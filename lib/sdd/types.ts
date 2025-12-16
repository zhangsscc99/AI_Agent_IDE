// SDD (Spec Driven Development) 类型定义

/**
 * 函数规格定义
 */
export interface FunctionSpec {
  name: string;
  description: string;
  parameters: ParameterSpec[];
  returns: ReturnSpec;
  examples?: ExampleSpec[];
  constraints?: string[];
}

/**
 * 参数规格
 */
export interface ParameterSpec {
  name: string;
  type: string;
  description: string;
  required: boolean;
  default?: any;
}

/**
 * 返回值规格
 */
export interface ReturnSpec {
  type: string;
  description: string;
}

/**
 * 示例规格
 */
export interface ExampleSpec {
  input: Record<string, any>;
  output: any;
  description?: string;
}

/**
 * 模块规格定义
 */
export interface ModuleSpec {
  name: string;
  version: string;
  description: string;
  author?: string;
  functions: FunctionSpec[];
  classes?: ClassSpec[];
  dependencies?: string[];
  metadata?: Record<string, any>;
}

/**
 * 类规格定义
 */
export interface ClassSpec {
  name: string;
  description: string;
  properties: PropertySpec[];
  methods: FunctionSpec[];
  extends?: string;
}

/**
 * 属性规格
 */
export interface PropertySpec {
  name: string;
  type: string;
  description: string;
  required: boolean;
  default?: any;
}

/**
 * 测试用例规格
 */
export interface TestSpec {
  name: string;
  description: string;
  setup?: string;
  testCases: TestCaseSpec[];
}

/**
 * 单个测试用例
 */
export interface TestCaseSpec {
  name: string;
  description: string;
  input: Record<string, any>;
  expectedOutput: any;
  assertions?: string[];
}

/**
 * 完整的项目规格
 */
export interface ProjectSpec {
  name: string;
  version: string;
  description: string;
  language: 'typescript' | 'javascript' | 'python' | 'java' | 'go' | 'other';
  modules: ModuleSpec[];
  tests?: TestSpec[];
  metadata?: Record<string, any>;
}

/**
 * 规格验证结果
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error';
}

export interface ValidationWarning {
  field: string;
  message: string;
  severity: 'warning';
}

/**
 * 代码生成选项
 */
export interface CodeGenerationOptions {
  language: string;
  includeTests: boolean;
  includeDocumentation: boolean;
  framework?: string;
  style?: 'functional' | 'oop';
}

