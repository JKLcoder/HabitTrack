// ==================== Outbox 监控面板 ====================

/**
 * Outbox 调试监控面板
 * 显示同步队列状态和统计信息
 */

class OutboxMonitor {
    constructor() {
        this.isVisible = false;
        this.refreshInterval = null;
        this.createUI();
        this.bindEvents();
    }

    createUI() {
        // 创建监控面板 HTML
        const monitorHTML = `
            <div id="outbox-monitor" class="outbox-monitor hidden">
                <div class="outbox-monitor-header">
                    <h3>🚀 Outbox 同步监控</h3>
                    <button id="outbox-monitor-close" class="outbox-close-btn">×</button>
                </div>
                <div class="outbox-monitor-content">
                    <div class="outbox-stats">
                        <div class="outbox-stat">
                            <span class="stat-label">总计:</span>
                            <span id="outbox-total" class="stat-value">0</span>
                        </div>
                        <div class="outbox-stat">
                            <span class="stat-label">待发送:</span>
                            <span id="outbox-pending" class="stat-value">0</span>
                        </div>
                        <div class="outbox-stat">
                            <span class="stat-label">失败:</span>
                            <span id="outbox-failed" class="stat-value">0</span>
                        </div>
                        <div class="outbox-stat">
                            <span class="stat-label">已交付:</span>
                            <span id="outbox-delivered" class="stat-value">0</span>
                        </div>
                    </div>
                    <div class="outbox-actions">
                        <button id="outbox-sync-now" class="outbox-btn">立即同步</button>
                        <button id="outbox-clear-delivered" class="outbox-btn">清理已交付</button>
                        <button id="outbox-show-queue" class="outbox-btn">查看队列</button>
                    </div>
                    <div id="outbox-queue" class="outbox-queue hidden"></div>
                </div>
            </div>
        `;

        // 添加样式
        const styles = `
            <style>
                .outbox-monitor {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: white;
                    border: 2px solid #007AFF;
                    border-radius: 12px;
                    padding: 20px;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                    z-index: 10000;
                    min-width: 400px;
                    max-width: 600px;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                }

                .outbox-monitor.hidden {
                    display: none;
                }

                .outbox-monitor-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    padding-bottom: 10px;
                    border-bottom: 1px solid #e0e0e0;
                }

                .outbox-monitor-header h3 {
                    margin: 0;
                    color: #007AFF;
                    font-size: 18px;
                }

                .outbox-close-btn {
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    color: #666;
                }

                .outbox-close-btn:hover {
                    color: #ff3b30;
                }

                .outbox-stats {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 15px;
                    margin-bottom: 20px;
                }

                .outbox-stat {
                    background: #f8f9fa;
                    padding: 12px;
                    border-radius: 8px;
                    display: flex;
                    justify-content: space-between;
                }

                .stat-label {
                    color: #666;
                    font-size: 14px;
                }

                .stat-value {
                    font-weight: bold;
                    color: #333;
                }

                .outbox-actions {
                    display: flex;
                    gap: 10px;
                    margin-bottom: 20px;
                }

                .outbox-btn {
                    padding: 8px 16px;
                    border: 1px solid #007AFF;
                    border-radius: 6px;
                    background: white;
                    color: #007AFF;
                    cursor: pointer;
                    font-size: 14px;
                    transition: all 0.2s;
                }

                .outbox-btn:hover {
                    background: #007AFF;
                    color: white;
                }

                .outbox-queue {
                    max-height: 300px;
                    overflow-y: auto;
                    border: 1px solid #e0e0e0;
                    border-radius: 6px;
                    padding: 10px;
                }

                .queue-item {
                    padding: 8px;
                    margin: 5px 0;
                    border-radius: 4px;
                    font-size: 13px;
                    border-left: 4px solid;
                }

                .queue-item.pending {
                    background: #fff3cd;
                    border-left-color: #ffc107;
                }

                .queue-item.failed {
                    background: #f8d7da;
                    border-left-color: #dc3545;
                }

                .queue-item.delivered {
                    background: #d4edda;
                    border-left-color: #28a745;
                }

                .queue-item-header {
                    font-weight: bold;
                    margin-bottom: 4px;
                }

                .queue-item-details {
                    color: #666;
                    font-size: 12px;
                }

                /* 浮动触发按钮 */
                .outbox-trigger {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    background: #007AFF;
                    color: white;
                    border: none;
                    border-radius: 50%;
                    width: 50px;
                    height: 50px;
                    font-size: 18px;
                    cursor: pointer;
                    box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3);
                    z-index: 1000;
                    transition: all 0.2s;
                }

                .outbox-trigger:hover {
                    transform: scale(1.1);
                    box-shadow: 0 6px 20px rgba(0, 122, 255, 0.4);
                }
            </style>
        `;

        // 添加到页面
        document.head.insertAdjacentHTML('beforeend', styles);
        document.body.insertAdjacentHTML('beforeend', monitorHTML);
        
        // 添加浮动触发按钮
        const triggerBtn = document.createElement('button');
        triggerBtn.id = 'outbox-trigger';
        triggerBtn.className = 'outbox-trigger';
        triggerBtn.innerHTML = '📤';
        triggerBtn.title = '打开 Outbox 监控面板 (按 O 键)';
        document.body.appendChild(triggerBtn);
    }

    bindEvents() {
        // 绑定按钮事件
        document.getElementById('outbox-trigger').addEventListener('click', () => this.show());
        document.getElementById('outbox-monitor-close').addEventListener('click', () => this.hide());
        document.getElementById('outbox-sync-now').addEventListener('click', () => this.syncNow());
        document.getElementById('outbox-clear-delivered').addEventListener('click', () => this.clearDelivered());
        document.getElementById('outbox-show-queue').addEventListener('click', () => this.toggleQueue());

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (e.key === 'o' || e.key === 'O') {
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.toggle();
                }
            }
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });

        // 点击外部关闭
        document.getElementById('outbox-monitor').addEventListener('click', (e) => {
            if (e.target.id === 'outbox-monitor') {
                this.hide();
            }
        });
    }

    async show() {
        this.isVisible = true;
        document.getElementById('outbox-monitor').classList.remove('hidden');
        await this.refreshStats();
        
        // 开始定期刷新
        this.refreshInterval = setInterval(() => {
            this.refreshStats();
        }, 2000);
    }

    hide() {
        this.isVisible = false;
        document.getElementById('outbox-monitor').classList.add('hidden');
        document.getElementById('outbox-queue').classList.add('hidden');
        
        // 停止刷新
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    async refreshStats() {
        if (!window.outboxSystem) return;

        try {
            const stats = await window.outboxSystem.getStats();
            
            document.getElementById('outbox-total').textContent = stats.total;
            document.getElementById('outbox-pending').textContent = stats.pending;
            document.getElementById('outbox-failed').textContent = stats.failed;
            document.getElementById('outbox-delivered').textContent = stats.delivered;

            // 更新浮动按钮状态
            const trigger = document.getElementById('outbox-trigger');
            if (stats.pending > 0 || stats.failed > 0) {
                trigger.style.background = stats.failed > 0 ? '#ff3b30' : '#ff9500';
                trigger.innerHTML = stats.pending + stats.failed;
            } else {
                trigger.style.background = '#007AFF';
                trigger.innerHTML = '✓';
            }
        } catch (error) {
            console.error('[OutboxMonitor] 刷新统计失败:', error);
        }
    }

    async syncNow() {
        if (!window.outboxSystem) return;
        
        const btn = document.getElementById('outbox-sync-now');
        const originalText = btn.textContent;
        
        btn.textContent = '同步中...';
        btn.disabled = true;
        
        try {
            await window.outboxSystem.triggerSync();
            await this.refreshStats();
        } catch (error) {
            console.error('[OutboxMonitor] 手动同步失败:', error);
            alert('同步失败: ' + error.message);
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    }

    async clearDelivered() {
        if (!window.outboxSystem) return;
        
        if (confirm('确定要清理所有已交付的记录吗？')) {
            try {
                await window.outboxSystem.cleanupDeliveredMutations();
                await this.refreshStats();
                alert('已交付的记录已清理完成');
            } catch (error) {
                console.error('[OutboxMonitor] 清理失败:', error);
                alert('清理失败: ' + error.message);
            }
        }
    }

    async toggleQueue() {
        const queueDiv = document.getElementById('outbox-queue');
        const btn = document.getElementById('outbox-show-queue');
        
        if (queueDiv.classList.contains('hidden')) {
            // 显示队列
            await this.loadQueue();
            queueDiv.classList.remove('hidden');
            btn.textContent = '隐藏队列';
        } else {
            // 隐藏队列
            queueDiv.classList.add('hidden');
            btn.textContent = '查看队列';
        }
    }

    async loadQueue() {
        if (!window.outboxSystem) return;

        try {
            const mutations = await window.outboxSystem.getPendingMutations(20); // 显示前20条
            const queueDiv = document.getElementById('outbox-queue');
            
            if (mutations.length === 0) {
                queueDiv.innerHTML = '<p style="text-align: center; color: #666;">队列为空</p>';
                return;
            }

            const queueHTML = mutations.map(mutation => {
                const date = new Date(mutation.timestamp).toLocaleString();
                const statusClass = mutation.status;
                
                return `
                    <div class="queue-item ${statusClass}">
                        <div class="queue-item-header">
                            #${mutation.mutation_id} - ${mutation.operation} ${mutation.entity_type}
                        </div>
                        <div class="queue-item-details">
                            实体ID: ${mutation.entity_id} | 
                            状态: ${mutation.status} | 
                            时间: ${date}
                            ${mutation.retry_count > 0 ? ` | 重试次数: ${mutation.retry_count}` : ''}
                            ${mutation.last_error ? ` | 错误: ${mutation.last_error}` : ''}
                        </div>
                    </div>
                `;
            }).join('');

            queueDiv.innerHTML = queueHTML;
        } catch (error) {
            console.error('[OutboxMonitor] 加载队列失败:', error);
            document.getElementById('outbox-queue').innerHTML = 
                '<p style="color: red;">加载队列失败: ' + error.message + '</p>';
        }
    }
}

// 在 outboxSystem 初始化后创建监控面板
setTimeout(() => {
    if (window.outboxSystem) {
        window.outboxMonitor = new OutboxMonitor();
        console.log('[OutboxMonitor] 监控面板已初始化 - 按 Ctrl+O 打开面板');
    }
}, 1000);