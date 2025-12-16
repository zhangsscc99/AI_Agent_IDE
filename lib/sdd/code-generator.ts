// 从 Spec 生成代码
import { ModuleSpec, FunctionSpec, ClassSpec, CodeGenerationOptions } from './types';

export class CodeGenerator {
  /**
   * 从模块规格生成代码
   */
  async generateCode(
    spec: ModuleSpec,
    options: CodeGenerationOptions
  ): Promise<{ code: string; tests?: string; docs?: string }> {
    const { language } = options;

    let code: string;
    let tests: string | undefined;
    let docs: string | undefined;

    switch (language) {
      case 'typescript':
      case 'javascript':
        code = this.generateTypeScript(spec, options);
        if (options.includeTests) {
          tests = this.generateTypeScriptTests(spec);
        }
        break;

      case 'python':
        code = this.generatePython(spec, options);
        if (options.includeTests) {
          tests = this.generatePythonTests(spec);
        }
        break;

      default:
        throw new Error(`Unsupported language: ${language}`);
    }

    if (options.includeDocumentation) {
      docs = this.generateDocumentation(spec);
    }

    return { code, tests, docs };
  }

  /**
   * 生成 TypeScript 代码
   */
  private generateTypeScript(spec: ModuleSpec, options: CodeGenerationOptions): string {
    let code = `// ${spec.description}\n`;
    code += `// Generated from spec: ${spec.name}\n`;
    code += `// Version: ${spec.version}\n\n`;

    // 生成接口定义（如果有类）
    if (spec.classes && spec.classes.length > 0) {
      for (const classSpec of spec.classes) {
        code += this.generateTypeScriptClass(classSpec);
        code += '\n\n';
      }
    }

    // 生成函数
    for (const funcSpec of spec.functions) {
      code += this.generateTypeScriptFunction(funcSpec);
      code += '\n\n';
    }

    return code;
  }

  /**
   * 生成 TypeScript 类
   */
  private generateTypeScriptClass(classSpec: ClassSpec): string {
    let code = `/**\n * ${classSpec.description}\n */\n`;
    code += `export class ${classSpec.name}`;
    
    if (classSpec.extends) {
      code += ` extends ${classSpec.extends}`;
    }
    
    code += ' {\n';

    // 生成属性
    for (const prop of classSpec.properties) {
      code += `  /**\n   * ${prop.description}\n   */\n`;
      code += `  ${prop.name}${prop.required ? '' : '?'}: ${prop.type}`;
      if (prop.default !== undefined) {
        code += ` = ${JSON.stringify(prop.default)}`;
      }
      code += ';\n\n';
    }

    // 生成构造函数
    code += '  constructor(';
    const requiredProps = classSpec.properties.filter(p => p.required);
    code += requiredProps.map(p => `${p.name}: ${p.type}`).join(', ');
    code += ') {\n';
    for (const prop of requiredProps) {
      code += `    this.${prop.name} = ${prop.name};\n`;
    }
    code += '  }\n\n';

    // 生成方法
    for (const method of classSpec.methods) {
      code += this.generateTypeScriptFunction(method, '  ');
      code += '\n';
    }

    code += '}';
    return code;
  }

  /**
   * 生成 TypeScript 函数
   */
  private generateTypeScriptFunction(funcSpec: FunctionSpec, indent: string = ''): string {
    let code = `${indent}/**\n${indent} * ${funcSpec.description}\n`;
    
    // 添加参数文档
    for (const param of funcSpec.parameters) {
      code += `${indent} * @param ${param.name} - ${param.description}\n`;
    }
    
    code += `${indent} * @returns ${funcSpec.returns.description}\n`;
    code += `${indent} */\n`;

    // 函数签名
    code += `${indent}export function ${funcSpec.name}(\n`;
    code += funcSpec.parameters.map(param => {
      const optional = param.required ? '' : '?';
      const defaultValue = param.default !== undefined ? ` = ${JSON.stringify(param.default)}` : '';
      return `${indent}  ${param.name}${optional}: ${param.type}${defaultValue}`;
    }).join(',\n');
    code += `\n${indent}): ${funcSpec.returns.type} {\n`;
    
    // 函数体占位符
    code += `${indent}  // TODO: Implement function logic\n`;
    
    // 如果有约束条件，添加注释
    if (funcSpec.constraints && funcSpec.constraints.length > 0) {
      code += `${indent}  // Constraints:\n`;
      for (const constraint of funcSpec.constraints) {
        code += `${indent}  // - ${constraint}\n`;
      }
    }
    
    // 添加示例注释
    if (funcSpec.examples && funcSpec.examples.length > 0) {
      code += `${indent}  // Example:\n`;
      const example = funcSpec.examples[0];
      code += `${indent}  // ${funcSpec.name}(${JSON.stringify(example.input)}) => ${JSON.stringify(example.output)}\n`;
    }
    
    code += `${indent}  throw new Error('Not implemented');\n`;
    code += `${indent}}`;
    
    return code;
  }

  /**
   * 生成 Python 代码
   */
  private generatePython(spec: ModuleSpec, options: CodeGenerationOptions): string {
    let code = `"""${spec.description}\n`;
    code += `Generated from spec: ${spec.name}\n`;
    code += `Version: ${spec.version}\n"""\n\n`;
    code += 'from typing import Any, Optional, Dict, List\n\n';

    // 生成类
    if (spec.classes && spec.classes.length > 0) {
      for (const classSpec of spec.classes) {
        code += this.generatePythonClass(classSpec);
        code += '\n\n';
      }
    }

    // 生成函数
    for (const funcSpec of spec.functions) {
      code += this.generatePythonFunction(funcSpec);
      code += '\n\n';
    }

    return code;
  }

  /**
   * 生成 Python 类
   */
  private generatePythonClass(classSpec: ClassSpec): string {
    let code = `class ${classSpec.name}`;
    
    if (classSpec.extends) {
      code += `(${classSpec.extends})`;
    }
    
    code += ':\n';
    code += `    """${classSpec.description}"""\n\n`;

    // 生成 __init__
    code += '    def __init__(self';
    const requiredProps = classSpec.properties.filter(p => p.required);
    for (const prop of requiredProps) {
      code += `, ${prop.name}: ${this.pythonType(prop.type)}`;
    }
    code += '):\n';
    
    for (const prop of classSpec.properties) {
      code += `        self.${prop.name}`;
      if (prop.required) {
        code += ` = ${prop.name}\n`;
      } else if (prop.default !== undefined) {
        code += ` = ${JSON.stringify(prop.default)}\n`;
      } else {
        code += ' = None\n';
      }
    }
    code += '\n';

    // 生成方法
    for (const method of classSpec.methods) {
      code += this.generatePythonFunction(method, '    ', true);
      code += '\n';
    }

    return code;
  }

  /**
   * 生成 Python 函数
   */
  private generatePythonFunction(funcSpec: FunctionSpec, indent: string = '', isMethod: boolean = false): string {
    let code = `${indent}def ${funcSpec.name}(`;
    
    if (isMethod) {
      code += 'self';
      if (funcSpec.parameters.length > 0) code += ', ';
    }
    
    code += funcSpec.parameters.map(param => {
      let paramStr = `${param.name}: ${this.pythonType(param.type)}`;
      if (param.default !== undefined) {
        paramStr += ` = ${JSON.stringify(param.default)}`;
      }
      return paramStr;
    }).join(', ');
    
    code += `) -> ${this.pythonType(funcSpec.returns.type)}:\n`;
    code += `${indent}    """${funcSpec.description}\n\n`;
    
    // 添加参数文档
    if (funcSpec.parameters.length > 0) {
      code += `${indent}    Args:\n`;
      for (const param of funcSpec.parameters) {
        code += `${indent}        ${param.name}: ${param.description}\n`;
      }
      code += '\n';
    }
    
    code += `${indent}    Returns:\n`;
    code += `${indent}        ${funcSpec.returns.description}\n`;
    code += `${indent}    """\n`;
    
    // 函数体
    code += `${indent}    # TODO: Implement function logic\n`;
    
    if (funcSpec.constraints && funcSpec.constraints.length > 0) {
      code += `${indent}    # Constraints:\n`;
      for (const constraint of funcSpec.constraints) {
        code += `${indent}    # - ${constraint}\n`;
      }
    }
    
    code += `${indent}    raise NotImplementedError("Not implemented")`;
    
    return code;
  }

  /**
   * 转换为 Python 类型
   */
  private pythonType(tsType: string): string {
    const typeMap: Record<string, string> = {
      'string': 'str',
      'number': 'float',
      'boolean': 'bool',
      'any': 'Any',
      'void': 'None',
      'Array<string>': 'List[str]',
      'Array<number>': 'List[float]',
      'Record<string, any>': 'Dict[str, Any]',
    };
    
    return typeMap[tsType] || tsType;
  }

  /**
   * 生成 TypeScript 测试
   */
  private generateTypeScriptTests(spec: ModuleSpec): string {
    let code = `// Tests for ${spec.name}\n`;
    code += `import { describe, it, expect } from 'vitest';\n`;
    code += `import * as target from './${spec.name}';\n\n`;

    for (const funcSpec of spec.functions) {
      code += `describe('${funcSpec.name}', () => {\n`;
      
      if (funcSpec.examples && funcSpec.examples.length > 0) {
        for (let i = 0; i < funcSpec.examples.length; i++) {
          const example = funcSpec.examples[i];
          code += `  it('${example.description || `example ${i + 1}`}', () => {\n`;
          code += `    const input = ${JSON.stringify(example.input, null, 4).split('\n').join('\n    ')};\n`;
          code += `    const expected = ${JSON.stringify(example.output)};\n`;
          code += `    const result = target.${funcSpec.name}(${Object.keys(example.input).map(k => `input.${k}`).join(', ')});\n`;
          code += `    expect(result).toEqual(expected);\n`;
          code += `  });\n\n`;
        }
      } else {
        code += `  it('should work correctly', () => {\n`;
        code += `    // TODO: Add test implementation\n`;
        code += `    expect(true).toBe(true);\n`;
        code += `  });\n\n`;
      }
      
      code += `});\n\n`;
    }

    return code;
  }

  /**
   * 生成 Python 测试
   */
  private generatePythonTests(spec: ModuleSpec): string {
    let code = `"""Tests for ${spec.name}"""\n`;
    code += `import pytest\n`;
    code += `from ${spec.name} import *\n\n`;

    for (const funcSpec of spec.functions) {
      code += `class Test${this.capitalize(funcSpec.name)}:\n`;
      
      if (funcSpec.examples && funcSpec.examples.length > 0) {
        for (let i = 0; i < funcSpec.examples.length; i++) {
          const example = funcSpec.examples[i];
          const testName = example.description 
            ? example.description.replace(/\s+/g, '_').toLowerCase()
            : `example_${i + 1}`;
          
          code += `    def test_${testName}(self):\n`;
          code += `        """${example.description || `Test example ${i + 1}`}"""\n`;
          code += `        result = ${funcSpec.name}(${Object.entries(example.input).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(', ')})\n`;
          code += `        assert result == ${JSON.stringify(example.output)}\n\n`;
        }
      } else {
        code += `    def test_basic(self):\n`;
        code += `        """TODO: Add test implementation"""\n`;
        code += `        assert True\n\n`;
      }
    }

    return code;
  }

  /**
   * 生成文档
   */
  private generateDocumentation(spec: ModuleSpec): string {
    let docs = `# ${spec.name}\n\n`;
    docs += `${spec.description}\n\n`;
    docs += `**Version:** ${spec.version}\n\n`;

    if (spec.dependencies && spec.dependencies.length > 0) {
      docs += `## Dependencies\n\n`;
      for (const dep of spec.dependencies) {
        docs += `- ${dep}\n`;
      }
      docs += '\n';
    }

    docs += `## Functions\n\n`;
    for (const funcSpec of spec.functions) {
      docs += `### ${funcSpec.name}\n\n`;
      docs += `${funcSpec.description}\n\n`;
      
      docs += `**Parameters:**\n\n`;
      for (const param of funcSpec.parameters) {
        docs += `- \`${param.name}\` (${param.type})${param.required ? ' *required*' : ''}: ${param.description}\n`;
      }
      docs += '\n';
      
      docs += `**Returns:** ${funcSpec.returns.type} - ${funcSpec.returns.description}\n\n`;
      
      if (funcSpec.examples && funcSpec.examples.length > 0) {
        docs += `**Examples:**\n\n`;
        for (const example of funcSpec.examples) {
          docs += '```\n';
          docs += `${funcSpec.name}(${JSON.stringify(example.input)})\n`;
          docs += `// => ${JSON.stringify(example.output)}\n`;
          docs += '```\n\n';
        }
      }
    }

    if (spec.classes && spec.classes.length > 0) {
      docs += `## Classes\n\n`;
      for (const classSpec of spec.classes) {
        docs += `### ${classSpec.name}\n\n`;
        docs += `${classSpec.description}\n\n`;
        
        docs += `**Properties:**\n\n`;
        for (const prop of classSpec.properties) {
          docs += `- \`${prop.name}\` (${prop.type}): ${prop.description}\n`;
        }
        docs += '\n';
        
        docs += `**Methods:**\n\n`;
        for (const method of classSpec.methods) {
          docs += `- \`${method.name}()\`: ${method.description}\n`;
        }
        docs += '\n';
      }
    }

    return docs;
  }

  /**
   * 首字母大写
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

