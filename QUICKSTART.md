# 🚀 快速启动指南

## 第一步：配置 GLM-4.6 API Key

创建 `.env.local` 文件（在项目根目录）：

\`\`\`env
# GLM-4.6 配置
LLM_PROVIDER=glm
LLM_API_KEY=你的GLM_API_KEY
LLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4
LLM_MODEL=glm-4-flash

# 工作空间路径
WORKSPACE_PATH=./workspace
\`\`\`

### 如何获取 GLM API Key？

1. 访问智谱 AI 开放平台：https://open.bigmodel.cn/
2. 注册/登录账号
3. 在控制台创建 API Key
4. 复制 Key 填入上面的 \`LLM_API_KEY\`

## 第二步：启动项目

\`\`\`bash
npm run dev
\`\`\`

访问：http://localhost:3000

## 第三步：开始使用！

### 💡 试试这些命令

#### 1. 创建第一个文件
\`\`\`
创建一个 hello.py 文件，写一个打印 Hello World 的程序
\`\`\`

#### 2. 创建 React 组件
\`\`\`
创建一个 Button.tsx 组件，支持 primary 和 secondary 两种样式
\`\`\`

#### 3. 创建完整项目
\`\`\`
创建一个 Todo List 应用，包含 HTML、CSS 和 JavaScript
\`\`\`

#### 4. 代码分析
\`\`\`
分析一下这个代码有什么可以优化的地方
\`\`\`

## 🎨 界面说明

```
┌─────────────┬───────────────────────────┬─────────────┐
│             │                           │             │
│   文件树     │      Monaco 编辑器         │  AI 对话     │
│             │                           │             │
│ 📁 项目目录  │  实时代码编辑              │  流式对话    │
│ 📄 文件列表  │  语法高亮                 │  工具调用    │
│             │  自动补全                 │  实时反馈    │
│             │                           │             │
└─────────────┴───────────────────────────┴─────────────┘
```

## 🔍 功能演示

### Agent 执行过程可视化

当你发送消息后，你会看到：

1. **🤖 AI 思考**: 流式输出 AI 的回复
2. **🔧 工具调用**: 显示 AI 正在使用什么工具
   - 例如：`调用工具: write_file`
3. **✅ 执行结果**: 显示工具执行是否成功
   - 例如：`工具执行成功: write_file`
4. **📝 文件更新**: 左侧文件树自动刷新
5. **💾 记忆保存**: 所有对话和操作都会保存

### 记忆系统

- Agent 会记住你的所有对话
- 会记录所有文件操作
- 可以引用之前的内容
- 支持多轮对话

## 🛠️ 进阶配置

### 使用其他 LLM

#### OpenAI GPT-4
\`\`\`env
LLM_PROVIDER=openai
LLM_API_KEY=sk-...
LLM_MODEL=gpt-4
\`\`\`

#### Anthropic Claude
\`\`\`env
LLM_PROVIDER=claude
LLM_API_KEY=sk-ant-...
LLM_MODEL=claude-3-5-sonnet-20241022
\`\`\`

### 自定义工作空间路径

默认情况下，每个会话的文件会保存在 `workspace/{sessionId}/` 目录。

你可以修改 \`WORKSPACE_PATH\` 来改变存储位置。

## ❓ 常见问题

### Q: 为什么看不到文件？
A: 点击右上角的"刷新"按钮，或者让 AI 创建一个新文件

### Q: Agent 没有响应？
A: 
1. 检查 `.env.local` 文件是否配置正确
2. 检查 API Key 是否有效
3. 查看浏览器控制台是否有错误

### Q: 如何清除历史记录？
A: 刷新页面会生成新的 sessionId，相当于新会话

### Q: 支持哪些编程语言？
A: Monaco Editor 支持几十种语言：
- JavaScript/TypeScript
- Python
- Java
- C/C++
- Go
- Rust
- PHP
- Ruby
- HTML/CSS
- JSON/YAML
- Markdown
- 等等...

## 🎯 下一步

1. 试试让 AI 创建一个完整的小项目
2. 尝试代码重构和优化
3. 体验多轮对话和上下文记忆
4. 查看 `agent.db` 数据库中的记忆数据

## 💪 高级用法

### 让 AI 做代码审查
\`\`\`
请审查一下我的代码，找出潜在的 bug 和性能问题
\`\`\`

### 让 AI 写测试
\`\`\`
为这个函数写单元测试
\`\`\`

### 让 AI 重构代码
\`\`\`
把这个大函数拆分成几个小函数，提高可读性
\`\`\`

### 让 AI 生成文档
\`\`\`
为这个项目生成 README 文档
\`\`\`

---

🎉 **开始你的 AI 编程之旅吧！**




