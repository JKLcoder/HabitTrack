// ==================== Service Worker (可选) ====================
// 为 HabitTrack 应用提供后台同步支持

const CACHE_NAME = 'habit-track-v1';
const OUTBOX_SYNC_TAG = 'outbox-sync';

// 需要缓存的文件
const STATIC_FILES = [
    '/',
    '/index.html',
    '/script.js',
    '/styles.css',
    '/outbox-system.js',
    '/outbox-monitor.js'
];

// 安装 Service Worker
self.addEventListener('install', (event) => {
    console.log('[SW] 安装中...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] 缓存静态文件');
                return cache.addAll(STATIC_FILES);
            })
            .then(() => {
                console.log('[SW] 安装完成');
                return self.skipWaiting();
            })
    );
});

// 激活 Service Worker
self.addEventListener('activate', (event) => {
    console.log('[SW] 激活中...');
    
    event.waitUntil(
        Promise.all([
            // 清理旧缓存
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('[SW] 删除旧缓存:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            // 接管所有客户端
            self.clients.claim()
        ])
    );
    
    console.log('[SW] 激活完成');
});

// 网络请求拦截
self.addEventListener('fetch', (event) => {
    const request = event.request;
    
    // 只处理 HTTP/HTTPS 请求
    if (!request.url.startsWith('http')) {
        return;
    }
    
    // 对于 Supabase API 请求，优先使用网络
    if (request.url.includes('supabase.co')) {
        event.respondWith(
            fetch(request)
                .catch(() => {
                    // 网络失败时，如果是 GET 请求，可以考虑返回缓存或离线页面
                    if (request.method === 'GET') {
                        return new Response(
                            JSON.stringify({ error: 'Network unavailable', offline: true }),
                            { headers: { 'Content-Type': 'application/json' } }
                        );
                    }
                    throw new Error('Network unavailable');
                })
        );
        return;
    }
    
    // 对于静态资源，使用缓存优先策略
    event.respondWith(
        caches.match(request)
            .then(response => {
                if (response) {
                    console.log('[SW] 从缓存返回:', request.url);
                    return response;
                }
                
                // 缓存中没有，从网络获取
                return fetch(request)
                    .then(fetchResponse => {
                        // 检查响应是否有效
                        if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
                            return fetchResponse;
                        }
                        
                        // 克隆响应，因为响应流只能使用一次
                        const responseToCache = fetchResponse.clone();
                        
                        // 缓存响应
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(request, responseToCache);
                            });
                        
                        return fetchResponse;
                    })
                    .catch(() => {
                        // 网络失败，如果是导航请求，返回离线页面
                        if (request.mode === 'navigate') {
                            return caches.match('/index.html');
                        }
                    });
            })
    );
});

// Background Sync 支持
self.addEventListener('sync', (event) => {
    console.log('[SW] 后台同步事件:', event.tag);
    
    if (event.tag === OUTBOX_SYNC_TAG) {
        event.waitUntil(performOutboxSync());
    }
});

// 执行 Outbox 同步
async function performOutboxSync() {
    try {
        console.log('[SW] 开始后台同步 Outbox...');
        
        // 通知所有客户端执行同步
        const clients = await self.clients.matchAll({ 
            includeUncontrolled: true,
            type: 'window'
        });
        
        for (const client of clients) {
            client.postMessage({
                type: 'BACKGROUND_SYNC',
                action: 'SYNC_OUTBOX'
            });
        }
        
        console.log('[SW] 后台同步请求已发送到所有客户端');
    } catch (error) {
        console.error('[SW] 后台同步失败:', error);
        throw error;
    }
}

// 处理客户端消息
self.addEventListener('message', (event) => {
    console.log('[SW] 收到消息:', event.data);
    
    if (event.data && event.data.type === 'REGISTER_BACKGROUND_SYNC') {
        // 注册后台同步
        event.waitUntil(
            self.registration.sync.register(OUTBOX_SYNC_TAG)
                .then(() => {
                    console.log('[SW] 后台同步已注册');
                    event.ports[0].postMessage({ success: true });
                })
                .catch(error => {
                    console.error('[SW] 注册后台同步失败:', error);
                    event.ports[0].postMessage({ success: false, error: error.message });
                })
        );
    }
});

// 推送通知支持（可选）
self.addEventListener('push', (event) => {
    if (!event.data) return;
    
    try {
        const data = event.data.json();
        const options = {
            body: data.body || '您有新的同步更新',
            icon: '/icon-192.png',
            badge: '/badge-72.png',
            tag: 'habit-sync',
            data: data.data || {}
        };
        
        event.waitUntil(
            self.registration.showNotification(
                data.title || 'HabitTrack 同步',
                options
            )
        );
    } catch (error) {
        console.error('[SW] 处理推送消息失败:', error);
    }
});

// 通知点击处理
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    event.waitUntil(
        self.clients.matchAll({ type: 'window' })
            .then(clients => {
                // 如果有打开的窗口，聚焦到它
                for (const client of clients) {
                    if (client.url.includes(self.location.origin)) {
                        return client.focus();
                    }
                }
                
                // 否则打开新窗口
                return self.clients.openWindow('/');
            })
    );
});

console.log('[SW] Service Worker 已加载');