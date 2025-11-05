import { supabase } from './supabase';
import { getCurrentOfficeId, getCurrentGlobalUser } from './authDB';

export type GoogleCalendarSync = {
  id: number;
  userId: number;
  officeId: string;
  calendarId: string; // Google Calendar ID
  syncDirection: 'import' | 'export' | 'bidirectional';
  enabled: boolean;
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
};

// Googleカレンダー同期設定を取得
export async function getGoogleCalendarSync(): Promise<GoogleCalendarSync | null> {
  const officeId = getCurrentOfficeId();
  const user = getCurrentGlobalUser();
  if (!officeId || !user) {
    console.log('getGoogleCalendarSync: officeIdまたはuserがありません', { officeId, userId: user?.id });
    return null;
  }

  const { data, error } = await supabase
    .from('google_calendar_sync')
    .select('*')
    .eq('office_id', officeId)
    .eq('user_id', user.id)
    .maybeSingle();

  // テーブルが存在しない場合のエラーを無視
  if (error && error.code !== 'PGRST116' && error.code !== '42P01') {
    console.error('Googleカレンダー同期設定取得エラー:', error);
  }

  if (!data) {
    console.log('getGoogleCalendarSync: データが見つかりません', { officeId, userId: user.id });
    return null;
  }

  return {
    id: data.id,
    userId: data.user_id,
    officeId: data.office_id,
    calendarId: data.calendar_id,
    syncDirection: data.sync_direction as 'import' | 'export' | 'bidirectional',
    enabled: data.enabled,
    lastSyncAt: data.last_sync_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

// Googleカレンダー同期設定を作成・更新
export async function upsertGoogleCalendarSync(
  calendarId: string,
  syncDirection: 'import' | 'export' | 'bidirectional',
  enabled: boolean = true
): Promise<GoogleCalendarSync> {
  const officeId = getCurrentOfficeId();
  const user = getCurrentGlobalUser();
  if (!officeId || !user) throw new Error('ログインが必要です');

  // まず既存のレコードを確認
  const { data: existing } = await supabase
    .from('google_calendar_sync')
    .select('id')
    .eq('office_id', officeId)
    .eq('user_id', user.id)
    .maybeSingle();

  let data, error;

  if (existing) {
    // 既存レコードを更新
    const result = await supabase
      .from('google_calendar_sync')
      .update({
        calendar_id: calendarId,
        sync_direction: syncDirection,
        enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();
    data = result.data;
    error = result.error;
  } else {
    // 新規レコードを作成
    const result = await supabase
      .from('google_calendar_sync')
      .insert({
        user_id: user.id,
        office_id: officeId,
        calendar_id: calendarId,
        sync_direction: syncDirection,
        enabled,
      })
      .select()
      .single();
    data = result.data;
    error = result.error;
  }

  if (error) {
    const errorDetails = error.message || error.code || JSON.stringify(error);
    console.error('カレンダー同期設定保存エラー:', {
      error,
      errorMessage: error.message,
      errorCode: error.code,
      errorDetails: error.details,
      errorHint: error.hint,
      officeId,
      userId: user.id,
      calendarId,
      syncDirection,
    });
    throw new Error('カレンダー同期設定の保存に失敗しました: ' + errorDetails);
  }

  if (!data) {
    throw new Error('カレンダー同期設定の保存に失敗しました: データが返されませんでした');
  }

  return {
    id: data.id,
    userId: data.user_id,
    officeId: data.office_id,
    calendarId: data.calendar_id,
    syncDirection: data.sync_direction as 'import' | 'export' | 'bidirectional',
    enabled: data.enabled,
    lastSyncAt: data.last_sync_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

// Googleカレンダー同期を削除
export async function deleteGoogleCalendarSync(): Promise<void> {
  const officeId = getCurrentOfficeId();
  const user = getCurrentGlobalUser();
  if (!officeId || !user) throw new Error('ログインが必要です');

  const { error } = await supabase
    .from('google_calendar_sync')
    .delete()
    .eq('office_id', officeId)
    .eq('user_id', user.id);

  if (error) {
    throw new Error('カレンダー同期設定の削除に失敗しました');
  }
}

// トークンを保存
export async function saveGoogleTokens(
  accessToken: string,
  refreshToken: string,
  expiryDate: Date
): Promise<void> {
  const officeId = getCurrentOfficeId();
  const user = getCurrentGlobalUser();
  if (!officeId || !user) throw new Error('ログインが必要です');

  // まず既存のレコードを確認
  const { data: existing, error: checkError } = await supabase
    .from('google_calendar_sync')
    .select('id')
    .eq('office_id', officeId)
    .eq('user_id', user.id)
    .maybeSingle();

  // テーブルが存在しない場合のエラーを無視
  if (checkError && checkError.code !== 'PGRST116' && checkError.code !== '42P01') {
    console.error('レコード確認エラー:', checkError);
    throw new Error('レコードの確認に失敗しました: ' + (checkError.message || JSON.stringify(checkError)));
  }

  if (existing) {
    // 既存レコードを更新
    const { error } = await supabase
      .from('google_calendar_sync')
      .update({
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expiry: expiryDate.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (error) {
      const errorDetails = error.message || error.code || JSON.stringify(error);
      console.error('トークン更新エラー:', {
        error,
        errorMessage: error.message,
        errorCode: error.code,
        errorDetails: error.details,
        errorHint: error.hint,
        officeId,
        userId: user.id,
      });
      throw new Error('トークンの保存に失敗しました: ' + errorDetails);
    }
  } else {
    // 新規レコードを作成（calendar_idとsync_directionは必須なのでデフォルト値を設定）
    const { error } = await supabase
      .from('google_calendar_sync')
      .insert({
        office_id: officeId,
        user_id: user.id,
        calendar_id: 'primary', // デフォルト値
        sync_direction: 'bidirectional', // デフォルト値
        enabled: true,
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expiry: expiryDate.toISOString(),
      });

    if (error) {
      const errorDetails = error.message || error.code || JSON.stringify(error);
      console.error('トークン作成エラー:', {
        error,
        errorMessage: error.message,
        errorCode: error.code,
        errorDetails: error.details,
        errorHint: error.hint,
        officeId,
        userId: user.id,
      });
      throw new Error('トークンの保存に失敗しました: ' + errorDetails);
    }
  }
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
    .from('google_calendar_sync')
    .select('access_token, refresh_token, token_expiry')
    .eq('office_id', officeId)
    .eq('user_id', user.id)
    .single();

  if (error || !data || !data.access_token || !data.refresh_token) {
    return null;
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiryDate: new Date(data.token_expiry),
  };
}

// 同期実行関数は /app/api/calendar-sync/route.ts に移動しました
// クライアントサイドからは /api/calendar-sync を呼び出してください

