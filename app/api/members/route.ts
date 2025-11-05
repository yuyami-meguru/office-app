import { NextRequest, NextResponse } from 'next/server';
import { getMembers } from '@/lib/membersDB';

// REST API: メンバー一覧取得
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const members = await getMembers();
    return NextResponse.json({ members });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

