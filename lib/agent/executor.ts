// Agent 执行器 - 核心状态机
import { Message, AgentContext, Task, TaskStatus } from './types';
import { LLMClient } from './llm';
import { TOOLS, toolsToFunctions } from './tools';
import { memoryManager } from './memory';
import crypto from 'crypto';

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
  private inferredFile: string | null = null;
  
  constructor(options: AgentExecutorOptions) {
    this.options = options;
    this.context = {
      sessionId: options.sessionId,
      workspacePath: options.workspacePath,
      memory: [],
      tools: Object.values(TOOLS),
    };
    
    this.systemPrompt = `你是一个专业的 AI 编程助手，类似 Cursor IDE，你能智能地修改代码。

## 核心工作流程
1. **理解用户意图** - 分析用户想要修改什么文件
2. **读取现有代码** - 使用 read_file 读取文件
3. **生成新代码** - 基于需求修改代码
4. **请求用户确认** - 使用 write_file，系统会自动显示 Diff 给用户审批

## 智能文件识别
- 如果用户说"修改这个文件"，使用消息中的"当前打开的文件"
- 如果用户没明说文件名，从上下文推断（如提到 "two_sum"，可能是 "two_sum.py"）
- 如果不确定，询问用户

## 工具使用规则
当你调用 write_file 时：
- 系统会**自动暂停**
- 前端会显示 **Diff 视图**（绿色=新增，红色=删除）
- 用户需要**勾选确认**才能应用
- 你不需要等待，继续解释你的修改即可

## 正确示例
用户："修改 two_sum.py，添加注释"
你的操作：
1. read_file({ path: "two_sum.py" })
2. [分析代码]
3. write_file({ path: "two_sum.py", content: "带注释的完整代码" })
4. "我已经添加了详细的中文注释，解释了哈希表解法的原理..."

## 重要
- write_file 会触发审批流程，用户会看到 Diff
- 不要说"请确认"，直接解释你做了什么修改
- 代码要完整，包含正确的换行符

工作目录: ${this.context.workspacePath}`;
  }
  
  // 智能推断要修改的文件
  private async inferTargetFile(userMessage: string): Promise<string | null> {
    try {
      // 列出工作空间的所有文件
      const fs = await import('fs/promises');
      const path = await import('path');
      
      async function walkDir(dir: string): Promise<string[]> {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        const files: string[] = [];
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            files.push(...await walkDir(fullPath));
          } else {
            files.push(path.relative(dir, fullPath));
          }
        }
        return files;
      }
      
      const files = await walkDir(this.context.workspacePath);
      
      // 简单的文件匹配逻辑
      const message = userMessage.toLowerCase();
      for (const file of files) {
        const fileName = file.toLowerCase();
        if (message.includes(fileName) || fileName.includes(message.split(' ')[0])) {
          return file;
        }
      }
      
      return null;
    } catch {
      return null;
    }
  }
  
  // 执行用户请求
  async *execute(userMessage: string): AsyncGenerator<{
    type: 'message' | 'tool_call' | 'tool_result' | 'done' | 'error' | 'approval_required';
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
          
          // 如果是 write_file，先读取原文件，然后请求用户审批
          if (toolName === 'write_file') {
            const filePath = toolArgs.path;
            const newContent = toolArgs.content;
            
            // 尝试读取原文件
            let originalContent = '';
            try {
              const readTool = TOOLS['read_file'];
              const readResult = await readTool.execute({
                path: filePath,
                workspacePath: this.context.workspacePath,
              });
              originalContent = readResult.content || '';
            } catch {
              originalContent = ''; // 新文件
            }
            
            // 请求用户审批
            yield {
              type: 'approval_required',
              content: `我想修改 ${filePath}，请查看修改内容并确认`,
              data: {
                id: crypto.randomUUID(),
                filePath,
                originalContent,
                modifiedContent: newContent,
              },
            };
            
            // 等待用户审批（这里跳过工具执行，由前端处理）
            continue;
          }
          
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


