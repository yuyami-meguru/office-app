import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');

  // 環境変数のチェック
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  // リダイレクトURIを動的に決定（現在のホストに合わせる）
  const host = request.headers.get('host') || 'localhost:3000';
  const protocol = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${protocol}://${host}/api/auth/google`;

  if (!clientId || !clientSecret) {
    console.error('環境変数が設定されていません:', {
      GOOGLE_CLIENT_ID: clientId ? '設定済み' : '未設定',
      GOOGLE_CLIENT_SECRET: clientSecret ? '設定済み' : '未設定',
    });
    return NextResponse.redirect(
      new URL('/calendar-sync?error=env_not_set', request.url)
    );
  }

  try {
    // googleapisパッケージがインストールされている場合のみ実行
    const { google } = await import('googleapis');

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    if (!code) {
      // リダイレクトURIを現在のホストに合わせて動的に設定
      const host = request.headers.get('host') || 'localhost:3000';
      const protocol = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
      const dynamicRedirectUri = `${protocol}://${host}/api/auth/google`;
      
      // 動的リダイレクトURIを使用してOAuth2クライアントを再作成
      const dynamicOAuth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        dynamicRedirectUri
      );
      
      // 認証URLを生成してリダイレクト
      const authUrl = dynamicOAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: [
          'https://www.googleapis.com/auth/calendar',
          'https://www.googleapis.com/auth/calendar.events',
        ],
        prompt: 'consent', // リフレッシュトークンを取得するため
      });

      console.log('認証URL生成:', { 
        authUrl, 
        clientId: clientId?.substring(0, 20) + '...', 
        redirectUri: dynamicRedirectUri,
        originalRedirectUri: redirectUri
      });
      
      return NextResponse.redirect(authUrl);
    }

    // 認証コードをトークンに交換
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error('トークンの取得に失敗しました');
    }

    // トークンを一時的にセッションに保存（クライアント側でデータベースに保存）
    const response = NextResponse.redirect(
      new URL('/calendar-sync?success=true&tokens=' + encodeURIComponent(JSON.stringify(tokens)), request.url)
    );

    return response;
  } catch (error: any) {
    if (error.code === 'MODULE_NOT_FOUND') {
      return NextResponse.redirect(
        new URL('/calendar-sync?error=module_not_found', request.url)
      );
    }
    console.error('認証エラー:', error);
    return NextResponse.redirect(
      new URL('/calendar-sync?error=auth_failed', request.url)
    );
  }
}

