// API 路由 - 获取调试追踪数据
import { NextRequest, NextResponse } from 'next/server';
import { debugTracer } from '@/lib/debug/tracer';

/**
 * GET /api/debug/trace?sessionId=xxx
 * 获取指定会话的调试追踪数据
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Debug API: Looking for session:', sessionId);
    const session = debugTracer.getSession(sessionId);
    
    console.log('🔍 Debug API: Session found?', !!session);
    console.log('🔍 Debug API: All sessions:', debugTracer.getAllSessions().map(s => s.id));

    if (!session) {
      return NextResponse.json(
        { 
          error: 'Session not found',
          sessionId,
          availableSessions: debugTracer.getAllSessions().map(s => s.id)
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      session
    });
  } catch (error: any) {
    console.error('Error fetching debug trace:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/debug/trace/all
 * 获取所有会话的调试追踪数据
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'list_all') {
      const sessions = debugTracer.getAllSessions();
      return NextResponse.json({
        success: true,
        sessions: sessions.map(s => ({
          id: s.id,
          startTime: s.startTime,
          endTime: s.endTime,
          eventsCount: s.events.length,
          summary: s.summary
        }))
      });
    }

    if (action === 'export') {
      const { sessionId } = body;
      if (!sessionId) {
        return NextResponse.json(
          { error: 'sessionId is required for export' },
          { status: 400 }
        );
      }

      const exportData = debugTracer.exportSession(sessionId);
      return NextResponse.json({
        success: true,
        data: exportData
      });
    }

    if (action === 'clear') {
      const { sessionId } = body;
      if (!sessionId) {
        return NextResponse.json(
          { error: 'sessionId is required for clear' },
          { status: 400 }
        );
      }

      debugTracer.clearSession(sessionId);
      return NextResponse.json({
        success: true,
        message: `Cleared session ${sessionId}`
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error in debug trace API:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

