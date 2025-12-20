import { NextRequest, NextResponse } from 'next/server';
import { checkpointStore } from '@/lib/agent/checkpoints';

export async function GET(request: NextRequest) {
  const checkpointId = request.nextUrl.searchParams.get('checkpointId');
  if (!checkpointId) {
    return NextResponse.json(
      { error: 'checkpointId is required' },
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

  return NextResponse.json({ success: true, checkpoint });
}
