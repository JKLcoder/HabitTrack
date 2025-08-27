// ==================== Outbox Pattern 离线优先同步系统 ====================

/**
 * IndexedDB Outbox 系统
 * 实现离线优先的数据同步模式
 */

class OutboxSystem {
    constructor() {
        this.dbName = 'HabitTrackOutbox';
        this.version = 1;
        this.db = null;
        this.mutationId = 0;
        this.isProcessing = false;
        this.retryTimeouts = new Map();
        
        // 初始化
        this.init();
    }

    async init() {
        try {
            await this.initDB();
            await this.loadMutationId();
            this.startSyncProcessor();
            
            // 注册 Service Worker（如果支持）
            await this.registerServiceWorker();
            
            console.log('[Outbox] 系统初始化完成');
        } catch (error) {
            console.error('[Outbox] 初始化失败:', error);
        }
    }

    /**
     * 初始化 IndexedDB
     */
    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // outbox 表：存储待同步的操作
                if (!db.objectStoreNames.contains('outbox')) {
                    const outboxStore = db.createObjectStore('outbox', { keyPath: 'mutation_id' });
                    outboxStore.createIndex('status', 'status', { unique: false });
                    outboxStore.createIndex('timestamp', 'timestamp', { unique: false });
                    outboxStore.createIndex('entity_type', 'entity_type', { unique: false });
                    outboxStore.createIndex('next_retry', 'next_retry', { unique: false });
                }

                // metadata 表：存储系统元数据
                if (!db.objectStoreNames.contains('metadata')) {
                    db.createObjectStore('metadata', { keyPath: 'key' });
                }

                console.log('[Outbox] IndexedDB 初始化完成');
            };
        });
    }

    /**
     * 加载当前 mutation ID
     */
    async loadMutationId() {
        try {
            const tx = this.db.transaction(['metadata'], 'readonly');
            const store = tx.objectStore('metadata');
            const request = store.get('mutation_id');

            return new Promise((resolve) => {
                request.onsuccess = () => {
                    this.mutationId = request.result ? request.result.value : 0;
                    resolve();
                };
                request.onerror = () => {
                    this.mutationId = 0;
                    resolve();
                };
            });
        } catch (error) {
            console.error('[Outbox] 加载 mutation ID 失败:', error);
            this.mutationId = 0;
        }
    }

    /**
     * 获取下一个 mutation ID
     */
    async getNextMutationId() {
        this.mutationId++;
        
        try {
            const tx = this.db.transaction(['metadata'], 'readwrite');
            const store = tx.objectStore('metadata');
            await store.put({ key: 'mutation_id', value: this.mutationId });
        } catch (error) {
            console.error('[Outbox] 保存 mutation ID 失败:', error);
        }

        return this.mutationId;
    }

    /**
     * 添加变更到 outbox
     */
    async addMutation(operation, entityType, entityId, payload) {
        const mutationId = await this.getNextMutationId();
        const timestamp = Date.now();

        const mutation = {
            mutation_id: mutationId,
            timestamp,
            operation, // 'create', 'update', 'delete'
            entity_type: entityType, // 'habit', 'archived_habit'
            entity_id: entityId,
            payload,
            status: 'pending', // 'pending', 'delivered', 'failed'
            retry_count: 0,
            next_retry: timestamp,
            created_at: timestamp
        };

        try {
            const tx = this.db.transaction(['outbox'], 'readwrite');
            const store = tx.objectStore('outbox');
            await store.add(mutation);

            console.log(`[Outbox] 添加变更 #${mutationId}:`, operation, entityType, entityId);

            // 立即尝试同步
            this.triggerSync();

            // 如果支持，也注册后台同步
            this.requestBackgroundSync();

            return mutationId;
        } catch (error) {
            console.error('[Outbox] 添加变更失败:', error);
            throw error;
        }
    }

    /**
     * 获取待处理的变更
     */
    async getPendingMutations(limit = 10) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(['outbox'], 'readonly');
            const store = tx.objectStore('outbox');
            const index = store.index('next_retry');
            const range = IDBKeyRange.upperBound(Date.now());
            const request = index.openCursor(range);
            
            const mutations = [];
            let count = 0;

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor && count < limit) {
                    const mutation = cursor.value;
                    if (mutation.status === 'pending' || mutation.status === 'failed') {
                        mutations.push(mutation);
                        count++;
                    }
                    cursor.continue();
                } else {
                    resolve(mutations.sort((a, b) => a.mutation_id - b.mutation_id));
                }
            };

            request.onerror = () => reject(request.error);
        });
    }

    /**
     * 标记变更为已交付
     */
    async markAsDelivered(mutationId) {
        try {
            const tx = this.db.transaction(['outbox'], 'readwrite');
            const store = tx.objectStore('outbox');
            const mutation = await this.getMutation(mutationId);
            
            if (mutation) {
                mutation.status = 'delivered';
                mutation.delivered_at = Date.now();
                await store.put(mutation);
                
                console.log(`[Outbox] 变更 #${mutationId} 已标记为交付`);
            }
        } catch (error) {
            console.error(`[Outbox] 标记变更 #${mutationId} 交付失败:`, error);
        }
    }

    /**
     * 标记变更为失败，并设置重试时间
     */
    async markAsFailed(mutationId, error) {
        try {
            const tx = this.db.transaction(['outbox'], 'readwrite');
            const store = tx.objectStore('outbox');
            const mutation = await this.getMutation(mutationId);
            
            if (mutation) {
                mutation.status = 'failed';
                mutation.retry_count++;
                mutation.last_error = error.message;
                mutation.failed_at = Date.now();
                
                // 指数退避：2^retry_count * 1000ms，最大 5 分钟
                const retryDelay = Math.min(
                    Math.pow(2, mutation.retry_count) * 1000,
                    5 * 60 * 1000
                );
                mutation.next_retry = Date.now() + retryDelay;
                
                await store.put(mutation);
                
                console.log(`[Outbox] 变更 #${mutationId} 标记为失败，${retryDelay/1000}秒后重试`);
            }
        } catch (error) {
            console.error(`[Outbox] 标记变更 #${mutationId} 失败状态时出错:`, error);
        }
    }

    /**
     * 获取单个变更记录
     */
    async getMutation(mutationId) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(['outbox'], 'readonly');
            const store = tx.objectStore('outbox');
            const request = store.get(mutationId);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * 启动同步处理器
     */
    startSyncProcessor() {
        // 定期检查同步队列
        setInterval(() => {
            this.triggerSync();
        }, 30000); // 30秒检查一次

        // 监听网络状态
        window.addEventListener('online', () => {
            console.log('[Outbox] 网络已连接，开始同步');
            this.triggerSync();
        });

        // 监听页面可见性变化
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                console.log('[Outbox] 页面变为可见，检查同步');
                this.triggerSync();
            }
        });

        // 监听页面聚焦
        window.addEventListener('focus', () => {
            console.log('[Outbox] 窗口获得焦点，检查同步');
            this.triggerSync();
        });
    }

    /**
     * 触发同步
     */
    async triggerSync() {
        if (this.isProcessing || !navigator.onLine) {
            return;
        }

        this.isProcessing = true;

        try {
            const pendingMutations = await this.getPendingMutations();
            
            if (pendingMutations.length === 0) {
                return;
            }

            console.log(`[Outbox] 开始处理 ${pendingMutations.length} 个待同步变更`);

            for (const mutation of pendingMutations) {
                try {
                    await this.processMutation(mutation);
                } catch (error) {
                    console.error(`[Outbox] 处理变更 #${mutation.mutation_id} 失败:`, error);
                    await this.markAsFailed(mutation.mutation_id, error);
                }
            }
        } catch (error) {
            console.error('[Outbox] 同步处理失败:', error);
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * 处理单个变更
     */
    async processMutation(mutation) {
        const { operation, entity_type, entity_id, payload, mutation_id } = mutation;
        
        console.log(`[Outbox] 处理变更 #${mutation_id}: ${operation} ${entity_type} ${entity_id}`);

        // 检查 Supabase 是否可用
        if (!window.isSupabaseAvailable || !window.supabaseClient) {
            throw new Error('Supabase 不可用');
        }

        try {
            switch (entity_type) {
                case 'habit':
                    await this.syncHabitToSupabase(operation, entity_id, payload, mutation_id);
                    break;
                case 'archived_habit':
                    await this.syncArchivedHabitToSupabase(operation, entity_id, payload, mutation_id);
                    break;
                default:
                    throw new Error(`未知的实体类型: ${entity_type}`);
            }

            await this.markAsDelivered(mutation_id);
        } catch (error) {
            throw error;
        }
    }

    /**
     * 同步习惯数据到 Supabase
     */
    async syncHabitToSupabase(operation, habitId, payload, mutationId) {
        const { supabaseClient } = window;

        // 创建幂等的 RPC 调用数据
        const rpcData = {
            mutation_id: mutationId,
            operation,
            habit_id: habitId,
            habit_data: payload,
            client_timestamp: Date.now()
        };

        let result;
        switch (operation) {
            case 'create':
            case 'update':
                result = await supabaseClient.rpc('upsert_habit_mutation', rpcData);
                break;
            case 'delete':
                result = await supabaseClient.rpc('delete_habit_mutation', rpcData);
                break;
            default:
                throw new Error(`未知的操作类型: ${operation}`);
        }

        if (result.error) {
            throw new Error(`Supabase RPC 错误: ${result.error.message}`);
        }

        console.log(`[Outbox] 成功同步习惯变更 #${mutationId}`);
    }

    /**
     * 同步已归档习惯数据到 Supabase
     */
    async syncArchivedHabitToSupabase(operation, habitId, payload, mutationId) {
        const { supabaseClient } = window;

        const rpcData = {
            mutation_id: mutationId,
            operation,
            archived_habit_id: habitId,
            archived_habit_data: payload,
            client_timestamp: Date.now()
        };

        let result;
        switch (operation) {
            case 'create':
            case 'update':
                result = await supabaseClient.rpc('upsert_archived_habit_mutation', rpcData);
                break;
            case 'delete':
                result = await supabaseClient.rpc('delete_archived_habit_mutation', rpcData);
                break;
            default:
                throw new Error(`未知的操作类型: ${operation}`);
        }

        if (result.error) {
            throw new Error(`Supabase RPC 错误: ${result.error.message}`);
        }

        console.log(`[Outbox] 成功同步归档习惯变更 #${mutationId}`);
    }

    /**
     * 注册 Service Worker
     */
    async registerServiceWorker() {
        if (!('serviceWorker' in navigator)) {
            console.log('[Outbox] Service Worker 不支持');
            return;
        }

        try {
            const registration = await navigator.serviceWorker.register('/service-worker.js');
            console.log('[Outbox] Service Worker 注册成功:', registration.scope);

            // 监听 Service Worker 消息
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'BACKGROUND_SYNC') {
                    if (event.data.action === 'SYNC_OUTBOX') {
                        console.log('[Outbox] 收到后台同步请求');
                        this.triggerSync();
                    }
                }
            });

            // 注册后台同步（如果支持）
            if ('sync' in window.ServiceWorkerRegistration.prototype) {
                this.serviceWorkerRegistration = registration;
                console.log('[Outbox] Background Sync 支持已启用');
            }

            // 请求通知权限（可选）
            if ('Notification' in window && Notification.permission === 'default') {
                await Notification.requestPermission();
            }

        } catch (error) {
            console.error('[Outbox] Service Worker 注册失败:', error);
        }
    }

    /**
     * 请求后台同步
     */
    async requestBackgroundSync() {
        if (!this.serviceWorkerRegistration || !('sync' in window.ServiceWorkerRegistration.prototype)) {
            return false;
        }

        try {
            await this.serviceWorkerRegistration.sync.register('outbox-sync');
            console.log('[Outbox] 后台同步已注册');
            return true;
        } catch (error) {
            console.error('[Outbox] 注册后台同步失败:', error);
            return false;
        }
    }

    /**
     * 清理已交付的旧记录
     */
    async cleanupDeliveredMutations(olderThanDays = 7) {
        const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
        
        try {
            const tx = this.db.transaction(['outbox'], 'readwrite');
            const store = tx.objectStore('outbox');
            const index = store.index('timestamp');
            const range = IDBKeyRange.upperBound(cutoffTime);
            const request = index.openCursor(range);

            let deletedCount = 0;
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const mutation = cursor.value;
                    if (mutation.status === 'delivered') {
                        cursor.delete();
                        deletedCount++;
                    }
                    cursor.continue();
                } else {
                    console.log(`[Outbox] 清理了 ${deletedCount} 条已交付的记录`);
                }
            };
        } catch (error) {
            console.error('[Outbox] 清理记录失败:', error);
        }
    }

    /**
     * 获取 outbox 统计信息
     */
    async getStats() {
        return new Promise((resolve) => {
            const tx = this.db.transaction(['outbox'], 'readonly');
            const store = tx.objectStore('outbox');
            const request = store.getAll();

            request.onsuccess = () => {
                const mutations = request.result;
                const stats = {
                    total: mutations.length,
                    pending: mutations.filter(m => m.status === 'pending').length,
                    failed: mutations.filter(m => m.status === 'failed').length,
                    delivered: mutations.filter(m => m.status === 'delivered').length
                };
                resolve(stats);
            };
        });
    }
}

// 创建全局实例
window.outboxSystem = new OutboxSystem();

// 定期清理
setInterval(() => {
    window.outboxSystem?.cleanupDeliveredMutations();
}, 24 * 60 * 60 * 1000); // 每天清理一次