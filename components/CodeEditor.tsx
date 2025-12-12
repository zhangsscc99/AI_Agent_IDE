'use client';

import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

const Editor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-[#1e1e1e] text-gray-400">
      <div className="text-center">
        <div className="text-4xl mb-4">⏳</div>
        <p className="text-lg">加载编辑器中...</p>
      </div>
    </div>
  ),
});

interface CodeEditorProps {
  file: { path: string; content: string } | null;
  onContentChange?: (content: string) => void;
}

export function CodeEditor({ file, onContentChange }: CodeEditorProps) {
  const editorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(null);
  
  const handleEditorDidMount = (
    editor: any,
    monaco: any
  ) => {
    editorRef.current = editor;
    
    // 配置 Monaco 主题（Cursor Light）
    monaco.editor.defineTheme('cursor-light', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#1e1e1e',
        'editor.lineHighlightBackground': '#f9fafb',
        'editorLineNumber.foreground': '#9ca3af',
        'editorLineNumber.activeForeground': '#1e1e1e',
      },
    });
    
    monaco.editor.setTheme('cursor-light');
  };
  
  const getLanguage = (filePath: string): string => {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      py: 'python',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      cs: 'csharp',
      go: 'go',
      rs: 'rust',
      php: 'php',
      rb: 'ruby',
      swift: 'swift',
      kt: 'kotlin',
      html: 'html',
      css: 'css',
      scss: 'scss',
      json: 'json',
      xml: 'xml',
      yaml: 'yaml',
      yml: 'yaml',
      md: 'markdown',
      sql: 'sql',
      sh: 'shell',
      bash: 'shell',
    };
    return languageMap[ext || ''] || 'plaintext';
  };
  
  useEffect(() => {
    if (editorRef.current && file && typeof window !== 'undefined') {
      const model = editorRef.current.getModel();
      if (model && (window as any).monaco) {
        // 更新语言
        const language = getLanguage(file.path);
        (window as any).monaco.editor.setModelLanguage(model, language);
      }
    }
  }, [file?.path]);
  
  if (!file) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="text-6xl mb-4">📝</div>
          <p className="text-lg font-medium text-gray-900">没有打开的文件</p>
          <p className="text-sm text-gray-500 mt-2">从左侧选择一个文件或让 AI 创建新文件</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full monaco-editor-container">
      <Editor
        height="100%"
        language={getLanguage(file.path)}
        value={file.content}
        onChange={(value) => {
          if (value !== undefined && onContentChange) {
            onContentChange(value);
          }
        }}
        onMount={handleEditorDidMount}
        theme="cursor-light"
        options={{
          fontSize: 13,
          fontFamily: "'Menlo', 'Monaco', 'Courier New', monospace",
          minimap: { enabled: true },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: 'on',
          lineNumbers: 'on',
          renderWhitespace: 'selection',
          bracketPairColorization: { enabled: true },
          padding: { top: 16, bottom: 16 },
          lineHeight: 22,
          cursorBlinking: 'smooth',
          smoothScrolling: true,
        }}
      />
    </div>
  );
}


