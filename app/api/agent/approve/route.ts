// 代码修改审批 API
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, filePath, content, approved } = await request.json();
    
    if (!sessionId || !filePath || content === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    if (!approved) {
      return NextResponse.json({ success: true, message: 'Change rejected' });
    }
    
    // 应用修改
    const workspacePath = path.join(
      process.cwd(),
      process.env.WORKSPACE_PATH || 'workspace',
      sessionId
    );
    
    const fullPath = path.join(workspacePath, filePath);
    
    // 修复换行符
    let fixedContent = content;
    if (typeof content === 'string') {
      fixedContent = content.replace(/\\r\\n/g, '\r\n').replace(/\\n/g, '\n');
    }
    
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, fixedContent, 'utf-8');
    
    return NextResponse.json({
      success: true,
      message: 'Changes applied successfully',
      path: filePath,
    });
  } catch (error: any) {
    console.error('Approval error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

