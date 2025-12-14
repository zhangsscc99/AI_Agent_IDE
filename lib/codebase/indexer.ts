// Codebase Indexer - 使用 GLM Embedding API
import { ChromaClient } from 'chromadb';
import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import fs from 'fs/promises';
import path from 'path';
import { CodeChunk, SearchResult } from './types';

export class CodebaseIndexer {
  private client: ChromaClient;
  private collection: any;
  private glmApiKey: string;
  private glmBaseUrl: string;
  
  constructor() {
    this.glmApiKey = process.env.GLM_API_KEY || '';
    this.glmBaseUrl = 'https://open.bigmodel.cn/api/paas/v4';
    
    // 初始化 ChromaDB 客户端
    this.client = new ChromaClient();
  }
  
  async initialize(collectionName = 'codebase') {
    try {
      // 尝试获取已存在的集合
      this.collection = await this.client.getCollection({
        name: collectionName
      });
      console.log(`Using existing collection: ${collectionName}`);
    } catch (error) {
      // 如果不存在，创建新集合
      this.collection = await this.client.createCollection({
        name: collectionName,
        metadata: { 'hnsw:space': 'cosine' }
      });
      console.log(`Created new collection: ${collectionName}`);
    }
  }
  
  // 生成 Embedding（使用 GLM API）
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await fetch(`${this.glmBaseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.glmApiKey}`
        },
        body: JSON.stringify({
          model: 'embedding-2',  // GLM 的 embedding 模型
          input: text
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GLM API error: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      return data.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }
  
  // 解析代码为语义块
  private async parseCode(code: string, filePath: string): Promise<CodeChunk[]> {
    const chunks: CodeChunk[] = [];
    
    // 根据文件类型选择解析策略
    const ext = path.extname(filePath).toLowerCase();
    
    if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
      // TypeScript/JavaScript 解析
      try {
        const ast = parser.parse(code, {
          sourceType: 'module',
          plugins: ['typescript', 'jsx']
        });
        
        // 遍历 AST，提取函数、类、接口等
        traverse(ast, {
          FunctionDeclaration: (path: any) => {
            const node = path.node;
            if (node.loc && node.start !== null && node.end !== null) {
              chunks.push({
                id: `${filePath}:${node.loc.start.line}`,
                text: code.slice(node.start, node.end),
                type: 'function',
                name: node.id?.name || 'anonymous',
                startLine: node.loc.start.line,
                endLine: node.loc.end.line,
              });
            }
          },
          ArrowFunctionExpression: (path: any) => {
            const node = path.node;
            const parent = path.parent;
            if (node.loc && node.start !== null && node.end !== null) {
              const name = parent.type === 'VariableDeclarator' ? parent.id.name : 'anonymous';
              chunks.push({
                id: `${filePath}:${node.loc.start.line}`,
                text: code.slice(node.start, node.end),
                type: 'function',
                name,
                startLine: node.loc.start.line,
                endLine: node.loc.end.line,
              });
            }
          },
          ClassDeclaration: (path: any) => {
            const node = path.node;
            if (node.loc && node.start !== null && node.end !== null) {
              chunks.push({
                id: `${filePath}:${node.loc.start.line}`,
                text: code.slice(node.start, node.end),
                type: 'class',
                name: node.id.name,
                startLine: node.loc.start.line,
                endLine: node.loc.end.line,
              });
            }
          },
          TSInterfaceDeclaration: (path: any) => {
            const node = path.node;
            if (node.loc && node.start !== null && node.end !== null) {
              chunks.push({
                id: `${filePath}:${node.loc.start.line}`,
                text: code.slice(node.start, node.end),
                type: 'interface',
                name: node.id.name,
                startLine: node.loc.start.line,
                endLine: node.loc.end.line,
              });
            }
          }
        });
      } catch (error) {
        console.log(`Failed to parse ${filePath} with AST, falling back to line chunking`);
        // 解析失败，使用行分块
        chunks.push(...this.chunkByLines(code, filePath));
      }
    } else {
      // 其他文件类型，按行分块
      chunks.push(...this.chunkByLines(code, filePath));
    }
    
    // 如果没有提取到任何块，至少创建一个
    if (chunks.length === 0) {
      chunks.push(...this.chunkByLines(code, filePath, 100));
    }
    
    return chunks;
  }
  
  // 按行分块（备用方案）
  private chunkByLines(code: string, filePath: string, linesPerChunk = 50): CodeChunk[] {
    const lines = code.split('\n');
    const chunks: CodeChunk[] = [];
    
    for (let i = 0; i < lines.length; i += linesPerChunk) {
      const chunkLines = lines.slice(i, i + linesPerChunk);
      const text = chunkLines.join('\n');
      
      // 跳过空块
      if (text.trim().length === 0) continue;
      
      chunks.push({
        id: `${filePath}:${i + 1}`,
        text,
        type: 'chunk',
        startLine: i + 1,
        endLine: i + chunkLines.length,
      });
    }
    
    return chunks;
  }
  
  // 索引单个文件
  async indexFile(filePath: string, workspacePath: string): Promise<number> {
    const fullPath = path.join(workspacePath, filePath);
    
    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      
      // 解析代码
      const chunks = await this.parseCode(content, filePath);
      
      console.log(`Indexing ${filePath}: ${chunks.length} chunks`);
      
      // 为每个块生成 embedding 并存储
      for (const chunk of chunks) {
        try {
          const embedding = await this.generateEmbedding(chunk.text);
          
          await this.collection.add({
            ids: [chunk.id],
            embeddings: [embedding],
            documents: [chunk.text],
            metadatas: [{
              filePath,
              type: chunk.type,
              name: chunk.name || '',
              startLine: chunk.startLine,
              endLine: chunk.endLine,
            }]
          });
        } catch (error) {
          console.error(`Error indexing chunk ${chunk.id}:`, error);
          // 继续处理下一个块
        }
      }
      
      return chunks.length;
    } catch (error) {
      console.error(`Error indexing file ${filePath}:`, error);
      throw error;
    }
  }
  
  // 搜索相关代码
  async search(query: string, topK = 5): Promise<SearchResult[]> {
    try {
      const queryEmbedding = await this.generateEmbedding(query);
      
      const results = await this.collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: topK,
      });
      
      if (!results.documents || !results.documents[0]) {
        return [];
      }
      
      return results.documents[0].map((doc: string, i: number) => ({
        content: doc,
        filePath: results.metadatas[0][i].filePath,
        type: results.metadatas[0][i].type,
        name: results.metadatas[0][i].name || undefined,
        startLine: results.metadatas[0][i].startLine,
        endLine: results.metadatas[0][i].endLine,
        distance: results.distances[0][i],
        similarity: Number((1 - results.distances[0][i]).toFixed(3)),
      }));
    } catch (error) {
      console.error('Error searching:', error);
      throw error;
    }
  }
  
  // 索引整个工作空间
  async indexWorkspace(
    workspacePath: string,
    onProgress?: (processed: number, total: number, currentFile: string) => void
  ): Promise<void> {
    const files = await this.walkDir(workspacePath);
    const codeFiles = files.filter(f => this.isCodeFile(f) && !this.shouldSkip(f));
    
    console.log(`Found ${codeFiles.length} code files to index`);
    
    let processed = 0;
    for (const file of codeFiles) {
      const relativePath = path.relative(workspacePath, file);
      
      try {
        await this.indexFile(relativePath, workspacePath);
        processed++;
        
        if (onProgress) {
          onProgress(processed, codeFiles.length, relativePath);
        }
      } catch (error) {
        console.error(`Failed to index ${relativePath}:`, error);
        // 继续处理下一个文件
      }
    }
    
    console.log(`Indexing complete: ${processed}/${codeFiles.length} files`);
  }
  
  // 递归遍历目录
  private async walkDir(dir: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          if (!this.shouldSkipDir(entry.name)) {
            files.push(...await this.walkDir(fullPath));
          }
        } else {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.error(`Error walking directory ${dir}:`, error);
    }
    
    return files;
  }
  
  // 判断是否为代码文件
  private isCodeFile(filename: string): boolean {
    const codeExts = [
      '.ts', '.tsx', '.js', '.jsx',
      '.py', '.java', '.cpp', '.c', '.h',
      '.go', '.rs', '.rb', '.php',
      '.vue', '.svelte'
    ];
    return codeExts.some(ext => filename.endsWith(ext));
  }
  
  // 判断是否应该跳过目录
  private shouldSkipDir(dirname: string): boolean {
    const skipDirs = [
      'node_modules', '.git', 'dist', 'build',
      '.next', 'out', 'coverage', '.vscode',
      '__pycache__', 'venv', '.pytest_cache'
    ];
    return skipDirs.includes(dirname);
  }
  
  // 判断是否应该跳过文件
  private shouldSkip(filePath: string): boolean {
    const skipDirs = this.shouldSkipDir.bind(this);
    return filePath.split(path.sep).some(part => skipDirs(part));
  }
  
  // 清除索引
  async clearIndex(): Promise<void> {
    try {
      await this.client.deleteCollection({ name: 'codebase' });
      console.log('Index cleared');
      await this.initialize();
    } catch (error) {
      console.error('Error clearing index:', error);
    }
  }
}

// 单例
let indexerInstance: CodebaseIndexer | null = null;

export async function getIndexer(): Promise<CodebaseIndexer> {
  if (!indexerInstance) {
    indexerInstance = new CodebaseIndexer();
    await indexerInstance.initialize();
  }
  return indexerInstance;
}

