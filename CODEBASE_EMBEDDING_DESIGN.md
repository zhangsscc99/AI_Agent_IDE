# 🧠 Codebase Embedding 设计方案

## 📋 需求分析

### 当前痛点

1. **AI 看不到全局代码** - 只能看到当前打开的文件
2. **无法语义搜索** - 用户必须精确说出文件名
3. **缺乏上下文** - AI 不知道项目结构

### 目标功能

1. ✅ 用自然语言搜索代码
2. ✅ AI 自动找到相关文件
3. ✅ 理解项目结构和依赖关系
4. ✅ 提供更准确的代码建议

---

## 🏗️ 技术架构

### 1. 整体流程

```
代码库
  ↓
代码解析（AST）
  ↓
分块（Chunking）
  ↓
生成向量（Embedding）
  ↓
存储到向量数据库
  ↓
用户查询
  ↓
向量相似度搜索
  ↓
返回最相关的代码片段
```

### 2. 技术栈选择

#### 方案 A：轻量级（推荐 MVP）

| 组件 | 技术 | 理由 |
|------|------|------|
| **Embedding 模型** | `text-embedding-3-small` (OpenAI) | API 调用，无需本地部署 |
| **向量数据库** | `chromadb` (纯 JS) | 轻量，易集成，支持内存模式 |
| **代码解析** | `@babel/parser` + `tree-sitter` | 生成 AST，提取语义信息 |
| **文件监听** | `chokidar` | 实时监听代码变化 |

#### 方案 B：完整方案（生产级）

| 组件 | 技术 | 理由 |
|------|------|------|
| **Embedding 模型** | `jina-embeddings-v2-code` | 专门针对代码优化 |
| **向量数据库** | `qdrant` 或 `weaviate` | 高性能，支持复杂查询 |
| **代码解析** | `tree-sitter` | 多语言支持 |
| **增量索引** | 自定义 | 只重新索引变化的文件 |

---

## 💻 实现步骤

### Phase 1: 基础索引（2-3 天）

#### 1.1 安装依赖

```bash
npm install chromadb @babel/parser @babel/traverse chokidar
npm install openai  # 用于生成 embedding
```

#### 1.2 创建索引器

```typescript
// lib/codebase/indexer.ts
import { ChromaClient } from 'chromadb';
import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import fs from 'fs/promises';
import path from 'path';
import { OpenAI } from 'openai';

export class CodebaseIndexer {
  private client: ChromaClient;
  private collection: any;
  private openai: OpenAI;
  
  constructor() {
    this.client = new ChromaClient();
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  
  async initialize() {
    // 创建或获取集合
    this.collection = await this.client.getOrCreateCollection({
      name: 'codebase',
      metadata: { 'hnsw:space': 'cosine' }
    });
  }
  
  // 索引单个文件
  async indexFile(filePath: string, workspacePath: string) {
    const fullPath = path.join(workspacePath, filePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    
    // 解析代码
    const chunks = await this.parseCode(content, filePath);
    
    // 生成 embedding
    for (const chunk of chunks) {
      const embedding = await this.generateEmbedding(chunk.text);
      
      await this.collection.add({
        ids: [chunk.id],
        embeddings: [embedding],
        documents: [chunk.text],
        metadatas: [{
          filePath,
          type: chunk.type,  // 'function', 'class', 'comment', etc.
          startLine: chunk.startLine,
          endLine: chunk.endLine,
        }]
      });
    }
  }
  
  // 解析代码为语义块
  private async parseCode(code: string, filePath: string) {
    const chunks: any[] = [];
    
    try {
      const ast = parser.parse(code, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx']
      });
      
      // 遍历 AST，提取函数、类等
      traverse(ast, {
        FunctionDeclaration(path) {
          chunks.push({
            id: `${filePath}:${path.node.loc?.start.line}`,
            text: code.slice(path.node.start!, path.node.end!),
            type: 'function',
            name: path.node.id?.name || 'anonymous',
            startLine: path.node.loc?.start.line,
            endLine: path.node.loc?.end.line,
          });
        },
        ClassDeclaration(path) {
          chunks.push({
            id: `${filePath}:${path.node.loc?.start.line}`,
            text: code.slice(path.node.start!, path.node.end!),
            type: 'class',
            name: path.node.id.name,
            startLine: path.node.loc?.start.line,
            endLine: path.node.loc?.end.line,
          });
        }
      });
    } catch (error) {
      // 如果解析失败，按行分块
      chunks.push(...this.chunkByLines(code, filePath));
    }
    
    return chunks;
  }
  
  // 按行分块（备用方案）
  private chunkByLines(code: string, filePath: string, linesPerChunk = 50) {
    const lines = code.split('\n');
    const chunks: any[] = [];
    
    for (let i = 0; i < lines.length; i += linesPerChunk) {
      const chunkLines = lines.slice(i, i + linesPerChunk);
      chunks.push({
        id: `${filePath}:${i + 1}`,
        text: chunkLines.join('\n'),
        type: 'chunk',
        startLine: i + 1,
        endLine: i + chunkLines.length,
      });
    }
    
    return chunks;
  }
  
  // 生成 embedding
  private async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  }
  
  // 搜索相关代码
  async search(query: string, topK = 5) {
    const queryEmbedding = await this.generateEmbedding(query);
    
    const results = await this.collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: topK,
    });
    
    return results.documents[0].map((doc, i) => ({
      content: doc,
      filePath: results.metadatas[0][i].filePath,
      type: results.metadatas[0][i].type,
      startLine: results.metadatas[0][i].startLine,
      endLine: results.metadatas[0][i].endLine,
      distance: results.distances[0][i],
    }));
  }
  
  // 索引整个工作空间
  async indexWorkspace(workspacePath: string) {
    const files = await this.walkDir(workspacePath);
    
    for (const file of files) {
      // 跳过 node_modules、.git 等
      if (this.shouldSkip(file)) continue;
      
      console.log(`Indexing: ${file}`);
      await this.indexFile(file, workspacePath);
    }
  }
  
  private async walkDir(dir: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...await this.walkDir(fullPath));
      } else if (this.isCodeFile(entry.name)) {
        files.push(fullPath);
      }
    }
    
    return files;
  }
  
  private isCodeFile(filename: string): boolean {
    const codeExts = ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.cpp', '.c', '.go', '.rs'];
    return codeExts.some(ext => filename.endsWith(ext));
  }
  
  private shouldSkip(filePath: string): boolean {
    const skipDirs = ['node_modules', '.git', 'dist', 'build', '.next'];
    return skipDirs.some(dir => filePath.includes(dir));
  }
}
```

#### 1.3 添加 API 端点

```typescript
// app/api/codebase/index/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { CodebaseIndexer } from '@/lib/codebase/indexer';
import path from 'path';

export async function POST(req: NextRequest) {
  const { sessionId } = await req.json();
  const workspacePath = path.join(process.cwd(), 'workspace', sessionId);
  
  const indexer = new CodebaseIndexer();
  await indexer.initialize();
  
  console.log('Starting indexing...');
  await indexer.indexWorkspace(workspacePath);
  
  return NextResponse.json({ success: true, message: 'Indexing complete' });
}
```

```typescript
// app/api/codebase/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { CodebaseIndexer } from '@/lib/codebase/indexer';

export async function POST(req: NextRequest) {
  const { query, topK = 5 } = await req.json();
  
  const indexer = new CodebaseIndexer();
  await indexer.initialize();
  
  const results = await indexer.search(query, topK);
  
  return NextResponse.json({ results });
}
```

---

### Phase 2: 集成到 Agent（1-2 天）

#### 2.1 添加搜索工具

```typescript
// lib/agent/tools.ts
export const codebaseSearchTool: Tool = {
  name: 'search_codebase',
  description: 'Search the codebase using natural language. Use this to find relevant code before making changes.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Natural language query describing what code you are looking for'
      },
      topK: {
        type: 'number',
        description: 'Number of results to return (default: 5)'
      }
    },
    required: ['query']
  },
  execute: async ({ query, topK = 5 }) => {
    const response = await fetch('/api/codebase/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, topK })
    });
    
    const { results } = await response.json();
    
    return {
      success: true,
      results: results.map((r: any) => ({
        file: r.filePath,
        lines: `${r.startLine}-${r.endLine}`,
        type: r.type,
        similarity: (1 - r.distance).toFixed(2),
        preview: r.content.slice(0, 200) + '...'
      }))
    };
  }
};

// 添加到工具列表
export const TOOLS = {
  read_file: readFileTool,
  write_file: writeFileTool,
  list_files: listFilesTool,
  search_codebase: codebaseSearchTool,  // ← 新增
  apply_patch: applyPatchTool,
  create_patch: createPatchTool,
};
```

#### 2.2 更新 System Prompt

```typescript
// lib/agent/executor.ts
this.systemPrompt = `你是一个专业的 AI 编程助手...

## 可用工具

1. **search_codebase** - 搜索代码库
   - 用于查找相关代码
   - 在修改代码前，先搜索了解项目结构
   - 例如："查找处理用户认证的代码"

2. **read_file** - 读取文件
   ...

## 工作流程

1. 收到用户请求
2. 如果不确定在哪个文件，先用 search_codebase 搜索
3. 找到相关文件后，用 read_file 读取
4. 理解代码后，用 write_file 修改
...
`;
```

---

### Phase 3: 实时更新（1 天）

#### 3.1 文件监听

```typescript
// lib/codebase/watcher.ts
import chokidar from 'chokidar';
import { CodebaseIndexer } from './indexer';

export class CodebaseWatcher {
  private watcher: chokidar.FSWatcher | null = null;
  private indexer: CodebaseIndexer;
  
  constructor(private workspacePath: string) {
    this.indexer = new CodebaseIndexer();
  }
  
  async start() {
    await this.indexer.initialize();
    
    this.watcher = chokidar.watch(this.workspacePath, {
      ignored: /(^|[\/\\])\../, // 忽略隐藏文件
      persistent: true,
      ignoreInitial: true
    });
    
    this.watcher
      .on('add', path => this.onFileChange(path, 'add'))
      .on('change', path => this.onFileChange(path, 'change'))
      .on('unlink', path => this.onFileDelete(path));
    
    console.log(`Watching: ${this.workspacePath}`);
  }
  
  private async onFileChange(filePath: string, event: string) {
    console.log(`File ${event}: ${filePath}`);
    
    // 重新索引文件
    const relativePath = path.relative(this.workspacePath, filePath);
    await this.indexer.indexFile(relativePath, this.workspacePath);
  }
  
  private async onFileDelete(filePath: string) {
    console.log(`File deleted: ${filePath}`);
    // TODO: 从向量数据库删除
  }
  
  stop() {
    this.watcher?.close();
  }
}
```

---

## 🎨 前端集成

### 1. 添加"索引代码库"按钮

```typescript
// components/FileExplorer.tsx
export default function FileExplorer() {
  const [isIndexing, setIsIndexing] = useState(false);
  
  const handleIndex = async () => {
    setIsIndexing(true);
    try {
      await fetch('/api/codebase/index', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      alert('索引完成！');
    } catch (error) {
      console.error(error);
    } finally {
      setIsIndexing(false);
    }
  };
  
  return (
    <div>
      <button
        onClick={handleIndex}
        disabled={isIndexing}
        className="..."
      >
        {isIndexing ? '正在索引...' : '🔍 索引代码库'}
      </button>
      {/* 文件树 */}
    </div>
  );
}
```

### 2. 显示搜索结果

```typescript
// components/ChatPanel.tsx
if (event.type === 'tool_call' && event.data.name === 'search_codebase') {
  return (
    <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
      <div className="font-semibold mb-2">🔍 代码搜索结果：</div>
      {event.data.result.results.map((r, i) => (
        <div key={i} className="mb-2 p-2 bg-white rounded">
          <div className="font-mono text-sm">{r.file}</div>
          <div className="text-xs text-gray-500">
            {r.type} | 行 {r.lines} | 相似度 {r.similarity}
          </div>
          <pre className="text-xs mt-1 text-gray-600">{r.preview}</pre>
        </div>
      ))}
    </div>
  );
}
```

---

## 📊 效果示例

### 场景 1：智能搜索

**用户：** "在哪里处理文件上传？"

**AI：**
```
🔧 调用工具: search_codebase
查询: "file upload handling"

🔍 搜索结果:
1. app/api/workspace/upload/route.ts (相似度: 0.92)
   - 类型: function
   - 行: 15-45
   - 预览: export async function POST(request: NextRequest) {...

2. components/FileExplorer.tsx (相似度: 0.87)
   - 类型: function
   - 行: 78-120
   - 预览: const handleFileUpload = async (files) {...

根据搜索结果，文件上传在以下位置处理：
1. 后端：app/api/workspace/upload/route.ts
2. 前端：components/FileExplorer.tsx
```

### 场景 2：自动找到相关文件

**用户：** "添加一个删除文件的功能"

**AI：**
```
🔧 调用工具: search_codebase
查询: "file operations delete remove"

🔍 找到相关代码：
- lib/agent/tools.ts (已有 read_file, write_file)
- app/api/workspace/files/route.ts (文件列表 API)

我将在这些位置添加删除功能...

🔧 调用工具: write_file
路径: lib/agent/tools.ts
内容: [添加 delete_file 工具]
```

---

## ⏱️ 开发时间估算

| 阶段 | 任务 | 时间 |
|------|------|------|
| Phase 1 | 基础索引器 | 2-3 天 |
| Phase 2 | 集成到 Agent | 1-2 天 |
| Phase 3 | 实时更新 | 1 天 |
| Phase 4 | 前端展示 | 0.5 天 |
| **总计** | | **4.5-6.5 天** |

---

## 🚀 优化方向

### 短期（MVP）
1. ✅ 支持 TypeScript/JavaScript
2. ✅ 基础语义搜索
3. ✅ 手动触发索引

### 中期
1. 🔄 支持多语言（Python, Go, etc.）
2. 🔄 增量索引（只更新变化的文件）
3. 🔄 搜索结果排序优化

### 长期
1. 🎯 代码图谱（依赖关系）
2. 🎯 智能推荐（自动建议相关代码）
3. 🎯 跨项目搜索

---

## 💰 成本估算

### OpenAI Embedding API

- **模型：** `text-embedding-3-small`
- **价格：** $0.02 / 1M tokens
- **估算：** 1000 个文件（平均 200 行/文件）≈ 400K tokens
- **索引成本：** $0.008（约 ¥0.06）
- **搜索成本：** 每次查询 ≈ 100 tokens = $0.000002

**结论：** 成本极低，可忽略不计

---

## 🎯 总结

### 能做吗？

✅ **完全可以做！**

### 难度如何？

⭐⭐⭐ **中等难度**
- 需要理解 Embedding 和向量搜索
- 需要集成新的依赖
- 但整体架构清晰，有成熟的库支持

### 值得做吗？

✅ **强烈推荐！**

这是 AI IDE 的核心功能之一，可以：
1. 大幅提升 AI 的代码理解能力
2. 减少用户手动指定文件的次数
3. 让 AI 真正"理解"整个项目

---

**准备好开始实现了吗？** 🚀

