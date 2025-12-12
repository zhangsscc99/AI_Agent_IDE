// 工作空间文件管理 API
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';

// 递归列出文件
async function walkDir(dir: string, baseDir: string): Promise<any[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const items: any[] = [];
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);
    
    if (entry.isDirectory()) {
      const children = await walkDir(fullPath, baseDir);
      items.push({
        name: entry.name,
        path: relativePath,
        type: 'directory',
        children,
      });
    } else {
      items.push({
        name: entry.name,
        path: relativePath,
        type: 'file',
      });
    }
  }
  
  return items.sort((a, b) => {
    if (a.type === b.type) return a.name.localeCompare(b.name);
    return a.type === 'directory' ? -1 : 1;
  });
}

// GET - 列出文件
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }
    
    const workspacePath = path.join(
      process.cwd(),
      process.env.WORKSPACE_PATH || 'workspace',
      sessionId
    );
    
    // 确保工作空间存在
    await fs.mkdir(workspacePath, { recursive: true });
    
    const files = await walkDir(workspacePath, workspacePath);
    
    return NextResponse.json({ files });
  } catch (error: any) {
    console.error('List files error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - 读取文件内容
export async function POST(request: NextRequest) {
  try {
    const { sessionId, filePath } = await request.json();
    
    if (!sessionId || !filePath) {
      return NextResponse.json(
        { error: 'Missing sessionId or filePath' },
        { status: 400 }
      );
    }
    
    const workspacePath = path.join(
      process.cwd(),
      process.env.WORKSPACE_PATH || 'workspace',
      sessionId
    );
    
    const fullPath = path.join(workspacePath, filePath);
    
    // 安全检查：确保文件在工作空间内
    if (!fullPath.startsWith(workspacePath)) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 403 });
    }
    
    const content = await fs.readFile(fullPath, 'utf-8');
    
    return NextResponse.json({ content, path: filePath });
  } catch (error: any) {
    console.error('Read file error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}




