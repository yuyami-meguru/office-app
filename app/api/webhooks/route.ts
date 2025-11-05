import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Webhook設定テーブル（今後作成）
// 現在は簡易的な実装

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, data, signature } = body;

    // 署名検証（実際の実装では適切に検証）
    // if (!verifySignature(signature, body)) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    // }

    // イベント処理
    switch (event) {
      case 'task.created':
      case 'task.updated':
      case 'task.deleted':
      case 'member.created':
      case 'member.updated':
      case 'member.deleted':
      case 'announcement.created':
        // Webhook受信をログに記録
        await supabase.from('activity_logs').insert([
          {
            office_id: data.officeId || '',
            user_id: 0, // システム
            action_type: `webhook.${event}`,
            entity_type: 'webhook',
            entity_id: null,
            details: { event, data },
          },
        ]);
        break;
      default:
        return NextResponse.json({ error: 'Unknown event' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Webhook endpoint',
    usage: 'POST requests with event and data',
  });
}

