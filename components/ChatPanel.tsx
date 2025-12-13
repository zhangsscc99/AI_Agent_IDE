'use client';

import { useState, useRef, useEffect } from 'react';
import { DiffViewer } from './DiffViewer';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    type?: string;
    data?: any;
  };
}

interface PendingChange {
  id: string;
  filePath: string;
  originalContent: string;
  modifiedContent: string;
  reasoning: string;
  isApplying?: boolean;
}

interface ChatPanelProps {
  sessionId: string;
  currentFile: { path: string; content: string } | null;
  onFileModified?: () => void;
}

export function ChatPanel({ sessionId, currentFile, onFileModified }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentAssistantMessage, setCurrentAssistantMessage] = useState('');
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages, currentAssistantMessage]);
  
  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    
    // 如果有当前文件，增强用户消息
    let enhancedMessage = input;
    if (currentFile) {
      // 只要有打开的文件，就告诉 AI
      enhancedMessage = `[系统提示] 当前打开的文件是: ${currentFile.path}

用户请求: ${input}

注意：如果用户说"这个文件"、"当前文件"或"修改文件"，就是指 ${currentFile.path} 这个文件！`;
    }
    
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input, // 显示原始消息
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setCurrentAssistantMessage('');
    
    try {
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: enhancedMessage, // 发送增强后的消息
          sessionId,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'API request failed');
      }
      
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');
      
      const decoder = new TextDecoder();
      let buffer = '';
      let assistantMessageContent = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));
              
              if (event.type === 'message') {
                assistantMessageContent += event.content;
                setCurrentAssistantMessage(assistantMessageContent);
              } else if (event.type === 'tool_call') {
                assistantMessageContent += `\n\n🔧 ${event.content}`;
                setCurrentAssistantMessage(assistantMessageContent);
              } else if (event.type === 'tool_result') {
                assistantMessageContent += `\n✅ ${event.content}`;
                setCurrentAssistantMessage(assistantMessageContent);
                
                // 如果是文件操作，触发刷新
                if (event.data?.path && onFileModified) {
                  setTimeout(() => onFileModified(), 500);
                }
              } else if (event.type === 'approval_required') {
                // AI 请求用户审批代码修改
                setPendingChange({
                  id: event.data.id,
                  filePath: event.data.filePath,
                  originalContent: event.data.originalContent,
                  modifiedContent: event.data.modifiedContent,
                  reasoning: event.content,
                });
                assistantMessageContent += `\n\n💡 ${event.content}`;
                setCurrentAssistantMessage(assistantMessageContent);
              } else if (event.type === 'error') {
                assistantMessageContent += `\n\n❌ 错误: ${event.content}`;
                setCurrentAssistantMessage(assistantMessageContent);
              } else if (event.type === 'done') {
                const assistantMessage: Message = {
                  id: crypto.randomUUID(),
                  role: 'assistant',
                  content: assistantMessageContent || '完成',
                  timestamp: new Date(),
                };
                setMessages(prev => [...prev, assistantMessage]);
                setCurrentAssistantMessage('');
              }
            } catch (e) {
              console.error('Failed to parse event:', e);
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `❌ 错误: ${error.message}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      setCurrentAssistantMessage('');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="h-full flex flex-col bg-white">
      {/* 头部 */}
      <div className="px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <div className="relative">
            {/* AI 助手图标 - 现代风格 */}
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="white" fillOpacity="0.9"/>
                <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fillOpacity="0.9"/>
                <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fillOpacity="0.9"/>
              </svg>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-gray-900">AI 编程助手</h2>
            <p className="text-xs text-gray-500">在线</p>
          </div>
        </div>
      </div>
      
      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && !currentAssistantMessage && (
          <div className="text-center py-12">
            {/* AI 助手图标 - 大号 */}
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="white" fillOpacity="0.9"/>
                <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fillOpacity="0.9"/>
                <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fillOpacity="0.9"/>
              </svg>
            </div>
            <p className="text-base font-semibold text-gray-900">AI 编程助手</p>
            <p className="text-sm text-gray-500 mt-2 mb-3">让你无需亲手写代码，AI 自动完成</p>
            <div className="max-w-xs mx-auto space-y-2 text-left mt-6">
              <div className="flex items-start gap-2 text-sm text-gray-600">
                <span className="text-blue-500">•</span>
                <span>自动创建和编辑代码文件</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-gray-600">
                <span className="text-blue-500">•</span>
                <span>智能分析和重构代码</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-gray-600">
                <span className="text-blue-500">•</span>
                <span>一句话完成复杂功能</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-gray-600">
                <span className="text-blue-500">•</span>
                <span>实时修改，即时生效</span>
              </div>
            </div>
          </div>
        )}
        
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                {message.content}
              </div>
              <div className={`text-xs mt-2 ${
                message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
              }`}>
                {message.timestamp.toLocaleTimeString('zh-CN', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          </div>
        ))}
        
        {currentAssistantMessage && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-gray-100 text-gray-900">
              <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                {currentAssistantMessage}
                <span className="inline-block w-2 h-4 ml-1 bg-blue-500 animate-pulse rounded" />
              </div>
            </div>
          </div>
        )}
        
        {/* 代码修改审批界面 */}
        {pendingChange && (
          <div className="px-4 py-3">
            <DiffViewer
              filePath={pendingChange.filePath}
              originalContent={pendingChange.originalContent}
              modifiedContent={pendingChange.modifiedContent}
              isApplying={pendingChange.isApplying}
              onApprove={async () => {
                // 设置 loading 状态
                setPendingChange({ ...pendingChange, isApplying: true });
                
                try {
                  const response = await fetch('/api/agent/approve', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      sessionId,
                      filePath: pendingChange.filePath,
                      content: pendingChange.modifiedContent,
                      approved: true,
                    }),
                  });
                  
                  if (response.ok) {
                    setPendingChange(null);
                    if (onFileModified) onFileModified();
                    
                    const successMsg: Message = {
                      id: crypto.randomUUID(),
                      role: 'assistant',
                      content: `✅ 已应用修改到 ${pendingChange.filePath}`,
                      timestamp: new Date(),
                    };
                    setMessages(prev => [...prev, successMsg]);
                  }
                } catch (error) {
                  console.error('Failed to apply changes:', error);
                  setPendingChange({ ...pendingChange, isApplying: false });
                }
              }}
              onReject={() => {
                setPendingChange(null);
                const rejectMsg: Message = {
                  id: crypto.randomUUID(),
                  role: 'assistant',
                  content: '已拒绝本次修改',
                  timestamp: new Date(),
                };
                setMessages(prev => [...prev, rejectMsg]);
              }}
            />
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* 输入框 */}
      <div className="border-t border-gray-200 p-4">
        {currentFile && (
          <div className="mb-3 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700 flex items-center gap-2">
            <span>📄</span>
            <span className="truncate">{currentFile.path}</span>
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="输入消息... (Enter 发送)"
            className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white text-sm transition-colors"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="px-5 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-xl text-sm font-medium text-white transition-all shadow-sm hover:shadow disabled:shadow-none"
          >
            {isLoading ? '...' : '发送'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          按 Enter 发送，Shift + Enter 换行
        </p>
      </div>
    </div>
  );
}
