'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import DiscordLayout from '@/components/DiscordLayout';
import { getMyMembership } from '@/lib/membersDB';
import {
  getWebhookConfigurations,
  createWebhookConfiguration,
  updateWebhookConfiguration,
  deleteWebhookConfiguration,
  getWebhookDeliveries,
  type WebhookConfiguration,
  type WebhookDelivery,
} from '@/lib/webhooksDB';

export const dynamic = 'force-dynamic';

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookConfiguration[]>([]);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookConfiguration | null>(null);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [newWebhook, setNewWebhook] = useState({
    name: '',
    url: '',
    events: [] as string[],
  });
  const router = useRouter();

  const availableEvents = [
    'task.created',
    'task.updated',
    'task.deleted',
    'member.created',
    'member.updated',
    'member.deleted',
    'announcement.created',
    'announcement.updated',
    'announcement.deleted',
    'event.created',
    'event.updated',
    'event.deleted',
  ];

  useEffect(() => {
    checkAuthorization();
  }, []);

  useEffect(() => {
    if (isAuthorized === true) {
      loadWebhooks();
    }
  }, [isAuthorized]);

  useEffect(() => {
    if (selectedWebhook) {
      loadDeliveries(selectedWebhook.id);
    }
  }, [selectedWebhook]);

  const checkAuthorization = async () => {
    try {
      const membership = await getMyMembership();
      if (membership && membership.userRole === 'admin') {
        setIsAuthorized(true);
      } else {
        setIsAuthorized(false);
      }
    } catch (err) {
      console.error('認証チェックエラー:', err);
      setIsAuthorized(false);
    }
  };

  const loadWebhooks = async () => {
    const data = await getWebhookConfigurations();
    setWebhooks(data);
  };

  const loadDeliveries = async (webhookId: number) => {
    const data = await getWebhookDeliveries(webhookId);
    setDeliveries(data);
  };

  const handleCreate = async () => {
    if (!newWebhook.name || !newWebhook.url || newWebhook.events.length === 0) {
      alert('名前、URL、イベントを入力してください');
      return;
    }

    try {
      await createWebhookConfiguration(newWebhook.name, newWebhook.url, newWebhook.events);
      setNewWebhook({ name: '', url: '', events: [] });
      setIsCreating(false);
      await loadWebhooks();
    } catch (err) {
      alert('Webhook設定の作成に失敗しました');
    }
  };

  const handleToggleEnabled = async (webhook: WebhookConfiguration) => {
    try {
      await updateWebhookConfiguration(webhook.id, { enabled: !webhook.enabled });
      await loadWebhooks();
    } catch (err) {
      alert('設定の更新に失敗しました');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('このWebhook設定を削除しますか？')) return;

    try {
      await deleteWebhookConfiguration(id);
      await loadWebhooks();
      if (selectedWebhook?.id === id) {
        setSelectedWebhook(null);
      }
    } catch (err) {
      alert('Webhook設定の削除に失敗しました');
    }
  };

  const toggleEvent = (event: string) => {
    setNewWebhook(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event],
    }));
  };

  // 認証チェック中
  if (isAuthorized === null) {
    return (
      <AuthGuard>
        <DiscordLayout>
          <div className="p-8">
            <div className="text-center py-12">
              <p className="text-gray-500">読み込み中...</p>
            </div>
          </div>
        </DiscordLayout>
      </AuthGuard>
    );
  }

  // 管理者でない場合
  if (isAuthorized === false) {
    return (
      <AuthGuard>
        <DiscordLayout>
          <div className="p-8">
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <h1 className="text-2xl font-semibold text-gray-900 mb-4">アクセス権限がありません</h1>
              <p className="text-gray-600 mb-6">Webhook設定は管理者のみが利用できます。</p>
              <button
                onClick={() => router.push('/office')}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-all font-semibold"
              >
                ダッシュボードに戻る
              </button>
            </div>
          </div>
        </DiscordLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <DiscordLayout>
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900 mb-2">Webhook設定</h1>
              <p className="text-gray-600">外部システムへのイベント通知を設定（管理者専用）</p>
            </div>
            <button
              onClick={() => setIsCreating(!isCreating)}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-all font-semibold"
            >
              {isCreating ? 'キャンセル' : '+ 新規Webhook'}
            </button>
          </div>

          {/* 新規作成フォーム */}
          {isCreating && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">新しいWebhook設定</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">名前 *</label>
                  <input
                    type="text"
                    value={newWebhook.name}
                    onChange={(e) => setNewWebhook({ ...newWebhook, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    placeholder="Webhook設定名"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">URL *</label>
                  <input
                    type="url"
                    value={newWebhook.url}
                    onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    placeholder="https://example.com/webhook"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">購読するイベント *</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto border border-gray-300 rounded-lg p-3">
                    {availableEvents.map(event => (
                      <label key={event} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newWebhook.events.includes(event)}
                          onChange={() => toggleEvent(event)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm text-gray-700">{event}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleCreate}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
                >
                  作成
                </button>
              </div>
            </div>
          )}

          {/* Webhook一覧 */}
          <div className="space-y-4">
            {webhooks.map(webhook => (
              <div
                key={webhook.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{webhook.name}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        webhook.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {webhook.enabled ? '有効' : '無効'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">URL: {webhook.url}</p>
                    <div className="flex flex-wrap gap-2">
                      {webhook.events.map(event => (
                        <span key={event} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                          {event}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      シークレット: {webhook.secret.substring(0, 16)}...
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleEnabled(webhook)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                        webhook.enabled
                          ? 'bg-gray-600 text-white hover:bg-gray-700'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {webhook.enabled ? '無効化' : '有効化'}
                    </button>
                    <button
                      onClick={() => setSelectedWebhook(selectedWebhook?.id === webhook.id ? null : webhook)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold"
                    >
                      {selectedWebhook?.id === webhook.id ? '履歴を閉じる' : '履歴を見る'}
                    </button>
                    <button
                      onClick={() => handleDelete(webhook.id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-semibold"
                    >
                      削除
                    </button>
                  </div>
                </div>

                {/* 送信履歴 */}
                {selectedWebhook?.id === webhook.id && (
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <h4 className="font-semibold text-gray-900 mb-3">送信履歴</h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {deliveries.map(delivery => (
                        <div key={delivery.id} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm text-gray-900">{delivery.event}</span>
                            <span className={`text-xs px-2 py-1 rounded ${
                              delivery.responseStatus && delivery.responseStatus < 300
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {delivery.responseStatus || '未送信'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            {new Date(delivery.deliveredAt).toLocaleString('ja-JP')}
                          </p>
                        </div>
                      ))}
                      {deliveries.length === 0 && (
                        <p className="text-sm text-gray-500">送信履歴がありません</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {webhooks.length === 0 && !isCreating && (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <p className="text-gray-500 text-lg">Webhook設定がまだありません</p>
              <p className="text-gray-400 text-sm mt-2">「+ 新規Webhook」ボタンから追加してください</p>
            </div>
          )}
        </div>
      </DiscordLayout>
    </AuthGuard>
  );
}

