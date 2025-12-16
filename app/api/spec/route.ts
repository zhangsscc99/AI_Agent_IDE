// API 路由 - Spec 管理
import { NextRequest, NextResponse } from 'next/server';
import { SpecManager } from '@/lib/sdd/spec-manager';
import path from 'path';

const WORKSPACE_PATH = process.env.WORKSPACE_PATH || './workspace';

/**
 * GET /api/spec?sessionId=xxx
 * 列出指定会话的所有 spec 文件
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');
    const fileName = searchParams.get('fileName');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    const workspacePath = path.join(WORKSPACE_PATH, sessionId);
    const specManager = new SpecManager(workspacePath);

    // 如果指定了文件名，读取该文件
    if (fileName) {
      const spec = await specManager.readSpec(fileName);
      return NextResponse.json({
        success: true,
        spec
      });
    }

    // 否则列出所有文件
    const files = await specManager.listSpecs();
    return NextResponse.json({
      success: true,
      files
    });
  } catch (error: any) {
    console.error('Error in spec API:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/spec
 * 创建新的 spec 文件
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, spec, format = 'yaml' } = body;

    if (!sessionId || !spec) {
      return NextResponse.json(
        { error: 'sessionId and spec are required' },
        { status: 400 }
      );
    }

    const workspacePath = path.join(WORKSPACE_PATH, sessionId);
    const specManager = new SpecManager(workspacePath);

    const fileName = await specManager.createSpec(spec, format);

    return NextResponse.json({
      success: true,
      fileName,
      message: `Created spec: ${fileName}`
    });
  } catch (error: any) {
    console.error('Error creating spec:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/spec
 * 更新 spec 文件
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, fileName, spec } = body;

    if (!sessionId || !fileName || !spec) {
      return NextResponse.json(
        { error: 'sessionId, fileName, and spec are required' },
        { status: 400 }
      );
    }

    const workspacePath = path.join(WORKSPACE_PATH, sessionId);
    const specManager = new SpecManager(workspacePath);

    await specManager.updateSpec(fileName, spec);

    return NextResponse.json({
      success: true,
      message: `Updated spec: ${fileName}`
    });
  } catch (error: any) {
    console.error('Error updating spec:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/spec
 * 删除 spec 文件
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');
    const fileName = searchParams.get('fileName');

    if (!sessionId || !fileName) {
      return NextResponse.json(
        { error: 'sessionId and fileName are required' },
        { status: 400 }
      );
    }

    const workspacePath = path.join(WORKSPACE_PATH, sessionId);
    const specManager = new SpecManager(workspacePath);

    await specManager.deleteSpec(fileName);

    return NextResponse.json({
      success: true,
      message: `Deleted spec: ${fileName}`
    });
  } catch (error: any) {
    console.error('Error deleting spec:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

