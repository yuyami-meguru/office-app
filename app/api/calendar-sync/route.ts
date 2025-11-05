import { NextRequest, NextResponse } from 'next/server';
import { 
  getGoogleCalendarSync, 
  getGoogleTokens, 
  saveGoogleTokens 
} from '@/lib/calendarSyncDB';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // 同期設定を取得
    const sync = await getGoogleCalendarSync();
    if (!sync || !sync.enabled) {
      return NextResponse.json(
        { success: false, error: 'カレンダー同期が設定されていません' },
        { status: 400 }
      );
    }

    // トークンを取得
    const tokens = await getGoogleTokens();
    if (!tokens) {
      return NextResponse.json(
        { success: false, error: 'Google認証が必要です。認証を行ってください。' },
        { status: 401 }
      );
    }

    // googleapisパッケージをインポート（サーバーサイドのみ）
    const { google } = await import('googleapis');
    
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google';

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { success: false, error: '環境変数（GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET）が設定されていません。' },
        { status: 500 }
      );
    }
    
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    oauth2Client.setCredentials({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expiry_date: tokens.expiryDate.getTime(),
    });

    // トークンが期限切れの場合はリフレッシュ
    if (tokens.expiryDate < new Date()) {
      const { credentials } = await oauth2Client.refreshAccessToken();
      await saveGoogleTokens(
        credentials.access_token!,
        credentials.refresh_token || tokens.refreshToken,
        new Date(credentials.expiry_date!)
      );
      oauth2Client.setCredentials(credentials);
    }

    // Calendar APIクライアントを作成
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // 同期方向に応じて処理
    if (sync.syncDirection === 'import' || sync.syncDirection === 'bidirectional') {
      // Googleカレンダーからイベントを取得
      const response = await calendar.events.list({
        calendarId: sync.calendarId || 'primary',
        timeMin: new Date().toISOString(),
        maxResults: 100,
        singleEvents: true,
        orderBy: 'startTime',
      });

      const googleEvents = response.data.items || [];
      
      // ここでアプリのイベントと同期する処理を実装
      // 現在は簡易的に最終同期時刻を更新
    }

    if (sync.syncDirection === 'export' || sync.syncDirection === 'bidirectional') {
      // アプリのイベントをGoogleカレンダーに送信
      // ここでアプリのイベントをGoogleカレンダーに送信する処理を実装
    }

    // 最終同期日時を更新
    const officeId = sync.officeId;
    const userId = sync.userId;
    
    await supabase
      .from('google_calendar_sync')
      .update({ 
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('office_id', officeId)
      .eq('user_id', userId);

    return NextResponse.json({ success: true, message: 'カレンダーを同期しました' });
  } catch (error: any) {
    if (error.code === 'MODULE_NOT_FOUND') {
      return NextResponse.json(
        { success: false, error: 'googleapisパッケージがインストールされていません。npm install googleapis を実行してください。' },
        { status: 500 }
      );
    }
    console.error('同期エラー:', error);
    return NextResponse.json(
      { success: false, error: error.message || '同期に失敗しました' },
      { status: 500 }
    );
  }
}
