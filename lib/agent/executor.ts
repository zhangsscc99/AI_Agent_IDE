// Agent 执行器 - 核心状态机
import { Message, AgentContext, Task, TaskStatus } from './types';
import { LLMClient } from './llm';
import { TOOLS, toolsToFunctions } from './tools';
import { memoryManager } from './memory';
import { v4 as uuidv4 } from 'uuid';

export interface AgentExecutorOptions {
  sessionId: string;
  workspacePath: string;
  llmClient: LLMClient;
  maxIterations?: number;
}

export class AgentExecutor {
  private options: AgentExecutorOptions;
  private context: AgentContext;
  private systemPrompt: string;
  
  constructor(options: AgentExecutorOptions) {
    this.options = options;
    this.context = {
      sessionId: options.sessionId,
      workspacePath: options.workspacePath,
      memory: [],
      tools: Object.values(TOOLS),
    };
    
    this.systemPrompt = `你是一个专业的 AI 编程助手，你必须使用工具来实际执行操作。

## 核心原则
1. **必须使用工具执行** - 不要只给建议，要实际修改文件
2. **先读后写** - 修改文件前先用 read_file 读取当前内容
3. **直接修改** - 使用 write_file 写入完整的修改后内容
4. **确认结果** - 告诉用户"已完成"

## 工作流程示例
用户说："修改这个文件，实现两数之和"
如果用户消息中包含"当前打开的文件是: xxx"，那就修改那个文件！

正确步骤：
1. read_file({ path: "用户告诉你的文件路径" })  ← 注意：使用用户提供的路径！
2. 分析现有代码
3. write_file({ path: "同样的路径", content: "修改后的完整代码" })
   - 重要：content 必须是正确格式化的代码，使用真实换行符（\n），不是字面量字符串
4. 告诉用户"已完成"

## 可用工具
- read_file(path): 读取文件内容
- write_file(path, content): 写入完整文件内容
- list_files(path): 列出目录
- apply_patch(path, patch): 应用补丁
- create_patch: 创建补丁

## 重要提醒
❌ 错误：自己猜测文件名，如"两数之和的解法.txt"
✅ 正确：使用用户消息中提供的文件路径

工作目录: ${this.context.workspacePath}

记住：用户期待你实际执行操作，不是提建议！`;
  }
  
  // 执行用户请求
  async *execute(userMessage: string): AsyncGenerator<{
    type: 'message' | 'tool_call' | 'tool_result' | 'done' | 'error';
    content: string;
    data?: any;
  }> {
    try {
      // 保存用户消息到记忆
      await memoryManager.addMemory({
        sessionId: this.context.sessionId,
        type: 'conversation',
        content: userMessage,
        metadata: { role: 'user' },
      });
      
      // 获取对话历史
      const recentMemories = await memoryManager.getRecentConversations(
        this.context.sessionId,
        20
      );
      
      // 构建消息列表
      const messages: Message[] = [
        { role: 'system', content: this.systemPrompt },
        ...recentMemories.map(m => ({
          role: m.metadata?.role || 'user',
          content: m.content,
        } as Message)),
        { role: 'user', content: userMessage },
      ];
      
      // 准备工具
      const tools = toolsToFunctions(this.context.tools);
      
      let iterations = 0;
      const maxIterations = this.options.maxIterations || 10;
      let fullResponse = '';
      
      while (iterations < maxIterations) {
        iterations++;
        
        let currentToolCalls: any[] = [];
        let currentResponse = '';
        
        // 流式调用 LLM
        for await (const chunk of this.options.llmClient.streamChat(
          messages,
          tools,
          0.7
        )) {
          if (chunk.delta) {
            currentResponse += chunk.delta;
            fullResponse += chunk.delta;
            yield {
              type: 'message',
              content: chunk.delta,
            };
          }
          
          if (chunk.tool_calls) {
            currentToolCalls.push(...chunk.tool_calls);
          }
          
          if (chunk.done) {
            break;
          }
        }
        
        // 如果有响应内容，添加到消息历史
        if (currentResponse) {
          messages.push({
            role: 'assistant',
            content: currentResponse,
          });
        }
        
        // 如果没有工具调用，说明任务完成
        if (currentToolCalls.length === 0) {
          // 保存助手响应到记忆
          await memoryManager.addMemory({
            sessionId: this.context.sessionId,
            type: 'conversation',
            content: fullResponse,
            metadata: { role: 'assistant' },
          });
          
          yield { type: 'done', content: '' };
          break;
        }
        
        // 执行工具调用
        console.log('Tool calls to execute:', currentToolCalls);
        
        for (const toolCall of currentToolCalls) {
          const toolName = toolCall.function?.name;
          const toolArgsStr = toolCall.function?.arguments || '{}';
          
          console.log(`Executing tool: ${toolName} with args: ${toolArgsStr}`);
          
          const toolArgs = JSON.parse(toolArgsStr);
          
          yield {
            type: 'tool_call',
            content: `调用工具: ${toolName}`,
            data: { name: toolName, args: toolArgs },
          };
          
          try {
            const tool = TOOLS[toolName];
            if (!tool) {
              throw new Error(`Unknown tool: ${toolName}`);
            }
            
            const result = await tool.execute({
              ...toolArgs,
              workspacePath: this.context.workspacePath,
            });
            
            // 记录工具调用
            await memoryManager.addMemory({
              sessionId: this.context.sessionId,
              type: 'file_operation',
              content: `${toolName}: ${JSON.stringify(toolArgs)}`,
              metadata: { tool: toolName, args: toolArgs, result },
            });
            
            yield {
              type: 'tool_result',
              content: `工具执行成功: ${toolName}`,
              data: result,
            };
            
            // 添加工具结果到消息历史
            messages.push({
              role: 'tool',
              content: JSON.stringify(result),
              tool_call_id: toolCall.id,
              name: toolName,
            });
            
            // 如果是 read_file，添加提示让 AI 继续执行 write_file
            if (toolName === 'read_file') {
              messages.push({
                role: 'user',
                content: '好的，我看到文件内容了。现在请直接使用 write_file 工具修改这个文件，写入完整的修改后的代码。不要只给建议！',
              });
            }
          } catch (error: any) {
            yield {
              type: 'error',
              content: `工具执行失败: ${error.message}`,
              data: { tool: toolName, error: error.message },
            };
            
            messages.push({
              role: 'tool',
              content: JSON.stringify({ error: error.message }),
              tool_call_id: toolCall.id,
              name: toolName,
            });
          }
        }
      }
      
      if (iterations >= maxIterations) {
        yield {
          type: 'error',
          content: '达到最大迭代次数',
        };
      }
    } catch (error: any) {
      yield {
        type: 'error',
        content: error.message,
      };
    }
  }
  
  // 清除会话
  async clearSession(): Promise<void> {
    await memoryManager.clearSession(this.context.sessionId);
  }
}


