'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import DiscordLayout from '@/components/DiscordLayout';
import { getMyMembership } from '@/lib/membersDB';
import {
  getPermissionDefinitions,
  getPermissionAssignments,
  addPermissionAssignment,
  removePermissionAssignment,
  type PermissionDefinition,
  type PermissionAssignment,
  type ResourceType,
  type Action,
} from '@/lib/permissionsDB';
import { getDepartments } from '@/lib/membersDB';

export const dynamic = 'force-dynamic';

export default function PermissionsPage() {
  const [definitions, setDefinitions] = useState<PermissionDefinition[]>([]);
  const [assignments, setAssignments] = useState<Record<number, PermissionAssignment[]>>({});
  const [departments, setDepartments] = useState<string[]>([]);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [selectedPermission, setSelectedPermission] = useState<PermissionDefinition | null>(null);
  const [newAssignmentType, setNewAssignmentType] = useState<'role' | 'department' | 'user'>('role');
  const [newAssignmentValue, setNewAssignmentValue] = useState<string>('');
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
    await loadDefinitions();
    await loadDepartments();
  };

  const loadDefinitions = async () => {
    try {
      const data = await getPermissionDefinitions();
      console.log('権限定義データ:', data); // デバッグ用
      setDefinitions(data);
      
      // 各権限の割り当てを取得
      const assignmentsData: Record<number, PermissionAssignment[]> = {};
      for (const perm of data) {
        const assigns = await getPermissionAssignments(perm.id);
        assignmentsData[perm.id] = assigns;
      }
      setAssignments(assignmentsData);
    } catch (err) {
      console.error('権限定義読み込みエラー:', err);
      alert('権限定義の読み込みに失敗しました。ブラウザのコンソールを確認してください。');
    }
  };

  const loadDepartments = async () => {
    const depts = await getDepartments();
    // getDepartments()はstring[]を返すので、そのまま使用
    setDepartments(depts);
  };

  const handleAddAssignment = async (permissionId: number) => {
    if (!newAssignmentValue.trim()) return;

    try {
      await addPermissionAssignment(permissionId, newAssignmentType, newAssignmentValue);
      setNewAssignmentValue('');
      await loadDefinitions();
    } catch (err) {
      alert('権限割り当ての追加に失敗しました');
    }
  };

  const handleRemoveAssignment = async (assignmentId: number, permissionId: number) => {
    if (!confirm('この権限割り当てを削除しますか？')) return;

    try {
      await removePermissionAssignment(assignmentId);
      await loadDefinitions();
    } catch (err) {
      alert('権限割り当ての削除に失敗しました');
    }
  };

  const getResourceTypeLabel = (type: ResourceType) => {
    const labels: Record<ResourceType, string> = {
      member: 'メンバー',
      task: 'タスク',
      schedule: 'スケジュール',
      announcement: 'お知らせ',
      file: 'ファイル',
      project: 'プロジェクト',
      chat: 'チャット',
      workflow: '承認',
    };
    return labels[type] || type;
  };

  const getActionLabel = (action: Action) => {
    const labels: Record<Action, string> = {
      view: '閲覧',
      create: '作成',
      edit: '編集',
      delete: '削除',
      approve: '承認',
    };
    return labels[action] || action;
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
              <p className="text-gray-600 mb-6">権限管理は管理者のみが利用できます。</p>
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

  // リソースタイプごとにグループ化
  const groupedByResource = definitions.reduce((acc, perm) => {
    if (!acc[perm.resourceType]) {
      acc[perm.resourceType] = [];
    }
    acc[perm.resourceType].push(perm);
    return acc;
  }, {} as Record<ResourceType, PermissionDefinition[]>);

  return (
    <AuthGuard>
      <DiscordLayout>
        <div className="p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">権限管理</h1>
            <p className="text-gray-600">機能ごとのアクセス権限を細かく設定（管理者専用）</p>
          </div>

          {Object.entries(groupedByResource).map(([resourceType, perms]) => (
            <div key={resourceType} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {getResourceTypeLabel(resourceType as ResourceType)}
              </h2>
              
              <div className="space-y-4">
                {perms.map(perm => (
                  <div key={perm.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {getActionLabel(perm.action)}
                        </h3>
                        {perm.description && (
                          <p className="text-sm text-gray-500 mt-1">{perm.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => setSelectedPermission(
                          selectedPermission?.id === perm.id ? null : perm
                        )}
                        className="text-blue-600 hover:text-blue-800 text-sm font-semibold"
                      >
                        {selectedPermission?.id === perm.id ? '閉じる' : '割り当てを管理'}
                      </button>
                    </div>

                    {/* 現在の割り当て */}
                    <div className="mb-3">
                      <div className="flex flex-wrap gap-2">
                        {assignments[perm.id]?.map(assign => (
                          <span
                            key={assign.id}
                            className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm flex items-center gap-2"
                          >
                            {assign.targetType === 'role' && 'ロール: '}
                            {assign.targetType === 'department' && '部署: '}
                            {assign.targetType === 'user' && 'ユーザー: '}
                            {assign.targetValue}
                            <button
                              onClick={() => handleRemoveAssignment(assign.id, perm.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                        {(!assignments[perm.id] || assignments[perm.id].length === 0) && (
                          <span className="text-sm text-gray-400">割り当てなし</span>
                        )}
                      </div>
                    </div>

                    {/* 割り当て追加フォーム */}
                    {selectedPermission?.id === perm.id && (
                      <div className="border-t border-gray-200 pt-3 mt-3">
                        <div className="flex gap-2">
                          <select
                            value={newAssignmentType}
                            onChange={(e) => setNewAssignmentType(e.target.value as 'role' | 'department' | 'user')}
                            className="border border-gray-300 rounded px-3 py-2 text-sm"
                          >
                            <option value="role">ロール</option>
                            <option value="department">部署</option>
                            <option value="user">ユーザー</option>
                          </select>
                          
                          {newAssignmentType === 'role' && (
                            <select
                              value={newAssignmentValue}
                              onChange={(e) => setNewAssignmentValue(e.target.value)}
                              className="border border-gray-300 rounded px-3 py-2 text-sm"
                            >
                              <option value="">選択...</option>
                              <option value="admin">管理者</option>
                              <option value="staff">スタッフ</option>
                            </select>
                          )}
                          
                          {newAssignmentType === 'department' && (
                            <select
                              value={newAssignmentValue}
                              onChange={(e) => setNewAssignmentValue(e.target.value)}
                              className="border border-gray-300 rounded px-3 py-2 text-sm"
                            >
                              <option value="">選択...</option>
                              {departments.map(dept => (
                                <option key={dept} value={dept}>{dept}</option>
                              ))}
                            </select>
                          )}
                          
                          {newAssignmentType === 'user' && (
                            <input
                              type="text"
                              value={newAssignmentValue}
                              onChange={(e) => setNewAssignmentValue(e.target.value)}
                              placeholder="ユーザーID"
                              className="border border-gray-300 rounded px-3 py-2 text-sm"
                            />
                          )}
                          
                          <button
                            onClick={() => handleAddAssignment(perm.id)}
                            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
                          >
                            追加
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {definitions.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <p className="text-gray-500 text-lg mb-4">権限定義がまだ設定されていません</p>
              <div className="bg-gray-50 rounded-lg p-4 text-left max-w-2xl mx-auto">
                <p className="text-sm text-gray-700 mb-2 font-semibold">以下の手順で設定してください：</p>
                <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
                  <li>Supabase Dashboardにアクセス</li>
                  <li>SQL Editorを開く</li>
                  <li>「New Query」をクリック</li>
                  <li><code className="bg-gray-200 px-2 py-1 rounded">supabase-setup-permissions-simple.sql</code> の内容をコピー＆ペースト</li>
                  <li>「Run」をクリック</li>
                  <li>このページを再読み込み（F5）</li>
                </ol>
                <p className="text-xs text-gray-500 mt-4">
                  💡 ブラウザのコンソール（F12）でエラーがないか確認してください
                </p>
              </div>
            </div>
          )}
        </div>
      </DiscordLayout>
    </AuthGuard>
  );
}

