// LLM 客户端 (支持 GLM-4.6 / OpenAI / Claude)
import { Message } from './types';

export interface LLMConfig {
  provider: 'glm' | 'openai' | 'claude';
  apiKey: string;
  baseUrl?: string;
  model: string;
}

export interface LLMStreamChunk {
  delta: string;
  done: boolean;
  tool_calls?: any[];
}

export class LLMClient {
  private config: LLMConfig;
  
  constructor(config: LLMConfig) {
    this.config = config;
  }
  
  // 获取 API 基础 URL
  private getBaseUrl(): string {
    if (this.config.baseUrl) {
      return this.config.baseUrl;
    }
    
    switch (this.config.provider) {
      case 'glm':
        return 'https://open.bigmodel.cn/api/paas/v4';
      case 'openai':
        return 'https://api.openai.com/v1';
      case 'claude':
        return 'https://api.anthropic.com/v1';
      default:
        throw new Error(`Unknown provider: ${this.config.provider}`);
    }
  }
  
  // 转换消息格式（如果需要）
  private transformMessages(messages: Message[]): any[] {
    // GLM-4.6 和 OpenAI 使用相同的格式
    if (this.config.provider === 'glm' || this.config.provider === 'openai') {
      return messages;
    }
    
    // Claude 需要不同的格式，但这里先用通用格式
    return messages;
  }
  
  // 流式对话
  async *streamChat(
    messages: Message[],
    tools?: any[],
    temperature = 0.7
  ): AsyncGenerator<LLMStreamChunk> {
    const baseUrl = this.getBaseUrl();
    const transformedMessages = this.transformMessages(messages);
    
    const requestBody: any = {
      model: this.config.model,
      messages: transformedMessages,
      temperature,
      stream: true,
    };
    
    if (tools && tools.length > 0) {
      requestBody.tools = tools;
      requestBody.tool_choice = 'auto';
    }
    
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LLM API error: ${response.status} - ${error}`);
    }
    
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }
    
    const decoder = new TextDecoder();
    let buffer = '';
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        
        if (trimmed.startsWith('data: ')) {
          try {
            const data = JSON.parse(trimmed.slice(6));
            const delta = data.choices?.[0]?.delta;
            
            if (delta?.content) {
              yield {
                delta: delta.content,
                done: false,
              };
            }
            
            if (delta?.tool_calls) {
              // GLM-4 和 OpenAI 的 tool_calls 格式
              console.log('Received tool_calls:', delta.tool_calls);
              yield {
                delta: '',
                done: false,
                tool_calls: delta.tool_calls,
              };
            }
            
            if (data.choices?.[0]?.finish_reason) {
              yield {
                delta: '',
                done: true,
              };
            }
          } catch (e) {
            console.error('Failed to parse SSE data:', trimmed, e);
          }
        }
      }
    }
  }
  
  // 非流式对话
  async chat(
    messages: Message[],
    tools?: any[],
    temperature = 0.7
  ): Promise<any> {
    const baseUrl = this.getBaseUrl();
    const transformedMessages = this.transformMessages(messages);
    
    const requestBody: any = {
      model: this.config.model,
      messages: transformedMessages,
      temperature,
    };
    
    if (tools && tools.length > 0) {
      requestBody.tools = tools;
      requestBody.tool_choice = 'auto';
    }
    
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LLM API error: ${response.status} - ${error}`);
    }
    
    return response.json();
  }
}

// 创建 LLM 客户端实例
export function createLLMClient(config?: Partial<LLMConfig>): LLMClient {
  const defaultConfig: LLMConfig = {
    provider: (process.env.LLM_PROVIDER as any) || 'glm',
    apiKey: process.env.LLM_API_KEY || '',
    baseUrl: process.env.LLM_BASE_URL,
    model: process.env.LLM_MODEL || 'glm-4-flash',
  };
  
  return new LLMClient({ ...defaultConfig, ...config });
}


