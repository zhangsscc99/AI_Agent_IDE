# 🧠 上下文增强（Context Enhancement）详解

## 📋 什么是上下文增强？

**上下文增强 = 在用户消息中添加额外的上下文信息，帮助 AI 更好地理解用户意图**

---

## 🎯 我们项目的实现

### 位置：`components/ChatPanel.tsx:51-60`

```typescript
// 如果有当前文件，增强用户消息
let enhancedMessage = input;
if (currentFile) {
  // 只要有打开的文件，就告诉 AI
  enhancedMessage = `[系统提示] 当前打开的文件是: ${currentFile.path}

用户请求: ${input}

注意：如果用户说"这个文件"、"当前文件"或"修改文件"，就是指 ${currentFile.path} 这个文件！`;
}
```

---

## 🔍 详细解析

### 场景 1: 没有上下文增强

**用户操作：**
1. 点击左侧 `two_sum.py` 文件（在编辑器中打开）
2. 输入："修改这个文件，添加注释"

**发送给 AI 的消息：**
```
修改这个文件，添加注释
```

**AI 的理解：**
```
❌ "这个文件" 是哪个文件？
❌ 用户没有明确说文件名
❌ AI 可能猜测错误或询问用户
```

### 场景 2: 有上下文增强

**用户操作：**
1. 点击左侧 `two_sum.py` 文件（在编辑器中打开）
2. 输入："修改这个文件，添加注释"

**发送给 AI 的消息：**
```
[系统提示] 当前打开的文件是: practice_agent/two_sum.py

用户请求: 修改这个文件，添加注释

注意：如果用户说"这个文件"、"当前文件"或"修改文件"，就是指 practice_agent/two_sum.py 这个文件！
```

**AI 的理解：**
```
✅ "这个文件" = practice_agent/two_sum.py
✅ 明确知道要修改哪个文件
✅ 直接调用 read_file("practice_agent/two_sum.py")
```

---

## 💡 为什么需要上下文增强？

### 问题：指代不明

人类对话中经常使用**指代词**：
- "这个文件"
- "当前文件"
- "它"
- "上面的代码"

但 AI **没有视觉**，看不到用户打开了什么文件！

### 解决方案：主动提供上下文

```
用户看到的：
┌─────────────┬─────────────────┐
│ two_sum.py  │ 编辑器显示代码   │
│ (已打开)    │ def two_sum():  │
└─────────────┴─────────────────┘

AI 看到的（没有上下文）：
❌ 只有文字："修改这个文件"
❌ 不知道"这个"是什么

AI 看到的（有上下文）：
✅ [系统提示] 当前打开的文件是: two_sum.py
✅ 用户请求: 修改这个文件
✅ 明确知道"这个" = two_sum.py
```

---

## 🔧 实现细节

### 1. 检测当前文件

```typescript
// app/page.tsx
const [currentFile, setCurrentFile] = useState<{
  path: string;
  content: string;
} | null>(null);

// 当用户点击文件时
<FileExplorer
  onSelectFile={(path, content) => {
    setCurrentFile({ path, content });  // ← 设置当前文件
  }}
/>
```

### 2. 传递到聊天面板

```typescript
// app/page.tsx
<ChatPanel 
  sessionId={sessionId} 
  currentFile={currentFile}  // ← 传递当前文件
  onFileModified={refreshCurrentFile}
/>
```

### 3. 增强消息

```typescript
// components/ChatPanel.tsx
const sendMessage = async () => {
  let enhancedMessage = input;
  
  if (currentFile) {
    // 自动添加上下文
    enhancedMessage = `[系统提示] 当前打开的文件是: ${currentFile.path}
    
用户请求: ${input}

注意：如果用户说"这个文件"，就是指 ${currentFile.path}！`;
  }
  
  // 发送增强后的消息给 AI
  const response = await fetch('/api/agent/chat', {
    body: JSON.stringify({
      message: enhancedMessage,  // ← 发送增强后的消息
      sessionId,
    }),
  });
};
```

---

## 📊 效果对比

### ❌ 没有上下文增强

```
用户："修改这个文件"
  ↓
AI："哪个文件？请告诉我文件名"
  ↓
用户："two_sum.py"
  ↓
AI："好的，我来修改..."
```

**需要 2 轮对话！**

### ✅ 有上下文增强

```
用户："修改这个文件"
  ↓
系统自动添加："当前打开的文件是: two_sum.py"
  ↓
AI："好的，我来修改 two_sum.py..."
```

**只需 1 轮对话！**

---

## 🎯 上下文增强的类型

### 1. **文件上下文**（已实现）

```typescript
if (currentFile) {
  enhancedMessage = `当前打开的文件是: ${currentFile.path}`;
}
```

**作用：** 解决"这个文件"的指代问题

### 2. **代码上下文**（可扩展）

```typescript
// 未来可以添加
if (currentFile) {
  const selectedCode = getSelectedCode();  // 用户选中的代码
  enhancedMessage = `
当前文件: ${currentFile.path}
选中的代码: ${selectedCode}
用户请求: ${input}
  `;
}
```

**作用：** 解决"这段代码"的指代问题

### 3. **历史上下文**（已实现）

```typescript
// lib/agent/executor.ts:125-139
const recentMemories = await memoryManager.getRecentConversations(
  this.context.sessionId,
  20
);

const messages: Message[] = [
  { role: 'system', content: this.systemPrompt },
  ...recentMemories.map(m => ({  // ← 添加历史对话
    role: m.metadata?.role || 'user',
    content: m.content,
  })),
  { role: 'user', content: userMessage },
];
```

**作用：** AI 记住之前的对话

### 4. **工作空间上下文**（已实现）

```typescript
// lib/agent/executor.ts:76
工作目录: ${this.context.workspacePath}
```

**作用：** AI 知道文件路径的根目录

---

## 🚀 未来扩展方向

### 1. **代码选择上下文**

```typescript
// 用户选中代码后
if (selectedCode) {
  enhancedMessage += `
选中的代码:
\`\`\`python
${selectedCode}
\`\`\`
  `;
}
```

**场景：**
```
用户选中函数 → 输入："重构这个函数"
→ AI 知道"这个函数"是选中的代码
```

### 2. **错误上下文**

```typescript
// 编辑器有错误时
if (errors.length > 0) {
  enhancedMessage += `
当前文件有 ${errors.length} 个错误:
${errors.map(e => `- ${e.message}`).join('\n')}
  `;
}
```

**场景：**
```
用户："修复这些错误"
→ AI 知道要修复哪些错误
```

### 3. **Git 上下文**

```typescript
// 显示文件修改状态
if (gitStatus) {
  enhancedMessage += `
文件状态: ${gitStatus}
最近修改: ${lastModified}
  `;
}
```

---

## 📝 总结

### 上下文增强 = 把"隐式信息"变成"显式信息"

**隐式信息（用户知道但 AI 不知道）：**
- 当前打开的文件
- 选中的代码
- 之前的对话
- 文件修改状态

**显式信息（我们主动告诉 AI）：**
- `[系统提示] 当前打开的文件是: two_sum.py`
- `选中的代码: def two_sum(): ...`
- `之前的对话: ...`
- `文件状态: 已修改`

### 核心价值

✅ **减少对话轮数** - 从 2 轮 → 1 轮  
✅ **提高准确性** - AI 不会猜错  
✅ **提升体验** - 用户不需要重复说明  

---

**这就是我们项目的上下文增强机制！** 🎉


