// Agent 核心类型定义

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

export type AgentRole = 'planner' | 'executor' | 'reviewer';

// 任务定义
export interface Task {
  id: string;
  sessionId: string;
  role: AgentRole;
  status: TaskStatus;
  input: string;
  output?: string;
  result?: any;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

// Agent 工具定义
export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (params: any) => Promise<any>;
}

// 记忆条目
export interface Memory {
  id: string;
  sessionId: string;
  type: 'conversation' | 'file_operation' | 'task_result';
  content: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

// Agent 执行上下文
export interface AgentContext {
  sessionId: string;
  workspacePath: string;
  currentFile?: string;
  memory: Memory[];
  tools: Tool[];
}

// LLM 消息
export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

// Agent 响应
export interface AgentResponse {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

// 代码修改建议（需要用户审批）
export interface CodeChangeProposal {
  id: string;
  filePath: string;
  originalContent: string;
  modifiedContent: string;
  reasoning: string;
  timestamp: Date;
}
