'use client';

import { useState, useEffect } from 'react';
import { FileExplorer } from '@/components/FileExplorer';
import { CodeEditor } from '@/components/CodeEditor';
import { ChatPanel } from '@/components/ChatPanel';

export default function Home() {
  const [sessionId] = useState(() => crypto.randomUUID());
  const [currentFile, setCurrentFile] = useState<{
    path: string;
    content: string;
  } | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [chatWidth, setChatWidth] = useState(380);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // 刷新当前文件
  const refreshCurrentFile = () => {
    setRefreshTrigger(prev => prev + 1);
  };
  
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
      
      {/* 调整大小手柄 */}
      <div
        className="w-[1px] bg-gray-200 hover:bg-blue-500 cursor-col-resize transition-colors"
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
      />
      
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
      
      {/* 调整大小手柄 */}
      <div
        className="w-[1px] bg-gray-200 hover:bg-blue-500 cursor-col-resize transition-colors"
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
      />
      
      {/* AI 聊天面板 */}
      <div
        className="border-l border-gray-200 overflow-hidden bg-white"
        style={{ width: chatWidth }}
      >
        <ChatPanel 
          sessionId={sessionId} 
          currentFile={currentFile}
          onFileModified={refreshCurrentFile}
        />
      </div>
    </div>
  );
}


