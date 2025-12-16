# SDD 和调试追踪示例

本目录包含使用 SDD 和调试追踪功能的示例。

## 📁 文件说明

### calculator.spec.yaml
一个简单的计算器模块规格，演示：
- 基本函数定义
- 参数和返回值类型
- 示例和约束条件

### user_manager.spec.yaml
用户管理模块规格，演示：
- 复杂的类定义
- 类方法
- 依赖管理
- 详细的约束条件

## 🚀 使用示例

### 示例 1：从规格生成代码

在 AI Agent 对话框中输入：

```
请读取 examples/calculator.spec.yaml，并生成 TypeScript 代码到 src/calculator.ts
```

Agent 会：
1. 读取规格文件
2. 调用 `generate_code_from_spec` 工具
3. 生成代码文件和测试文件

### 示例 2：创建新的规格

在 AI Agent 对话框中输入：

```
创建一个 todo 列表管理模块的规格，包含以下功能：
- 创建待办事项
- 获取待办事项列表
- 更新待办事项状态
- 删除待办事项
```

Agent 会调用 `create_spec` 工具创建规格文件。

### 示例 3：启用调试追踪

修改 `app/api/agent/chat/route.ts`：

```typescript
const executor = new AgentExecutor({
  sessionId,
  workspacePath,
  llmClient,
  enableDebug: true  // 启用调试
});
```

然后查看调试数据：

```typescript
// 获取调试信息
const response = await fetch(`/api/debug/trace?sessionId=${sessionId}`);
const { session } = await response.json();

console.log('LLM 调用次数:', session.summary.llmCalls);
console.log('工具调用次数:', session.summary.toolCalls);
console.log('Token 使用:', session.summary.tokensUsed);
```

### 示例 4：从代码推断规格

如果你有现有的代码文件 `src/utils.ts`，可以：

```
分析 src/utils.ts 并生成规格文件
```

Agent 会调用 `infer_spec_from_code` 工具。

## 💡 实际应用场景

### 场景 1：团队协作开发

1. **需求讨论阶段**
   ```
   创建一个支付模块的规格，包含：支付、退款、查询订单状态
   ```

2. **规格评审**
   ```
   读取 payment.spec.yaml 的内容
   验证 payment.spec.yaml 是否有效
   ```

3. **代码生成**
   ```
   从 payment.spec.yaml 生成 TypeScript 代码，包含测试
   ```

4. **并行开发**
   - 前端团队根据规格开发界面
   - 后端团队实现业务逻辑
   - 测试团队编写测试用例

### 场景 2：API 设计

1. **设计 RESTful API**
   ```
   创建一个 REST API 规格，用于博客系统，包含：
   - GET /api/posts - 获取文章列表
   - GET /api/posts/:id - 获取单篇文章
   - POST /api/posts - 创建文章
   - PUT /api/posts/:id - 更新文章
   - DELETE /api/posts/:id - 删除文章
   ```

2. **生成代码**
   ```
   从 blog_api.spec.yaml 生成 Express 路由代码
   ```

### 场景 3：性能优化

1. **启用调试追踪**
   ```typescript
   enableDebug: true
   ```

2. **分析性能瓶颈**
   ```typescript
   const { toolStats } = session.summary;
   
   // 找出最慢的工具
   Object.entries(toolStats).forEach(([tool, stats]) => {
     if (stats.avgDuration > 1000) {
       console.log(`${tool} 平均耗时: ${stats.avgDuration}ms`);
     }
   });
   ```

3. **优化慢速操作**
   - 添加缓存
   - 并行处理
   - 减少 LLM 调用

### 场景 4：错误排查

1. **查看错误事件**
   ```typescript
   const errors = session.events.filter(e => e.type === 'error');
   errors.forEach(error => {
     console.log('错误:', error.data.message);
     console.log('堆栈:', error.data.stack);
   });
   ```

2. **分析决策过程**
   ```typescript
   const decisions = session.events.filter(e => e.type === 'decision');
   decisions.forEach(d => {
     console.log('决策:', d.data.decision);
     console.log('原因:', d.data.reasoning);
   });
   ```

## 🧪 测试建议

### 单元测试

生成的测试文件包含基本的测试框架：

```typescript
// calculator.test.ts
describe('add', () => {
  it('should add two positive numbers', () => {
    const result = add(2, 3);
    expect(result).toBe(5);
  });
  
  it('should handle negative numbers', () => {
    const result = add(-5, 10);
    expect(result).toBe(5);
  });
});
```

### 集成测试

测试整个工作流程：

```typescript
describe('SDD Workflow', () => {
  it('should create spec, generate code, and run tests', async () => {
    // 1. 创建规格
    const spec = await createSpec({
      name: 'test_module',
      functions: [...]
    });
    
    // 2. 生成代码
    const code = await generateCode(spec, {
      language: 'typescript',
      includeTests: true
    });
    
    // 3. 运行测试
    const testResults = await runTests(code.tests);
    expect(testResults.passed).toBe(true);
  });
});
```

## 📊 性能基准

基于调试追踪数据的性能基准：

| 操作 | 平均耗时 | Token 使用 |
|------|---------|-----------|
| 创建简单规格 | 2-3s | 500-800 |
| 生成 TypeScript 代码 | 1-2s | 300-500 |
| 生成 Python 代码 | 1-2s | 300-500 |
| 代码推断规格 | 3-5s | 800-1200 |
| 规格验证 | <1s | 0 |

## 🔗 相关资源

- [SDD 使用指南](../docs/SDD_GUIDE.md)
- [调试追踪指南](../docs/DEBUG_GUIDE.md)
- [完整 API 文档](../docs/API_REFERENCE.md)

## 💬 获取帮助

遇到问题？在 AI Agent 中询问：

```
如何使用 SDD 功能？
如何启用调试追踪？
规格文件的格式是什么？
如何查看性能统计？
```

Agent 会引导你使用这些功能！

