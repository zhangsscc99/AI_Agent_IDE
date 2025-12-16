// Spec 管理器 - 负责规格的 CRUD 操作
import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { ProjectSpec, ModuleSpec, ValidationResult } from './types';

export class SpecManager {
  private workspacePath: string;
  private specDir: string;

  constructor(workspacePath: string) {
    this.workspacePath = workspacePath;
    this.specDir = path.join(workspacePath, '.specs');
  }

  /**
   * 初始化 spec 目录
   */
  async init(): Promise<void> {
    try {
      await fs.mkdir(this.specDir, { recursive: true });
    } catch (error) {
      // 目录已存在
    }
  }

  /**
   * 创建新的规格文件
   */
  async createSpec(spec: ProjectSpec | ModuleSpec, format: 'yaml' | 'json' = 'yaml'): Promise<string> {
    await this.init();

    const name = 'name' in spec ? spec.name : 'unnamed';
    const fileName = `${name}.spec.${format}`;
    const filePath = path.join(this.specDir, fileName);

    let content: string;
    if (format === 'yaml') {
      content = yaml.dump(spec, { indent: 2 });
    } else {
      content = JSON.stringify(spec, null, 2);
    }

    await fs.writeFile(filePath, content, 'utf-8');
    return fileName;
  }

  /**
   * 读取规格文件
   */
  async readSpec(fileName: string): Promise<ProjectSpec | ModuleSpec> {
    const filePath = path.join(this.specDir, fileName);
    const content = await fs.readFile(filePath, 'utf-8');

    if (fileName.endsWith('.yaml') || fileName.endsWith('.yml')) {
      return yaml.load(content) as ProjectSpec | ModuleSpec;
    } else {
      return JSON.parse(content);
    }
  }

  /**
   * 列出所有规格文件
   */
  async listSpecs(): Promise<string[]> {
    try {
      await this.init();
      const files = await fs.readdir(this.specDir);
      return files.filter(f => f.endsWith('.spec.yaml') || f.endsWith('.spec.json'));
    } catch {
      return [];
    }
  }

  /**
   * 更新规格文件
   */
  async updateSpec(fileName: string, spec: ProjectSpec | ModuleSpec): Promise<void> {
    const filePath = path.join(this.specDir, fileName);
    const format = fileName.endsWith('.json') ? 'json' : 'yaml';

    let content: string;
    if (format === 'yaml') {
      content = yaml.dump(spec, { indent: 2 });
    } else {
      content = JSON.stringify(spec, null, 2);
    }

    await fs.writeFile(filePath, content, 'utf-8');
  }

  /**
   * 删除规格文件
   */
  async deleteSpec(fileName: string): Promise<void> {
    const filePath = path.join(this.specDir, fileName);
    await fs.unlink(filePath);
  }

  /**
   * 验证规格文件
   */
  async validateSpec(spec: ProjectSpec | ModuleSpec): Promise<ValidationResult> {
    const errors: any[] = [];
    const warnings: any[] = [];

    // 基本验证
    if (!spec.name || spec.name.trim() === '') {
      errors.push({
        field: 'name',
        message: 'Spec name is required',
        severity: 'error'
      });
    }

    if (!spec.description || spec.description.trim() === '') {
      warnings.push({
        field: 'description',
        message: 'Description is recommended',
        severity: 'warning'
      });
    }

    if ('modules' in spec) {
      // 验证 ProjectSpec
      if (!spec.modules || spec.modules.length === 0) {
        warnings.push({
          field: 'modules',
          message: 'Project should have at least one module',
          severity: 'warning'
        });
      }
    }

    if ('functions' in spec) {
      // 验证 ModuleSpec
      spec.functions?.forEach((func, index) => {
        if (!func.name) {
          errors.push({
            field: `functions[${index}].name`,
            message: 'Function name is required',
            severity: 'error'
          });
        }

        if (!func.parameters) {
          warnings.push({
            field: `functions[${index}].parameters`,
            message: 'Function parameters should be defined',
            severity: 'warning'
          });
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 从现有代码推断规格
   */
  async inferSpecFromCode(filePath: string): Promise<ModuleSpec> {
    // 这里可以实现代码分析逻辑
    // 简化版本：返回一个基本的 spec 模板
    const fileName = path.basename(filePath, path.extname(filePath));
    
    return {
      name: fileName,
      version: '1.0.0',
      description: `Module specification for ${fileName}`,
      functions: []
    };
  }
}

