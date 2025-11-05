import { NextRequest, NextResponse } from 'next/server';
import { getTasks, addTask as addTaskDB } from '@/lib/tasksDB';
import { getCurrentOfficeId, getCurrentGlobalUser } from '@/lib/authDB';

// REST API: タスク一覧取得
export async function GET(request: NextRequest) {
  try {
    // 認証チェック（簡易版）
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tasks = await getTasks();
    return NextResponse.json({ tasks });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// REST API: タスク作成
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const task = await addTaskDB(body);
    
    return NextResponse.json({ task }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

