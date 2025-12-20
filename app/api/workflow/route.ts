import { NextRequest, NextResponse } from 'next/server';
import { workflowManager } from '@/lib/agent/workflow';
import { checkpointStore } from '@/lib/agent/checkpoints';

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId');
  if (!sessionId) {
    return NextResponse.json(
      { error: 'sessionId is required' },
      { status: 400 }
    );
  }

  const workflow = workflowManager.getWorkflow(sessionId);
  if (!workflow) {
    return NextResponse.json({ success: true, workflow: null, checkpoints: [] });
  }

  const checkpoints = checkpointStore.listBySession(sessionId);

  return NextResponse.json({
    success: true,
    workflow,
    checkpoints,
  });
}
