// Codebase Embedding 类型定义

export interface CodeChunk {
  id: string;
  text: string;
  type: 'function' | 'class' | 'interface' | 'comment' | 'chunk';
  name?: string;
  startLine: number;
  endLine: number;
}

export interface SearchResult {
  content: string;
  filePath: string;
  type: string;
  name?: string;
  startLine: number;
  endLine: number;
  distance: number;
  similarity: number;
}

export interface IndexStatus {
  isIndexing: boolean;
  totalFiles: number;
  processedFiles: number;
  currentFile?: string;
}

