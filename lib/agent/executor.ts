// Agent 执行器 - 核心状态机
import { Message, AgentContext } from './types';
import { LLMClient } from './llm';
import { TOOLS, toolsToFunctions } from './tools';
import { memoryManager } from './memory';
import { debugTracer } from '../debug/tracer';
import { workflowManager } from './workflow';
import { checkpointStore } from './checkpoints';

export interface AgentExecutorOptions {
  sessionId: string;
  workspacePath: string;
  llmClient: LLMClient;
  maxIterations?: number;
  enableDebug?: boolean; // 启用调试追踪
}

export class AgentExecutor {
  private options: AgentExecutorOptions;
  private context: AgentContext;
  private systemPrompt: string;
  private inferredFile: string | null = null;
  private workflowRootStepId: string | null = null;
  private toolCallSteps: Map<string, string> = new Map();
  
  constructor(options: AgentExecutorOptions) {
    this.options = options;
    this.context = {
      sessionId: options.sessionId,
      workspacePath: options.workspacePath,
      memory: [],
      tools: Object.values(TOOLS),
    };
    
    this.systemPrompt = `你是一个专业的 AI 编程助手，类似 Cursor IDE。

## 🚨 核心原则：必须使用工具执行操作

用户要求你做事时：
1. ✅ **必须调用 write_file 工具** - 不是选项，是必须！
2. ❌ **禁止只输出代码块** - 代码块没用，用户看不到文件
3. ❌ **禁止说"完成"** - 除非你真的调用了 write_file

## 🔍 智能代码搜索

在执行任务前，如果你不确定代码在哪里，使用 **search_codebase** 工具：

### 何时使用
- 用户问"在哪里...？"、"如何实现...？"
- 需要修改功能但不知道在哪个文件
- 想了解项目结构

### 使用示例
用户："添加用户认证日志"
你：
1. 🔍 search_codebase({ query: "user authentication" })
2. 找到相关文件后，read_file 读取
3. write_file 修改代码

## 📋 工作流程

### 创建新文件（必须调用工具！）
用户说："创建文件"、"写一个新文件"

你的唯一正确做法：
→ 立即调用 write_file 工具
→ 参数：path="文件名.py", content="完整代码"
→ 然后说："我已经创建了文件..."

❌ 绝对不能：
- 输出代码块后说"完成"
- 说"你可以保存为..."
- 不调用工具就结束对话

### 修改现有文件  
用户说："修改文件"、"添加功能"
你必须：
1. 如果不确定文件位置：search_codebase({ query: "相关功能" })
2. read_file({ path: "文件.py" })
3. 分析代码
4. write_file({ path: "文件.py", content: "修改后的完整代码" })

## ❌ 错误示例
用户："创建一个新文件"
你：❌ "好的，代码如下：[代码块]，完成" 
→ 这样什么都不会发生！

## ✅ 正确示例
用户："创建一个新文件"
你：✅ 调用 write_file({ path: "new_file.py", content: "..." })
你：✅ "我创建了 new_file.py，包含了..."

用户："在哪里处理文件上传？"
你：✅ 调用 search_codebase({ query: "file upload handling" })
你：✅ "我找到了相关代码，在 app/api/workspace/upload/route.ts..."

## 🎯 记住
- 用户要求创建/修改文件时，**必须调用 write_file**
- 不确定代码位置时，先用 search_codebase 搜索
- 不要只给代码建议，要实际执行
- 调用工具后，系统会自动显示审批界面

工作目录: ${this.context.workspacePath}`;
  }
  
  // 智能推断要修改的文件
  private async inferTargetFile(userMessage: string): Promise<string | null> {
    try {
      // 列出工作空间的所有文件
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const walkDir = async (dir: string): Promise<string[]> => {
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
      };
      
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
      // 启动调试会话
      if (this.options.enableDebug) {
        debugTracer.startSession(this.context.sessionId);
      }

      // 初始化工作流状态
      this.toolCallSteps.clear();
      const rootStep = workflowManager.startWorkflow(
        this.context.sessionId,
        userMessage
      );
      this.workflowRootStepId = rootStep?.id || null;

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
        
        // 追踪 LLM 调用
        let llmEventId: string | undefined;
        if (this.options.enableDebug) {
          llmEventId = debugTracer.traceLLMCall(
            this.context.sessionId,
            'glm-4-flash',
            messages,
            tools,
            0.7
          );
        }
        
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
        
        // 追踪 LLM 响应
        if (this.options.enableDebug && llmEventId) {
          debugTracer.traceLLMResponse(
            this.context.sessionId,
            llmEventId,
            currentResponse
          );
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

          // 结束调试会话
          if (this.options.enableDebug) {
            debugTracer.endSession(this.context.sessionId);
          }

          if (this.workflowRootStepId) {
            workflowManager.completeStep(
              this.context.sessionId,
              this.workflowRootStepId,
              { response: fullResponse }
            );
          }

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
            
            // 修复换行符
            const fixedNewContent = typeof newContent === 'string' 
              ? newContent.replace(/\\r\\n/g, '\r\n').replace(/\\n/g, '\n')
              : newContent;
            const fixedOriginalContent = typeof originalContent === 'string'
              ? originalContent.replace(/\\r\\n/g, '\r\n').replace(/\\n/g, '\n')
              : originalContent;
            
            const checkpoint = checkpointStore.create(this.context.sessionId, {
              filePath,
              originalContent: fixedOriginalContent,
              modifiedContent: fixedNewContent,
              status: 'pending',
            });

            if (this.workflowRootStepId) {
              workflowManager.startStep(this.context.sessionId, {
                parentId: this.workflowRootStepId,
                title: `修改 ${filePath}`,
                description: 'AI 提交了代码修改，等待审批',
                type: 'checkpoint',
                status: 'pending',
                metadata: {
                  checkpointId: checkpoint.id,
                  filePath,
                },
              });
            }

            // 请求用户审批
            yield {
              type: 'approval_required',
              content: `我想修改 ${filePath}，请查看修改内容并确认`,
              data: {
                id: checkpoint.id,
                filePath,
                originalContent: fixedOriginalContent,
                modifiedContent: fixedNewContent,
              },
            };
            
            // 添加一个假的工具结果，告诉 AI 已经进入审批流程
            messages.push({
              role: 'tool',
              content: JSON.stringify({ 
                success: true, 
                message: '修改建议已提交，等待用户审批' 
              }),
              tool_call_id: toolCall.id,
              name: toolName,
            });
            
            // 结束本轮对话，等待用户审批
            yield { type: 'done', content: '' };
            break;
          }
          
          yield {
            type: 'tool_call',
            content: `调用工具: ${toolName}`,
            data: { name: toolName, args: toolArgs },
          };
          
          // 追踪工具调用
          let toolEventId: string | undefined;
          if (this.options.enableDebug) {
            toolEventId = debugTracer.traceToolCall(
              this.context.sessionId,
              toolName,
              toolArgs
            );
          }

          let workflowStepId: string | null = null;
          if (this.workflowRootStepId) {
            const description = (() => {
              try {
                return JSON.stringify(toolArgs, null, 2).slice(0, 500);
              } catch {
                return '';
              }
            })();
            const step = workflowManager.startStep(this.context.sessionId, {
              parentId: this.workflowRootStepId,
              title: `调用 ${toolName}`,
              description,
              type: 'tool',
              metadata: { tool: toolName, args: toolArgs },
            });
            workflowStepId = step?.id || null;
            if (workflowStepId) {
              this.toolCallSteps.set(toolCall.id, workflowStepId);
            }
          }
          
          try {
            const tool = TOOLS[toolName];
            if (!tool) {
              throw new Error(`Unknown tool: ${toolName}`);
            }
            
            const result = await tool.execute({
              ...toolArgs,
              workspacePath: this.context.workspacePath,
            });
            
            // 追踪工具结果
            if (this.options.enableDebug && toolEventId) {
              debugTracer.traceToolResult(
                this.context.sessionId,
                toolEventId,
                result
              );
            }

            if (workflowStepId) {
              workflowManager.completeStep(
                this.context.sessionId,
                workflowStepId,
                { result }
              );
            }
            
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
              data: {
                tool: toolName,
                ...result
              },
            };
            
            // 添加工具结果到消息历史
            messages.push({
              role: 'tool',
              content: JSON.stringify(result),
              tool_call_id: toolCall.id,
              name: toolName,
            });
            
            // 如果是 read_file，强制要求 AI 调用 write_file
            if (toolName === 'read_file') {
              messages.push({
                role: 'system',
                content: '【系统要求】你必须立即调用 write_file 工具来修改文件。不要说"完成"、不要给建议、不要输出代码块。直接调用工具！',
              });
            }
          } catch (error: any) {
            // 追踪错误
            if (this.options.enableDebug) {
              if (toolEventId) {
                debugTracer.traceToolResult(
                  this.context.sessionId,
                  toolEventId,
                  null,
                  error.message
                );
              }
              debugTracer.traceError(this.context.sessionId, error);
            }

            const failedStepId = workflowStepId || this.toolCallSteps.get(toolCall.id);
            if (failedStepId) {
              workflowManager.failStep(
                this.context.sessionId,
                failedStepId,
                error.message
              );
            }

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
        if (this.options.enableDebug) {
          debugTracer.traceError(
            this.context.sessionId,
            '达到最大迭代次数'
          );
          debugTracer.endSession(this.context.sessionId);
        }

        if (this.workflowRootStepId) {
          workflowManager.failStep(
            this.context.sessionId,
            this.workflowRootStepId,
            '达到最大迭代次数'
          );
        }
        
        yield {
          type: 'error',
          content: '达到最大迭代次数',
        };
      }
    } catch (error: any) {
      if (this.options.enableDebug) {
        debugTracer.traceError(this.context.sessionId, error);
        debugTracer.endSession(this.context.sessionId);
      }

      if (this.workflowRootStepId) {
        workflowManager.failStep(
          this.context.sessionId,
          this.workflowRootStepId,
          error.message
        );
      }
      
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
