// 实时状态显示优化
function updateSyncIndicator(status) {
    const syncStatus = document.getElementById('syncStatus');
    const syncIndicator = document.getElementById('syncIndicator');
    const syncText = document.getElementById('syncText');
    
    switch(status) {
        case 'editing':
            syncIndicator.className = 'sync-indicator editing';
            syncText.textContent = '编辑中';
            syncIndicator.style.background = '#fbbf24'; // 黄色
            break;
        case 'pending':
            syncIndicator.className = 'sync-indicator pending';
            syncText.textContent = '待同步';
            syncIndicator.style.background = '#f97316'; // 橙色
            break;
        case 'syncing':
            syncIndicator.className = 'sync-indicator syncing';
            syncText.textContent = '同步中';
            syncIndicator.style.background = '#3b82f6'; // 蓝色
            break;
        case 'synced':
            syncIndicator.className = 'sync-indicator';
            syncText.textContent = '已同步';
            syncIndicator.style.background = '#10b981'; // 绿色
            break;
        case 'error':
            syncIndicator.className = 'sync-indicator offline';
            syncText.textContent = '同步失败';
            syncIndicator.style.background = '#ef4444'; // 红色
            break;
    }
}

// 在任务更新函数中使用
function updateTaskWithStatus(index, task) {
    if (selectedSchedule && selectedSchedule.items[index]) {
        // 1. 立即更新UI状态为"编辑中"
        updateSyncIndicator('editing');
        
        selectedSchedule.items[index].task = task;
        
        if (!task || task.trim() === '') {
            selectedSchedule.items[index].completed = false;
        }
        
        // 2. 保存到本地后显示"待同步"
        saveToLocalStorage();
        updateSyncIndicator('pending');
        
        // 3. 防抖保存到云端
        saveToSupabaseDebounced(selectedSchedule.dayId);
        
        updateCheckboxState(index, task);
        
        setTimeout(() => {
            renderCalendar();
        }, 100);
    }
}