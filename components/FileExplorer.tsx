'use client';

import { useState, useEffect, useRef } from 'react';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

interface FileExplorerProps {
  sessionId: string;
  onSelectFile: (path: string, content: string) => void;
  refreshTrigger?: number;
  currentFilePath?: string;
  onFileUpdate?: (path: string, content: string) => void;
}

export function FileExplorer({ 
  sessionId, 
  onSelectFile, 
  refreshTrigger, 
  currentFilePath,
  onFileUpdate 
}: FileExplorerProps) {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  
  const loadFiles = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/workspace/files?sessionId=${sessionId}`);
      const data = await response.json();
      setFiles(data.files || []);
    } catch (error) {
      console.error('Failed to load files:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // 索引代码库
  const handleIndexCodebase = async () => {
    if (indexing) return;
    
    setIndexing(true);
    try {
      const response = await fetch('/api/codebase/index', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('✅ 代码库索引完成！现在 AI 可以智能搜索代码了。');
      } else {
        alert('❌ 索引失败: ' + data.error);
      }
    } catch (error) {
      console.error('Index error:', error);
      alert('❌ 索引失败，请检查控制台');
    } finally {
      setIndexing(false);
    }
  };
  
  useEffect(() => {
    loadFiles();
    const interval = setInterval(loadFiles, 5000);
    return () => clearInterval(interval);
  }, [sessionId]);
  
  // 当收到刷新信号时，重新加载当前文件
  useEffect(() => {
    if (refreshTrigger && currentFilePath && onFileUpdate) {
      const reloadCurrentFile = async () => {
        try {
          const response = await fetch('/api/workspace/files', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, filePath: currentFilePath }),
          });
          const data = await response.json();
          onFileUpdate(currentFilePath, data.content);
        } catch (error) {
          console.error('Failed to reload file:', error);
        }
      };
      reloadCurrentFile();
    }
  }, [refreshTrigger]);
  
  const handleFileClick = async (file: FileNode) => {
    if (file.type === 'directory') {
      setExpandedDirs(prev => {
        const next = new Set(prev);
        if (next.has(file.path)) {
          next.delete(file.path);
        } else {
          next.add(file.path);
        }
        return next;
      });
    } else {
      setSelectedFile(file.path);
      try {
        const response = await fetch('/api/workspace/files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, filePath: file.path }),
        });
        const data = await response.json();
        onSelectFile(file.path, data.content);
      } catch (error) {
        console.error('Failed to load file:', error);
      }
    }
  };
  
  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('sessionId', sessionId);
      
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }
      
      const response = await fetch('/api/workspace/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        await loadFiles();
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleUpload(e.dataTransfer.files);
  };
  
  const renderNode = (node: FileNode, depth = 0) => {
    const isExpanded = expandedDirs.has(node.path);
    const isDirectory = node.type === 'directory';
    const isSelected = selectedFile === node.path;
    
    return (
      <div key={node.path}>
        <div
          className={`flex items-center px-2 py-1.5 hover:bg-gray-100 cursor-pointer text-sm transition-colors ${
            isSelected ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
          }`}
          style={{ paddingLeft: `${depth * 16 + 12}px` }}
          onClick={() => handleFileClick(node)}
        >
          {isDirectory && (
            <span className="mr-1.5 text-xs">
              {isExpanded ? '📂' : '📁'}
            </span>
          )}
          {!isDirectory && <span className="mr-1.5 text-xs">📄</span>}
          <span className="truncate">{node.name}</span>
        </div>
        {isDirectory && isExpanded && node.children && (
          <div>
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div 
      className={`h-full flex flex-col bg-gray-50 ${dragOver ? 'drag-over' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {/* 头部 */}
      <div className="px-3 py-2.5 border-b border-gray-200 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-900 uppercase tracking-wider">
          文件资源管理器
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 hover:bg-gray-200 rounded text-gray-600 transition-colors"
            title="上传文件"
            disabled={uploading}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            onClick={() => folderInputRef.current?.click()}
            className="p-1.5 hover:bg-gray-200 rounded text-gray-600 transition-colors"
            title="上传文件夹"
            disabled={uploading}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </button>
          <button
            onClick={loadFiles}
            className="p-1.5 hover:bg-gray-200 rounded text-gray-600 transition-colors"
            disabled={loading}
            title="刷新文件列表"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            onClick={handleIndexCodebase}
            className="p-1.5 hover:bg-blue-100 rounded text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={indexing || files.length === 0}
            title={indexing ? "正在索引..." : "索引代码库（用于 AI 智能搜索）"}
          >
            {indexing ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
          </button>
        </div>
      </div>
      
      {/* 文件列表 */}
      <div className="flex-1 overflow-y-auto">
        {uploading && (
          <div className="p-4 text-sm text-blue-600 bg-blue-50 border-b border-blue-100">
            正在上传文件...
          </div>
        )}
        {dragOver && (
          <div className="p-8 m-4 border-2 border-dashed border-blue-400 rounded-lg bg-blue-50 text-center">
            <div className="text-3xl mb-2">📁</div>
            <p className="text-sm font-medium text-blue-600">拖放文件到这里</p>
            <p className="text-xs text-blue-500 mt-1">支持单个文件或整个文件夹</p>
          </div>
        )}
        {!dragOver && files.length === 0 && !loading && (
          <div className="p-6 text-center">
            <div className="text-4xl mb-3">📂</div>
            <p className="text-sm font-medium text-gray-900 mb-1">暂无文件</p>
            <p className="text-xs text-gray-500 mb-4">
              上传文件或让 AI 创建
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded transition-colors"
              >
                上传文件
              </button>
              <button
                onClick={() => folderInputRef.current?.click()}
                className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs rounded transition-colors"
              >
                上传文件夹
              </button>
            </div>
          </div>
        )}
        {!dragOver && files.map(node => renderNode(node))}
      </div>
      
      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleUpload(e.target.files)}
      />
      <input
        ref={folderInputRef}
        type="file"
        /* @ts-ignore */
        webkitdirectory=""
        directory=""
        multiple
        className="hidden"
        onChange={(e) => handleUpload(e.target.files)}
      />
    </div>
  );
}
