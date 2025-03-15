// 全局变量
let habits = []; // 存储所有习惯
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

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM加载完成，初始化应用...');
    
    loadHabits();
    updateWeekDisplay();
    renderHabits();
    updateWeeklySummary();
    
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
    
    // 点击模态框外部关闭
    window.addEventListener('click', (e) => {
        if (e.target === habitModal) {
            closeModal();
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
        habits = habits.filter(h => h.id !== habitId);
        saveHabitsToStorage();
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
    
    // 确保保存到localStorage
    saveHabitsToStorage();
    
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