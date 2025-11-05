'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import DiscordLayout from '@/components/DiscordLayout';
import { getMyMembership } from '@/lib/membersDB';
import {
  getStorageLifecyclePolicies,
  upsertStorageLifecyclePolicy,
  getStorageQuota,
  updateStorageQuota,
  formatBytes,
  type StorageLifecyclePolicy,
  type StorageQuota,
} from '@/lib/storagePolicyDB';

export const dynamic = 'force-dynamic';

export default function StoragePolicyPage() {
  const [policies, setPolicies] = useState<StorageLifecyclePolicy[]>([]);
  const [quota, setQuota] = useState<StorageQuota | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [newPolicy, setNewPolicy] = useState({
    bucketName: 'files',
    ruleName: '',
    actionType: 'delete' as 'delete' | 'archive' | 'move',
    triggerDays: 30,
    targetPath: '',
  });
  const router = useRouter();

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
    const [policiesData, quotaData] = await Promise.all([
      getStorageLifecyclePolicies(),
      getStorageQuota(),
    ]);
    setPolicies(policiesData);
    setQuota(quotaData);
  };

  const handleSavePolicy = async () => {
    if (!newPolicy.ruleName.trim()) {
      alert('ルール名を入力してください');
      return;
    }

    try {
      await upsertStorageLifecyclePolicy(
        newPolicy.bucketName,
        newPolicy.ruleName,
        newPolicy.actionType,
        newPolicy.triggerDays,
        newPolicy.actionType === 'move' ? newPolicy.targetPath : undefined
      );
      setNewPolicy({
        bucketName: 'files',
        ruleName: '',
        actionType: 'delete',
        triggerDays: 30,
        targetPath: '',
      });
      await loadData();
      alert('ライフサイクルポリシーを保存しました');
    } catch (err) {
      alert('ポリシーの保存に失敗しました');
    }
  };

  const handleSaveQuota = async () => {
    if (!quota) return;

    try {
      await updateStorageQuota(Number(quota.storageLimitBytes), quota.warningThresholdPercent);
      await loadData();
      alert('ストレージクォータを更新しました');
    } catch (err) {
      alert('クォータの更新に失敗しました');
    }
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
              <p className="text-gray-600 mb-6">ストレージポリシーは管理者のみが利用できます。</p>
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

  const usagePercent = quota ? (Number(quota.currentUsageBytes) / Number(quota.storageLimitBytes)) * 100 : 0;
  const isWarning = quota && usagePercent >= quota.warningThresholdPercent;

  return (
    <AuthGuard>
      <DiscordLayout>
        <div className="p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">ストレージポリシー</h1>
            <p className="text-gray-600">ストレージライフサイクルとクォータを管理（管理者専用）</p>
          </div>

          {/* ストレージクォータ */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">ストレージクォータ</h2>
            {quota ? (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">使用量</span>
                    <span className={`text-sm font-semibold ${isWarning ? 'text-red-600' : 'text-gray-900'}`}>
                      {formatBytes(Number(quota.currentUsageBytes))} / {formatBytes(Number(quota.storageLimitBytes))}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div
                      className={`h-4 rounded-full transition-all ${
                        isWarning ? 'bg-red-600' : 'bg-blue-600'
                      }`}
                      style={{ width: `${Math.min(usagePercent, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {usagePercent.toFixed(1)}% 使用中
                    {isWarning && ' (警告閾値到達)'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ストレージ上限</label>
                  <input
                    type="number"
                    value={Number(quota.storageLimitBytes)}
                    onChange={(e) => setQuota(prev => prev ? {
                      ...prev,
                      storageLimitBytes: Number(e.target.value) || 0,
                    } : null)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    警告閾値: {quota.warningThresholdPercent}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={quota.warningThresholdPercent}
                    onChange={(e) => setQuota(prev => prev ? {
                      ...prev,
                      warningThresholdPercent: parseInt(e.target.value),
                    } : null)}
                    className="w-full"
                  />
                </div>
                <button
                  onClick={handleSaveQuota}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-semibold"
                >
                  更新
                </button>
              </div>
            ) : (
              <p className="text-gray-500">クォータ設定がありません</p>
            )}
          </div>

          {/* ライフサイクルポリシー */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">新しいライフサイクルポリシー</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">バケット名</label>
                <input
                  type="text"
                  value={newPolicy.bucketName}
                  onChange={(e) => setNewPolicy({ ...newPolicy, bucketName: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ルール名 *</label>
                <input
                  type="text"
                  value={newPolicy.ruleName}
                  onChange={(e) => setNewPolicy({ ...newPolicy, ruleName: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  placeholder="30日後に削除"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">アクション</label>
                <select
                  value={newPolicy.actionType}
                  onChange={(e) => setNewPolicy({ ...newPolicy, actionType: e.target.value as 'delete' | 'archive' | 'move' })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                >
                  <option value="delete">削除</option>
                  <option value="archive">アーカイブ</option>
                  <option value="move">移動</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">トリガー日数（作成日から）</label>
                <input
                  type="number"
                  value={newPolicy.triggerDays}
                  onChange={(e) => setNewPolicy({ ...newPolicy, triggerDays: parseInt(e.target.value) || 30 })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  min="1"
                />
              </div>
              {newPolicy.actionType === 'move' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">移動先パス</label>
                  <input
                    type="text"
                    value={newPolicy.targetPath}
                    onChange={(e) => setNewPolicy({ ...newPolicy, targetPath: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    placeholder="/archive/"
                  />
                </div>
              )}
              <button
                onClick={handleSavePolicy}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-semibold"
              >
                作成
              </button>
            </div>
          </div>

          {/* ポリシー一覧 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">ライフサイクルポリシー一覧</h2>
            <div className="space-y-3">
              {policies.map(policy => (
                <div key={policy.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">{policy.ruleName}</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          policy.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {policy.enabled ? '有効' : '無効'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        バケット: {policy.bucketName} • アクション: {
                          policy.actionType === 'delete' ? '削除' :
                          policy.actionType === 'archive' ? 'アーカイブ' : '移動'
                        } • {policy.triggerDays}日後
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {policies.length === 0 && (
                <p className="text-gray-500 text-center py-8">ライフサイクルポリシーがありません</p>
              )}
            </div>
          </div>
        </div>
      </DiscordLayout>
    </AuthGuard>
  );
}

