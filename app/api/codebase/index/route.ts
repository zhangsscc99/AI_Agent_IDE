// API: 索引代码库
import { NextRequest, NextResponse } from 'next/server';
import { getIndexer } from '@/lib/codebase/indexer';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();
    
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'sessionId is required' },
        { status: 400 }
      );
    }
    
    const workspacePath = path.join(process.cwd(), 'workspace', sessionId);
    
    console.log(`Starting indexing for session: ${sessionId}`);
    console.log(`Workspace path: ${workspacePath}`);
    
    const indexer = await getIndexer();
    
    // 索引整个工作空间
    await indexer.indexWorkspace(workspacePath, (processed, total, currentFile) => {
      console.log(`Progress: ${processed}/${total} - ${currentFile}`);
    });
    
    return NextResponse.json({
      success: true,
      message: 'Indexing completed successfully'
    });
    
  } catch (error: any) {
    console.error('Indexing error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// GET: 获取索引状态
export async function GET(req: NextRequest) {
  try {
    const indexer = await getIndexer();
    
    return NextResponse.json({
      success: true,
      status: 'ready'
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

