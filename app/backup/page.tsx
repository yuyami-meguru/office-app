'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import DiscordLayout from '@/components/DiscordLayout';
import { getMyMembership } from '@/lib/membersDB';
import {
  getBackupConfiguration,
  upsertBackupConfiguration,
  createBackup,
  getBackupHistory,
  getDataRetentionPolicies,
  upsertDataRetentionPolicy,
  type BackupConfiguration,
  type BackupHistory,
  type DataRetentionPolicy,
} from '@/lib/backupDB';

export const dynamic = 'force-dynamic';

export default function BackupPage() {
  const [backupConfig, setBackupConfig] = useState<BackupConfiguration | null>(null);
  const [backupHistory, setBackupHistory] = useState<BackupHistory[]>([]);
  const [retentionPolicies, setRetentionPolicies] = useState<DataRetentionPolicy[]>([]);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const resourceTypes = [
    { value: 'tasks', label: 'タスク' },
    { value: 'events', label: 'イベント' },
    { value: 'announcements', label: 'お知らせ' },
    { value: 'files', label: 'ファイル' },
    { value: 'activity_logs', label: '活動履歴' },
  ];

  useEffect(() => {
    checkAuthorization();
  }, []);

  useEffect(() => {
    if (isAuthorized === true) {
      loadData();
    }
  }, [isAuthorized]);

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

  const loadData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadBackupConfiguration(),
        loadBackupHistory(),
        loadRetentionPolicies(),
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadBackupConfiguration = async () => {
    const config = await getBackupConfiguration();
    setBackupConfig(config);
  };

  const loadBackupHistory = async () => {
    const history = await getBackupHistory(20);
    setBackupHistory(history);
  };

  const loadRetentionPolicies = async () => {
    const policies = await getDataRetentionPolicies();
    setRetentionPolicies(policies);
  };

  const handleSaveConfig = async () => {
    if (!backupConfig) return;

    try {
      await upsertBackupConfiguration(
        backupConfig.scheduleType,
        backupConfig.scheduleConfig,
        backupConfig.retentionDays,
        backupConfig.enabled
      );
      await loadBackupConfiguration();
      alert('バックアップ設定を保存しました');
    } catch (err) {
      alert('設定の保存に失敗しました');
    }
  };

  const handleCreateBackup = async () => {
    if (!confirm('バックアップを作成しますか？')) return;

    setIsCreating(true);
    try {
      await createBackup('full');
      await loadBackupHistory();
      await loadBackupConfiguration();
      alert('バックアップが作成されました');
    } catch (err: any) {
      alert(err.message || 'バックアップの作成に失敗しました');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSaveRetentionPolicy = async (resourceType: string, retentionDays: number | null, autoDelete: boolean) => {
    try {
      await upsertDataRetentionPolicy(resourceType, retentionDays, autoDelete, true);
      await loadRetentionPolicies();
      alert('データ保持ポリシーを保存しました');
    } catch (err) {
      alert('ポリシーの保存に失敗しました');
    }
  };

  // 認証チェック中
  if (isAuthorized === null || isLoading) {
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
              <p className="text-gray-600 mb-6">バックアップ設定は管理者のみが利用できます。</p>
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
              <h1 className="text-3xl font-semibold text-gray-900 mb-2">バックアップ・リストア</h1>
              <p className="text-gray-600">データのバックアップとリストア、データ保持ポリシーを管理（管理者専用）</p>
            </div>
            <button
              onClick={handleCreateBackup}
              disabled={isCreating}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-all font-semibold disabled:opacity-50"
            >
              {isCreating ? '作成中...' : '+ バックアップ作成'}
            </button>
          </div>

          {/* バックアップ設定 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">バックアップ設定</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">スケジュール</label>
                <select
                  value={backupConfig?.scheduleType || 'manual'}
                  onChange={(e) => setBackupConfig(prev => prev ? {
                    ...prev,
                    scheduleType: e.target.value as 'daily' | 'weekly' | 'monthly' | 'manual',
                  } : null)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                >
                  <option value="manual">手動</option>
                  <option value="daily">毎日</option>
                  <option value="weekly">毎週</option>
                  <option value="monthly">毎月</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">保持期間（日数）</label>
                <input
                  type="number"
                  value={backupConfig?.retentionDays || 30}
                  onChange={(e) => setBackupConfig(prev => prev ? {
                    ...prev,
                    retentionDays: parseInt(e.target.value) || 30,
                  } : null)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  min="1"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={backupConfig?.enabled ?? false}
                  onChange={(e) => setBackupConfig(prev => prev ? {
                    ...prev,
                    enabled: e.target.checked,
                  } : null)}
                  className="w-5 h-5"
                />
                <label className="text-sm font-medium text-gray-700">有効化</label>
              </div>
              {backupConfig?.lastBackupAt && (
                <p className="text-sm text-gray-500">
                  最終バックアップ: {new Date(backupConfig.lastBackupAt).toLocaleString('ja-JP')}
                </p>
              )}
              <button
                onClick={handleSaveConfig}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-semibold"
              >
                設定を保存
              </button>
            </div>
          </div>

          {/* バックアップ履歴 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">バックアップ履歴</h2>
            <div className="space-y-2">
              {backupHistory.map(backup => (
                <div key={backup.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">
                          {backup.backupType === 'full' ? '完全バックアップ' : '増分バックアップ'}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          backup.status === 'completed' ? 'bg-green-100 text-green-700' :
                          backup.status === 'failed' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {backup.status === 'completed' ? '完了' :
                           backup.status === 'failed' ? '失敗' : '処理中'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {new Date(backup.createdAt).toLocaleString('ja-JP')}
                        {backup.fileSizeBytes && ` • ${(backup.fileSizeBytes / 1024).toFixed(2)} KB`}
                      </p>
                      {backup.errorMessage && (
                        <p className="text-sm text-red-600 mt-1">{backup.errorMessage}</p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        // バックアップデータをダウンロード
                        const dataStr = JSON.stringify(backup.backupData, null, 2);
                        const dataBlob = new Blob([dataStr], { type: 'application/json' });
                        const url = URL.createObjectURL(dataBlob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `backup-${backup.id}-${new Date(backup.createdAt).toISOString().split('T')[0]}.json`;
                        link.click();
                      }}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
                    >
                      ダウンロード
                    </button>
                  </div>
                </div>
              ))}
              {backupHistory.length === 0 && (
                <p className="text-gray-500 text-center py-8">バックアップ履歴がありません</p>
              )}
            </div>
          </div>

          {/* データ保持ポリシー */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">データ保持ポリシー</h2>
            <div className="space-y-4">
              {resourceTypes.map(resource => {
                const policy = retentionPolicies.find(p => p.resourceType === resource.value);
                return (
                  <div key={resource.value} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-gray-900">{resource.label}</h3>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">保持期間（日数、空欄は無期限）</label>
                        <input
                          type="number"
                          value={policy?.retentionDays || ''}
                          onChange={(e) => {
                            const days = e.target.value ? parseInt(e.target.value) : null;
                            handleSaveRetentionPolicy(resource.value, days, policy?.autoDelete || false);
                          }}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2"
                          placeholder="無期限"
                          min="1"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={policy?.autoDelete || false}
                          onChange={(e) => {
                            handleSaveRetentionPolicy(resource.value, policy?.retentionDays || null, e.target.checked);
                          }}
                          className="w-4 h-4"
                        />
                        <label className="text-sm text-gray-700">期限切れデータを自動削除</label>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </DiscordLayout>
    </AuthGuard>
  );
}

