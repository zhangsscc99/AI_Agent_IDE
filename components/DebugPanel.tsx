'use client';

import React, { useState } from 'react';
import { TraceSession, TraceEvent } from '@/lib/debug/tracer';

interface DebugPanelProps {
  session: TraceSession | null;
  onClose?: () => void;
}

export function DebugPanel({ session, onClose }: DebugPanelProps) {
  const [selectedEvent, setSelectedEvent] = useState<TraceEvent | null>(null);
  const [filter, setFilter] = useState<string>('all');
  
  if (!session) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-500 px-8">
        <svg className="w-20 h-20 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-lg font-medium text-gray-700 mb-2">暂无调试数据</p>
        <p className="text-sm text-gray-500 text-center max-w-xs">
          请先在「聊天」标签页与 AI 对话，<br/>
          系统会自动记录执行过程。
        </p>
        <div className="mt-6 px-4 py-2 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-600">
          💡 提示：每次对话都会生成调试追踪数据
        </div>
      </div>
    );
  }

  const filteredEvents = session.events.filter(event => {
    if (filter === 'all') return true;
    return event.type === filter;
  });

  const eventTypeColors: Record<string, string> = {
    agent_start: 'bg-green-100 text-green-800',
    agent_end: 'bg-gray-100 text-gray-800',
    llm_call: 'bg-blue-100 text-blue-800',
    llm_response: 'bg-blue-50 text-blue-700',
    tool_call: 'bg-purple-100 text-purple-800',
    tool_result: 'bg-purple-50 text-purple-700',
    error: 'bg-red-100 text-red-800',
    thinking: 'bg-yellow-100 text-yellow-800',
    decision: 'bg-indigo-100 text-indigo-800',
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-blue-50 to-purple-50">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Agent 工作流程</h2>
          <p className="text-xs text-gray-500 mt-0.5">实时查看 AI 的工作过程</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Workflow Timeline */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="p-4">
          <div className="space-y-4">
            {filteredEvents.map((event, index) => (
              <WorkflowStep 
                key={event.id} 
                event={event} 
                index={index}
                isLast={index === filteredEvents.length - 1}
                onClick={() => setSelectedEvent(event)}
                isSelected={selectedEvent?.id === event.id}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Event Details */}
      {selectedEvent && (
        <div className="border-t bg-gray-50 p-4 max-h-64 overflow-y-auto">
          <h3 className="font-semibold mb-3 text-gray-900">详细信息</h3>
          <div className="bg-white rounded-lg border p-3 space-y-2">
            {selectedEvent.type === 'tool_call' && (
              <>
                <div>
                  <span className="text-xs font-medium text-gray-500">工具名称</span>
                  <p className="text-sm text-gray-900 mt-1">
                    {selectedEvent.data?.name || selectedEvent.data?.toolName || '未知'}
                  </p>
                </div>
                {selectedEvent.data?.arguments && (
                  <div>
                    <span className="text-xs font-medium text-gray-500">参数</span>
                    <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-x-auto">
                      {JSON.stringify(selectedEvent.data.arguments, null, 2)}
                    </pre>
                  </div>
                )}
              </>
            )}
            {selectedEvent.type === 'tool_result' && (
              <>
                <div>
                  <span className="text-xs font-medium text-gray-500">执行结果</span>
                  <p className={`text-sm mt-1 ${selectedEvent.data?.success !== false ? 'text-green-600' : 'text-red-600'}`}>
                    {selectedEvent.data?.success !== false ? '✓ 成功' : '✗ 失败'}
                  </p>
                </div>
                {selectedEvent.data?.path && (
                  <div>
                    <span className="text-xs font-medium text-gray-500">文件路径</span>
                    <p className="text-sm text-gray-900 mt-1 font-mono">{selectedEvent.data.path}</p>
                  </div>
                )}
              </>
            )}
            {selectedEvent.type === 'error' && (
              <div>
                <span className="text-xs font-medium text-gray-500">错误信息</span>
                <p className="text-sm text-red-600 mt-1">{selectedEvent.data?.message || selectedEvent.data?.content}</p>
              </div>
            )}
            {selectedEvent.type === 'approval_required' && (
              <div>
                <span className="text-xs font-medium text-gray-500">待确认文件</span>
                <p className="text-sm text-gray-900 mt-1 font-mono">{selectedEvent.data?.filePath}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// 工作流步骤组件
function WorkflowStep({ 
  event, 
  index, 
  isLast, 
  onClick, 
  isSelected 
}: { 
  event: TraceEvent; 
  index: number; 
  isLast: boolean;
  onClick: () => void;
  isSelected: boolean;
}) {
  const getStepInfo = () => {
    switch (event.type) {
      case 'agent_start':
        return {
          icon: '🚀',
          title: '开始处理',
          description: 'Agent 开始分析您的请求',
          color: 'bg-green-100 text-green-700 border-green-200'
        };
      
      case 'tool_call':
        const toolName = event.data?.name || event.data?.toolName || '未知工具';
        const toolNames: Record<string, string> = {
          'read_file': '📖 读取文件',
          'write_file': '✍️ 写入文件',
          'list_files': '📂 列出文件',
          'search_codebase': '🔍 搜索代码库',
          'create_spec': '📋 创建规格',
          'generate_code_from_spec': '⚙️ 生成代码',
          'read_spec': '📄 读取规格',
          'validate_spec': '✅ 验证规格'
        };
        
        return {
          icon: toolNames[toolName] || '🔧',
          title: toolNames[toolName] || `调用工具: ${toolName}`,
          description: getToolDescription(event, toolName),
          color: 'bg-purple-100 text-purple-700 border-purple-200'
        };
      
      case 'tool_result':
        return {
          icon: '✓',
          title: '执行完成',
          description: event.data?.success !== false ? '操作成功完成' : '操作失败',
          color: event.data?.success !== false 
            ? 'bg-green-100 text-green-700 border-green-200'
            : 'bg-red-100 text-red-700 border-red-200'
        };
      
      case 'approval_required':
        return {
          icon: '⏸️',
          title: '等待确认',
          description: `等待您确认对 ${event.data?.filePath || '文件'} 的修改`,
          color: 'bg-yellow-100 text-yellow-700 border-yellow-200'
        };
      
      case 'error':
        return {
          icon: '❌',
          title: '发生错误',
          description: event.data?.message || event.data?.content || '未知错误',
          color: 'bg-red-100 text-red-700 border-red-200'
        };
      
      case 'agent_end':
        return {
          icon: '✨',
          title: '处理完成',
          description: '所有任务已完成',
          color: 'bg-blue-100 text-blue-700 border-blue-200'
        };
      
      default:
        return {
          icon: '•',
          title: event.type,
          description: JSON.stringify(event.data || {}).slice(0, 50),
          color: 'bg-gray-100 text-gray-700 border-gray-200'
        };
    }
  };

  const stepInfo = getStepInfo();

  return (
    <div className="flex items-start gap-3">
      {/* 时间线 */}
      <div className="flex flex-col items-center">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${stepInfo.color} border-2 ${isSelected ? 'ring-2 ring-blue-400' : ''}`}>
          {stepInfo.icon}
        </div>
        {!isLast && (
          <div className="w-0.5 h-full bg-gray-200 mt-2" style={{ minHeight: '40px' }} />
        )}
      </div>

      {/* 内容 */}
      <div 
        className={`flex-1 pb-4 cursor-pointer transition-all rounded-lg p-3 ${
          isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
        }`}
        onClick={onClick}
      >
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold text-sm text-gray-900">{stepInfo.title}</h3>
          <span className="text-xs text-gray-400">
            {new Date(event.timestamp).toLocaleTimeString('zh-CN', { 
              hour: '2-digit', 
              minute: '2-digit',
              second: '2-digit'
            })}
          </span>
        </div>
        <p className="text-sm text-gray-600">{stepInfo.description}</p>
        {event.duration && event.duration > 0 && (
          <p className="text-xs text-gray-400 mt-1">耗时: {event.duration}ms</p>
        )}
      </div>
    </div>
  );
}

function getToolDescription(event: TraceEvent, toolName: string): string {
  const args = event.data?.arguments || event.data;
  
  switch (toolName) {
    case 'read_file':
      return `读取文件: ${args?.path || '未知路径'}`;
    case 'write_file':
      return `创建/修改文件: ${args?.path || '未知路径'}`;
    case 'list_files':
      return `列出目录: ${args?.path || '当前目录'}`;
    case 'search_codebase':
      return `搜索: "${args?.query || '未知查询'}"`;
    case 'create_spec':
      return `创建规格: ${args?.name || '未知名称'}`;
    case 'generate_code_from_spec':
      return `从规格生成 ${args?.language || '代码'}: ${args?.outputPath || '未知路径'}`;
    case 'read_spec':
      return `读取规格: ${args?.fileName || '未知文件'}`;
    case 'validate_spec':
      return `验证规格: ${args?.fileName || '未知文件'}`;
    default:
      return `执行工具: ${toolName}`;
  }
}

export default DebugPanel;

