// 调试追踪系统 - 记录 Agent 执行的每一步
import crypto from 'crypto';

/**
 * 追踪事件类型
 */
export type TraceEventType = 
  | 'agent_start'
  | 'agent_end'
  | 'llm_call'
  | 'llm_response'
  | 'tool_call'
  | 'tool_result'
  | 'error'
  | 'thinking'
  | 'decision';

/**
 * 追踪事件
 */
export interface TraceEvent {
  id: string;
  sessionId: string;
  type: TraceEventType;
  timestamp: number;
  duration?: number; // 毫秒
  data: any;
  parentId?: string;
  metadata?: Record<string, any>;
}

/**
 * LLM 调用追踪
 */
export interface LLMCallTrace {
  model: string;
  messages: any[];
  tools?: any[];
  temperature?: number;
  tokensUsed?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

/**
 * 工具调用追踪
 */
export interface ToolCallTrace {
  toolName: string;
  arguments: any;
  result?: any;
  error?: string;
  duration: number;
}

/**
 * 追踪会话
 */
export interface TraceSession {
  id: string;
  startTime: number;
  endTime?: number;
  events: TraceEvent[];
  summary?: TraceSummary;
}

/**
 * 追踪摘要
 */
export interface TraceSummary {
  totalDuration: number;
  llmCalls: number;
  toolCalls: number;
  errors: number;
  tokensUsed: {
    prompt: number;
    completion: number;
    total: number;
  };
  toolStats: Record<string, {
    calls: number;
    totalDuration: number;
    avgDuration: number;
    errors: number;
  }>;
}

/**
 * 调试追踪器
 */
export class DebugTracer {
  private sessions: Map<string, TraceSession> = new Map();
  private currentEventStack: Map<string, string[]> = new Map(); // sessionId -> stack of event IDs

  /**
   * 开始新的追踪会话
   */
  startSession(sessionId: string): void {
    const session: TraceSession = {
      id: sessionId,
      startTime: Date.now(),
      events: []
    };
    
    this.sessions.set(sessionId, session);
    this.currentEventStack.set(sessionId, []);
    
    this.addEvent(sessionId, 'agent_start', { sessionId });
  }

  /**
   * 结束追踪会话
   */
  endSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.endTime = Date.now();
      session.summary = this.generateSummary(session);
      
      this.addEvent(sessionId, 'agent_end', {
        sessionId,
        summary: session.summary
      });
    }
  }

  /**
   * 添加追踪事件
   */
  addEvent(
    sessionId: string,
    type: TraceEventType,
    data: any,
    metadata?: Record<string, any>
  ): string {
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.warn(`Session ${sessionId} not found`);
      return '';
    }

    const stack = this.currentEventStack.get(sessionId) || [];
    const parentId = stack.length > 0 ? stack[stack.length - 1] : undefined;

    const event: TraceEvent = {
      id: crypto.randomUUID(),
      sessionId,
      type,
      timestamp: Date.now(),
      data,
      parentId,
      metadata
    };

    session.events.push(event);
    return event.id;
  }

  /**
   * 开始追踪一个操作（返回 eventId 用于后续更新）
   */
  startOperation(
    sessionId: string,
    type: TraceEventType,
    data: any
  ): string {
    const eventId = this.addEvent(sessionId, type, data);
    const stack = this.currentEventStack.get(sessionId) || [];
    stack.push(eventId);
    this.currentEventStack.set(sessionId, stack);
    return eventId;
  }

  /**
   * 结束一个操作（更新持续时间）
   */
  endOperation(
    sessionId: string,
    eventId: string,
    result?: any
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const event = session.events.find(e => e.id === eventId);
    if (event) {
      event.duration = Date.now() - event.timestamp;
      if (result) {
        event.data = { ...event.data, result };
      }
    }

    // 从栈中移除
    const stack = this.currentEventStack.get(sessionId) || [];
    const index = stack.indexOf(eventId);
    if (index > -1) {
      stack.splice(index, 1);
      this.currentEventStack.set(sessionId, stack);
    }
  }

  /**
   * 追踪 LLM 调用
   */
  traceLLMCall(
    sessionId: string,
    model: string,
    messages: any[],
    tools?: any[],
    temperature?: number
  ): string {
    return this.startOperation(sessionId, 'llm_call', {
      model,
      messages: messages.map(m => ({
        role: m.role,
        content: typeof m.content === 'string' 
          ? m.content.slice(0, 200) + (m.content.length > 200 ? '...' : '')
          : m.content
      })),
      tools: tools?.length,
      temperature
    });
  }

  /**
   * 追踪 LLM 响应
   */
  traceLLMResponse(
    sessionId: string,
    eventId: string,
    response: string,
    tokensUsed?: { prompt: number; completion: number; total: number }
  ): void {
    this.endOperation(sessionId, eventId, {
      response: response.slice(0, 500) + (response.length > 500 ? '...' : ''),
      tokensUsed
    });
  }

  /**
   * 追踪工具调用
   */
  traceToolCall(
    sessionId: string,
    toolName: string,
    args: any
  ): string {
    return this.startOperation(sessionId, 'tool_call', {
      toolName,
      arguments: args
    });
  }

  /**
   * 追踪工具结果
   */
  traceToolResult(
    sessionId: string,
    eventId: string,
    result: any,
    error?: string
  ): void {
    this.endOperation(sessionId, eventId, { result, error });
  }

  /**
   * 追踪思考过程
   */
  traceThinking(sessionId: string, thought: string): void {
    this.addEvent(sessionId, 'thinking', { thought });
  }

  /**
   * 追踪决策
   */
  traceDecision(sessionId: string, decision: string, reasoning: string): void {
    this.addEvent(sessionId, 'decision', { decision, reasoning });
  }

  /**
   * 追踪错误
   */
  traceError(sessionId: string, error: Error | string): void {
    this.addEvent(sessionId, 'error', {
      message: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined
    });
  }

  /**
   * 获取会话的所有事件
   */
  getSession(sessionId: string): TraceSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * 获取所有会话
   */
  getAllSessions(): TraceSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * 清除会话
   */
  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    this.currentEventStack.delete(sessionId);
  }

  /**
   * 生成会话摘要
   */
  private generateSummary(session: TraceSession): TraceSummary {
    const summary: TraceSummary = {
      totalDuration: session.endTime ? session.endTime - session.startTime : 0,
      llmCalls: 0,
      toolCalls: 0,
      errors: 0,
      tokensUsed: { prompt: 0, completion: 0, total: 0 },
      toolStats: {}
    };

    for (const event of session.events) {
      switch (event.type) {
        case 'llm_call':
          summary.llmCalls++;
          if (event.data.result?.tokensUsed) {
            summary.tokensUsed.prompt += event.data.result.tokensUsed.prompt || 0;
            summary.tokensUsed.completion += event.data.result.tokensUsed.completion || 0;
            summary.tokensUsed.total += event.data.result.tokensUsed.total || 0;
          }
          break;

        case 'tool_call':
          summary.toolCalls++;
          const toolName = event.data.toolName;
          if (!summary.toolStats[toolName]) {
            summary.toolStats[toolName] = {
              calls: 0,
              totalDuration: 0,
              avgDuration: 0,
              errors: 0
            };
          }
          summary.toolStats[toolName].calls++;
          if (event.duration) {
            summary.toolStats[toolName].totalDuration += event.duration;
          }
          if (event.data.result?.error) {
            summary.toolStats[toolName].errors++;
          }
          break;

        case 'error':
          summary.errors++;
          break;
      }
    }

    // 计算平均值
    for (const toolName in summary.toolStats) {
      const stats = summary.toolStats[toolName];
      stats.avgDuration = stats.calls > 0 ? stats.totalDuration / stats.calls : 0;
    }

    return summary;
  }

  /**
   * 导出会话为 JSON
   */
  exportSession(sessionId: string): string {
    const session = this.sessions.get(sessionId);
    return JSON.stringify(session, null, 2);
  }

  /**
   * 导出所有会话
   */
  exportAllSessions(): string {
    const sessions = Array.from(this.sessions.values());
    return JSON.stringify(sessions, null, 2);
  }
}

// 全局追踪器实例
export const debugTracer = new DebugTracer();

