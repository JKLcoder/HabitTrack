// 全局变量
let habits = []; // 存储所有习惯
let archivedHabits = []; // 存储已归档的习惯
let currentWeekStart = getWeekStart(new Date()); // 当前周的开始日期
let editingHabitId = null; // 当前正在编辑的习惯ID

// DOM元素
const habitsList = document.getElementById('habits-list');
const habitModal = document.getElementById('habit-modal');
const habitForm = document.getElementById('habit-form');
const modalTitle = document.getElementById('modal-title');
const addHabitBtn = document.getElementById('add-habit');
const cancelHabitBtn = document.getElementById('cancel-habit');
const closeModalBtn = document.querySelector('.close-modal');
const prevWeekBtn = document.getElementById('prev-week');
const nextWeekBtn = document.getElementById('next-week');
const currentWeekBtn = document.getElementById('current-week-btn');
const currentWeekSpan = document.getElementById('current-week');
const weekStartDateSpan = document.getElementById('week-start-date');
const weekEndDateSpan = document.getElementById('week-end-date');
const totalHabitsSpan = document.getElementById('total-habits');
const completedCheckmarksSpan = document.getElementById('completed-checkmarks');
const completionRateSpan = document.getElementById('completion-rate');
const averageScoreSpan = document.getElementById('average-score');
const saveHabitBtn = document.getElementById('save-habit');
const archivedCountSpan = document.getElementById('archived-count');
const archivedHabitsGrid = document.getElementById('archived-habits-grid');
const emptyArchivedDiv = document.getElementById('empty-archived');
const navTabs = document.querySelectorAll('.nav-tab');
const tabContents = document.querySelectorAll('.tab-content');
const certificateModal = document.getElementById('certificate-modal');
const certificateContainer = document.getElementById('certificate-container');
const downloadCertificateBtn = document.getElementById('download-certificate');
const closeCertificateBtn = document.getElementById('close-certificate');
const closeCertificateBtnAlt = document.getElementById('close-certificate-btn');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM加载完成，初始化应用...');
    
    loadHabits();
    loadArchivedHabits(); // 加载已归档的习惯
    updateWeekDisplay();
    renderHabits();
    renderArchivedHabits(); // 渲染已归档习惯
    updateWeeklySummary();
    updateArchivedCount(); // 更新归档习惯数量
    
    // 事件监听器
    if (addHabitBtn) {
        console.log('绑定添加习惯按钮事件');
        addHabitBtn.addEventListener('click', openAddHabitModal);
    }
    
    if (habitForm) {
        console.log('绑定习惯表单提交事件');
        habitForm.addEventListener('submit', saveHabit);
    }
    
    if (cancelHabitBtn) {
        console.log('绑定取消按钮事件');
        cancelHabitBtn.addEventListener('click', closeModal);
    }
    
    if (closeModalBtn) {
        console.log('绑定关闭模态框按钮事件');
        closeModalBtn.addEventListener('click', closeModal);
    }
    
    if (prevWeekBtn) {
        console.log('绑定上一周按钮事件');
        prevWeekBtn.addEventListener('click', goToPrevWeek);
    }
    
    if (nextWeekBtn) {
        console.log('绑定下一周按钮事件');
        nextWeekBtn.addEventListener('click', goToNextWeek);
    }
    
    if (currentWeekBtn) {
        console.log('绑定本周按钮事件');
        currentWeekBtn.addEventListener('click', goToCurrentWeek);
    }
    
    // 绑定导航标签事件
    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');
            switchTab(tabId);
        });
    });
    
    // 绑定证书模态框关闭事件
    if (closeCertificateBtn) {
        closeCertificateBtn.addEventListener('click', closeCertificateModal);
    }
    
    if (closeCertificateBtnAlt) {
        closeCertificateBtnAlt.addEventListener('click', closeCertificateModal);
    }
    
    // 绑定下载证书事件
    if (downloadCertificateBtn) {
        downloadCertificateBtn.addEventListener('click', downloadCertificate);
    }
    
    // 点击模态框外部关闭
    window.addEventListener('click', (e) => {
        if (e.target === habitModal) {
            closeModal();
        }
        if (e.target === certificateModal) {
            closeCertificateModal();
        }
    });
    
    console.log('初始化完成');
});

// 获取周的开始日期（周一）
function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 调整周日
    return new Date(d.setDate(diff));
}

// 获取周的结束日期（周日）
function getWeekEnd(weekStart) {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    return end;
}

// 格式化日期为 YYYY-MM-DD
function formatDate(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 更新周显示
function updateWeekDisplay() {
    console.log('更新周显示');
    const weekEnd = getWeekEnd(currentWeekStart);
    
    // 计算当前是第几周（以年初为基准）
    const startOfYear = new Date(currentWeekStart.getFullYear(), 0, 1);
    const weekNumber = Math.ceil(((currentWeekStart - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
    
    if (currentWeekSpan) currentWeekSpan.textContent = weekNumber;
    if (weekStartDateSpan) weekStartDateSpan.textContent = formatDate(currentWeekStart);
    if (weekEndDateSpan) weekEndDateSpan.textContent = formatDate(weekEnd);
    
    // 更新导航按钮状态
    const today = new Date();
    const currentWeekStartDate = getWeekStart(today);
    
    if (currentWeekBtn) {
        if (formatDate(currentWeekStart) === formatDate(currentWeekStartDate)) {
            currentWeekBtn.classList.add('active');
        } else {
            currentWeekBtn.classList.remove('active');
        }
    }
}

// 前往上一周
function goToPrevWeek() {
    console.log('前往上一周');
    const prevWeek = new Date(currentWeekStart);
    prevWeek.setDate(prevWeek.getDate() - 7);
    currentWeekStart = prevWeek;
    updateWeekDisplay();
    renderHabits();
    updateWeeklySummary();
}

// 前往下一周
function goToNextWeek() {
    console.log('前往下一周');
    const nextWeek = new Date(currentWeekStart);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    // 检查是否是新的一周
    const currentWeekKey = getWeekKey(currentWeekStart);
    const nextWeekKey = getWeekKey(nextWeek);
    
    if (currentWeekKey !== nextWeekKey) {
        // 更新每个习惯的周记录
        habits.forEach(habit => {
            // 更新本周记录
            updateWeeklyRecord(habit, currentWeekStart);
            
            // 重新计算历史最高记录
            recalculateWeeklyHighest(habit);
        });
    }
    
    currentWeekStart = nextWeek;
    updateWeekDisplay();
    renderHabits();
    updateWeeklySummary();
}

// 前往当前周
function goToCurrentWeek() {
    console.log('前往当前周');
    currentWeekStart = getWeekStart(new Date());
    updateWeekDisplay();
    renderHabits();
    updateWeeklySummary();
}

// 从localStorage加载习惯
function loadHabits() {
    try {
        const savedHabits = localStorage.getItem('habits');
        if (savedHabits) {
            habits = JSON.parse(savedHabits);
            console.log(`从localStorage加载了 ${habits.length} 个习惯`);
        } else {
            console.log('localStorage中没有保存的习惯数据');
            habits = [];
        }
    } catch (error) {
        console.error('加载习惯数据时出错:', error);
        habits = [];
    }
}

// 从localStorage加载已归档的习惯
function loadArchivedHabits() {
    try {
        const savedArchivedHabits = localStorage.getItem('archivedHabits');
        if (savedArchivedHabits) {
            archivedHabits = JSON.parse(savedArchivedHabits);
            console.log(`从localStorage加载了 ${archivedHabits.length} 个已归档习惯`);
        } else {
            console.log('localStorage中没有已归档的习惯数据');
            archivedHabits = [];
        }
    } catch (error) {
        console.error('加载已归档习惯数据时出错:', error);
        archivedHabits = [];
    }
}

// 保存习惯到localStorage
function saveHabitsToStorage() {
    try {
        localStorage.setItem('habits', JSON.stringify(habits));
        console.log(`已保存 ${habits.length} 个习惯到localStorage`);
    } catch (error) {
        console.error('保存习惯数据时出错:', error);
        alert('保存数据失败，请检查浏览器存储设置或清理浏览器缓存后重试。');
    }
}

// 保存已归档习惯到localStorage
function saveArchivedHabitsToStorage() {
    try {
        localStorage.setItem('archivedHabits', JSON.stringify(archivedHabits));
        console.log(`已保存 ${archivedHabits.length} 个已归档习惯到localStorage`);
    } catch (error) {
        console.error('保存已归档习惯数据时出错:', error);
        alert('保存归档数据失败，请检查浏览器存储设置或清理浏览器缓存后重试。');
    }
}

// 打开添加习惯模态框
function openAddHabitModal() {
    console.log('打开添加习惯模态框');
    modalTitle.textContent = '添加新习惯';
    habitForm.reset();
    document.getElementById('habit-color').value = getRandomColor();
    editingHabitId = null;
    habitModal.style.display = 'flex';
}

// 打开编辑习惯模态框
function openEditHabitModal(habitId) {
    console.log(`打开编辑习惯模态框，习惯ID: ${habitId}`);
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;
    
    modalTitle.textContent = '编辑习惯';
    document.getElementById('habit-name').value = habit.name;
    document.getElementById('habit-description').value = habit.description || '';
    document.getElementById('habit-color').value = habit.color;
    editingHabitId = habitId;
    habitModal.style.display = 'flex';
}

// 关闭模态框
function closeModal() {
    console.log('关闭模态框');
    habitModal.style.display = 'none';
    habitForm.reset();
}

// 保存习惯
function saveHabit(e) {
    console.log('保存习惯');
    e.preventDefault();
    
    const name = document.getElementById('habit-name').value.trim();
    const description = document.getElementById('habit-description').value.trim();
    const color = document.getElementById('habit-color').value;
    
    if (!name) return;
    
    if (editingHabitId) {
        // 编辑现有习惯
        const index = habits.findIndex(h => h.id === editingHabitId);
        if (index !== -1) {
            habits[index].name = name;
            habits[index].description = description;
            habits[index].color = color;
        }
    } else {
        // 添加新习惯
        const newHabit = {
            id: Date.now().toString(),
            name,
            description,
            color,
            checkmarks: {}, // 存储打卡记录，格式: { 'YYYY-MM-DD': true }
            weeklyHighest: 0, // 历史每周最高完成次数
            weeklyTarget: 1,  // 本周目标次数，初始为1
            weeklyRecords: {} // 存储每周记录，格式: { 'YYYY-WW': completedDays }
        };
        habits.push(newHabit);
    }
    
    saveHabitsToStorage();
    
    // 添加到 outbox 同步队列
    if (window.outboxSystem) {
        try {
            if (editingHabitId) {
                // 编辑现有习惯
                const editedHabit = habits.find(h => h.id === editingHabitId);
                if (editedHabit) {
                    window.outboxSystem.addMutation('update', 'habit', editingHabitId, editedHabit);
                }
            } else {
                // 添加新习惯
                const newHabit = habits[habits.length - 1]; // 最新添加的习惯
                if (newHabit) {
                    window.outboxSystem.addMutation('create', 'habit', newHabit.id, newHabit);
                }
            }
        } catch (error) {
            console.error('[Outbox] 添加习惯变更失败:', error);
        }
    }
    
    renderHabits();
    updateWeeklySummary();
    
    // 检查是否存在热力图相关函数，如果存在则调用
    if (typeof updateHeatmapSelects === 'function') {
        updateHeatmapSelects(); // 更新热力图选择器
    }
    
    if (typeof renderHeatmap === 'function') {
        renderHeatmap(); // 重新渲染热力图
    }
    
    closeModal();
}

// 删除习惯
function deleteHabit(habitId) {
    console.log(`删除习惯，习惯ID: ${habitId}`);
    if (confirm('确定要删除这个习惯吗？所有相关的打卡记录都将被删除。')) {
        // 获取要删除的习惯数据（用于同步）
        const habitToDelete = habits.find(h => h.id === habitId);
        
        habits = habits.filter(h => h.id !== habitId);
        saveHabitsToStorage();
        
        // 添加删除操作到 outbox 同步队列
        if (window.outboxSystem && habitToDelete) {
            try {
                window.outboxSystem.addMutation('delete', 'habit', habitId, habitToDelete);
            } catch (error) {
                console.error('[Outbox] 添加删除习惯变更失败:', error);
            }
        }
        
        renderHabits();
        updateWeeklySummary();
    }
}

// 切换打卡状态
function toggleCheckmark(habitId, dateStr) {
    console.log(`切换习惯 ${habitId} 在日期 ${dateStr} 的打卡状态`);
    
    const habit = habits.find(h => h.id === habitId);
    if (!habit) {
        console.error(`未找到ID为 ${habitId} 的习惯`);
        return;
    }
    
    // 确保checkmarks对象存在
    if (!habit.checkmarks) {
        habit.checkmarks = {};
    }
    
    // 获取当前周的完成情况（切换前）
    const oldCompletedDays = calculateCompletedDays(habit, currentWeekStart);
    
    // 直接使用日期字符串而不是日期对象
    if (habit.checkmarks[dateStr]) {
        delete habit.checkmarks[dateStr];
        console.log(`取消打卡: ${dateStr}`);
    } else {
        habit.checkmarks[dateStr] = true;
        console.log(`完成打卡: ${dateStr}`);
    }
    
    // 获取切换后的完成情况
    const newCompletedDays = calculateCompletedDays(habit, currentWeekStart);
    
    // 更新本周记录
    updateWeeklyRecord(habit, currentWeekStart);
    
    // 重新计算历史最高记录
    recalculateWeeklyHighest(habit);
    
    // 计算连续天数
    const streakInfo = calculateStreak(habit);
    console.log(`习惯 ${habit.name} 当前连续天数: ${streakInfo.currentStreak}, 最长连续天数: ${streakInfo.longestStreak}`);
    
    // 如果连续天数达到21天，自动归档习惯
    if (streakInfo.currentStreak >= 21) {
        archiveHabit(habit, streakInfo);
        return; // 已归档，不需要继续更新
    }
    
    // 确保保存到localStorage
    saveHabitsToStorage();
    
    // 添加打卡变更到 outbox 同步队列
    if (window.outboxSystem) {
        try {
            window.outboxSystem.addMutation('update', 'habit', habitId, habit);
        } catch (error) {
            console.error('[Outbox] 添加打卡变更失败:', error);
        }
    }
    
    // 重新渲染UI
    renderHabits();
    updateWeeklySummary();
}

// 计算某周内完成的天数
function calculateCompletedDays(habit, weekStart) {
    let completedDays = 0;
    const weekEnd = getWeekEnd(weekStart);
    
    // 遍历周的每一天
    for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
        const dateStr = formatDate(d);
        if (habit.checkmarks && habit.checkmarks[dateStr]) {
            completedDays++;
        }
    }
    
    return completedDays;
}

// 更新周记录
function updateWeeklyRecord(habit, weekStart) {
    const weekKey = getWeekKey(weekStart);
    const completedDays = calculateCompletedDays(habit, weekStart);
    
    // 确保weeklyRecords对象存在
    if (!habit.weeklyRecords) {
        habit.weeklyRecords = {};
    }
    
    // 更新本周记录
    habit.weeklyRecords[weekKey] = completedDays;
}

// 重新计算习惯的历史最高完成次数
function recalculateWeeklyHighest(habit) {
    console.log(`重新计算习惯 ${habit.name} 的历史最高完成次数`);
    
    // 如果没有周记录，则最高记录为0
    if (!habit.weeklyRecords || Object.keys(habit.weeklyRecords).length === 0) {
        habit.weeklyHighest = 0;
        habit.weeklyTarget = 1; // 如果没有记录，目标设为默认值1
        return;
    }
    
    // 获取所有周记录的完成次数
    const completedCounts = Object.values(habit.weeklyRecords);
    
    // 找出历史最高记录
    let highestCount = Math.max(...completedCounts);
    
    // 更新历史最高记录
    habit.weeklyHighest = highestCount;
    
    // 直接更新周目标为历史最高记录
    habit.weeklyTarget = Math.max(1, highestCount); // 确保目标至少为1
    
    console.log(`习惯 ${habit.name} 的历史最高完成次数更新为 ${highestCount}，目标更新为 ${habit.weeklyTarget}`);
}

// 计算习惯的周评分
function calculateWeekScore(habit, weekStart) {
    const completedDays = calculateCompletedDays(habit, weekStart);
    
    // 根据完成天数计算评分
    let score;
    switch (completedDays) {
        case 0: score = 'F'; break;
        case 1: score = 'D'; break;
        case 2: score = 'C-'; break;
        case 3: score = 'C'; break;
        case 4: score = 'B-'; break;
        case 5: score = 'B'; break;
        case 6: score = 'A-'; break;
        case 7: score = 'A+'; break;
        default: score = 'N/A';
    }
    
    return {
        score,
        completedDays,
        numericScore: completedDays // 用于计算平均分
    };
}

// 获取周的唯一标识符 (YYYY-WW 格式)
function getWeekKey(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    
    // 计算是一年中的第几周
    const startOfYear = new Date(year, 0, 1);
    const weekNumber = Math.ceil(((d - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
    
    return `${year}-${String(weekNumber).padStart(2, '0')}`;
}

// 更新周目标
function updateWeeklyTarget(habit, newTarget) {
    // 如果没有目标字段，初始化它
    if (typeof habit.weeklyTarget === 'undefined') {
        habit.weeklyTarget = 1;
    }
    
    // 直接设置新目标，不再保持不低于当前目标的限制
    // 这样当历史最高记录减少时，目标也会相应减少
    habit.weeklyTarget = Math.max(1, newTarget); // 确保目标至少为1
    
    console.log(`习惯 ${habit.name} 的目标更新为 ${habit.weeklyTarget}`);
    
    // 保存更改
    saveHabitsToStorage();
}

// 渲染习惯列表
function renderHabits() {
    console.log('渲染习惯列表');
    if (!habitsList) {
        console.error('未找到习惯列表DOM元素');
        return;
    }
    
    habitsList.innerHTML = '';
    
    if (habits.length === 0) {
        habitsList.innerHTML = `
            <div class="empty-state" style="padding: 40px; text-align: center; color: var(--dark-gray);">
                <p>还没有添加任何习惯</p>
                <p>点击"添加习惯"按钮开始记录你的好习惯</p>
            </div>
        `;
        return;
    }
    
    habits.forEach(habit => {
        const habitRow = document.createElement('div');
        habitRow.className = 'habit-row';
        
        // 习惯名称
        const nameCell = document.createElement('div');
        nameCell.className = 'habit-title';
        nameCell.innerHTML = `
            <span class="habit-color" style="background-color: ${habit.color}"></span>
            <span>${habit.name}</span>
        `;
        habitRow.appendChild(nameCell);
        
        // 周一到周日的打卡格子
        const weekEnd = getWeekEnd(currentWeekStart);
        
        // 使用数组存储日期，避免循环中的引用问题
        const weekDates = [];
        for (let d = new Date(currentWeekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
            weekDates.push(formatDate(new Date(d)));
        }
        
        // 使用日期数组创建打卡格子
        weekDates.forEach(dateStr => {
            const isChecked = habit.checkmarks && habit.checkmarks[dateStr] === true;
            
            const checkCell = document.createElement('div');
            const checkmarkDiv = document.createElement('div');
            checkmarkDiv.className = `checkmark ${isChecked ? 'checked' : ''}`;
            checkmarkDiv.innerHTML = isChecked ? '✓' : '';
            
            // 使用闭包捕获当前日期字符串
            checkmarkDiv.addEventListener('click', function() {
                toggleCheckmark(habit.id, dateStr);
            });
            
            checkCell.appendChild(checkmarkDiv);
            habitRow.appendChild(checkCell);
        });
        
        // 周目标
        const scoreInfo = calculateWeekScore(habit, currentWeekStart);
        const targetCell = document.createElement('div');
        targetCell.className = 'habit-target';
        
        const targetDiv = document.createElement('div');
        targetDiv.className = 'target-badge';
        
        const targetValue = document.createElement('div');
        targetValue.className = 'target-value';
        targetValue.textContent = `${scoreInfo.completedDays}/${habit.weeklyTarget || 1}`;
        
        const targetLabel = document.createElement('div');
        targetLabel.className = 'target-label';
        targetLabel.textContent = '本周目标';
        
        // 进度条
        const progressBar = document.createElement('div');
        progressBar.className = 'target-progress-bar';
        
        const progressFill = document.createElement('div');
        progressFill.className = `target-progress-fill ${scoreInfo.completedDays >= (habit.weeklyTarget || 1) ? 'completed' : ''}`;
        progressFill.style.width = `${Math.min(100, (scoreInfo.completedDays / (habit.weeklyTarget || 1)) * 100)}%`;
        
        progressBar.appendChild(progressFill);
        
        targetDiv.appendChild(targetValue);
        targetDiv.appendChild(targetLabel);
        targetDiv.appendChild(progressBar);
        targetCell.appendChild(targetDiv);
        
        habitRow.appendChild(targetCell);
        
        // 操作按钮
        const actionsCell = document.createElement('div');
        actionsCell.className = 'habit-actions';
        
        const editButton = document.createElement('button');
        editButton.className = 'action-button edit-button';
        editButton.title = '编辑';
        editButton.textContent = '✏️';
        editButton.addEventListener('click', function() {
            openEditHabitModal(habit.id);
        });
        
        const deleteButton = document.createElement('button');
        deleteButton.className = 'action-button delete-button';
        deleteButton.title = '删除';
        deleteButton.textContent = '🗑️';
        deleteButton.addEventListener('click', function() {
            deleteHabit(habit.id);
        });
        
        actionsCell.appendChild(editButton);
        actionsCell.appendChild(deleteButton);
        habitRow.appendChild(actionsCell);
        
        habitsList.appendChild(habitRow);
    });
}

// 更新周总结
function updateWeeklySummary() {
    console.log('更新周总结');
    const totalHabits = habits.length;
    let totalCheckmarks = 0;
    let totalPossibleCheckmarks = totalHabits * 7;
    let totalScore = 0;
    let totalTargets = 0;
    let achievedTargets = 0;
    
    habits.forEach(habit => {
        const scoreInfo = calculateWeekScore(habit, currentWeekStart);
        totalCheckmarks += scoreInfo.completedDays;
        totalScore += scoreInfo.numericScore;
        
        // 计算目标完成情况
        totalTargets++;
        if (scoreInfo.completedDays >= (habit.weeklyTarget || 1)) {
            achievedTargets++;
        }
    });
    
    const completionRate = totalPossibleCheckmarks > 0 
        ? Math.round((totalCheckmarks / totalPossibleCheckmarks) * 100) 
        : 0;
    
    const targetRate = totalTargets > 0
        ? Math.round((achievedTargets / totalTargets) * 100)
        : 0;
    
    // 更新统计数据
    if (totalHabitsSpan) totalHabitsSpan.textContent = totalHabits;
    if (completedCheckmarksSpan) completedCheckmarksSpan.textContent = totalCheckmarks;
    if (completionRateSpan) completionRateSpan.textContent = `${completionRate}%`;
    
    // 如果有目标完成率显示元素，更新它
    const targetRateSpan = document.getElementById('target-rate');
    if (targetRateSpan) {
        targetRateSpan.textContent = `${targetRate}%`;
    }
    
    // 更新进度条
    const weekProgressFill = document.getElementById('week-progress-fill');
    const weekProgressText = document.getElementById('week-progress-text');
    
    if (weekProgressFill) {
        weekProgressFill.style.width = `${completionRate}%`;
    }
    
    if (weekProgressText) {
        weekProgressText.textContent = `${completionRate}%`;
    }
}

// 生成随机颜色
function getRandomColor() {
    const colors = [
        '#FF3B30', // 红色
        '#FF9500', // 橙色
        '#FFCC00', // 黄色
        '#34C759', // 绿色
        '#5AC8FA', // 浅蓝
        '#007AFF', // 蓝色
        '#5856D6', // 紫色
        '#AF52DE'  // 粉色
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

// 计算习惯的连续打卡天数
function calculateStreak(habit) {
    if (!habit.checkmarks) {
        return { currentStreak: 0, longestStreak: 0 };
    }
    
    // 获取所有打卡日期并排序
    const checkDates = Object.keys(habit.checkmarks)
        .filter(date => habit.checkmarks[date])
        .sort();
    
    if (checkDates.length === 0) {
        return { currentStreak: 0, longestStreak: 0 };
    }
    
    // 计算当前连续天数
    let currentStreak = 1;
    let longestStreak = 1;
    const today = formatDate(new Date());
    const yesterday = formatDate(new Date(Date.now() - 86400000));
    
    // 检查最后一次打卡是否是今天或昨天
    const lastCheckDate = checkDates[checkDates.length - 1];
    if (lastCheckDate !== today && lastCheckDate !== yesterday) {
        // 如果最后一次打卡不是今天或昨天，当前连续天数为0
        return { currentStreak: 0, longestStreak: calculateLongestStreak(checkDates) };
    }
    
    // 从最后一次打卡开始向前计算连续天数
    for (let i = checkDates.length - 1; i > 0; i--) {
        const currentDate = new Date(checkDates[i]);
        const prevDate = new Date(checkDates[i - 1]);
        
        // 计算日期差
        const diffTime = currentDate - prevDate;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
            // 连续打卡
            currentStreak++;
        } else {
            // 连续中断
            break;
        }
    }
    
    // 计算历史最长连续天数
    longestStreak = Math.max(currentStreak, calculateLongestStreak(checkDates));
    
    return { currentStreak, longestStreak };
}

// 计算历史最长连续打卡天数
function calculateLongestStreak(checkDates) {
    let longestStreak = 1;
    let currentStreak = 1;
    
    for (let i = 1; i < checkDates.length; i++) {
        const currentDate = new Date(checkDates[i]);
        const prevDate = new Date(checkDates[i - 1]);
        
        // 计算日期差
        const diffTime = currentDate - prevDate;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
            // 连续打卡
            currentStreak++;
            longestStreak = Math.max(longestStreak, currentStreak);
        } else {
            // 连续中断
            currentStreak = 1;
        }
    }
    
    return longestStreak;
}

// 归档习惯
function archiveHabit(habit, streakInfo) {
    console.log(`归档习惯: ${habit.name}, 连续完成天数: ${streakInfo.currentStreak}`);
    
    // 创建归档记录
    const archivedHabit = {
        id: habit.id,
        name: habit.name,
        description: habit.description,
        color: habit.color,
        archivedDate: formatDate(new Date()),
        streak: streakInfo.currentStreak,
        longestStreak: streakInfo.longestStreak
    };
    
    // 添加到归档列表
    archivedHabits.push(archivedHabit);
    
    // 从活跃习惯列表中移除
    habits = habits.filter(h => h.id !== habit.id);
    
    // 保存到localStorage
    saveHabitsToStorage();
    saveArchivedHabitsToStorage();
    
    // 添加归档变更到 outbox 同步队列
    if (window.outboxSystem) {
        try {
            // 删除原习惯
            window.outboxSystem.addMutation('delete', 'habit', habit.id, habit);
            // 创建归档习惯
            window.outboxSystem.addMutation('create', 'archived_habit', archivedHabit.id, archivedHabit);
        } catch (error) {
            console.error('[Outbox] 添加归档变更失败:', error);
        }
    }
    
    // 显示祝贺消息
    showArchiveNotification(archivedHabit);
    
    // 更新UI
    renderHabits();
    renderArchivedHabits();
    updateWeeklySummary();
    updateArchivedCount();
}

// 显示习惯归档通知
function showArchiveNotification(archivedHabit) {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = 'archive-notification';
    notification.innerHTML = `
        <div class="notification-content">
            <h3>🎉 恭喜你！</h3>
            <p>你已经连续 <strong>${archivedHabit.streak}</strong> 天完成了 <strong>${archivedHabit.name}</strong> 习惯！</p>
            <p>这个习惯已经成功养成并归档。继续保持！</p>
            <button class="close-notification">知道了</button>
        </div>
    `;
    
    // 添加到页面
    document.body.appendChild(notification);
    
    // 添加关闭按钮事件
    const closeButton = notification.querySelector('.close-notification');
    closeButton.addEventListener('click', function() {
        document.body.removeChild(notification);
    });
    
    // 5秒后自动关闭
    setTimeout(() => {
        if (document.body.contains(notification)) {
            document.body.removeChild(notification);
        }
    }, 5000);
}

// 切换标签页
function switchTab(tabId) {
    // 移除所有标签的active类
    navTabs.forEach(tab => {
        tab.classList.remove('active');
    });
    
    // 移除所有内容的active类
    tabContents.forEach(content => {
        content.classList.remove('active');
    });
    
    // 添加active类到选中的标签和内容
    document.querySelector(`.nav-tab[data-tab="${tabId}"]`).classList.add('active');
    document.getElementById(`${tabId}-page`).classList.add('active');
}

// 更新归档习惯数量
function updateArchivedCount() {
    if (archivedCountSpan) {
        archivedCountSpan.textContent = archivedHabits.length;
    }
}

// 渲染已归档习惯
function renderArchivedHabits() {
    if (!archivedHabitsGrid) return;
    
    archivedHabitsGrid.innerHTML = '';
    
    if (archivedHabits.length === 0) {
        if (emptyArchivedDiv) {
            emptyArchivedDiv.style.display = 'block';
        }
        return;
    }
    
    if (emptyArchivedDiv) {
        emptyArchivedDiv.style.display = 'none';
    }
    
    archivedHabits.forEach(habit => {
        const card = document.createElement('div');
        card.className = 'archived-card';
        
        // 卡片头部
        const header = document.createElement('div');
        header.className = 'archived-card-header';
        
        const title = document.createElement('div');
        title.className = 'archived-card-title';
        
        const colorSpan = document.createElement('span');
        colorSpan.className = 'archived-color';
        colorSpan.style.backgroundColor = habit.color;
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'archived-name';
        nameSpan.textContent = habit.name;
        
        title.appendChild(colorSpan);
        title.appendChild(nameSpan);
        
        const dateSpan = document.createElement('span');
        dateSpan.className = 'archived-date';
        dateSpan.textContent = `归档于 ${habit.archivedDate}`;
        
        header.appendChild(title);
        header.appendChild(dateSpan);
        
        // 卡片内容
        const body = document.createElement('div');
        body.className = 'archived-card-body';
        
        if (habit.description) {
            const description = document.createElement('div');
            description.className = 'archived-description';
            description.textContent = habit.description;
            body.appendChild(description);
        }
        
        const stats = document.createElement('div');
        stats.className = 'archived-stats';
        
        const streakStat = document.createElement('div');
        streakStat.className = 'archived-stat';
        
        const streakValue = document.createElement('div');
        streakValue.className = 'archived-stat-value';
        streakValue.textContent = habit.streak;
        
        const streakLabel = document.createElement('div');
        streakLabel.className = 'archived-stat-label';
        streakLabel.textContent = '连续天数';
        
        streakStat.appendChild(streakValue);
        streakStat.appendChild(streakLabel);
        
        const longestStreakStat = document.createElement('div');
        longestStreakStat.className = 'archived-stat';
        
        const longestStreakValue = document.createElement('div');
        longestStreakValue.className = 'archived-stat-value';
        longestStreakValue.textContent = habit.longestStreak || habit.streak;
        
        const longestStreakLabel = document.createElement('div');
        longestStreakLabel.className = 'archived-stat-label';
        longestStreakLabel.textContent = '最长连续';
        
        longestStreakStat.appendChild(longestStreakValue);
        longestStreakStat.appendChild(longestStreakLabel);
        
        stats.appendChild(streakStat);
        stats.appendChild(longestStreakStat);
        
        body.appendChild(stats);
        
        // 卡片操作
        const actions = document.createElement('div');
        actions.className = 'archived-card-actions';
        
        const restoreButton = document.createElement('button');
        restoreButton.className = 'archived-button restore-button';
        restoreButton.textContent = '恢复习惯';
        restoreButton.addEventListener('click', () => {
            restoreHabit(habit.id);
        });
        
        const certificateButton = document.createElement('button');
        certificateButton.className = 'archived-button certificate-button';
        certificateButton.textContent = '查看证书';
        certificateButton.addEventListener('click', () => {
            showCertificate(habit);
        });
        
        actions.appendChild(restoreButton);
        actions.appendChild(certificateButton);
        
        // 组装卡片
        card.appendChild(header);
        card.appendChild(body);
        card.appendChild(actions);
        
        archivedHabitsGrid.appendChild(card);
    });
}

// 恢复已归档习惯
function restoreHabit(habitId) {
    const habitIndex = archivedHabits.findIndex(h => h.id === habitId);
    if (habitIndex === -1) return;
    
    const habit = archivedHabits[habitIndex];
    
    // 创建新的活跃习惯
    const restoredHabit = {
        id: Date.now().toString(), // 生成新ID避免冲突
        name: habit.name,
        description: habit.description,
        color: habit.color,
        checkmarks: {}, // 重置打卡记录
        weeklyHighest: 0,
        weeklyTarget: 1,
        weeklyRecords: {}
    };
    
    // 添加到活跃习惯列表
    habits.push(restoredHabit);
    
    // 从归档列表中移除
    archivedHabits.splice(habitIndex, 1);
    
    // 保存到localStorage
    saveHabitsToStorage();
    saveArchivedHabitsToStorage();
    
    // 添加恢复习惯变更到 outbox 同步队列
    if (window.outboxSystem) {
        try {
            // 删除归档习惯
            window.outboxSystem.addMutation('delete', 'archived_habit', habitId, habit);
            // 创建新的活跃习惯
            window.outboxSystem.addMutation('create', 'habit', restoredHabit.id, restoredHabit);
        } catch (error) {
            console.error('[Outbox] 添加恢复习惯变更失败:', error);
        }
    }
    
    // 更新UI
    renderHabits();
    renderArchivedHabits();
    updateWeeklySummary();
    updateArchivedCount();
    
    // 显示成功消息
    alert(`习惯"${habit.name}"已成功恢复！`);
}

// 显示习惯证书
function showCertificate(habit) {
    if (!certificateContainer || !certificateModal) return;
    
    // 创建证书HTML
    const certificateHTML = `
        <div class="certificate">
            <div class="certificate-border"></div>
            <div class="certificate-content">
                <div class="certificate-title">习惯养成证书</div>
                <div class="certificate-subtitle">特此证明</div>
                <div class="certificate-name">${habit.name}</div>
                <div class="certificate-text">
                    已经成功养成，连续坚持了 <strong>${habit.streak}</strong> 天，
                    <br>展现了非凡的毅力和自律精神。
                </div>
                <div class="certificate-streak">🏆 ${habit.streak} 天连续打卡 🏆</div>
                <div class="certificate-date">归档日期：${habit.archivedDate}</div>
                <div class="certificate-signature">习惯打卡</div>
                <div class="certificate-app-name">习惯打卡应用</div>
            </div>
            <div class="certificate-seal">✓</div>
        </div>
    `;
    
    certificateContainer.innerHTML = certificateHTML;
    certificateModal.style.display = 'flex';
    
    // 保存当前习惯ID用于下载
    downloadCertificateBtn.setAttribute('data-habit-id', habit.id);
}

// 关闭证书模态框
function closeCertificateModal() {
    if (certificateModal) {
        certificateModal.style.display = 'none';
    }
}

// 下载证书
function downloadCertificate() {
    const habitId = downloadCertificateBtn.getAttribute('data-habit-id');
    const habit = archivedHabits.find(h => h.id === habitId);
    
    if (!habit || !certificateContainer) return;
    
    // 使用html2canvas库将证书转换为图片
    html2canvas(certificateContainer.querySelector('.certificate')).then(canvas => {
        // 创建下载链接
        const link = document.createElement('a');
        link.download = `${habit.name}-习惯养成证书.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
} 