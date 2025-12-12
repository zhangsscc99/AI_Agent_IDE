// 文件上传 API
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const sessionId = formData.get('sessionId') as string;
    const files = formData.getAll('files') as File[];
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }
    
    const workspacePath = path.join(
      process.cwd(),
      process.env.WORKSPACE_PATH || 'workspace',
      sessionId
    );
    
    await fs.mkdir(workspacePath, { recursive: true });
    
    const uploadedFiles: string[] = [];
    
    for (const file of files) {
      if (!file || !(file instanceof File)) continue;
      
      // 获取文件路径（包含目录结构）
      const filePath = (file as any).webkitRelativePath || file.name;
      const fullPath = path.join(workspacePath, filePath);
      
      // 创建目录
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      
      // 写入文件
      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(fullPath, buffer);
      
      uploadedFiles.push(filePath);
    }
    
    return NextResponse.json({
      success: true,
      files: uploadedFiles,
      count: uploadedFiles.length
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}



