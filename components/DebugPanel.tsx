'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { WorkflowRun, WorkflowStep } from '@/lib/agent/types';
import { DiffViewer } from './DiffViewer';

interface DebugPanelProps {
  workflow: WorkflowRun | null;
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

interface CheckpointPreview {
  checkpointId: string;
  filePath: string;
  originalContent: string;
  modifiedContent: string;
  status: string;
}

export function DebugPanel({ workflow, isLoading, error, onRefresh }: DebugPanelProps) {
  const [selectedStep, setSelectedStep] = useState<WorkflowStep | null>(null);
  const [checkpointPreview, setCheckpointPreview] = useState<CheckpointPreview | null>(null);
  const [checkpointLoading, setCheckpointLoading] = useState(false);
  const [checkpointError, setCheckpointError] = useState<string | null>(null);

  const steps = useMemo(() => {
    if (!workflow?.steps) return [];
    return [...workflow.steps].sort((a, b) => a.startedAt - b.startedAt);
  }, [workflow]);

  useEffect(() => {
    if (!steps.length) {
      setSelectedStep(null);
      return;
    }

    setSelectedStep(prev => {
      if (prev) {
        const updated = steps.find(step => step.id === prev.id);
        return updated || steps[0];
      }
      return steps[0];
    });
  }, [steps]);

  useEffect(() => {
    if (!selectedStep?.metadata?.checkpointId) {
      setCheckpointPreview(null);
      setCheckpointError(null);
      return;
    }

    const checkpointId = selectedStep.metadata.checkpointId as string;
    setCheckpointLoading(true);
    setCheckpointError(null);

    fetch(`/api/workflow/checkpoint?checkpointId=${checkpointId}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || '获取 diff 失败');
        }
        setCheckpointPreview({
          checkpointId,
          filePath: data.checkpoint.filePath,
          originalContent: data.checkpoint.originalContent,
          modifiedContent: data.checkpoint.modifiedContent,
          status: data.checkpoint.status,
        });
      })
      .catch(err => {
        setCheckpointError(err.message);
      })
      .finally(() => setCheckpointLoading(false));
  }, [selectedStep?.metadata?.checkpointId]);

  const statusStyles: Record<string, string> = {
    pending: 'bg-yellow-50 text-yellow-700 border-yellow-100',
    in_progress: 'bg-blue-50 text-blue-700 border-blue-100',
    completed: 'bg-green-50 text-green-700 border-green-100',
    error: 'bg-red-50 text-red-600 border-red-100',
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          正在加载工作流...
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 text-sm text-red-500">
          <p className="mb-3">无法获取工作流：{error}</p>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              重试
            </button>
          )}
        </div>
      );
    }

    if (!workflow || steps.length === 0) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-gray-500 px-8">
          <svg className="w-20 h-20 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-lg font-medium text-gray-700 mb-2">暂无工作流数据</p>
          <p className="text-sm text-gray-500 text-center max-w-xs">
            请先在「聊天」标签页与 AI 对话，系统会自动记录执行 todo 列表与代码修改节点。
          </p>
        </div>
      );
    }

    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <div className="p-4 space-y-3">
            {steps.map(step => (
              <button
                key={step.id}
                onClick={() => setSelectedStep(step)}
                className={`w-full text-left rounded-xl border p-4 bg-white transition-all ${
                  selectedStep?.id === step.id ? 'border-blue-400 shadow-md' : 'border-gray-200 hover:border-blue-200'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{step.title}</p>
                    {step.description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{step.description}</p>
                    )}
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full border ${statusStyles[step.status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                    {statusLabel(step.status)}
                  </span>
                </div>
                <div className="mt-3 flex items-center text-xs text-gray-400 gap-4">
                  <span>类型：{stepTypeLabel(step.type)}</span>
                  <span>
                    {new Date(step.startedAt).toLocaleTimeString('zh-CN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="border-t bg-white p-4 h-96 overflow-y-auto">
          {selectedStep ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">{selectedStep.title}</p>
                {selectedStep.description && (
                  <p className="text-xs text-gray-500 mt-1 whitespace-pre-wrap break-words">
                    {selectedStep.description}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                <span>状态：{statusLabel(selectedStep.status)}</span>
                {selectedStep.metadata?.tool && (
                  <span>工具：{selectedStep.metadata.tool}</span>
                )}
                {selectedStep.metadata?.filePath && (
                  <span>文件：{selectedStep.metadata.filePath}</span>
                )}
              </div>

              {selectedStep.metadata?.checkpointId && (
                <div className="border rounded-lg overflow-hidden">
                  {checkpointLoading && (
                    <div className="p-3 text-xs text-gray-500">正在加载代码差异...</div>
                  )}
                  {checkpointError && (
                    <div className="p-3 text-xs text-red-500">{checkpointError}</div>
                  )}
                  {checkpointPreview && !checkpointLoading && !checkpointError && (
                    <DiffViewer
                      filePath={checkpointPreview.filePath}
                      originalContent={checkpointPreview.originalContent}
                      modifiedContent={checkpointPreview.modifiedContent}
                      mode="preview"
                      height={320}
                    />
                  )}
                </div>
              )}

              {!selectedStep.metadata?.checkpointId && selectedStep.metadata?.result && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-2">工具输出</p>
                  <pre className="text-xs text-gray-800 whitespace-pre-wrap break-words">
                    {JSON.stringify(selectedStep.metadata.result, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-500 text-sm">请选择左侧的步骤查看详情</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-blue-50 to-purple-50">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Todo 列表 & 工作流追踪</h2>
          <p className="text-xs text-gray-500 mt-0.5">查看每个 AI 节点并追溯代码 diff</p>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="text-xs px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50"
          >
            刷新
          </button>
        )}
      </div>
      {renderContent()}
    </div>
  );
}

function statusLabel(status: string) {
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
}

function stepTypeLabel(type: string) {
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
}

export default DebugPanel;
