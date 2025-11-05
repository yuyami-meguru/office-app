'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import DiscordLayout from '@/components/DiscordLayout';
import { getAuditLogs, getAuditLogsForExport, getAuditLogsForJSONExport, type AuditLog } from '@/lib/auditDB';
import { getMyMembership } from '@/lib/membersDB';

export const dynamic = 'force-dynamic';

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [filterAction, setFilterAction] = useState<string>('全て');
  const [filterResourceType, setFilterResourceType] = useState<string>('全て');
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  useEffect(() => {
    checkAuthorization();
  }, []);

  useEffect(() => {
    if (isAuthorized === true) {
      loadLogs();
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

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const data = await getAuditLogs(500);
      setLogs(data);
    } catch (err) {
      console.error('ログ取得エラー:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const data = await getAuditLogsForExport();
      const headers = ['日時', 'ユーザー', 'アクション', 'リソースタイプ', 'リソースID', '詳細', 'IPアドレス'];
      const csvContent = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = row[header];
            return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
          }).join(',')
        )
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('CSVエクスポートに失敗しました');
    }
  };

  const handleExportJSON = async () => {
    try {
      const data = await getAuditLogsForJSONExport();
      const jsonContent = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit_logs_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('JSONエクスポートに失敗しました');
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('作成') || action.includes('追加')) return 'text-green-600';
    if (action.includes('更新') || action.includes('変更')) return 'text-blue-600';
    if (action.includes('削除')) return 'text-red-600';
    return 'text-gray-600';
  };

  const uniqueActions = Array.from(new Set(logs.map(log => log.action)));
  const uniqueResourceTypes = Array.from(new Set(logs.map(log => log.resourceType)));

  let filteredLogs = logs;

  // フィルタリング
  if (filterAction !== '全て') {
    filteredLogs = filteredLogs.filter(log => log.action === filterAction);
  }
  if (filterResourceType !== '全て') {
    filteredLogs = filteredLogs.filter(log => log.resourceType === filterResourceType);
  }
  if (searchQuery) {
    filteredLogs = filteredLogs.filter(log =>
      log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.resourceType.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

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
              <p className="text-gray-600 mb-6">監査ログは管理者のみが閲覧できます。</p>
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
              <h1 className="text-3xl font-semibold text-gray-900 mb-2">監査ログ</h1>
              <p className="text-gray-600">システム内のすべての操作履歴を確認（管理者専用）</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleExportCSV}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-all font-semibold"
              >
                CSVエクスポート
              </button>
              <button
                onClick={handleExportJSON}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-all font-semibold"
              >
                JSONエクスポート
              </button>
            </div>
          </div>

          {/* フィルタ */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <input
                  type="text"
                  placeholder="検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                />
              </div>
              <div>
                <select
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                >
                  <option value="全て">全てのアクション</option>
                  {uniqueActions.map(action => (
                    <option key={action} value={action}>{action}</option>
                  ))}
                </select>
              </div>
              <div>
                <select
                  value={filterResourceType}
                  onChange={(e) => setFilterResourceType(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                >
                  <option value="全て">全てのリソース</option>
                  {uniqueResourceTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ログ一覧 */}
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">読み込み中...</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">日時</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ユーザー</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">アクション</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">リソース</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">詳細</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredLogs.map(log => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(log.createdAt).toLocaleString('ja-JP')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.userName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`font-medium ${getActionColor(log.action)}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {log.resourceType} {log.resourceId ? `#${log.resourceId}` : ''}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {log.details ? (
                            <details className="cursor-pointer">
                              <summary className="text-blue-600 hover:text-blue-800">詳細を見る</summary>
                              <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-auto max-w-md">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            </details>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!isLoading && filteredLogs.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <p className="text-gray-500 text-lg">ログが見つかりません</p>
            </div>
          )}
        </div>
      </DiscordLayout>
    </AuthGuard>
  );
}

