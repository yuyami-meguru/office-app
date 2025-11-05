'use client';

import { useState, useEffect } from 'react';
import AuthGuard from '@/components/AuthGuard';
import DiscordLayout from '@/components/DiscordLayout';
import { getCurrentGlobalUser } from '@/lib/authDB';
import {
  getGoogleCalendarSync,
  upsertGoogleCalendarSync,
  deleteGoogleCalendarSync,
  saveGoogleTokens,
  getGoogleTokens,
  type GoogleCalendarSync,
} from '@/lib/calendarSyncDB';

export const dynamic = 'force-dynamic';

export default function CalendarSyncPage() {
  const [sync, setSync] = useState<GoogleCalendarSync | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [calendarId, setCalendarId] = useState('');
  const [syncDirection, setSyncDirection] = useState<'import' | 'export' | 'bidirectional'>('bidirectional');
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasTokens, setHasTokens] = useState(false);
  const user = getCurrentGlobalUser();

  useEffect(() => {
    loadSync();
    checkTokens();
    
    // URLパラメータからトークンを取得して保存
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const tokensParam = urlParams.get('tokens');
    const error = urlParams.get('error');
    
    if (success === 'true' && tokensParam) {
      try {
        const tokens = JSON.parse(decodeURIComponent(tokensParam));
        if (tokens.access_token && tokens.refresh_token && tokens.expiry_date) {
          handleSaveTokens(tokens);
          // URLパラメータを削除
          window.history.replaceState({}, '', '/calendar-sync');
        }
      } catch (err) {
        console.error('トークン解析エラー:', err);
        alert('トークンの保存に失敗しました');
      }
    }
    
    if (error === 'auth_failed') {
      alert('Google認証に失敗しました。もう一度お試しください。');
      window.history.replaceState({}, '', '/calendar-sync');
    }
    
    if (error === 'module_not_found') {
      alert('googleapisパッケージがインストールされていません。npm install googleapis を実行してください。');
      window.history.replaceState({}, '', '/calendar-sync');
    }
    
    if (error === 'env_not_set') {
      alert('環境変数（GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET）が設定されていません。.env.localファイルを確認してください。');
      window.history.replaceState({}, '', '/calendar-sync');
    }
  }, []);
  
  const checkTokens = async () => {
    const tokens = await getGoogleTokens();
    setHasTokens(!!tokens);
  };
  
  const handleSaveTokens = async (tokens: any) => {
    try {
      await saveGoogleTokens(
        tokens.access_token,
        tokens.refresh_token,
        new Date(tokens.expiry_date)
      );
      await checkTokens();
      alert('Google認証が完了しました');
    } catch (err: any) {
      console.error('トークン保存エラー:', err);
      alert('トークンの保存に失敗しました: ' + (err.message || '不明なエラー'));
    }
  };
  
  const handleAuth = () => {
    window.location.href = '/api/auth/google';
  };

  const loadSync = async () => {
    setIsLoading(true);
    try {
      const data = await getGoogleCalendarSync();
      setSync(data);
      if (data) {
        setCalendarId(data.calendarId);
        setSyncDirection(data.syncDirection);
      }
    } catch (err) {
      console.error('同期設定取得エラー:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!calendarId.trim()) {
      alert('カレンダーIDを入力してください');
      return;
    }

    try {
      await upsertGoogleCalendarSync(calendarId, syncDirection, true);
      await loadSync();
      await checkTokens(); // トークン状態も更新
      alert('カレンダー同期設定を保存しました');
    } catch (err: any) {
      console.error('設定保存エラー:', err);
      alert('設定の保存に失敗しました: ' + (err.message || '不明なエラー'));
    }
  };

  const handleDelete = async () => {
    if (!confirm('カレンダー同期設定を削除しますか？')) return;

    try {
      await deleteGoogleCalendarSync();
      setSync(null);
      setCalendarId('');
      setSyncDirection('bidirectional');
      alert('カレンダー同期設定を削除しました');
    } catch (err) {
      alert('設定の削除に失敗しました');
    }
  };

  const handleSync = async () => {
    if (!hasTokens) {
      alert('Google認証が必要です。まず認証を行ってください。');
      return;
    }
    
    setIsSyncing(true);
    try {
      const response = await fetch('/api/calendar-sync', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || '同期に失敗しました');
      }
      
      await loadSync();
      alert('カレンダーを同期しました');
    } catch (err: any) {
      alert(err.message || '同期に失敗しました');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleToggleEnabled = async () => {
    if (!sync) return;

    try {
      await upsertGoogleCalendarSync(sync.calendarId, sync.syncDirection, !sync.enabled);
      await loadSync();
    } catch (err) {
      alert('設定の更新に失敗しました');
    }
  };

  return (
    <AuthGuard>
      <DiscordLayout>
        <div className="p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">Googleカレンダー同期</h1>
            <p className="text-gray-600">Googleカレンダーとスケジュールを同期</p>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">読み込み中...</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              {sync ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">同期設定</h2>
                      <p className="text-sm text-gray-500 mt-1">
                        最終同期: {sync.lastSyncAt ? new Date(sync.lastSyncAt).toLocaleString('ja-JP') : '未同期'}
                      </p>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sync.enabled}
                        onChange={handleToggleEnabled}
                        className="w-5 h-5"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        {sync.enabled ? '有効' : '無効'}
                      </span>
                    </label>
                  </div>

                  {/* Google認証ステータス */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-blue-900">
                          Google認証状態
                        </p>
                        <p className="text-xs text-blue-700 mt-1">
                          {hasTokens ? '認証済み' : '未認証'}
                        </p>
                      </div>
                      {!hasTokens && (
                        <button
                          onClick={handleAuth}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-semibold"
                        >
                          Google認証
                        </button>
                      )}
                      {hasTokens && (
                        <span className="text-green-600 text-sm font-semibold">✓ 認証済み</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">カレンダーID</label>
                    <input
                      type="text"
                      value={calendarId}
                      onChange={(e) => setCalendarId(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                      placeholder="Google Calendar ID（例: primary）"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      通常は "primary" を使用します
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">同期方向</label>
                    <select
                      value={syncDirection}
                      onChange={(e) => setSyncDirection(e.target.value as 'import' | 'export' | 'bidirectional')}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    >
                      <option value="import">インポートのみ（Google → アプリ）</option>
                      <option value="export">エクスポートのみ（アプリ → Google）</option>
                      <option value="bidirectional">双方向同期</option>
                    </select>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleSave}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-semibold"
                    >
                      設定を保存
                    </button>
                    <button
                      onClick={handleSync}
                      disabled={isSyncing || !hasTokens || !sync.enabled}
                      className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSyncing ? '同期中...' : '今すぐ同期'}
                    </button>
                    <button
                      onClick={handleDelete}
                      className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 font-semibold"
                    >
                      削除
                    </button>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800 font-semibold mb-2">注意</p>
                    <p className="text-sm text-yellow-700 mb-2">
                      実際のGoogleカレンダー同期には、Google Calendar APIの認証設定が必要です。
                      環境変数（GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET）が設定されている場合、同期機能が利用可能です。
                    </p>
                    <p className="text-xs text-yellow-600 mt-2">
                      ※ 環境変数が設定されていない場合は、GOOGLE_CALENDAR_IMPLEMENTATION.md を参照してください
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <p className="text-gray-600">Googleカレンダー同期を設定してください</p>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">カレンダーID</label>
                    <input
                      type="text"
                      value={calendarId}
                      onChange={(e) => setCalendarId(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                      placeholder="Google Calendar ID（例: primary）"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">同期方向</label>
                    <select
                      value={syncDirection}
                      onChange={(e) => setSyncDirection(e.target.value as 'import' | 'export' | 'bidirectional')}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    >
                      <option value="import">インポートのみ（Google → アプリ）</option>
                      <option value="export">エクスポートのみ（アプリ → Google）</option>
                      <option value="bidirectional">双方向同期</option>
                    </select>
                  </div>

                  {/* Google認証 */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm font-semibold text-blue-900">
                          Google認証
                        </p>
                        <p className="text-xs text-blue-700 mt-1">
                          {hasTokens ? '認証済み' : '認証が必要です'}
                        </p>
                      </div>
                      {!hasTokens && (
                        <button
                          onClick={handleAuth}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-semibold"
                        >
                          Google認証
                        </button>
                      )}
                      {hasTokens && (
                        <span className="text-green-600 text-sm font-semibold">✓ 認証済み</span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={handleSave}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
                  >
                    設定を保存
                  </button>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800 font-semibold mb-2">注意</p>
                    <p className="text-sm text-yellow-700">
                      実際のGoogleカレンダー同期には、Google Calendar APIの認証設定が必要です。
                      環境変数（GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET）が設定されている場合、同期機能が利用可能です。
                    </p>
                    <p className="text-xs text-yellow-600 mt-2">
                      ※ 環境変数が設定されていない場合は、GOOGLE_CALENDAR_IMPLEMENTATION.md を参照してください
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DiscordLayout>
    </AuthGuard>
  );
}

