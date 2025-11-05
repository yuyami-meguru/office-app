# Googleカレンダー同期機能の実装ガイド

## 概要

Google Calendar APIを使用して、アプリのスケジュールとGoogleカレンダーを同期する機能を実装します。

## 実装手順

### 1. Google Cloud Consoleでの設定

#### 1.1 プロジェクトの作成
1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. 新しいプロジェクトを作成（または既存のプロジェクトを選択）
3. プロジェクト名を入力（例: "事務所管理アプリ"）

#### 1.2 Google Calendar APIの有効化
1. 「APIとサービス」→「ライブラリ」に移動
2. "Google Calendar API"を検索
3. 「有効にする」をクリック

#### 1.3 OAuth 2.0認証情報の作成
1. 「APIとサービス」→「認証情報」に移動
2. 「認証情報を作成」→「OAuth クライアント ID」を選択
3. 同意画面を設定（初回のみ）
   - ユーザータイプ: 外部
   - アプリ名: 事務所管理アプリ
   - ユーザーサポートメール: あなたのメールアドレス
   - 開発者の連絡先情報: あなたのメールアドレス
4. OAuth クライアント IDを作成
   - アプリケーションの種類: 「ウェブアプリケーション」
   - 名前: 事務所管理アプリ
   - 承認済みのリダイレクト URI: 
     - `http://localhost:3000/api/auth/google/callback` (開発環境)
     - `https://your-domain.com/api/auth/google/callback` (本番環境)

#### 1.4 認証情報の取得
1. 作成したOAuth 2.0クライアント IDの「クライアント ID」と「クライアント シークレット」をコピー
2. これらを環境変数に設定（後述）

### 2. 環境変数の設定

`.env.local`ファイルに以下を追加：

```env
# Google Calendar API
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

Vercelにデプロイする場合、Vercelの環境変数設定にも追加してください。

### 3. 必要なパッケージのインストール

```bash
npm install googleapis
npm install @types/googleapis --save-dev
```

### 4. 認証フローの実装

#### 4.1 認証APIルートの作成

`app/api/auth/google/route.ts.example`を参考に、`app/api/auth/google/route.ts`を作成：

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');

  if (!code) {
    // 認証URLを生成してリダイレクト
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
      ],
      prompt: 'consent', // リフレッシュトークンを取得するため
    });

    return NextResponse.redirect(authUrl);
  }

  // 認証コードをトークンに交換
  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    // トークンをデータベースに保存（lib/calendarSyncDB.ts の saveGoogleTokens を使用）
    // const officeId = getCurrentOfficeId();
    // const user = getCurrentGlobalUser();
    // if (officeId && user) {
    //   await saveGoogleTokens(tokens.access_token!, tokens.refresh_token!, new Date(tokens.expiry_date!));
    // }

    return NextResponse.redirect(
      new URL('/calendar-sync?success=true', request.url)
    );
  } catch (error) {
    console.error('認証エラー:', error);
    return NextResponse.redirect(
      new URL('/calendar-sync?error=auth_failed', request.url)
    );
  }
}
```

#### 4.2 コールバックAPIルートについて

リダイレクトURIは `/api/auth/google` に設定してください（コールバック用の別ルートは不要です）。
oauth2Client.getToken(code) が自動的にコールバックを処理します。

### 5. データベーススキーマの更新

`supabase-schema-calendar-sync.sql`を実行してください。このファイルには既にトークン保存用のカラムが含まれています：

```sql
-- 既存のテーブルに追加（既にスキーマに含まれています）
ALTER TABLE google_calendar_sync 
ADD COLUMN IF NOT EXISTS access_token TEXT,
ADD COLUMN IF NOT EXISTS refresh_token TEXT,
ADD COLUMN IF NOT EXISTS token_expiry TIMESTAMPTZ;
```

または、`supabase-schema-calendar-sync.sql`を再実行してください（`IF NOT EXISTS`でエラーになりません）。

### 6. トークン管理の実装

`lib/calendarSyncDB.ts`に、トークンの保存・取得機能を追加：

```typescript
import { supabase } from './supabase';
import { getCurrentOfficeId, getCurrentGlobalUser } from './authDB';

// トークンを保存
export async function saveGoogleTokens(
  accessToken: string,
  refreshToken: string,
  expiryDate: Date
): Promise<void> {
  const officeId = getCurrentOfficeId();
  const user = getCurrentGlobalUser();
  if (!officeId || !user) throw new Error('認証が必要です');

  const { error } = await supabase
    .from('calendar_sync_configs')
    .upsert({
      office_id: officeId,
      user_id: user.id,
      access_token: accessToken,
      refresh_token: refreshToken,
      token_expiry: expiryDate.toISOString(),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'office_id,user_id',
    });

  if (error) throw error;
}

// トークンを取得
export async function getGoogleTokens(): Promise<{
  accessToken: string;
  refreshToken: string;
  expiryDate: Date;
} | null> {
  const officeId = getCurrentOfficeId();
  const user = getCurrentGlobalUser();
  if (!officeId || !user) return null;

  const { data, error } = await supabase
    .from('calendar_sync_configs')
    .select('access_token, refresh_token, token_expiry')
    .eq('office_id', officeId)
    .eq('user_id', user.id)
    .single();

  if (error || !data) return null;

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiryDate: new Date(data.token_expiry),
  };
}
```

### 7. 同期機能の実装

`lib/calendarSyncDB.ts`の`syncGoogleCalendar`関数を実装：

```typescript
import { google } from 'googleapis';
import { getEvents } from './eventsDB';
import { addEvent, updateEvent } from './eventsDB';

export async function syncGoogleCalendar(): Promise<void> {
  const officeId = getCurrentOfficeId();
  const user = getCurrentGlobalUser();
  if (!officeId || !user) throw new Error('認証が必要です');

  // 設定を取得
  const config = await getGoogleCalendarSync();
  if (!config || !config.enabled) {
    throw new Error('カレンダー同期が有効になっていません');
  }

  // トークンを取得
  const tokens = await getGoogleTokens();
  if (!tokens) {
    throw new Error('Google認証が必要です。認証を行ってください。');
  }

  // OAuth2クライアントを設定
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
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
      credentials.refresh_token!,
      new Date(credentials.expiry_date!)
    );
    oauth2Client.setCredentials(credentials);
  }

  // Calendar APIクライアントを作成
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  // 同期方向に応じて処理
  if (config.syncDirection === 'import' || config.syncDirection === 'bidirectional') {
    // Googleカレンダーからイベントを取得
    const response = await calendar.events.list({
      calendarId: config.calendarId || 'primary',
      timeMin: new Date().toISOString(),
      maxResults: 100,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const googleEvents = response.data.items || [];
    
    // アプリのイベントと比較して同期
    const appEvents = await getEvents();
    
    for (const googleEvent of googleEvents) {
      // 既存のイベントをチェック（GoogleイベントIDで）
      const existingEvent = appEvents.find(
        e => e.notes?.includes(`google_id:${googleEvent.id}`)
      );

      if (existingEvent) {
        // 更新
        await updateEvent(existingEvent.id, {
          title: googleEvent.summary || '',
          date: googleEvent.start?.dateTime || googleEvent.start?.date || '',
          time: googleEvent.start?.dateTime?.split('T')[1] || '',
          notes: `google_id:${googleEvent.id}\n${googleEvent.description || ''}`,
        });
      } else {
        // 新規作成
        await addEvent({
          title: googleEvent.summary || '',
          date: googleEvent.start?.dateTime || googleEvent.start?.date || '',
          time: googleEvent.start?.dateTime?.split('T')[1] || '',
          notes: `google_id:${googleEvent.id}\n${googleEvent.description || ''}`,
        });
      }
    }
  }

  if (config.syncDirection === 'export' || config.syncDirection === 'bidirectional') {
    // アプリのイベントをGoogleカレンダーに送信
    const appEvents = await getEvents();
    
    for (const appEvent of appEvents) {
      // GoogleイベントIDをチェック
      const googleIdMatch = appEvent.notes?.match(/google_id:([^\n]+)/);
      
      if (googleIdMatch) {
        // 既存イベントを更新
        await calendar.events.update({
          calendarId: config.calendarId || 'primary',
          eventId: googleIdMatch[1],
          requestBody: {
            summary: appEvent.title,
            description: appEvent.notes,
            start: {
              dateTime: `${appEvent.date}T${appEvent.time}`,
              timeZone: 'Asia/Tokyo',
            },
            end: {
              dateTime: `${appEvent.date}T${appEvent.time}`,
              timeZone: 'Asia/Tokyo',
            },
          },
        });
      } else {
        // 新規イベントを作成
        const createdEvent = await calendar.events.insert({
          calendarId: config.calendarId || 'primary',
          requestBody: {
            summary: appEvent.title,
            description: `google_id:${Date.now()}\n${appEvent.notes || ''}`,
            start: {
              dateTime: `${appEvent.date}T${appEvent.time}`,
              timeZone: 'Asia/Tokyo',
            },
            end: {
              dateTime: `${appEvent.date}T${appEvent.time}`,
              timeZone: 'Asia/Tokyo',
            },
          },
        });

        // アプリのイベントにGoogle IDを追加
        if (createdEvent.data.id) {
          await updateEvent(appEvent.id, {
            notes: `${appEvent.notes || ''}\ngoogle_id:${createdEvent.data.id}`,
          });
        }
      }
    }
  }

  // 最終同期日時を更新
  await supabase
    .from('calendar_sync_configs')
    .update({ last_sync_at: new Date().toISOString() })
    .eq('office_id', officeId)
    .eq('user_id', user.id);
}
```

### 8. UIの更新

`app/calendar-sync/page.tsx`を更新して、認証ボタンを追加：

```typescript
const handleAuth = () => {
  // Google認証ページにリダイレクト
  window.location.href = '/api/auth/google';
};
```

### 9. セキュリティ考慮事項

1. **トークンの暗号化**: アクセストークンとリフレッシュトークンは暗号化して保存
2. **HTTPSの使用**: 本番環境では必ずHTTPSを使用
3. **スコープの最小化**: 必要な最小限のスコープのみを要求
4. **トークンの有効期限管理**: リフレッシュトークンを使用して自動更新

### 10. テスト

1. ローカル環境で認証フローをテスト
2. イベントの同期が正しく動作するか確認
3. エラーハンドリングを確認

## 参考リンク

- [Google Calendar API ドキュメント](https://developers.google.com/calendar/api/guides/overview)
- [googleapis npmパッケージ](https://www.npmjs.com/package/googleapis)
- [OAuth 2.0認証フロー](https://developers.google.com/identity/protocols/oauth2)

## 注意事項

- リフレッシュトークンは初回認証時にのみ取得されます（`prompt: 'consent'`を使用）
- トークンは安全に保存し、暗号化することを推奨
- APIの使用制限に注意（1日あたりのリクエスト数）

