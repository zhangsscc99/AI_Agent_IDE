'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileExplorer } from '@/components/FileExplorer';
import { CodeEditor } from '@/components/CodeEditor';
import { ChatPanel } from '@/components/ChatPanel';
import { DebugPanel } from '@/components/DebugPanel';
import { generateUUID } from '@/lib/utils/uuid';

export default function Home() {
  const [sessionId] = useState(() => generateUUID());
  const [currentFile, setCurrentFile] = useState<{
    path: string;
    content: string;
  } | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [chatWidth, setChatWidth] = useState(380);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState<'chat' | 'debug'>('chat');
  const [workflowData, setWorkflowData] = useState<any>(null);
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  
  const fetchWorkflow = useCallback(async () => {
    try {
      setWorkflowLoading(true);
      setWorkflowError(null);
      const response = await fetch(`/api/workflow?sessionId=${sessionId}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch workflow');
      }
      setWorkflowData(data.workflow);
    } catch (error: any) {
      setWorkflowError(error.message);
    } finally {
      setWorkflowLoading(false);
    }
  }, [sessionId]);

  // 刷新当前文件
  const refreshCurrentFile = () => {
    setRefreshTrigger(prev => prev + 1);
  };
  
  // 处理调试事件 -> 触发工作流刷新
  const handleDebugEvent = useCallback(() => {
    fetchWorkflow();
  }, [fetchWorkflow]);

  useEffect(() => {
    if (activeTab === 'debug') {
      fetchWorkflow();
    }
  }, [activeTab, fetchWorkflow]);
  
  return (
    <div className="flex h-screen bg-white text-gray-900">
      {/* 文件浏览器 */}
      <div
        className="border-r border-gray-200 overflow-hidden bg-gray-50"
        style={{ width: sidebarWidth }}
      >
        <FileExplorer
          sessionId={sessionId}
          onSelectFile={(path, content) => {
            setCurrentFile({ path, content });
          }}
          refreshTrigger={refreshTrigger}
          currentFilePath={currentFile?.path}
          onFileUpdate={(path, content) => {
            if (currentFile?.path === path) {
              setCurrentFile({ path, content });
            }
          }}
        />
      </div>
      
      {/* 调整大小手柄 - 加宽点击区域 */}
      <div
        className="w-1.5 bg-gray-200 hover:bg-blue-400 cursor-col-resize transition-all relative group flex-shrink-0"
        onMouseDown={(e) => {
          const startX = e.clientX;
          const startWidth = sidebarWidth;
          
          const handleMouseMove = (e: MouseEvent) => {
            const delta = e.clientX - startX;
            setSidebarWidth(Math.max(150, Math.min(500, startWidth + delta)));
          };
          
          const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
          };
          
          document.addEventListener('mousemove', handleMouseMove);
          document.addEventListener('mouseup', handleMouseUp);
        }}
      >
        {/* 悬停时显示的加宽提示 */}
        <div className="absolute inset-y-0 -left-2 -right-2 group-hover:bg-blue-400 group-hover:opacity-20 transition-all"></div>
      </div>
      
      {/* 代码编辑器 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white px-5 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* AI 助手 Logo */}
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="white" fillOpacity="0.9"/>
                  <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fillOpacity="0.9"/>
                  <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fillOpacity="0.9"/>
                </svg>
              </div>
              <div>
                <h1 className="text-base font-semibold text-gray-900">AI IDE Agent</h1>
                {currentFile && (
                  <p className="text-xs text-gray-500 mt-0.5">{currentFile.path}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded">GLM-4</span>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <CodeEditor
            file={currentFile}
            onContentChange={(content) => {
              if (currentFile) {
                setCurrentFile({ ...currentFile, content });
              }
            }}
          />
        </div>
      </div>
      
      {/* 调整大小手柄 - 加宽点击区域 */}
      <div
        className="w-1.5 bg-gray-200 hover:bg-blue-400 cursor-col-resize transition-all relative group flex-shrink-0"
        onMouseDown={(e) => {
          const startX = e.clientX;
          const startWidth = chatWidth;
          
          const handleMouseMove = (e: MouseEvent) => {
            const delta = startX - e.clientX;
            setChatWidth(Math.max(300, Math.min(800, startWidth + delta)));
          };
          
          const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
          };
          
          document.addEventListener('mousemove', handleMouseMove);
          document.addEventListener('mouseup', handleMouseUp);
        }}
      >
        {/* 悬停时显示的加宽提示 */}
        <div className="absolute inset-y-0 -left-2 -right-2 group-hover:bg-blue-400 group-hover:opacity-20 transition-all"></div>
      </div>
      
      {/* AI 聊天/调试面板 */}
      <div
        className="border-l border-gray-200 overflow-hidden bg-white flex flex-col"
        style={{ width: chatWidth }}
      >
        {/* 标签切换 */}
        <div className="border-b border-gray-200 px-4 py-2 bg-gray-50 flex gap-2">
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'chat'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            聊天
          </button>
          <button
            onClick={() => {
              setActiveTab('debug');
              fetchWorkflow();
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'debug'
                ? 'bg-white text-purple-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            调试
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'chat' ? (
            <ChatPanel 
              sessionId={sessionId} 
              currentFile={currentFile}
              workflow={workflowData}
              onFileModified={refreshCurrentFile}
              onDebugEvent={handleDebugEvent}
            />
          ) : (
            <DebugPanel 
              workflow={workflowData}
              isLoading={workflowLoading}
              error={workflowError}
              onRefresh={fetchWorkflow}
            />
          )}
        </div>
      </div>
    </div>
  );
}
