// API: 清除索引
import { NextRequest, NextResponse } from 'next/server';
import { getIndexer } from '@/lib/codebase/indexer';

export async function POST(req: NextRequest) {
  try {
    console.log('Clearing codebase index...');
    
    const indexer = await getIndexer();
    await indexer.clearIndex();
    
    return NextResponse.json({
      success: true,
      message: 'Index cleared successfully'
    });
    
  } catch (error: any) {
    console.error('Clear index error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

