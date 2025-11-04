'use client';

import { useState, useEffect } from 'react';
import AuthGuard from '@/components/AuthGuard';
import Header from '@/components/Header';
import {
  getCurrentOfficeId,
  getCurrentGlobalUser,
  getUserMemberships,
  getOfficeJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
} from '@/lib/authDB';
import { getDepartments } from '@/lib/membersDB';

export const dynamic = 'force-dynamic';

export default function RequestsPage() {
  const [requests, setRequests] = useState<(any & { username: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [approveForm, setApproveForm] = useState<{
    role: string;
    userRole: 'admin' | 'staff';
    departments: string[];
    group: string | null;
  }>({
    role: 'メンバー',
    userRole: 'staff',
    departments: [],
    group: null,
  });
  const [availableDepartments, setAvailableDepartments] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const user = getCurrentGlobalUser();
    const officeId = getCurrentOfficeId();

    if (!user || !officeId) {
      setIsLoading(false);
      return;
    }

    // 管理者権限チェック
    const memberships = await getUserMemberships(user.id);
    const membership = memberships.find((m) => m.officeId === officeId);
    
    if (!membership || membership.userRole !== 'admin' || membership.status !== 'approved') {
      setError('管理者権限が必要です');
      setIsLoading(false);
      return;
    }

    // 参加リクエストを取得
    const requestList = await getOfficeJoinRequests(officeId);
    setRequests(requestList);

    // 部署一覧を取得
    const depts = await getDepartments();
    setAvailableDepartments(depts);

    setIsLoading(false);
  };

  const handleApprove = async (requestId: number) => {
    setError('');
    setSuccess('');

    try {
      await approveJoinRequest(
        requestId,
        approveForm.role,
        approveForm.userRole,
        approveForm.departments,
        approveForm.group
      );
      setSuccess('参加リクエストを承認しました');
      setApprovingId(null);
      setApproveForm({
        role: 'メンバー',
        userRole: 'staff',
        departments: [],
        group: null,
      });
      await loadData();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    }
  };

  const handleReject = async (requestId: number) => {
    if (!confirm('この参加リクエストを拒否してもよろしいですか？')) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      await rejectJoinRequest(requestId);
      setSuccess('参加リクエストを拒否しました');
      await loadData();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    }
  };

  if (isLoading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </AuthGuard>
    );
  }

  if (error && error.includes('管理者権限')) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50">
          <Header title="アクセス拒否" showBackButton />
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-600">{error}</p>
            </div>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <Header title="参加リクエスト" showBackButton />
        
        <div className="max-w-7xl mx-auto px-4 py-8">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
              {success}
            </div>
          )}

          {requests.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-600">承認待ちの参加リクエストはありません</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div key={request.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">{request.displayName}</h3>
                      <p className="text-sm text-gray-600">ユーザー名: {request.username}</p>
                      <p className="text-xs text-gray-500">
                        リクエスト日時: {new Date(request.requestedAt).toLocaleString('ja-JP')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {approvingId === request.id ? (
                        <div className="bg-blue-50 rounded-lg p-4 space-y-3">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                              役割
                            </label>
                            <input
                              type="text"
                              value={approveForm.role}
                              onChange={(e) => setApproveForm({ ...approveForm, role: e.target.value })}
                              className="w-full border border-gray-300 rounded px-3 py-1"
                              placeholder="例: リーダー、メンバー"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                              権限
                            </label>
                            <select
                              value={approveForm.userRole}
                              onChange={(e) => setApproveForm({ ...approveForm, userRole: e.target.value as 'admin' | 'staff' })}
                              className="w-full border border-gray-300 rounded px-3 py-1"
                            >
                              <option value="staff">スタッフ</option>
                              <option value="admin">管理者</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                              部署
                            </label>
                            <div className="space-y-1">
                              {availableDepartments.map((dept) => (
                                <label key={dept} className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={approveForm.departments.includes(dept)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setApproveForm({
                                          ...approveForm,
                                          departments: [...approveForm.departments, dept],
                                        });
                                      } else {
                                        setApproveForm({
                                          ...approveForm,
                                          departments: approveForm.departments.filter((d) => d !== dept),
                                        });
                                      }
                                    }}
                                    className="mr-2"
                                  />
                                  <span className="text-sm">{dept}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                              グループ（任意）
                            </label>
                            <input
                              type="text"
                              value={approveForm.group || ''}
                              onChange={(e) => setApproveForm({ ...approveForm, group: e.target.value || null })}
                              className="w-full border border-gray-300 rounded px-3 py-1"
                              placeholder="例: Aグループ"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApprove(request.id)}
                              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                            >
                              承認
                            </button>
                            <button
                              onClick={() => {
                                setApprovingId(null);
                                setApproveForm({
                                  role: 'メンバー',
                                  userRole: 'staff',
                                  departments: [],
                                  group: null,
                                });
                              }}
                              className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
                            >
                              キャンセル
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setApprovingId(request.id);
                              setApproveForm({
                                role: 'メンバー',
                                userRole: 'staff',
                                departments: [],
                                group: null,
                              });
                            }}
                            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                          >
                            承認
                          </button>
                          <button
                            onClick={() => handleReject(request.id)}
                            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                          >
                            拒否
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}

