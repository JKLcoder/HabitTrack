// 数据同步修复方案
// 替换原有的 syncDataFromServer 函数

async function syncDataFromServer() {
    if (!currentUser) return;
    
    updateSyncStatus('syncing', '同步中...');
    
    try {
        // 1. 备份当前本地数据
        const localBackup = {
            schedules: JSON.parse(JSON.stringify(schedules)),
            workdayTemplate: JSON.parse(JSON.stringify(workdayTemplate)),
            nonWorkdayTemplate: JSON.parse(JSON.stringify(nonWorkdayTemplate))
        };
        
        console.log('本地数据备份完成，本地日程数量:', localBackup.schedules.length);
        
        // 2. 获取服务器数据
        const { data: schedulesData, error: schedulesError } = await supabaseClient
            .from('schedules')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('day_id', { ascending: false });
        
        if (schedulesError) {
            if (schedulesError.message.includes('relation') && schedulesError.message.includes('does not exist')) {
                console.error('数据库表不存在，请先创建数据库表');
                showNotification('数据库未初始化，请先创建数据库表', false);
                updateSyncStatus('offline', '需要初始化');
                return;
            }
            throw schedulesError;
        }
        
        console.log('服务器数据获取完成，服务器日程数量:', schedulesData ? schedulesData.length : 0);
        
        // 3. 智能合并数据
        const mergedSchedules = mergeScheduleData(localBackup.schedules, schedulesData || []);
        
        console.log('数据合并完成，最终日程数量:', mergedSchedules.length);
        
        // 4. 获取其他数据（模板、设置）
        const { data: templatesData } = await supabaseClient
            .from('templates')
            .select('*')
            .eq('user_id', currentUser.id);
        
        const { data: settingsData } = await supabaseClient
            .from('user_settings')
            .select('*')
            .eq('user_id', currentUser.id)
            .single();
        
        // 5. 更新本地数据
        schedules = mergedSchedules;
        
        // 更新模板
        if (templatesData && templatesData.length > 0) {
            templatesData.forEach(template => {
                if (template.template_type === 'workday') {
                    workdayTemplate = template.template_data || {};
                } else if (template.template_type === 'nonworkday') {
                    nonWorkdayTemplate = template.template_data || {};
                }
            });
        }
        
        // 更新用户设置
        if (settingsData) {
            if (settingsData.theme) {
                const newTheme = settingsData.theme;
                document.body.setAttribute('data-theme', newTheme);
                updateThemeIcon(newTheme);
                localStorage.setItem('calendarTheme', newTheme);
            }
            
            if (settingsData.current_date_data) {
                const dateData = settingsData.current_date_data;
                currentDate = new Date(dateData.year, dateData.month, dateData.day);
            }
        }
        
        // 6. 保存合并后的数据到本地存储
        saveToLocalStorage();
        
        // 7. 重新渲染界面
        renderCalendar();
        renderScheduleForDate();
        updateTemplateListDisplay();
        
        updateSyncStatus('', '已同步');
        console.log('数据同步完成');
        
        // 8. 如果有数据合并，提示用户
        const addedCount = mergedSchedules.length - Math.max(localBackup.schedules.length, schedulesData?.length || 0);
        if (addedCount > 0) {
            showNotification(`数据同步完成，合并了 ${addedCount} 条新数据`, true);
        }
        
    } catch (error) {
        console.error('数据同步失败:', error);
        updateSyncStatus('offline', '同步失败');
        showNotification('数据同步失败，已保留本地数据: ' + error.message, false);
    }
}

// 智能数据合并函数
function mergeScheduleData(localSchedules, serverSchedules) {
    console.log('开始合并数据...');
    console.log('本地数据:', localSchedules.length, '条');
    console.log('服务器数据:', serverSchedules.length, '条');
    
    // 创建合并结果的Map，使用dayId作为key
    const mergedMap = new Map();
    
    // 1. 先添加本地数据
    localSchedules.forEach(schedule => {
        if (schedule.dayId) {
            mergedMap.set(schedule.dayId, {
                ...schedule,
                source: 'local',
                lastModified: schedule.createdAt || new Date().toISOString()
            });
        }
    });
    
    // 2. 合并服务器数据
    serverSchedules.forEach(serverSchedule => {
        const dayId = serverSchedule.day_id;
        const localSchedule = mergedMap.get(dayId);
        
        const serverData = {
            dayId: serverSchedule.day_id,
            date: serverSchedule.date,
            weekday: serverSchedule.weekday,
            items: serverSchedule.items || [],
            createdAt: serverSchedule.created_at,
            source: 'server',
            lastModified: serverSchedule.updated_at || serverSchedule.created_at
        };
        
        if (!localSchedule) {
            // 服务器有，本地没有 -> 直接添加
            mergedMap.set(dayId, serverData);
            console.log(`添加服务器数据: ${serverSchedule.date}`);
        } else {
            // 两边都有 -> 需要决定使用哪个
            const localTime = new Date(localSchedule.lastModified).getTime();
            const serverTime = new Date(serverData.lastModified).getTime();
            
            if (serverTime > localTime) {
                // 服务器数据更新 -> 使用服务器数据
                mergedMap.set(dayId, serverData);
                console.log(`使用服务器较新数据: ${serverSchedule.date}`);
            } else if (localTime > serverTime) {
                // 本地数据更新 -> 保持本地数据
                console.log(`保持本地较新数据: ${localSchedule.date}`);
            } else {
                // 时间相同 -> 合并任务内容
                const mergedItems = mergeTaskItems(localSchedule.items, serverData.items);
                mergedMap.set(dayId, {
                    ...localSchedule,
                    items: mergedItems,
                    source: 'merged'
                });
                console.log(`合并同时间数据: ${localSchedule.date}`);
            }
        }
    });
    
    // 转换为数组并排序
    const result = Array.from(mergedMap.values())
        .sort((a, b) => b.dayId - a.dayId); // 按日期倒序
    
    console.log('合并完成，最终数据量:', result.length);
    return result;
}

// 合并任务项目
function mergeTaskItems(localItems, serverItems) {
    const merged = {};
    
    // 先添加本地任务
    localItems.forEach(item => {
        merged[item.time] = item;
    });
    
    // 合并服务器任务
    serverItems.forEach(serverItem => {
        const localItem = merged[serverItem.time];
        if (!localItem) {
            // 本地没有该时间段 -> 直接添加
            merged[serverItem.time] = serverItem;
        } else {
            // 本地有该时间段 -> 选择有内容的任务
            if (!localItem.task || localItem.task.trim() === '') {
                // 本地任务为空 -> 使用服务器任务
                merged[serverItem.time] = serverItem;
            }
            // 否则保持本地任务（本地优先原则）
        }
    });
    
    // 转换为数组并排序
    return Object.values(merged).sort((a, b) => a.time.localeCompare(b.time));
}

// 改进的保存函数 - 增加重试机制
async function saveToSupabaseWithRetry(maxRetries = 3) {
    // 总是先保存到本地存储，确保数据不丢失
    saveToLocalStorage();
    
    if (!currentUser || !isOnline) {
        console.log('用户未登录或离线，数据已保存到本地');
        return;
    }
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            updateSyncStatus('syncing', `保存中...${attempt}/${maxRetries}`);
            
            // 保存前验证数据完整性
            if (!validateDataIntegrity()) {
                throw new Error('数据完整性验证失败');
            }
            
            await saveSchedulesToSupabase();
            await saveUserSettingsToSupabase();
            
            updateSyncStatus('', '已同步');
            console.log(`数据保存成功 (尝试 ${attempt}/${maxRetries})`);
            return; // 成功后退出
            
        } catch (error) {
            console.error(`保存失败 (尝试 ${attempt}/${maxRetries}):`, error);
            
            if (attempt === maxRetries) {
                // 最后一次尝试失败
                updateSyncStatus('offline', '同步失败');
                showNotification(`数据保存失败（已尝试${maxRetries}次），已保存到本地`, false);
            } else {
                // 等待后重试
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
    }
}

// 数据完整性验证
function validateDataIntegrity() {
    // 检查schedules数组是否存在
    if (!Array.isArray(schedules)) {
        console.error('schedules不是数组');
        return false;
    }
    
    // 检查是否有重复的dayId
    const dayIds = schedules.map(s => s.dayId);
    const uniqueDayIds = new Set(dayIds);
    if (dayIds.length !== uniqueDayIds.size) {
        console.error('发现重复的dayId');
        return false;
    }
    
    // 检查每个schedule是否有必要字段
    for (const schedule of schedules) {
        if (!schedule.dayId || !schedule.date || !schedule.items) {
            console.error('发现缺少必要字段的schedule:', schedule);
            return false;
        }
    }
    
    console.log('数据完整性验证通过');
    return true;
}

// 数据恢复函数
function restoreFromBackup() {
    const backup = localStorage.getItem('calendarSchedulesBackup');
    if (backup) {
        try {
            const backupData = JSON.parse(backup);
            schedules = backupData;
            renderCalendar();
            renderScheduleForDate();
            showNotification('已从备份恢复数据', true);
            console.log('数据恢复成功，恢复了', backupData.length, '条记录');
        } catch (error) {
            console.error('数据恢复失败:', error);
            showNotification('数据恢复失败', false);
        }
    } else {
        showNotification('没有找到备份数据', false);
    }
}

// 创建数据备份
function createDataBackup() {
    try {
        localStorage.setItem('calendarSchedulesBackup', JSON.stringify(schedules));
        localStorage.setItem('calendarSchedulesBackupTime', new Date().toISOString());
        console.log('数据备份已创建');
    } catch (error) {
        console.error('创建数据备份失败:', error);
    }
}