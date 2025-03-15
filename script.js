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

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    loadHabits();
    updateWeekDisplay();
    renderHabits();
    updateWeeklySummary();
    
    // 事件监听器
    addHabitBtn.addEventListener('click', openAddHabitModal);
    habitForm.addEventListener('submit', saveHabit);
    cancelHabitBtn.addEventListener('click', closeModal);
    closeModalBtn.addEventListener('click', closeModal);
    prevWeekBtn.addEventListener('click', goToPrevWeek);
    nextWeekBtn.addEventListener('click', goToNextWeek);
    currentWeekBtn.addEventListener('click', goToCurrentWeek);
    
    // 点击模态框外部关闭
    window.addEventListener('click', (e) => {
        if (e.target === habitModal) {
            closeModal();
        }
    });
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
    const weekEnd = getWeekEnd(currentWeekStart);
    
    // 计算当前是第几周（以年初为基准）
    const startOfYear = new Date(currentWeekStart.getFullYear(), 0, 1);
    const weekNumber = Math.ceil(((currentWeekStart - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
    
    currentWeekSpan.textContent = weekNumber;
    weekStartDateSpan.textContent = formatDate(currentWeekStart);
    weekEndDateSpan.textContent = formatDate(weekEnd);
    
    // 更新导航按钮状态
    const today = new Date();
    const currentWeekStartDate = getWeekStart(today);
    
    if (formatDate(currentWeekStart) === formatDate(currentWeekStartDate)) {
        currentWeekBtn.classList.add('active');
    } else {
        currentWeekBtn.classList.remove('active');
    }
}

// 前往上一周
function goToPrevWeek() {
    const prevWeek = new Date(currentWeekStart);
    prevWeek.setDate(prevWeek.getDate() - 7);
    currentWeekStart = prevWeek;
    updateWeekDisplay();
    renderHabits();
    updateWeeklySummary();
}

// 前往下一周
function goToNextWeek() {
    const nextWeek = new Date(currentWeekStart);
    nextWeek.setDate(nextWeek.getDate() + 7);
    currentWeekStart = nextWeek;
    updateWeekDisplay();
    renderHabits();
    updateWeeklySummary();
}

// 前往当前周
function goToCurrentWeek() {
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
    modalTitle.textContent = '添加新习惯';
    habitForm.reset();
    document.getElementById('habit-color').value = getRandomColor();
    editingHabitId = null;
    habitModal.style.display = 'flex';
}

// 打开编辑习惯模态框
function openEditHabitModal(habitId) {
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
    habitModal.style.display = 'none';
    habitForm.reset();
}

// 保存习惯
function saveHabit(e) {
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
            checkmarks: {} // 存储打卡记录，格式: { 'YYYY-MM-DD': true }
        };
        habits.push(newHabit);
    }
    
    saveHabitsToStorage();
    renderHabits();
    updateWeeklySummary();
    closeModal();
}

// 删除习惯
function deleteHabit(habitId) {
    if (confirm('确定要删除这个习惯吗？所有相关的打卡记录都将被删除。')) {
        habits = habits.filter(h => h.id !== habitId);
        saveHabitsToStorage();
        renderHabits();
        updateWeeklySummary();
    }
}

// 切换打卡状态
function toggleCheckmark(habitId, dateStr) {
    console.log(`切换习惯 ${habitId} 在日期 ${dateStr} 的打卡状态`); // 添加调试日志
    
    const habit = habits.find(h => h.id === habitId);
    if (!habit) {
        console.error(`未找到ID为 ${habitId} 的习惯`);
        return;
    }
    
    // 直接使用日期字符串而不是日期对象
    if (habit.checkmarks[dateStr]) {
        delete habit.checkmarks[dateStr];
        console.log(`取消打卡: ${dateStr}`);
    } else {
        habit.checkmarks[dateStr] = true;
        console.log(`完成打卡: ${dateStr}`);
    }
    
    // 确保保存到localStorage
    saveHabitsToStorage();
    
    // 重新渲染UI
    renderHabits();
    updateWeeklySummary();
}

// 计算习惯的周评分
function calculateWeekScore(habit, weekStart) {
    let completedDays = 0;
    const weekEnd = getWeekEnd(weekStart);
    
    // 遍历周的每一天
    for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
        const dateStr = formatDate(d);
        if (habit.checkmarks[dateStr]) {
            completedDays++;
        }
    }
    
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

// 渲染习惯列表
function renderHabits() {
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
            checkmarkDiv.onclick = function() {
                toggleCheckmark(habit.id, dateStr);
            };
            
            checkCell.appendChild(checkmarkDiv);
            habitRow.appendChild(checkCell);
        });
        
        // 评分
        const scoreInfo = calculateWeekScore(habit, currentWeekStart);
        const scoreCell = document.createElement('div');
        scoreCell.className = 'habit-score';
        scoreCell.textContent = scoreInfo.score;
        habitRow.appendChild(scoreCell);
        
        // 操作按钮
        const actionsCell = document.createElement('div');
        actionsCell.className = 'habit-actions';
        
        const editButton = document.createElement('button');
        editButton.className = 'action-button edit-button';
        editButton.title = '编辑';
        editButton.textContent = '✏️';
        editButton.onclick = function() {
            openEditHabitModal(habit.id);
        };
        
        const deleteButton = document.createElement('button');
        deleteButton.className = 'action-button delete-button';
        deleteButton.title = '删除';
        deleteButton.textContent = '🗑️';
        deleteButton.onclick = function() {
            deleteHabit(habit.id);
        };
        
        actionsCell.appendChild(editButton);
        actionsCell.appendChild(deleteButton);
        habitRow.appendChild(actionsCell);
        
        habitsList.appendChild(habitRow);
    });
}

// 更新周总结
function updateWeeklySummary() {
    const totalHabits = habits.length;
    let totalCheckmarks = 0;
    let totalPossibleCheckmarks = totalHabits * 7;
    let totalScore = 0;
    
    habits.forEach(habit => {
        const scoreInfo = calculateWeekScore(habit, currentWeekStart);
        totalCheckmarks += scoreInfo.completedDays;
        totalScore += scoreInfo.numericScore;
    });
    
    const completionRate = totalPossibleCheckmarks > 0 
        ? Math.round((totalCheckmarks / totalPossibleCheckmarks) * 100) 
        : 0;
    
    const averageScore = totalHabits > 0 
        ? (totalScore / totalHabits).toFixed(1) 
        : 0;
    
    // 更新统计数据
    totalHabitsSpan.textContent = totalHabits;
    completedCheckmarksSpan.textContent = totalCheckmarks;
    completionRateSpan.textContent = `${completionRate}%`;
    averageScoreSpan.textContent = averageScore;
    
    // 如果有图表库，这里可以绘制图表
    // 简单起见，这里不实现图表功能
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