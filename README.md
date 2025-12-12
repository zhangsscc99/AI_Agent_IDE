# AI IDE Agent

一个基于 Web 的 AI 编程助手，类似 Cursor 的 Light Mode 风格。

## ✨ 特性

### 🎨 前端
- **Monaco Editor**: VS Code 同款编辑器，支持语法高亮、自动补全
- **文件上传**: 支持拖拽上传文件和文件夹
- **Cursor Light Mode**: 精致的白色主题设计
- **实时对话**: 流式 AI 对话，实时查看 AI 工作过程
- **响应式布局**: 可调整面板大小

### 🧠 Agent 后端架构
- **任务管理**: 完整的任务状态机
- **工具系统**: 可扩展的工具注册表
  - 文件读写
  - 目录浏览
  - 代码补丁（Diff/Patch）
- **记忆系统**: 内存存储（轻量快速）
- **LLM 适配**: 兼容 GLM-4.6 / OpenAI / Claude

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

创建 `.env.local` 文件：

```env
# GLM-4.6 配置
LLM_PROVIDER=glm
LLM_API_KEY=your_glm_api_key_here
LLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4
LLM_MODEL=glm-4-flash

# 工作空间路径
WORKSPACE_PATH=./workspace
```

### 3. 启动开发服务器

```bash
npm run dev
```

访问：http://localhost:3000

## 📁 文件上传

### 三种上传方式

1. **拖拽上传** 🎯
   - 直接把文件/文件夹拖到左侧面板
   - 会显示蓝色虚线边框提示

2. **点击上传** 📂
   - 点击顶部的 + 按钮上传文件
   - 点击文件夹图标上传整个文件夹

3. **空状态上传** 🆕
   - 没有文件时显示上传按钮

## 💡 使用示例

### 上传代码后让 AI 分析

```
1. 拖拽项目文件夹到左侧
2. 在右侧输入：分析这个项目的代码结构
3. AI 会读取文件并给出分析
```

### 让 AI 修改代码

```
1. 点击左侧某个文件
2. 输入：重构这个函数，提高可读性
3. AI 会使用 patch 工具修改文件
```

### 创建新项目

```
输入：创建一个 React Todo 应用，包含组件和样式
→ AI 会自动创建多个文件
→ 左侧文件树实时更新
```

## 🎨 界面风格

采用 **Cursor Light Mode** 设计：

- ✅ 纯白背景
- ✅ 精致圆角
- ✅ 优雅渐变
- ✅ 流畅动画
- ✅ 清晰边框

## 🔧 技术栈

- **前端**: Next.js 14, React, TypeScript, Tailwind CSS, Monaco Editor
- **后端**: Next.js API Routes
- **存储**: 内存存储（快速轻量）
- **LLM**: GLM-4.6 (智谱 AI)

## 📝 项目结构

```
AI_Agent/
├── app/                      # Next.js App Router
│   ├── api/
│   │   ├── agent/chat/       # Agent 对话 API
│   │   └── workspace/
│   │       ├── files/        # 文件管理
│   │       └── upload/       # 文件上传
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ChatPanel.tsx         # AI 对话面板
│   ├── CodeEditor.tsx        # Monaco 编辑器
│   └── FileExplorer.tsx      # 文件浏览器
├── lib/agent/
│   ├── executor.ts           # Agent 执行器
│   ├── llm.ts                # LLM 客户端
│   ├── memory.ts             # 记忆管理
│   ├── tools.ts              # 工具系统
│   └── types.ts
└── workspace/                # 用户文件存储
```

## 🎯 核心功能

### Agent 工作流程

```
用户请求
  ↓
Agent 分析
  ↓
调用工具（读/写文件）
  ↓
LLM 生成响应
  ↓
流式返回前端
```

### 可用工具

| 工具 | 功能 |
|------|------|
| `read_file` | 读取文件内容 |
| `write_file` | 创建/修改文件 |
| `list_files` | 列出目录文件 |
| `apply_patch` | 应用代码补丁 |
| `create_patch` | 创建差异补丁 |

## 🚀 部署

### Vercel（推荐）

```bash
# 1. 推送到 GitHub
git init
git add .
git commit -m "Initial commit"
git push

# 2. 在 Vercel 导入项目
# 3. 设置环境变量（LLM_API_KEY 等）
# 4. 一键部署
```

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

## 📄 许可证

MIT License

---

💡 **提示**: 如果遇到问题，检查：
1. `.env.local` 文件是否正确配置
2. GLM API Key 是否有效
3. 浏览器控制台是否有错误信息
