// Agent 工具系统
import { Tool } from './types';
import fs from 'fs/promises';
import path from 'path';
import { applyPatch, createPatch } from 'diff';

// 读取文件工具
export const readFileTool: Tool = {
  name: 'read_file',
  description: 'Read the contents of a file in the workspace',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'The relative path to the file'
      }
    },
    required: ['path']
  },
  execute: async ({ path: filePath, workspacePath }) => {
    const fullPath = path.join(workspacePath, filePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    return { success: true, content };
  }
};

// 写入文件工具
export const writeFileTool: Tool = {
  name: 'write_file',
  description: 'Write or update a file in the workspace',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'The relative path to the file'
      },
      content: {
        type: 'string',
        description: 'The content to write'
      }
    },
    required: ['path', 'content']
  },
  execute: async ({ path: filePath, content, workspacePath }) => {
    const fullPath = path.join(workspacePath, filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    
    // 修复换行符问题：将字面量的 \r\n 和 \n 转换为真正的换行符
    let fixedContent = content;
    if (typeof content === 'string') {
      // 将 \\r\\n 替换为 \r\n
      fixedContent = content.replace(/\\r\\n/g, '\r\n').replace(/\\n/g, '\n');
    }
    
    await fs.writeFile(fullPath, fixedContent, 'utf-8');
    return { success: true, path: filePath };
  }
};

// 列出文件工具
export const listFilesTool: Tool = {
  name: 'list_files',
  description: 'List all files in a directory',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'The relative directory path (default: ".")'
      }
    }
  },
  execute: async ({ path: dirPath = '.', workspacePath }) => {
    const fullPath = path.join(workspacePath, dirPath);
    
    async function walkDir(dir: string, prefix = ''): Promise<string[]> {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      const files: string[] = [];
      
      for (const entry of entries) {
        const relativePath = path.join(prefix, entry.name);
        if (entry.isDirectory()) {
          files.push(...await walkDir(path.join(dir, entry.name), relativePath));
        } else {
          files.push(relativePath);
        }
      }
      
      return files;
    }
    
    const files = await walkDir(fullPath);
    return { success: true, files };
  }
};

// 应用代码补丁工具
export const applyPatchTool: Tool = {
  name: 'apply_patch',
  description: 'Apply a unified diff patch to a file',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'The relative path to the file'
      },
      patch: {
        type: 'string',
        description: 'The unified diff patch'
      }
    },
    required: ['path', 'patch']
  },
  execute: async ({ path: filePath, patch, workspacePath }) => {
    const fullPath = path.join(workspacePath, filePath);
    const originalContent = await fs.readFile(fullPath, 'utf-8');
    const patchedContent = applyPatch(originalContent, patch);
    
    if (patchedContent === false) {
      throw new Error('Failed to apply patch');
    }
    
    await fs.writeFile(fullPath, patchedContent, 'utf-8');
    return { success: true, path: filePath };
  }
};

// 创建补丁工具
export const createPatchTool: Tool = {
  name: 'create_patch',
  description: 'Create a unified diff patch between old and new content',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'The file path (for context)'
      },
      oldContent: {
        type: 'string',
        description: 'The original content'
      },
      newContent: {
        type: 'string',
        description: 'The new content'
      }
    },
    required: ['path', 'oldContent', 'newContent']
  },
  execute: async ({ path: filePath, oldContent, newContent }) => {
    const patch = createPatch(filePath, oldContent, newContent);
    return { success: true, patch };
  }
};

// 工具注册表
export const TOOLS: Record<string, Tool> = {
  read_file: readFileTool,
  write_file: writeFileTool,
  list_files: listFilesTool,
  apply_patch: applyPatchTool,
  create_patch: createPatchTool,
};

// 将工具转换为 LLM function calling 格式
export function toolsToFunctions(tools: Tool[]) {
  return tools.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }
  }));
}


