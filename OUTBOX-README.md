# HabitTrack Outbox 离线优先同步系统

## 🚀 系统概述

我们已经为 HabitTrack 应用实现了完整的 **Outbox Pattern** 离线优先同步系统，解决了网络不稳定导致的数据同步问题。

### 核心特性

✅ **离线优先**: 所有操作立即在本地生效，UI 响应更快  
✅ **幂等同步**: 使用 mutation_id 确保重复提交不出错  
✅ **指数退避重试**: 网络失败时智能重试，避免服务器过载  
✅ **多触发点**: 网络恢复、页面切换、定时器等多种同步触发  
✅ **冲突解决**: 基于时间戳的 Last Write Wins 策略  
✅ **Service Worker**: 可选的后台同步支持  
✅ **监控面板**: 实时查看同步状态和队列

## 📁 文件结构

```
HabitTrack/
├── outbox-system.js      # 核心 Outbox 系统
├── outbox-monitor.js     # 监控面板 UI
├── service-worker.js     # Service Worker (可选)
├── test-outbox.html      # 测试页面
├── supabase-setup.sql    # 数据库 RPC 函数
├── index.html            # 主应用 (已修改)
└── script.js             # 业务逻辑 (已修改)
```

## 🔧 部署步骤

### 1. Supabase 数据库设置

在 Supabase SQL Editor 中执行 `supabase-setup.sql`：

```sql
-- 创建表结构
CREATE TABLE habits (...);
CREATE TABLE archived_habits (...);  
CREATE TABLE sync_mutations (...);

-- 创建 RPC 函数
CREATE FUNCTION upsert_habit_mutation(...);
CREATE FUNCTION delete_habit_mutation(...);
-- ... 更多函数
```

### 2. 文件部署

将所有 JavaScript 文件放到 Web 服务器根目录：

```bash
# 确保文件顺序正确
index.html          # 引用顺序：
├── outbox-system.js     # 1. 核心系统
├── outbox-monitor.js    # 2. 监控面板  
└── script.js            # 3. 业务逻辑
```

### 3. 验证部署

1. 打开 `test-outbox.html` 进行功能测试
2. 按 `Ctrl+O` 打开 Outbox 监控面板
3. 创建测试习惯，观察同步状态

## 🎮 使用方法

### 基本操作

```javascript
// 系统自动处理，无需手动调用
// 例如：创建习惯时会自动添加到 outbox
await saveHabit(); // 原有函数，已集成 outbox
```

### 监控面板快捷键

- `Ctrl+O`: 打开/关闭监控面板
- `Escape`: 关闭面板

### 监控面板功能

- **统计信息**: 总计/待发送/失败/已交付 变更数量
- **立即同步**: 手动触发同步
- **查看队列**: 显示详细的同步队列
- **清理已交付**: 删除已完成的同步记录

## 🔍 测试功能

使用 `test-outbox.html` 进行全面测试：

### 基础测试
- 创建/编辑/删除习惯
- 批量操作测试
- 网络中断模拟

### 压力测试
- 100 个并发操作
- 性能基准测试
- 错误恢复测试

### 快捷键测试
- `Ctrl+H`: 创建测试习惯
- `Ctrl+S`: 强制同步
- `Ctrl+L`: 清空日志

## 📊 工作原理

### 1. 数据流

```
用户操作 → localStorage (立即) → Outbox 队列 → Supabase (异步)
```

### 2. Outbox 表结构

```javascript
{
  mutation_id: 123,        // 单调递增 ID
  timestamp: 1640000000,   // 时间戳
  operation: 'create',     // 操作类型
  entity_type: 'habit',    // 实体类型
  entity_id: 'habit-123',  // 实体 ID
  payload: {...},          // 数据载荷
  status: 'pending',       // 状态
  retry_count: 0,          // 重试次数
  next_retry: 1640000000   // 下次重试时间
}
```

### 3. 同步触发条件

- 数据变更时立即触发
- 网络从离线恢复时
- 页面获得焦点时
- 页面从隐藏变为可见时
- 定时检查（30 秒间隔）
- Service Worker 后台同步

### 4. 重试策略

```javascript
// 指数退避：2^retry_count * 1000ms，最大 5 分钟
retryDelay = Math.min(Math.pow(2, retryCount) * 1000, 300000)
```

## 🛠 配置选项

### Outbox 系统配置

```javascript
// 在 outbox-system.js 中修改
constructor() {
    this.dbName = 'HabitTrackOutbox';    // IndexedDB 数据库名
    this.version = 1;                     // 数据库版本
    // ... 其他配置
}
```

### 同步间隔配置

```javascript
// 定期检查间隔（毫秒）
setInterval(() => this.triggerSync(), 30000); // 30 秒
```

## 🐛 故障排除

### 常见问题

1. **IndexedDB 不可用**
   - 检查浏览器是否支持 IndexedDB
   - 确认是否在 HTTPS 环境下运行

2. **Supabase RPC 调用失败**
   - 验证 RPC 函数是否正确部署
   - 检查 Supabase 连接配置
   - 确认用户认证状态

3. **同步队列卡住**
   - 打开监控面板查看具体错误
   - 使用 "立即同步" 手动触发
   - 检查网络连接状态

### 调试工具

```javascript
// 控制台调试
console.log(await window.outboxSystem.getStats());
console.log(await window.outboxSystem.getPendingMutations());

// 打开监控面板
window.outboxMonitor.show();
```

## 📈 性能优化

### 建议配置

- **批量大小**: 每次同步最多处理 10 条记录
- **清理频率**: 7 天清理一次已交付记录
- **重试上限**: 最大 5 分钟退避间隔

### 监控指标

通过监控面板观察：
- 待同步队列长度（建议 < 50）
- 失败率（建议 < 5%）
- 平均同步延迟（建议 < 10 秒）

## 🔄 升级路径

### 现有数据迁移

现有的 localStorage 数据会自动保留，新系统向后兼容。

### 渐进式启用

可以通过配置开关控制是否启用 Outbox 系统：

```javascript
if (window.outboxSystem && enableOutbox) {
    window.outboxSystem.addMutation(...)
}
```

## 📚 扩展功能

### 冲突解决策略

目前实现了简单的 LWW (Last Write Wins)，可扩展为：
- 字段级合并
- 用户选择解决
- 基于业务规则的自动解决

### Service Worker 增强

- 后台同步注册
- 离线页面缓存
- 推送通知支持

## 🎯 总结

新的 Outbox 同步系统为 HabitTrack 提供了：

1. **更好的用户体验**: 操作立即生效，无需等待网络
2. **更高的可靠性**: 网络问题不会丢失数据
3. **更强的容错性**: 自动重试和错误恢复
4. **更好的可观测性**: 实时监控和调试工具

系统已经完全集成到现有应用中，用户无感知升级。通过监控面板可以实时查看同步状态，确保数据安全可靠地同步到云端。