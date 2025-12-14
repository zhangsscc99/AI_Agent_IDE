# 📁 lib/agent 目录详解

这是 **Agent 核心模块**，包含 AI 编程助手的全部后端逻辑。

---

## 📂 文件结构

```
lib/agent/
├── types.ts      # 类型定义（所有接口和类型）
├── llm.ts        # LLM 客户端（调用大模型）
├── tools.ts      # 工具系统（文件操作工具）
├── memory.ts     # 记忆管理（对话和操作历史）
└── executor.ts   # 执行器（核心状态机）
```

---

## 1️⃣ types.ts - 类型定义

**作用：** 定义整个 Agent 系统的所有类型和接口

### 核心类型

#### Task（任务）
```typescript
interface Task {
  id: string;
  sessionId: string;
  role: 'planner' | 'executor' | 'reviewer';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  input: string;
  output?: string;
}
```
**用途：** 定义任务的结构（未来多 Agent 协作时使用）

#### Tool（工具）
```typescript
interface Tool {
  name: string;                    // 工具名称
  description: string;             // 工具描述（给 LLM 看）
  parameters: Record<string, any>; // 参数定义（JSON Schema）
  execute: (params: any) => Promise<any>; // 执行函数
}
```
**用途：** 定义工具的标准接口

#### Memory（记忆）
```typescript
interface Memory {
  id: string;
  sessionId: string;
  type: 'conversation' | 'file_operation' | 'task_result';
  content: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}
```
**用途：** 定义记忆条目的结构

#### Message（消息）
```typescript
interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: ToolCall[];  // LLM 想调用的工具
  tool_call_id?: string;    // 工具调用的 ID
}
```
**用途：** 定义 LLM 对话的消息格式

### 为什么需要这个文件？

✅ **类型安全** - TypeScript 编译时检查  
✅ **代码提示** - IDE 自动补全  
✅ **文档作用** - 一看就知道数据结构  
✅ **统一规范** - 所有模块使用相同的类型  

---

## 2️⃣ llm.ts - LLM 客户端

**作用：** 封装大模型 API 调用，支持多种 LLM 提供商

### 核心功能

#### 1. 多提供商支持

```typescript
export interface LLMConfig {
  provider: 'glm' | 'openai' | 'claude';
  apiKey: string;
  baseUrl?: string;
  model: string;
}
```

**支持的 LLM：**
- ✅ GLM-4.6（智谱 AI）
- ✅ OpenAI GPT-4
- ✅ Anthropic Claude

#### 2. 流式对话

```typescript
async *streamChat(
  messages: Message[],
  tools?: any[],
  temperature = 0.7
): AsyncGenerator<LLMStreamChunk>
```

**特点：**
- ✅ 流式输出（SSE）
- ✅ 支持工具调用（Function Calling）
- ✅ 实时返回 AI 响应

#### 3. 工具调用解析

```typescript
if (delta?.tool_calls) {
  yield {
    delta: '',
    done: false,
    tool_calls: delta.tool_calls,  // ← 解析工具调用
  };
}
```

**作用：** 从 LLM 响应中提取工具调用请求

### 工作流程

```
用户输入
  ↓
LLMClient.streamChat()
  ↓
构建请求（包含 tools）
  ↓
调用 GLM/OpenAI/Claude API
  ↓
流式解析响应
  ↓
返回：文本 + 工具调用
```

### 为什么需要这个文件？

✅ **统一接口** - 不同 LLM 用同一套代码  
✅ **流式支持** - 实时显示 AI 思考过程  
✅ **工具集成** - 自动处理 Function Calling  

---

## 3️⃣ tools.ts - 工具系统

**作用：** 定义 Agent 可以调用的所有工具（文件操作）

### 核心工具

#### 1. read_file（读取文件）

```typescript
export const readFileTool: Tool = {
  name: 'read_file',
  description: 'Read the contents of a file in the workspace',
  parameters: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'The relative path to the file' }
    },
    required: ['path']
  },
  execute: async ({ path: filePath, workspacePath }) => {
    const fullPath = path.join(workspacePath, filePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    return { success: true, content };
  }
};
```

**用途：** AI 读取文件内容

#### 2. write_file（写入文件）

```typescript
export const writeFileTool: Tool = {
  name: 'write_file',
  description: 'MUST use this tool to create or update files...',
  execute: async ({ path: filePath, content, workspacePath }) => {
    // 修复换行符
    const fixedContent = content.replace(/\\r\\n/g, '\r\n');
    await fs.writeFile(fullPath, fixedContent, 'utf-8');
    return { success: true, path: filePath };
  }
};
```

**用途：** AI 创建或修改文件（会触发审批流程）

#### 3. list_files（列出文件）

```typescript
export const listFilesTool: Tool = {
  name: 'list_files',
  execute: async ({ path: dirPath = '.', workspacePath }) => {
    // 递归遍历目录
    const files = await walkDir(fullPath);
    return { success: true, files };
  }
};
```

**用途：** AI 查看工作空间的文件结构

#### 4. apply_patch / create_patch（代码补丁）

**用途：** 支持 Diff/Patch 操作（未来扩展）

### 工具注册表

```typescript
export const TOOLS: Record<string, Tool> = {
  read_file: readFileTool,
  write_file: writeFileTool,
  list_files: listFilesTool,
  apply_patch: applyPatchTool,
  create_patch: createPatchTool,
};
```

**作用：** 统一管理所有工具

### 转换为 LLM 格式

```typescript
export function toolsToFunctions(tools: Tool[]) {
  return tools.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters  // JSON Schema
    }
  }));
}
```

**作用：** 将工具转换为 OpenAI Function Calling 格式

### 为什么需要这个文件？

✅ **可扩展** - 添加新工具只需定义 Tool 对象  
✅ **标准化** - 遵循 OpenAI Function Calling 规范  
✅ **类型安全** - 参数验证和类型检查  

---

## 4️⃣ memory.ts - 记忆管理

**作用：** 管理 Agent 的对话历史和操作记录

### 核心功能

#### 1. 内存存储

```typescript
class InMemoryDatabase {
  private memories: Map<string, Memory[]> = new Map();
  
  addMemory(memory: Memory): void {
    const sessionId = memory.sessionId;
    if (!this.memories.has(sessionId)) {
      this.memories.set(sessionId, []);
    }
    this.memories.get(sessionId)!.push(memory);
  }
}
```

**特点：**
- ✅ 内存存储（快速）
- ✅ 按 sessionId 隔离
- ✅ 重启后丢失（轻量级）

#### 2. 记忆类型

```typescript
type: 'conversation' | 'file_operation' | 'task_result'
```

- **conversation** - 对话历史
- **file_operation** - 文件操作记录
- **task_result** - 任务执行结果

#### 3. 记忆查询

```typescript
// 获取最近的对话
async getRecentConversations(sessionId: string, limit = 10)

// 获取文件操作历史
async getFileOperations(sessionId: string, filePath?: string)
```

**用途：** 为 AI 提供上下文

### 工作流程

```
用户发送消息
  ↓
MemoryManager.addMemory()  ← 保存用户消息
  ↓
AI 生成回复
  ↓
MemoryManager.addMemory()  ← 保存 AI 回复
  ↓
工具执行
  ↓
MemoryManager.addMemory()  ← 保存操作记录
  ↓
下次对话时
  ↓
MemoryManager.getRecentConversations()  ← 获取历史
  ↓
AI 看到上下文，理解之前的对话
```

### 为什么需要这个文件？

✅ **上下文记忆** - AI 记住之前的对话  
✅ **操作追踪** - 记录所有文件操作  
✅ **会话隔离** - 不同用户的数据分开  

---

## 5️⃣ executor.ts - 执行器（核心）

**作用：** Agent 的大脑，协调所有模块，执行用户请求

### 核心功能

#### 1. 状态机循环

```typescript
async *execute(userMessage: string) {
  while (iterations < maxIterations) {
    // 1. 调用 LLM
    for await (const chunk of llmClient.streamChat(...)) {
      // 收集响应和工具调用
    }
    
    // 2. 执行工具
    for (const toolCall of currentToolCalls) {
      const result = await tool.execute(...);
      // 返回结果给 LLM
    }
    
    // 3. 继续循环（LLM 可能再次调用工具）
  }
}
```

**特点：**
- ✅ 支持多轮工具调用
- ✅ 流式输出
- ✅ 自动重试（最多 10 次）

#### 2. 智能文件推断

```typescript
private async inferTargetFile(userMessage: string): Promise<string | null> {
  // 列出所有文件
  const files = await walkDir(this.context.workspacePath);
  
  // 字符串匹配
  for (const file of files) {
    if (message.includes(fileName)) {
      return file;
    }
  }
}
```

**用途：** 用户没说文件名时，自动推断

#### 3. 代码审批机制

```typescript
if (toolName === 'write_file') {
  // 读取原文件
  const originalContent = await readTool.execute(...);
  
  // 请求用户审批
  yield {
    type: 'approval_required',
    data: {
      filePath,
      originalContent,
      modifiedContent: newContent,
    },
  };
  
  // 结束对话，等待用户确认
  break;
}
```

**用途：** 修改代码前必须用户确认

#### 4. System Prompt 管理

```typescript
this.systemPrompt = `你是一个专业的 AI 编程助手...

## 核心原则
1. 必须调用 write_file 工具
2. 禁止只给建议
...
`;
```

**用途：** 控制 AI 的行为和决策

### 完整执行流程

```
用户输入："创建文件"
  ↓
executor.execute()
  ↓
1. 保存用户消息到记忆
  ↓
2. 获取对话历史
  ↓
3. 构建消息列表（system + history + user）
  ↓
4. 调用 LLM（传入 tools）
  ↓
5. LLM 返回：想调用 write_file
  ↓
6. 执行 write_file 工具
  ↓
7. 拦截 write_file，显示 Diff 审批
  ↓
8. 等待用户确认
  ↓
9. 返回结果
```

### 为什么需要这个文件？

✅ **核心协调** - 连接所有模块  
✅ **状态管理** - 控制执行流程  
✅ **智能决策** - System Prompt 控制 AI 行为  

---

## 🔄 模块协作关系

```
┌─────────────┐
│  executor   │  ← 核心协调器
│  (执行器)    │
└──────┬──────┘
       │
   ┌───┴───┬────────┬─────────┐
   │       │        │         │
┌──▼──┐ ┌─▼──┐  ┌──▼──┐  ┌───▼──┐
│ llm │ │tools│  │memory│ │types │
│(LLM)│ │(工具)│  │(记忆)│ │(类型)│
└─────┘ └────┘  └─────┘ └──────┘
```

### 数据流

```
用户输入
  ↓
executor.execute()
  ↓
memory.getRecentConversations()  ← 获取历史
  ↓
llm.streamChat(messages, tools)   ← 调用 LLM
  ↓
LLM 返回 tool_calls
  ↓
tools[工具名].execute()            ← 执行工具
  ↓
memory.addMemory()                ← 记录操作
  ↓
返回结果给用户
```

---

## 📊 文件大小和复杂度

| 文件 | 行数 | 复杂度 | 作用 |
|------|------|--------|------|
| `types.ts` | ~84 | ⭐ 低 | 类型定义 |
| `llm.ts` | ~194 | ⭐⭐ 中 | LLM 客户端 |
| `tools.ts` | ~181 | ⭐⭐ 中 | 工具系统 |
| `memory.ts` | ~81 | ⭐ 低 | 记忆管理 |
| `executor.ts` | ~356 | ⭐⭐⭐ 高 | 核心执行器 |
| **总计** | **~896 行** | | **完整的 Agent 系统** |

---

## 🎯 总结

### 每个文件的核心价值

1. **types.ts** - 📋 定义规范（所有数据结构）
2. **llm.ts** - 🤖 调用大模型（统一接口）
3. **tools.ts** - 🔧 工具库（可扩展的操作）
4. **memory.ts** - 💾 记忆系统（上下文管理）
5. **executor.ts** - 🧠 大脑（协调一切）

### 设计原则

✅ **单一职责** - 每个文件只做一件事  
✅ **低耦合** - 模块之间通过接口交互  
✅ **高内聚** - 相关功能集中在一起  
✅ **可扩展** - 添加新功能不影响现有代码  

---

**这就是我们 Agent 系统的完整架构！** 🎉


