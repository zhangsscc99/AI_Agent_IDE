# 调试追踪系统使用指南

## 📋 概述

调试追踪系统记录 Agent 执行的每一步，帮助你：

- 🔍 理解 Agent 的决策过程
- ⏱️ 分析性能瓶颈
- 🐛 快速定位问题
- 📊 统计资源使用（Token、API 调用等）

## 🚀 快速开始

### 1. 启用调试追踪

在创建 Agent 时启用调试：

```typescript
const executor = new AgentExecutor({
  sessionId: 'session-123',
  workspacePath: './workspace',
  llmClient: llmClient,
  enableDebug: true  // 启用调试追踪
});
```

### 2. 查看调试数据

通过 API 获取调试数据：

```typescript
// 获取特定会话的追踪数据
const response = await fetch('/api/debug/trace?sessionId=session-123');
const { session } = await response.json();

console.log('会话摘要:', session.summary);
console.log('事件列表:', session.events);
```

### 3. 使用调试面板

在 React 应用中使用 `DebugPanel` 组件：

```tsx
import { DebugPanel } from '@/components/DebugPanel';

function MyComponent() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    // 获取调试数据
    fetch('/api/debug/trace?sessionId=xxx')
      .then(res => res.json())
      .then(data => setSession(data.session));
  }, []);

  return <DebugPanel session={session} />;
}
```

## 📊 追踪事件类型

### agent_start
Agent 开始执行

```json
{
  "type": "agent_start",
  "timestamp": 1702345678901,
  "data": {
    "sessionId": "session-123"
  }
}
```

### agent_end
Agent 执行完成

```json
{
  "type": "agent_end",
  "timestamp": 1702345680123,
  "duration": 1222,
  "data": {
    "sessionId": "session-123",
    "summary": {
      "totalDuration": 1222,
      "llmCalls": 3,
      "toolCalls": 5,
      "tokensUsed": {
        "prompt": 450,
        "completion": 320,
        "total": 770
      }
    }
  }
}
```

### llm_call
调用 LLM

```json
{
  "type": "llm_call",
  "timestamp": 1702345679000,
  "data": {
    "model": "glm-4-flash",
    "messages": [
      {
        "role": "user",
        "content": "创建一个新文件..."
      }
    ],
    "tools": 6,
    "temperature": 0.7
  }
}
```

### llm_response
LLM 响应

```json
{
  "type": "llm_response",
  "timestamp": 1702345679500,
  "duration": 500,
  "data": {
    "response": "我会帮你创建文件...",
    "tokensUsed": {
      "prompt": 150,
      "completion": 100,
      "total": 250
    }
  }
}
```

### tool_call
调用工具

```json
{
  "type": "tool_call",
  "timestamp": 1702345679600,
  "data": {
    "toolName": "write_file",
    "arguments": {
      "path": "hello.py",
      "content": "print('Hello')"
    }
  }
}
```

### tool_result
工具执行结果

```json
{
  "type": "tool_result",
  "timestamp": 1702345679650,
  "duration": 50,
  "data": {
    "result": {
      "success": true,
      "path": "hello.py"
    }
  }
}
```

### thinking
Agent 思考过程

```json
{
  "type": "thinking",
  "timestamp": 1702345679700,
  "data": {
    "thought": "我需要先读取现有文件，然后进行修改..."
  }
}
```

### decision
Agent 决策

```json
{
  "type": "decision",
  "timestamp": 1702345679750,
  "data": {
    "decision": "使用 write_file 工具创建文件",
    "reasoning": "用户请求创建新文件，且目标路径不存在"
  }
}
```

### error
错误事件

```json
{
  "type": "error",
  "timestamp": 1702345679800,
  "data": {
    "message": "File not found: test.py",
    "stack": "Error: File not found..."
  }
}
```

## 📈 会话摘要

每个会话结束后会生成摘要：

```typescript
interface TraceSummary {
  totalDuration: number;      // 总耗时（毫秒）
  llmCalls: number;           // LLM 调用次数
  toolCalls: number;          // 工具调用次数
  errors: number;             // 错误次数
  tokensUsed: {
    prompt: number;           // Prompt tokens
    completion: number;       // Completion tokens
    total: number;            // 总 tokens
  };
  toolStats: {
    [toolName: string]: {
      calls: number;          // 调用次数
      totalDuration: number;  // 总耗时
      avgDuration: number;    // 平均耗时
      errors: number;         // 错误次数
    }
  }
}
```

## 🛠️ API 端点

### GET /api/debug/trace

获取指定会话的追踪数据。

**参数：**
- `sessionId` (query string): 会话 ID

**响应：**
```json
{
  "success": true,
  "session": {
    "id": "session-123",
    "startTime": 1702345678901,
    "endTime": 1702345680123,
    "events": [...],
    "summary": {...}
  }
}
```

### POST /api/debug/trace

执行调试相关操作。

**操作：list_all**

列出所有会话。

```json
{
  "action": "list_all"
}
```

**响应：**
```json
{
  "success": true,
  "sessions": [
    {
      "id": "session-123",
      "startTime": 1702345678901,
      "endTime": 1702345680123,
      "eventsCount": 15,
      "summary": {...}
    }
  ]
}
```

**操作：export**

导出会话数据。

```json
{
  "action": "export",
  "sessionId": "session-123"
}
```

**响应：**
```json
{
  "success": true,
  "data": "{\"id\":\"session-123\", ...}"
}
```

**操作：clear**

清除会话数据。

```json
{
  "action": "clear",
  "sessionId": "session-123"
}
```

## 🎯 使用场景

### 场景 1：性能优化

分析哪些工具调用最耗时：

```typescript
const { toolStats } = session.summary;

// 找出最慢的工具
const slowestTool = Object.entries(toolStats)
  .sort(([, a], [, b]) => b.avgDuration - a.avgDuration)[0];

console.log(`最慢的工具: ${slowestTool[0]}, 平均耗时: ${slowestTool[1].avgDuration}ms`);
```

### 场景 2：Token 使用分析

统计 Token 使用情况：

```typescript
const { tokensUsed } = session.summary;
const cost = tokensUsed.total * 0.00001; // 假设每 1K tokens 成本 $0.01

console.log(`总 tokens: ${tokensUsed.total}`);
console.log(`预估成本: $${cost.toFixed(4)}`);
```

### 场景 3：错误追踪

找出所有错误事件：

```typescript
const errors = session.events.filter(e => e.type === 'error');

errors.forEach(error => {
  console.log(`错误时间: ${new Date(error.timestamp).toLocaleString()}`);
  console.log(`错误信息: ${error.data.message}`);
});
```

### 场景 4：决策分析

了解 Agent 的决策过程：

```typescript
const decisions = session.events.filter(e => e.type === 'decision');

decisions.forEach(decision => {
  console.log(`决策: ${decision.data.decision}`);
  console.log(`理由: ${decision.data.reasoning}`);
});
```

## 📊 可视化工具

### DebugPanel 组件

完整的调试面板，包含：

- 📋 事件时间线
- 📈 会话摘要统计
- 🔍 事件过滤
- 📝 详细事件查看

```tsx
<DebugPanel
  session={session}
  onClose={() => setShowDebug(false)}
/>
```

### 自定义可视化

基于追踪数据创建自定义可视化：

```tsx
function TokenUsageChart({ session }) {
  const data = session.events
    .filter(e => e.type === 'llm_response')
    .map(e => ({
      time: e.timestamp,
      tokens: e.data.tokensUsed?.total || 0
    }));

  return <LineChart data={data} />;
}
```

## 💡 最佳实践

### 1. 仅在需要时启用

调试追踪会增加一些开销，生产环境建议禁用：

```typescript
const enableDebug = process.env.NODE_ENV === 'development';
```

### 2. 定期清理旧数据

追踪数据会占用内存，定期清理：

```typescript
// 清理 1 小时前的会话
const oneHourAgo = Date.now() - 3600000;
const oldSessions = debugTracer.getAllSessions()
  .filter(s => s.startTime < oneHourAgo);

oldSessions.forEach(s => debugTracer.clearSession(s.id));
```

### 3. 导出重要会话

保存重要的调试数据：

```typescript
const exportData = debugTracer.exportSession(sessionId);
fs.writeFileSync(
  `debug-${sessionId}.json`,
  exportData,
  'utf-8'
);
```

### 4. 使用过滤器

只关注特定类型的事件：

```typescript
const toolCalls = session.events.filter(e => 
  e.type === 'tool_call' || e.type === 'tool_result'
);
```

## 🔧 高级功能

### 自定义事件

添加自定义追踪事件：

```typescript
debugTracer.addEvent(
  sessionId,
  'custom_event',
  {
    customData: 'value',
    importance: 'high'
  },
  { tags: ['custom', 'important'] }
);
```

### 嵌套操作追踪

追踪嵌套的操作：

```typescript
const parentId = debugTracer.startOperation(
  sessionId,
  'complex_task',
  { task: 'parent' }
);

// 子操作
const childId = debugTracer.startOperation(
  sessionId,
  'sub_task',
  { task: 'child' }
);

// 完成子操作
debugTracer.endOperation(sessionId, childId);

// 完成父操作
debugTracer.endOperation(sessionId, parentId);
```

## 📚 更多资源

- [SDD 使用指南](./SDD_GUIDE.md)
- [Agent 工具文档](./AGENT_TOOLS.md)
- [API 参考](./API_REFERENCE.md)

