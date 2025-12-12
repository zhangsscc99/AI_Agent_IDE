// Agent 聊天 API (SSE 流式响应)
import { NextRequest } from 'next/server';
import { AgentExecutor } from '@/lib/agent/executor';
import { createLLMClient } from '@/lib/agent/llm';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { message, sessionId } = await request.json();
    
    if (!message || !sessionId) {
      return new Response('Missing message or sessionId', { status: 400 });
    }
    
    // 检查 API Key
    const apiKey = process.env.LLM_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'LLM API Key not configured. Please set LLM_API_KEY in .env file.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 创建工作空间目录
    const workspacePath = path.join(
      process.cwd(),
      process.env.WORKSPACE_PATH || 'workspace',
      sessionId
    );
    
    // 创建 LLM 客户端
    const llmClient = createLLMClient();
    
    // 创建 Agent 执行器
    const executor = new AgentExecutor({
      sessionId,
      workspacePath,
      llmClient,
    });
    
    // 创建 SSE 流
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of executor.execute(message)) {
            const data = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(data));
          }
          
          controller.close();
        } catch (error: any) {
          const errorData = `data: ${JSON.stringify({
            type: 'error',
            content: error.message,
          })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
          controller.close();
        }
      },
    });
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}




