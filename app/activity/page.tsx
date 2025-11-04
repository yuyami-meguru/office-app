'use client';

import { useState, useEffect } from 'react';
import AuthGuard from '@/components/AuthGuard';
import DiscordLayout from '@/components/DiscordLayout';
import { getActivityLogs, type ActivityLog } from '@/lib/activityLogsDB';

export const dynamic = 'force-dynamic';

export default function ActivityPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const data = await getActivityLogs(100);
      setLogs(data);
    } catch (err) {
      console.error('活動履歴読み込みエラー:', err);
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case '追加':
      case '作成':
        return '➕';
      case '削除':
        return '🗑️';
      case '更新':
        return '✏️';
      case '参加':
        return '👤';
      default:
        return '📝';
    }
  };

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case '追加':
      case '作成':
        return 'bg-green-100 text-green-700';
      case '削除':
        return 'bg-red-100 text-red-700';
      case '更新':
        return 'bg-blue-100 text-blue-700';
      case '参加':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatActivityMessage = (log: ActivityLog) => {
    const entityName = log.details?.name || log.details?.title || '';
    switch (log.entityType) {
      case 'メンバー':
        return `${entityName || 'メンバー'}を${log.actionType}`;
      case 'タスク':
        return `タスク「${entityName}」を${log.actionType}`;
      case 'イベント':
        return `予定「${entityName}」を${log.actionType}`;
      case 'お知らせ':
        return `お知らせ「${entityName}」を${log.actionType}`;
      case 'ファイル':
        return `ファイル「${entityName}」を${log.actionType}`;
      case '事務所':
        return `事務所「${entityName}」に${log.actionType}`;
      default:
        return `${log.entityType}を${log.actionType}`;
    }
  };

  if (isLoading) {
    return (
      <AuthGuard>
        <DiscordLayout>
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">読み込み中...</p>
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
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">活動履歴</h1>
            <p className="text-gray-600">事務所内の最近の活動を確認</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            {logs.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">活動履歴がありません</p>
              </div>
            ) : (
              <div className="space-y-4">
                {logs.map(log => (
                  <div
                    key={log.id}
                    className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${getActionColor(log.actionType)}`}>
                      {getActionIcon(log.actionType)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">{log.userName}</span>
                        <span className="text-sm text-gray-600">{formatActivityMessage(log)}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(log.createdAt).toLocaleString('ja-JP')}
                      </div>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                          <details>
                            <summary className="cursor-pointer text-gray-700">詳細</summary>
                            <pre className="mt-2 text-xs overflow-auto">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </details>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DiscordLayout>
    </AuthGuard>
  );
}

