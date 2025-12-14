// API: 搜索代码库
import { NextRequest, NextResponse } from 'next/server';
import { getIndexer } from '@/lib/codebase/indexer';

export async function POST(req: NextRequest) {
  try {
    const { query, topK = 5 } = await req.json();
    
    if (!query) {
      return NextResponse.json(
        { success: false, error: 'query is required' },
        { status: 400 }
      );
    }
    
    console.log(`Searching codebase: "${query}"`);
    
    const indexer = await getIndexer();
    const results = await indexer.search(query, topK);
    
    console.log(`Found ${results.length} results`);
    
    return NextResponse.json({
      success: true,
      results
    });
    
  } catch (error: any) {
    console.error('Search error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

