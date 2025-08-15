// 优化后的数据提交方案
let pendingChanges = new Set(); // 记录待提交的日程ID
let saveTimer = null;

// 改进的保存函数：只保存修改过的数据
async function saveChangedSchedulesToSupabase() {
    if (!currentUser || pendingChanges.size === 0) return;
    
    console.log('开始增量保存，待保存数量:', pendingChanges.size);
    
    const changedScheduleIds = Array.from(pendingChanges);
    const changedSchedules = schedules.filter(s => changedScheduleIds.includes(s.dayId));
    
    for (const schedule of changedSchedules) {
        try {
            const scheduleData = {
                user_id: currentUser.id,
                day_id: schedule.dayId,
                date: schedule.date,
                weekday: schedule.weekday,
                items: schedule.items || [],
                updated_at: new Date().toISOString() // 添加更新时间戳
            };
            
            // 使用 upsert 进行更新或插入
            const { error } = await supabaseClient
                .from('schedules')
                .upsert([scheduleData], { 
                    onConflict: 'user_id,day_id',
                    ignoreDuplicates: false 
                });
            
            if (error) throw error;
            
            console.log('增量保存成功:', schedule.date);
            
        } catch (error) {
            console.error('增量保存失败:', schedule.date, error);
            throw error;
        }
    }
    
    // 清空待提交列表
    pendingChanges.clear();
    console.log('增量保存完成');
}

// 防抖保存函数
function saveToSupabaseDebounced(changedDayId) {
    // 记录需要保存的日程
    if (changedDayId) {
        pendingChanges.add(changedDayId);
    }
    
    // 先保存到本地存储（立即）
    saveToLocalStorage();
    
    // 清除之前的定时器
    if (saveTimer) {
        clearTimeout(saveTimer);
    }
    
    // 设置新的定时器，2秒后提交到云端
    saveTimer = setTimeout(async () => {
        try {
            updateSyncStatus('syncing', '同步中...');
            await saveChangedSchedulesToSupabase();
            updateSyncStatus('', '已同步');
        } catch (error) {
            console.error('防抖保存失败:', error);
            updateSyncStatus('offline', '同步失败');
        }
    }, 2000); // 2秒防抖延迟
}

// 修改任务操作函数
function updateTaskOptimized(index, task) {
    if (selectedSchedule && selectedSchedule.items[index]) {
        console.log('更新任务内容:', index, '原内容:', selectedSchedule.items[index].task, '新内容:', task);
        
        selectedSchedule.items[index].task = task;
        
        if (!task || task.trim() === '') {
            selectedSchedule.items[index].completed = false;
        }
        
        // 使用防抖保存，只提交当前修改的日程
        saveToSupabaseDebounced(selectedSchedule.dayId);
        
        updateCheckboxState(index, task);
        
        setTimeout(() => {
            renderCalendar();
        }, 100);
    }
}

// 批量提交函数（用户主动触发）
async function forceSyncAll() {
    try {
        updateSyncStatus('syncing', '强制同步中...');
        
        // 将所有日程加入待提交列表
        schedules.forEach(s => pendingChanges.add(s.dayId));
        
        await saveChangedSchedulesToSupabase();
        updateSyncStatus('', '同步完成');
        showNotification('所有数据已同步到云端', true);
        
    } catch (error) {
        console.error('强制同步失败:', error);
        updateSyncStatus('offline', '同步失败');
        showNotification('同步失败：' + error.message, false);
    }
}