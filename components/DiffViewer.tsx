'use client';

import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

// 正确导入 DiffEditor
const DiffEditor = dynamic(
  () => import('@monaco-editor/react').then((mod) => mod.DiffEditor),
  {
    ssr: false,
    loading: () => <div className="h-full flex items-center justify-center text-gray-500">加载 Diff 视图...</div>,
  }
);

interface DiffViewerProps {
  filePath: string;
  originalContent: string;
  modifiedContent: string;
  onApprove?: () => void;
  onReject?: () => void;
  isApplying?: boolean;
  mode?: 'approval' | 'preview';
  height?: number;
}

export function DiffViewer({
  filePath,
  originalContent,
  modifiedContent,
  onApprove,
  onReject,
  isApplying = false,
  mode = 'approval',
  height = 500,
}: DiffViewerProps) {
  const editorRef = useRef<any>(null);
  
  // 组件卸载时清理编辑器
  useEffect(() => {
    return () => {
      if (editorRef.current) {
        try {
          editorRef.current.dispose();
        } catch (e) {
          // 忽略清理错误
        }
      }
    };
  }, []);
  
  const getLanguage = (path: string) => {
    const ext = path.split('.').pop()?.toLowerCase();
    const map: Record<string, string> = {
      ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
      py: 'python', java: 'java', cpp: 'cpp', c: 'c', go: 'go', rs: 'rust',
      html: 'html', css: 'css', json: 'json', md: 'markdown',
    };
    return map[ext || ''] || 'plaintext';
  };

  const isPreview = mode === 'preview';

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
      {/* 头部 */}
      <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-white border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center relative">
            {isApplying ? (
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="#0066FF" strokeWidth="4"></circle>
                <path className="opacity-75" fill="#0066FF" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 2L3 5L8 8L13 5L8 2Z" fill="#0066FF"/>
                <path d="M3 11L8 14L13 11" stroke="#0066FF" strokeWidth="1.5"/>
              </svg>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900">
                {isPreview ? '历史代码变更' : 'AI 代码修改建议'}
              </span>
              {isApplying ? (
                <span className="text-xs text-gray-500 animate-pulse">thinking...</span>
              ) : (
                <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                  isPreview ? 'text-gray-600 bg-gray-100' : 'text-blue-700 bg-blue-100'
                }`}>
                  {isPreview ? '预览' : '待审批'}
                </span>
              )}
            </div>
            <span className="text-xs text-gray-500 mt-0.5 block">{filePath}</span>
          </div>
        </div>
      </div>

      {/* Diff 编辑器 */}
      <div className="bg-gray-50" style={{ height }}>
        <DiffEditor
          key={`${filePath}-${originalContent?.length}-${modifiedContent?.length}`}
          original={originalContent}
          modified={modifiedContent}
          language={getLanguage(filePath)}
          theme="light"
          onMount={(editor) => {
            editorRef.current = editor;
          }}
          options={{
            readOnly: true,
            renderSideBySide: true,
            fontSize: 13,
            fontFamily: "'Menlo', 'Monaco', 'Courier New', monospace",
            lineNumbers: 'on',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: 'off',
            renderWhitespace: 'boundary',
          }}
        />
      </div>

      {/* 底部操作按钮 */}
      {mode === 'approval' && (
        <div className="px-5 py-3 bg-white border-t border-gray-200">
          <div className="flex items-center justify-end">
            <div className="flex gap-3">
              <button
                onClick={() => onReject?.()}
                disabled={isApplying}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                拒绝
              </button>
              <button
                onClick={() => onApprove?.()}
                disabled={isApplying}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-400 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow"
              >
                ✓ 确认
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
