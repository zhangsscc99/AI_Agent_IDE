# SDD (Spec Driven Development) 使用指南

## 📋 概述

SDD（规格驱动开发）是一种先定义规格，再生成代码的开发方法。通过明确定义函数、类、接口的规格，可以：

- ✅ 提高代码质量和一致性
- ✅ 自动生成代码和测试
- ✅ 更好的团队协作
- ✅ 减少误解和返工

## 🚀 快速开始

### 1. 创建规格文件

使用 AI Agent 创建规格：

```
请帮我创建一个用户认证模块的规格，包括登录和注册功能
```

Agent 会调用 `create_spec` 工具创建规格文件：

```yaml
name: user_auth
version: 1.0.0
description: 用户认证模块，提供登录和注册功能

functions:
  - name: login
    description: 用户登录
    parameters:
      - name: username
        type: string
        description: 用户名
        required: true
      - name: password
        type: string
        description: 密码
        required: true
    returns:
      type: Promise<User>
      description: 返回用户信息
    examples:
      - input:
          username: "admin"
          password: "123456"
        output:
          id: 1
          username: "admin"
          role: "admin"

  - name: register
    description: 用户注册
    parameters:
      - name: username
        type: string
        description: 用户名
        required: true
      - name: password
        type: string
        description: 密码
        required: true
      - name: email
        type: string
        description: 邮箱
        required: true
    returns:
      type: Promise<User>
      description: 返回新创建的用户
    constraints:
      - 用户名必须唯一
      - 密码长度至少 6 位
      - 邮箱格式必须有效
```

### 2. 从规格生成代码

```
请根据 user_auth.spec.yaml 生成 TypeScript 代码
```

Agent 会调用 `generate_code_from_spec` 工具生成代码：

```typescript
// 用户认证模块，提供登录和注册功能
// Generated from spec: user_auth
// Version: 1.0.0

/**
 * 用户登录
 * @param username - 用户名
 * @param password - 密码
 * @returns 返回用户信息
 */
export function login(
  username: string,
  password: string
): Promise<User> {
  // TODO: Implement function logic
  // Example:
  // login({"username":"admin","password":"123456"}) => {"id":1,"username":"admin","role":"admin"}
  throw new Error('Not implemented');
}

/**
 * 用户注册
 * @param username - 用户名
 * @param password - 密码
 * @param email - 邮箱
 * @returns 返回新创建的用户
 */
export function register(
  username: string,
  password: string,
  email: string
): Promise<User> {
  // TODO: Implement function logic
  // Constraints:
  // - 用户名必须唯一
  // - 密码长度至少 6 位
  // - 邮箱格式必须有效
  throw new Error('Not implemented');
}
```

### 3. 查看和管理规格

列出所有规格：
```
列出所有的规格文件
```

读取规格：
```
读取 user_auth.spec.yaml 的内容
```

验证规格：
```
验证 user_auth.spec.yaml 是否有效
```

## 🛠️ 可用工具

### create_spec

创建新的规格文件。

**参数：**
- `name` (string): 模块名称
- `description` (string): 模块描述
- `functions` (array): 函数规格列表
- `format` (string): 文件格式 (yaml 或 json)

**示例：**
```
创建一个 calculator 模块的规格，包含 add、subtract、multiply、divide 四个函数
```

### read_spec

读取现有的规格文件。

**参数：**
- `fileName` (string): 规格文件名

**示例：**
```
读取 calculator.spec.yaml
```

### list_specs

列出所有规格文件。

**示例：**
```
列出所有规格文件
```

### validate_spec

验证规格文件是否有效。

**参数：**
- `fileName` (string): 要验证的规格文件名

**示例：**
```
验证 calculator.spec.yaml 是否有效
```

### generate_code_from_spec

从规格生成代码。

**参数：**
- `specFileName` (string): 规格文件名
- `language` (string): 目标语言 (typescript, javascript, python)
- `outputPath` (string): 输出文件路径
- `includeTests` (boolean): 是否生成测试文件
- `includeDocumentation` (boolean): 是否生成文档

**示例：**
```
从 calculator.spec.yaml 生成 TypeScript 代码到 src/calculator.ts，包含测试
```

### infer_spec_from_code

从现有代码推断规格。

**参数：**
- `filePath` (string): 代码文件路径
- `outputSpecName` (string): 输出规格名称

**示例：**
```
分析 src/utils.ts 并生成规格文件
```

## 📝 规格文件格式

### YAML 格式（推荐）

```yaml
name: module_name
version: 1.0.0
description: Module description
dependencies:
  - dependency1
  - dependency2

functions:
  - name: functionName
    description: Function description
    parameters:
      - name: param1
        type: string
        description: Parameter description
        required: true
        default: "default value"
    returns:
      type: ReturnType
      description: Return value description
    examples:
      - input:
          param1: "value"
        output: "result"
        description: Example description
    constraints:
      - Constraint 1
      - Constraint 2

classes:
  - name: ClassName
    description: Class description
    properties:
      - name: property1
        type: string
        description: Property description
        required: true
    methods:
      - name: methodName
        description: Method description
        parameters: []
        returns:
          type: void
          description: No return value
```

### JSON 格式

```json
{
  "name": "module_name",
  "version": "1.0.0",
  "description": "Module description",
  "functions": [
    {
      "name": "functionName",
      "description": "Function description",
      "parameters": [],
      "returns": {
        "type": "void",
        "description": "No return value"
      }
    }
  ]
}
```

## 🎯 最佳实践

### 1. 明确的函数描述

❌ 不好：
```yaml
description: Process data
```

✅ 好：
```yaml
description: 处理用户输入数据，验证格式并转换为内部数据结构
```

### 2. 详细的参数说明

❌ 不好：
```yaml
parameters:
  - name: data
    type: any
    description: Data
```

✅ 好：
```yaml
parameters:
  - name: userData
    type: UserInput
    description: 用户输入的原始数据，包含 username、email 和 password 字段
    required: true
```

### 3. 提供示例

```yaml
examples:
  - input:
      username: "john_doe"
      email: "john@example.com"
    output:
      success: true
      userId: 123
    description: 正常注册流程
  - input:
      username: ""
      email: "invalid"
    output:
      success: false
      error: "Invalid input"
    description: 输入验证失败
```

### 4. 定义约束条件

```yaml
constraints:
  - 用户名长度必须在 3-20 个字符之间
  - 邮箱必须符合 RFC 5322 标准
  - 密码必须包含至少一个大写字母、一个小写字母和一个数字
  - 同一邮箱不能重复注册
```

## 🔄 工作流程

```
1. 定义需求
   ↓
2. 创建 Spec（使用 create_spec）
   ↓
3. 验证 Spec（使用 validate_spec）
   ↓
4. 生成代码（使用 generate_code_from_spec）
   ↓
5. 实现业务逻辑
   ↓
6. 运行测试
   ↓
7. 更新 Spec（如有变更）
```

## 💡 使用场景

### 场景 1：新功能开发

1. 与产品讨论需求
2. 创建功能规格
3. 团队评审规格
4. 生成代码框架
5. 填充业务逻辑

### 场景 2：代码重构

1. 从现有代码推断规格
2. 优化规格定义
3. 重新生成代码
4. 迁移业务逻辑

### 场景 3：API 设计

1. 设计 API 规格
2. 生成接口定义
3. 生成客户端代码
4. 生成服务端代码

## 🐛 常见问题

### Q: 如何修改已生成的代码？

A: 有两种方式：
1. 修改 Spec，重新生成代码（适合大改）
2. 直接修改代码，然后用 `infer_spec_from_code` 更新 Spec（适合小改）

### Q: 支持哪些编程语言？

A: 目前支持：
- TypeScript
- JavaScript
- Python

未来会支持更多语言。

### Q: 可以自定义代码生成模板吗？

A: 当前版本使用内置模板。未来版本会支持自定义模板。

### Q: Spec 文件存储在哪里？

A: 存储在工作空间的 `.specs/` 目录下。

## 📚 更多资源

- [Agent 工具文档](./AGENT_TOOLS.md)
- [调试追踪指南](./DEBUG_GUIDE.md)
- [API 参考](./API_REFERENCE.md)

