// 代码修改审批 API
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { checkpointStore } from '@/lib/agent/checkpoints';
import { workflowManager } from '@/lib/agent/workflow';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, filePath, content, approved, checkpointId } = await request.json();

    if (!sessionId || !filePath || !checkpointId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const checkpoint = checkpointStore.get(checkpointId);
    if (!checkpoint) {
      return NextResponse.json(
        { error: 'Checkpoint not found' },
        { status: 404 }
      );
    }

    if (!approved) {
      checkpointStore.updateStatus(checkpointId, 'rejected');
      workflowManager.rejectByCheckpoint(sessionId, checkpointId, '用户拒绝修改');
      return NextResponse.json({ success: true, message: 'Change rejected' });
    }

    if (content === undefined) {
      return NextResponse.json(
        { error: 'Missing content for approval' },
        { status: 400 }
      );
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
    
    checkpointStore.updateStatus(checkpointId, 'applied');
    workflowManager.completeByCheckpoint(sessionId, checkpointId);

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

