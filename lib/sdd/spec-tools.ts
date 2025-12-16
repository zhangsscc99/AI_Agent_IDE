// SDD 相关的 Agent 工具
import { Tool } from '../agent/types';
import { SpecManager } from './spec-manager';
import { CodeGenerator } from './code-generator';
import { ModuleSpec, ProjectSpec, CodeGenerationOptions } from './types';
import path from 'path';
import fs from 'fs/promises';

/**
 * 创建 Spec 工具
 */
export const createSpecTool: Tool = {
  name: 'create_spec',
  description: 'Create a new specification file for a module or project. This helps define the structure, functions, and requirements before writing code.',
  parameters: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Name of the module or project'
      },
      description: {
        type: 'string',
        description: 'Description of what this module/project does'
      },
      functions: {
        type: 'array',
        description: 'Array of function specifications',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            parameters: { type: 'array' },
            returns: { type: 'object' }
          }
        }
      },
      format: {
        type: 'string',
        enum: ['yaml', 'json'],
        description: 'File format for the spec (default: yaml)'
      }
    },
    required: ['name', 'description']
  },
  execute: async ({ name, description, functions = [], format = 'yaml', workspacePath }) => {
    const specManager = new SpecManager(workspacePath);
    
    const spec: ModuleSpec = {
      name,
      version: '1.0.0',
      description,
      functions: functions.map((f: any) => ({
        name: f.name,
        description: f.description || '',
        parameters: f.parameters || [],
        returns: f.returns || { type: 'void', description: '' }
      }))
    };
    
    const fileName = await specManager.createSpec(spec, format);
    
    return {
      success: true,
      fileName,
      path: `.specs/${fileName}`,
      message: `Created spec file: ${fileName}`
    };
  }
};

/**
 * 读取 Spec 工具
 */
export const readSpecTool: Tool = {
  name: 'read_spec',
  description: 'Read an existing specification file',
  parameters: {
    type: 'object',
    properties: {
      fileName: {
        type: 'string',
        description: 'Name of the spec file (e.g., "mymodule.spec.yaml")'
      }
    },
    required: ['fileName']
  },
  execute: async ({ fileName, workspacePath }) => {
    const specManager = new SpecManager(workspacePath);
    const spec = await specManager.readSpec(fileName);
    
    return {
      success: true,
      spec,
      message: `Read spec: ${fileName}`
    };
  }
};

/**
 * 列出所有 Spec 工具
 */
export const listSpecsTool: Tool = {
  name: 'list_specs',
  description: 'List all specification files in the workspace',
  parameters: {
    type: 'object',
    properties: {}
  },
  execute: async ({ workspacePath }) => {
    const specManager = new SpecManager(workspacePath);
    const files = await specManager.listSpecs();
    
    return {
      success: true,
      files,
      count: files.length,
      message: `Found ${files.length} spec file(s)`
    };
  }
};

/**
 * 验证 Spec 工具
 */
export const validateSpecTool: Tool = {
  name: 'validate_spec',
  description: 'Validate a specification file for errors and warnings',
  parameters: {
    type: 'object',
    properties: {
      fileName: {
        type: 'string',
        description: 'Name of the spec file to validate'
      }
    },
    required: ['fileName']
  },
  execute: async ({ fileName, workspacePath }) => {
    const specManager = new SpecManager(workspacePath);
    const spec = await specManager.readSpec(fileName);
    const validation = await specManager.validateSpec(spec);
    
    return {
      success: validation.valid,
      valid: validation.valid,
      errors: validation.errors,
      warnings: validation.warnings,
      message: validation.valid 
        ? 'Spec is valid' 
        : `Found ${validation.errors.length} error(s) and ${validation.warnings.length} warning(s)`
    };
  }
};

/**
 * 从 Spec 生成代码工具
 */
export const generateCodeFromSpecTool: Tool = {
  name: 'generate_code_from_spec',
  description: 'Generate code implementation from a specification file. This creates the actual code files based on the spec.',
  parameters: {
    type: 'object',
    properties: {
      specFileName: {
        type: 'string',
        description: 'Name of the spec file (e.g., "mymodule.spec.yaml")'
      },
      language: {
        type: 'string',
        enum: ['typescript', 'javascript', 'python'],
        description: 'Programming language to generate'
      },
      outputPath: {
        type: 'string',
        description: 'Output file path (e.g., "src/mymodule.ts")'
      },
      includeTests: {
        type: 'boolean',
        description: 'Generate test files (default: true)'
      },
      includeDocumentation: {
        type: 'boolean',
        description: 'Generate documentation (default: false)'
      }
    },
    required: ['specFileName', 'language', 'outputPath']
  },
  execute: async ({ 
    specFileName, 
    language, 
    outputPath, 
    includeTests = true,
    includeDocumentation = false,
    workspacePath 
  }) => {
    const specManager = new SpecManager(workspacePath);
    const codeGenerator = new CodeGenerator();
    
    // 读取 spec
    const spec = await specManager.readSpec(specFileName) as ModuleSpec;
    
    // 生成代码
    const options: CodeGenerationOptions = {
      language,
      includeTests,
      includeDocumentation,
      style: 'functional'
    };
    
    const { code, tests, docs } = await codeGenerator.generateCode(spec, options);
    
    // 写入主代码文件
    const fullOutputPath = path.join(workspacePath, outputPath);
    await fs.mkdir(path.dirname(fullOutputPath), { recursive: true });
    await fs.writeFile(fullOutputPath, code, 'utf-8');
    
    const generatedFiles = [outputPath];
    
    // 写入测试文件
    if (tests) {
      const testExt = language === 'python' ? '.py' : '.test.ts';
      const testPath = outputPath.replace(/\.(ts|js|py)$/, testExt);
      const fullTestPath = path.join(workspacePath, testPath);
      await fs.writeFile(fullTestPath, tests, 'utf-8');
      generatedFiles.push(testPath);
    }
    
    // 写入文档
    if (docs) {
      const docsPath = outputPath.replace(/\.(ts|js|py)$/, '.md');
      const fullDocsPath = path.join(workspacePath, docsPath);
      await fs.writeFile(fullDocsPath, docs, 'utf-8');
      generatedFiles.push(docsPath);
    }
    
    return {
      success: true,
      generatedFiles,
      message: `Generated code from spec: ${specFileName}`
    };
  }
};

/**
 * 从代码推断 Spec 工具
 */
export const inferSpecFromCodeTool: Tool = {
  name: 'infer_spec_from_code',
  description: 'Analyze existing code and generate a specification file from it',
  parameters: {
    type: 'object',
    properties: {
      filePath: {
        type: 'string',
        description: 'Path to the code file to analyze'
      },
      outputSpecName: {
        type: 'string',
        description: 'Name for the generated spec file'
      }
    },
    required: ['filePath']
  },
  execute: async ({ filePath, outputSpecName, workspacePath }) => {
    const specManager = new SpecManager(workspacePath);
    
    // 推断规格
    const spec = await specManager.inferSpecFromCode(filePath);
    
    // 保存规格
    const specName = outputSpecName || spec.name;
    const fileName = await specManager.createSpec({ ...spec, name: specName }, 'yaml');
    
    return {
      success: true,
      fileName,
      spec,
      message: `Inferred spec from ${filePath} and saved as ${fileName}`
    };
  }
};

// 导出所有 SDD 工具
export const SDD_TOOLS = {
  create_spec: createSpecTool,
  read_spec: readSpecTool,
  list_specs: listSpecsTool,
  validate_spec: validateSpecTool,
  generate_code_from_spec: generateCodeFromSpecTool,
  infer_spec_from_code: inferSpecFromCodeTool,
};

