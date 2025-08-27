// ==================== Outbox 系统验证脚本 ====================
// 在浏览器控制台中运行此脚本来验证 Outbox 系统是否正常工作

(async function verifyOutboxSystem() {
    console.log('🔍 开始验证 HabitTrack Outbox 系统...\n');

    const results = [];

    // 1. 检查系统初始化
    function checkSystemInitialization() {
        console.log('1️⃣ 检查系统初始化...');
        
        const checks = [
            { name: 'OutboxSystem 实例', check: () => !!window.outboxSystem },
            { name: 'OutboxMonitor 实例', check: () => !!window.outboxMonitor },
            { name: 'IndexedDB 支持', check: () => !!window.indexedDB },
            { name: 'Service Worker 支持', check: () => !!navigator.serviceWorker }
        ];

        checks.forEach(({ name, check }) => {
            const passed = check();
            console.log(`   ${passed ? '✅' : '❌'} ${name}: ${passed}`);
            results.push({ test: name, passed });
        });
    }

    // 2. 检查 IndexedDB 连接
    async function checkIndexedDBConnection() {
        console.log('\n2️⃣ 检查 IndexedDB 连接...');
        
        try {
            if (!window.outboxSystem?.db) {
                console.log('   ⏳ 等待 OutboxSystem 初始化...');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            const dbConnected = !!window.outboxSystem?.db;
            console.log(`   ${dbConnected ? '✅' : '❌'} IndexedDB 连接: ${dbConnected}`);
            results.push({ test: 'IndexedDB 连接', passed: dbConnected });

            if (dbConnected) {
                // 检查表结构
                const stores = ['outbox', 'metadata'];
                stores.forEach(storeName => {
                    const hasStore = window.outboxSystem.db.objectStoreNames.contains(storeName);
                    console.log(`   ${hasStore ? '✅' : '❌'} ${storeName} 表: ${hasStore}`);
                    results.push({ test: `${storeName} 表`, passed: hasStore });
                });
            }
        } catch (error) {
            console.log(`   ❌ IndexedDB 检查失败: ${error.message}`);
            results.push({ test: 'IndexedDB 连接', passed: false });
        }
    }

    // 3. 测试基本 CRUD 操作
    async function testBasicOperations() {
        console.log('\n3️⃣ 测试基本操作...');
        
        try {
            // 创建测试变更
            const testHabit = {
                id: 'verify-test-' + Date.now(),
                name: '验证测试习惯',
                description: '用于系统验证的测试习惯',
                color: '#007AFF',
                checkmarks: {},
                weeklyHighest: 0,
                weeklyTarget: 1,
                weeklyRecords: {}
            };

            console.log('   🔄 添加测试变更...');
            const mutationId = await window.outboxSystem.addMutation(
                'create', 'habit', testHabit.id, testHabit
            );

            const addSuccess = typeof mutationId === 'number';
            console.log(`   ${addSuccess ? '✅' : '❌'} 添加变更: ${addSuccess ? 'ID ' + mutationId : '失败'}`);
            results.push({ test: '添加变更', passed: addSuccess });

            if (addSuccess) {
                // 检查变更是否在队列中
                console.log('   🔄 检查变更队列...');
                const mutations = await window.outboxSystem.getPendingMutations(20);
                const foundMutation = mutations.find(m => m.mutation_id === mutationId);

                console.log(`   ${foundMutation ? '✅' : '❌'} 变更在队列中: ${!!foundMutation}`);
                results.push({ test: '变更在队列中', passed: !!foundMutation });
            }

        } catch (error) {
            console.log(`   ❌ 基本操作测试失败: ${error.message}`);
            results.push({ test: '基本操作', passed: false });
        }
    }

    // 4. 检查统计信息
    async function checkStats() {
        console.log('\n4️⃣ 检查统计信息...');
        
        try {
            const stats = await window.outboxSystem.getStats();
            const hasStats = stats && typeof stats.total === 'number';
            
            console.log(`   ${hasStats ? '✅' : '❌'} 统计信息获取: ${hasStats}`);
            results.push({ test: '统计信息', passed: hasStats });

            if (hasStats) {
                console.log(`   📊 总计: ${stats.total}, 待处理: ${stats.pending}, 失败: ${stats.failed}, 已交付: ${stats.delivered}`);
            }
        } catch (error) {
            console.log(`   ❌ 统计信息检查失败: ${error.message}`);
            results.push({ test: '统计信息', passed: false });
        }
    }

    // 5. 检查监控面板
    function checkMonitorPanel() {
        console.log('\n5️⃣ 检查监控面板...');
        
        try {
            const hasMonitor = !!window.outboxMonitor;
            console.log(`   ${hasMonitor ? '✅' : '❌'} 监控面板实例: ${hasMonitor}`);
            results.push({ test: '监控面板实例', passed: hasMonitor });

            if (hasMonitor) {
                const hasTriggerBtn = !!document.getElementById('outbox-trigger');
                console.log(`   ${hasTriggerBtn ? '✅' : '❌'} 浮动触发按钮: ${hasTriggerBtn}`);
                results.push({ test: '浮动触发按钮', passed: hasTriggerBtn });

                console.log('   💡 提示: 按 Ctrl+O 打开监控面板');
            }
        } catch (error) {
            console.log(`   ❌ 监控面板检查失败: ${error.message}`);
            results.push({ test: '监控面板', passed: false });
        }
    }

    // 6. 检查现有业务逻辑集成
    function checkBusinessLogicIntegration() {
        console.log('\n6️⃣ 检查业务逻辑集成...');
        
        const integrationChecks = [
            { name: 'saveHabit 函数存在', check: () => typeof window.saveHabit === 'function' || typeof saveHabit === 'function' },
            { name: 'deleteHabit 函数存在', check: () => typeof window.deleteHabit === 'function' || typeof deleteHabit === 'function' },
            { name: 'toggleCheckmark 函数存在', check: () => typeof window.toggleCheckmark === 'function' || typeof toggleCheckmark === 'function' },
            { name: 'archiveHabit 函数存在', check: () => typeof window.archiveHabit === 'function' || typeof archiveHabit === 'function' }
        ];

        integrationChecks.forEach(({ name, check }) => {
            const passed = check();
            console.log(`   ${passed ? '✅' : '❌'} ${name}: ${passed}`);
            results.push({ test: name, passed });
        });
    }

    // 执行所有检查
    checkSystemInitialization();
    await checkIndexedDBConnection();
    await testBasicOperations();
    await checkStats();
    checkMonitorPanel();
    checkBusinessLogicIntegration();

    // 生成总结报告
    console.log('\n📋 验证报告总结:');
    console.log('=' .repeat(50));
    
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    const successRate = Math.round((passed / total) * 100);

    console.log(`✅ 通过: ${passed}/${total} (${successRate}%)`);
    
    if (successRate >= 80) {
        console.log('🎉 系统验证通过！Outbox 同步系统运行正常。');
    } else if (successRate >= 60) {
        console.log('⚠️  系统部分功能存在问题，建议检查失败的测试项。');
    } else {
        console.log('❌ 系统存在严重问题，需要排查和修复。');
    }

    console.log('\n📝 详细结果:');
    results.forEach(({ test, passed }) => {
        console.log(`  ${passed ? '✅' : '❌'} ${test}`);
    });

    console.log('\n💡 下一步建议:');
    if (successRate >= 80) {
        console.log('  - 可以开始正常使用 HabitTrack 应用');
        console.log('  - 按 Ctrl+O 打开监控面板查看同步状态');
        console.log('  - 尝试创建习惯测试实际同步功能');
    } else {
        console.log('  - 检查浏览器控制台是否有错误信息');
        console.log('  - 确认 IndexedDB 在当前环境下可用');
        console.log('  - 验证 Supabase 配置是否正确');
    }

    console.log('\n🔗 有用链接:');
    console.log('  - 测试页面: /test-outbox.html');
    console.log('  - 文档: /OUTBOX-README.md');
    console.log('  - Supabase 设置: /supabase-setup.sql');

    return { passed, total, successRate, results };
})().catch(error => {
    console.error('❌ 验证脚本执行失败:', error);
});