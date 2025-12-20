'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { DiffViewer } from './DiffViewer';
import { generateUUID } from '@/lib/utils/uuid';
import { WorkflowRun, WorkflowStep } from '@/lib/agent/types';

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
  workflow?: WorkflowRun | null;
  onFileModified?: () => void;
  onDebugEvent?: (event: any) => void;
}

export function ChatPanel({ sessionId, currentFile, workflow, onFileModified, onDebugEvent }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentAssistantMessage, setCurrentAssistantMessage] = useState('');
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);
  const [selectedWorkflowStepId, setSelectedWorkflowStepId] = useState<string | null>(null);
  const [checkpointPreview, setCheckpointPreview] = useState<{
    filePath: string;
    originalContent: string;
    modifiedContent: string;
  } | null>(null);
  const [checkpointPreviewLoading, setCheckpointPreviewLoading] = useState(false);
  const [checkpointPreviewError, setCheckpointPreviewError] = useState<string | null>(null);
  
  // 从 localStorage 加载聊天记录
  useEffect(() => {
    const savedMessages = localStorage.getItem(`chat_messages_${sessionId}`);
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        setMessages(parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })));
      } catch (error) {
        console.error('Failed to load messages:', error);
      }
    }
  }, [sessionId]);
  
  // 保存聊天记录到 localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`chat_messages_${sessionId}`, JSON.stringify(messages));
    }
  }, [messages, sessionId]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages, currentAssistantMessage]);

  useEffect(() => {
    if (!workflow?.steps?.length) {
      setSelectedWorkflowStepId(null);
      setCheckpointPreview(null);
      return;
    }

    if (selectedWorkflowStepId) {
      const exists = workflow.steps.some(step => step.id === selectedWorkflowStepId);
      if (!exists) {
        setSelectedWorkflowStepId(null);
        setCheckpointPreview(null);
      }
    }
  }, [workflow, selectedWorkflowStepId]);

  const selectedWorkflowStep = useMemo<WorkflowStep | null>(() => {
    if (!selectedWorkflowStepId || !workflow?.steps) return null;
    return workflow.steps.find(step => step.id === selectedWorkflowStepId) || null;
  }, [selectedWorkflowStepId, workflow]);

  useEffect(() => {
    const checkpointId = selectedWorkflowStep?.metadata?.checkpointId;
    if (!checkpointId) {
      setCheckpointPreview(null);
      setCheckpointPreviewError(null);
      setCheckpointPreviewLoading(false);
      return;
    }

    let cancelled = false;
    const loadCheckpoint = async () => {
      try {
        setCheckpointPreviewLoading(true);
        setCheckpointPreviewError(null);
        const response = await fetch(`/api/workflow/checkpoint?checkpointId=${checkpointId}`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || '获取代码差异失败');
        }
        if (!cancelled) {
          setCheckpointPreview({
            filePath: data.checkpoint.filePath,
            originalContent: data.checkpoint.originalContent,
            modifiedContent: data.checkpoint.modifiedContent,
          });
        }
      } catch (error: any) {
        if (!cancelled) {
          setCheckpointPreviewError(error.message);
          setCheckpointPreview(null);
        }
      } finally {
        if (!cancelled) {
          setCheckpointPreviewLoading(false);
        }
      }
    };

    loadCheckpoint();
    return () => {
      cancelled = true;
    };
  }, [selectedWorkflowStep?.metadata?.checkpointId]);

  const workflowStatusStyles: Record<string, string> = {
    pending: 'bg-yellow-50 text-yellow-700 border border-yellow-100',
    in_progress: 'bg-blue-50 text-blue-700 border border-blue-100',
    completed: 'bg-green-50 text-green-700 border border-green-100',
    error: 'bg-red-50 text-red-600 border border-red-100',
  };

  const workflowStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return '待处理';
      case 'in_progress':
        return '执行中';
      case 'completed':
        return '已完成';
      case 'error':
        return '失败';
      default:
        return status;
    }
  };

  const workflowTypeLabel = (type: string) => {
    switch (type) {
      case 'task':
        return '主任务';
      case 'tool':
        return '工具调用';
      case 'checkpoint':
        return '代码修改';
      default:
        return type;
    }
  };
  
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
      id: generateUUID(),
      role: 'user',
      content: input, // 显示原始消息
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setCurrentAssistantMessage('');
    
    // 记录会话开始
    if (onDebugEvent) {
      onDebugEvent({
        type: 'agent_start',
        content: 'Agent 开始处理请求',
        timestamp: Date.now()
      });
    }
    
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
      let lastToolCallTime: number | null = null;
      
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
                lastToolCallTime = Date.now();
                
                // 记录工具调用事件
                if (onDebugEvent) {
                  onDebugEvent({
                    type: 'tool_call',
                    content: event.content,
                    timestamp: Date.now(),
                    data: event.data
                  });
                }
                
                assistantMessageContent += `\n\n🔧 ${event.content}`;
                setCurrentAssistantMessage(assistantMessageContent);
              } else if (event.type === 'tool_result') {
                // 计算工具执行耗时
                const duration = lastToolCallTime ? Date.now() - lastToolCallTime : 0;
                
                // 记录工具结果事件（包含耗时）
                if (onDebugEvent) {
                  onDebugEvent({
                    type: 'tool_result',
                    content: event.content,
                    timestamp: Date.now(),
                    duration,
                    data: event.data
                  });
                }
                
                lastToolCallTime = null;
                // 特殊处理搜索结果
                if (event.data?.tool === 'search_codebase' && event.data?.results) {
                  // 添加搜索结果消息
                  const searchResultMessage: Message = {
                    id: generateUUID(),
                    role: 'assistant',
                    content: event.content,
                    timestamp: new Date(),
                    metadata: {
                      type: 'search_result',
                      data: event.data
                    }
                  };
                  setMessages(prev => [...prev, searchResultMessage]);
                } else {
                  assistantMessageContent += `\n✅ ${event.content}`;
                  setCurrentAssistantMessage(assistantMessageContent);
                }
                
                // 如果是文件操作，触发刷新
                if (event.data?.path && onFileModified) {
                  setTimeout(() => onFileModified(), 500);
                }
              } else if (event.type === 'approval_required') {
                // 记录审批请求事件
                if (onDebugEvent) {
                  onDebugEvent({
                    type: 'approval_required',
                    content: event.content,
                    timestamp: Date.now(),
                    data: event.data
                  });
                }
                
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
                // 记录错误事件
                if (onDebugEvent) {
                  onDebugEvent({
                    type: 'error',
                    content: event.content,
                    timestamp: Date.now(),
                    data: event.data
                  });
                }
                
                assistantMessageContent += `\n\n❌ 错误: ${event.content}`;
                setCurrentAssistantMessage(assistantMessageContent);
              } else if (event.type === 'done') {
                const assistantMessage: Message = {
                  id: generateUUID(),
                  role: 'assistant',
                  content: assistantMessageContent || '完成',
                  timestamp: new Date(),
                };
                setMessages(prev => [...prev, assistantMessage]);
                setCurrentAssistantMessage('');
                
                // 记录会话结束
                if (onDebugEvent) {
                  onDebugEvent({
                    type: 'agent_end',
                    content: 'Agent 完成处理',
                    timestamp: Date.now()
                  });
                }
              }
            } catch (e) {
              console.error('Failed to parse event:', e);
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      
      // 记录错误
      if (onDebugEvent) {
        onDebugEvent({
          type: 'error',
          content: error.message,
          timestamp: Date.now(),
          data: { error: error.message }
        });
      }
      
      const errorMessage: Message = {
        id: generateUUID(),
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
          {messages.length > 0 && (
            <button
              onClick={() => {
                if (confirm('确定要清空所有聊天记录吗？')) {
                  setMessages([]);
                  localStorage.removeItem(`chat_messages_${sessionId}`);
                }
              }}
              className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 rounded hover:bg-red-50 transition-colors"
              title="清空聊天记录"
            >
              清空
            </button>
          )}
        </div>
      </div>

      {/* Todo 列表 */}
      {workflow?.steps?.length ? (
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">Todo 列表</p>
              <p className="text-xs text-gray-500">点击节点可查看执行详情 / diff</p>
            </div>
            <span className="text-xs text-gray-400">{workflow.steps.length} 个节点</span>
          </div>
          <div className="mt-3 space-y-2 max-h-48 overflow-y-auto pr-1">
            {workflow.steps.map(step => (
              <button
                key={step.id}
                onClick={() => setSelectedWorkflowStepId(prev => prev === step.id ? null : step.id)}
                className={`w-full text-left rounded-xl px-3 py-2 transition-all border ${
                  selectedWorkflowStepId === step.id
                    ? 'bg-white border-blue-300 shadow-sm'
                    : 'bg-white/80 border-gray-200 hover:border-blue-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-gray-900 truncate">{step.title}</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full ${
                    workflowStatusStyles[step.status] || 'bg-gray-100 text-gray-600 border border-gray-200'
                  }`}>
                    {workflowStatusLabel(step.status)}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-gray-500 flex items-center gap-2">
                  <span>{workflowTypeLabel(step.type)}</span>
                  {step.metadata?.filePath && (
                    <span className="truncate text-gray-400">{step.metadata.filePath}</span>
                  )}
                  {step.metadata?.checkpointId && <span className="text-blue-500">检查点</span>}
                </div>
              </button>
            ))}
          </div>

          {selectedWorkflowStep && (
            <div className="mt-3 border border-gray-200 rounded-xl bg-white">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-700">节点详情</p>
                {selectedWorkflowStep.description && (
                  <p className="text-xs text-gray-500 mt-1 whitespace-pre-wrap break-words">
                    {selectedWorkflowStep.description}
                  </p>
                )}
              </div>
              <div className="p-3 space-y-2 text-xs text-gray-600">
                <p>状态：{workflowStatusLabel(selectedWorkflowStep.status)}</p>
                <p>类型：{workflowTypeLabel(selectedWorkflowStep.type)}</p>
                {selectedWorkflowStep.metadata?.filePath && (
                  <p>文件：{selectedWorkflowStep.metadata.filePath}</p>
                )}
              </div>
              {selectedWorkflowStep.metadata?.checkpointId && (
                <div className="border-t border-gray-100">
                  {checkpointPreviewLoading && (
                    <div className="p-3 text-xs text-gray-500">正在加载代码差异...</div>
                  )}
                  {checkpointPreviewError && (
                    <div className="p-3 text-xs text-red-500">{checkpointPreviewError}</div>
                  )}
                  {checkpointPreview && !checkpointPreviewLoading && !checkpointPreviewError && (
                    <DiffViewer
                      filePath={checkpointPreview.filePath}
                      originalContent={checkpointPreview.originalContent}
                      modifiedContent={checkpointPreview.modifiedContent}
                      mode="preview"
                      height={260}
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}

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
              {/* 特殊处理搜索结果 */}
              {message.metadata?.type === 'search_result' && message.metadata.data?.results ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-blue-600 mb-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span>代码搜索结果</span>
                  </div>
                  {message.metadata.data.results.map((result: any, i: number) => (
                    <div key={i} className="bg-white border border-gray-200 rounded-lg p-3 text-xs">
                      <div className="flex items-start justify-between mb-2">
                        <div className="font-mono text-blue-600 font-medium truncate">{result.file}</div>
                        <div className="flex items-center gap-2 text-gray-500 text-xs shrink-0 ml-2">
                          <span className="px-1.5 py-0.5 bg-gray-100 rounded">{result.type}</span>
                          <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded">{(result.similarity * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                      {result.name && (
                        <div className="text-gray-600 font-medium mb-1">{result.name}</div>
                      )}
                      <div className="text-gray-500 text-xs mb-2">行 {result.lines}</div>
                      <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto text-gray-700 whitespace-pre-wrap break-words">
                        {result.preview}
                      </pre>
                    </div>
                  ))}
                </div>
              ) : (
                <>
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
                </>
              )}
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
                      checkpointId: pendingChange.id,
                    }),
                  });
                  
                  if (response.ok) {
                    setPendingChange(null);
                    if (onFileModified) onFileModified();
                    if (onDebugEvent) {
                      onDebugEvent({
                        type: 'checkpoint_update',
                        timestamp: Date.now(),
                        data: { checkpointId: pendingChange.id, status: 'approved' }
                      });
                    }

                    const successMsg: Message = {
                      id: generateUUID(),
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
              onReject={async () => {
                setPendingChange({ ...pendingChange, isApplying: true });
                try {
                  await fetch('/api/agent/approve', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      sessionId,
                      filePath: pendingChange.filePath,
                      approved: false,
                      checkpointId: pendingChange.id,
                    }),
                  });
                } catch (error) {
                  console.error('Failed to reject changes:', error);
                }
                setPendingChange(null);
                if (onDebugEvent) {
                  onDebugEvent({
                    type: 'checkpoint_update',
                    timestamp: Date.now(),
                    data: { checkpointId: pendingChange.id, status: 'rejected' }
                  });
                }
                const rejectMsg: Message = {
                  id: generateUUID(),
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
