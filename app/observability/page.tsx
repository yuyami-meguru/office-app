'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import DiscordLayout from '@/components/DiscordLayout';
import { getMyMembership } from '@/lib/membersDB';
import {
  getErrorLogs,
  resolveErrorLog,
  getPerformanceMetrics,
  getFeatureFlags,
  upsertFeatureFlag,
  type ErrorLog,
  type PerformanceMetric,
  type FeatureFlag,
} from '@/lib/observabilityDB';

export const dynamic = 'force-dynamic';

export default function ObservabilityPage() {
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([]);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<'errors' | 'metrics' | 'flags'>('errors');
  const [newFlag, setNewFlag] = useState({
    flagName: '',
    description: '',
    enabled: false,
    rolloutPercentage: 100,
  });
  const router = useRouter();

  useEffect(() => {
    checkAuthorization();
  }, []);

  useEffect(() => {
    if (isAuthorized === true) {
      loadData();
    }
  }, [isAuthorized, activeTab]);

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
    if (activeTab === 'errors') {
      const logs = await getErrorLogs(50);
      setErrorLogs(logs);
    } else if (activeTab === 'metrics') {
      const data = await getPerformanceMetrics(undefined, 50);
      setMetrics(data);
    } else if (activeTab === 'flags') {
      const flags = await getFeatureFlags();
      setFeatureFlags(flags);
    }
  };

  const handleResolveError = async (id: number) => {
    try {
      await resolveErrorLog(id);
      await loadData();
    } catch (err) {
      alert('エラーの解決に失敗しました');
    }
  };

  const handleSaveFlag = async () => {
    if (!newFlag.flagName.trim()) {
      alert('フラグ名を入力してください');
      return;
    }

    try {
      await upsertFeatureFlag(
        newFlag.flagName,
        newFlag.enabled,
        newFlag.description || undefined,
        [],
        [],
        newFlag.rolloutPercentage
      );
      setNewFlag({ flagName: '', description: '', enabled: false, rolloutPercentage: 100 });
      await loadData();
      alert('Feature Flagを保存しました');
    } catch (err) {
      alert('Feature Flagの保存に失敗しました');
    }
  };

  const handleToggleFlag = async (flag: FeatureFlag) => {
    try {
      await upsertFeatureFlag(
        flag.flagName,
        !flag.enabled,
        flag.description || undefined,
        flag.targetUsers,
        flag.targetRoles,
        flag.rolloutPercentage
      );
      await loadData();
    } catch (err) {
      alert('Feature Flagの更新に失敗しました');
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
              <p className="text-gray-600 mb-6">運用可観測性は管理者のみが利用できます。</p>
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
          <div className="mb-6">
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">運用可観測性</h1>
            <p className="text-gray-600">エラーログ、パフォーマンスメトリクス、Feature Flagを管理（管理者専用）</p>
          </div>

          {/* タブ */}
          <div className="flex gap-2 mb-6 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('errors')}
              className={`px-4 py-2 font-semibold transition-colors ${
                activeTab === 'errors'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              エラーログ
            </button>
            <button
              onClick={() => setActiveTab('metrics')}
              className={`px-4 py-2 font-semibold transition-colors ${
                activeTab === 'metrics'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              パフォーマンス
            </button>
            <button
              onClick={() => setActiveTab('flags')}
              className={`px-4 py-2 font-semibold transition-colors ${
                activeTab === 'flags'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Feature Flags
            </button>
          </div>

          {/* エラーログ */}
          {activeTab === 'errors' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">エラーログ</h2>
              <div className="space-y-3">
                {errorLogs.map(log => (
                  <div
                    key={log.id}
                    className={`p-4 rounded-lg border ${
                      log.severity === 'critical' ? 'bg-red-50 border-red-200' :
                      log.severity === 'high' ? 'bg-orange-50 border-orange-200' :
                      log.severity === 'medium' ? 'bg-yellow-50 border-yellow-200' :
                      'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900">{log.errorType}</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            log.severity === 'critical' ? 'bg-red-100 text-red-700' :
                            log.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                            log.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {log.severity}
                          </span>
                          {log.resolved && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                              解決済み
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{log.errorMessage}</p>
                        {log.url && (
                          <p className="text-xs text-gray-500">URL: {log.url}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          {new Date(log.createdAt).toLocaleString('ja-JP')}
                        </p>
                      </div>
                      {!log.resolved && (
                        <button
                          onClick={() => handleResolveError(log.id)}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                        >
                          解決
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {errorLogs.length === 0 && (
                  <p className="text-gray-500 text-center py-8">エラーログがありません</p>
                )}
              </div>
            </div>
          )}

          {/* パフォーマンスメトリクス */}
          {activeTab === 'metrics' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">パフォーマンスメトリクス</h2>
              <div className="space-y-3">
                {metrics.map(metric => (
                  <div key={metric.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-medium text-gray-900">{metric.metricName}</span>
                        <span className="text-sm text-gray-500 ml-2">({metric.metricType})</span>
                      </div>
                      <span className="text-lg font-semibold text-gray-900">
                        {metric.value.toFixed(2)} {metric.unit || ''}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(metric.createdAt).toLocaleString('ja-JP')}
                    </p>
                  </div>
                ))}
                {metrics.length === 0 && (
                  <p className="text-gray-500 text-center py-8">パフォーマンスメトリクスがありません</p>
                )}
              </div>
            </div>
          )}

          {/* Feature Flags */}
          {activeTab === 'flags' && (
            <div className="space-y-6">
              {/* 新規作成フォーム */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">新しいFeature Flag</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">フラグ名 *</label>
                    <input
                      type="text"
                      value={newFlag.flagName}
                      onChange={(e) => setNewFlag({ ...newFlag, flagName: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                      placeholder="new_feature"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">説明</label>
                    <input
                      type="text"
                      value={newFlag.description}
                      onChange={(e) => setNewFlag({ ...newFlag, description: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                      placeholder="機能の説明"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ロールアウト率: {newFlag.rolloutPercentage}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={newFlag.rolloutPercentage}
                      onChange={(e) => setNewFlag({ ...newFlag, rolloutPercentage: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newFlag.enabled}
                      onChange={(e) => setNewFlag({ ...newFlag, enabled: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <label className="text-sm font-medium text-gray-700">有効化</label>
                  </div>
                  <button
                    onClick={handleSaveFlag}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-semibold"
                  >
                    作成
                  </button>
                </div>
              </div>

              {/* Feature Flag一覧 */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Feature Flags</h2>
                <div className="space-y-3">
                  {featureFlags.map(flag => (
                    <div key={flag.id} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900">{flag.flagName}</span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              flag.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                            }`}>
                              {flag.enabled ? '有効' : '無効'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {flag.rolloutPercentage}% ロールアウト
                            </span>
                          </div>
                          {flag.description && (
                            <p className="text-sm text-gray-600">{flag.description}</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleToggleFlag(flag)}
                          className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                            flag.enabled
                              ? 'bg-red-600 text-white hover:bg-red-700'
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                        >
                          {flag.enabled ? '無効化' : '有効化'}
                        </button>
                      </div>
                    </div>
                  ))}
                  {featureFlags.length === 0 && (
                    <p className="text-gray-500 text-center py-8">Feature Flagがありません</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </DiscordLayout>
    </AuthGuard>
  );
}

