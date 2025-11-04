'use client';

import { useState, useEffect } from 'react';
import AuthGuard from '@/components/AuthGuard';
import DiscordLayout from '@/components/DiscordLayout';
import {
  getCurrentGlobalUser,
  getUserMemberships,
  getOffice,
  createJoinRequest,
  createOffice,
  type OfficeMembership,
  type Office,
} from '@/lib/authDB';

export const dynamic = 'force-dynamic';

export default function Home() {
  const [memberships, setMemberships] = useState<OfficeMembership[]>([]);
  const [offices, setOffices] = useState<(Office & { status: string; displayName: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [joinOfficeCode, setJoinOfficeCode] = useState('');
  const [joinDisplayName, setJoinDisplayName] = useState('');
  const [createOfficeName, setCreateOfficeName] = useState('');
  const [createOfficeCode, setCreateOfficeCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const user = getCurrentGlobalUser();
    if (!user) return;

    const membershipList = await getUserMemberships(user.id);
    setMemberships(membershipList);

    const officeList = await Promise.all(
      membershipList.map(async (m) => {
        const office = await getOffice(m.officeId);
        return {
          ...(office as Office),
          status: m.status,
          displayName: m.displayName,
        } as Office & { status: string; displayName: string };
      })
    );
    setOffices(officeList);
    setIsLoading(false);
  };

  const handleJoinOffice = async () => {
    setError('');
    setSuccess('');

    if (!joinOfficeCode || !joinDisplayName) {
      setError('事務所コードと表示名を入力してください');
      return;
    }

    const user = getCurrentGlobalUser();
    if (!user) return;

    try {
      await createJoinRequest(user.id, joinOfficeCode, joinDisplayName);
      setSuccess('参加リクエストを送信しました。承認をお待ちください。');
      setJoinOfficeCode('');
      setJoinDisplayName('');
      setShowJoinForm(false);
      await loadData();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    }
  };

  const handleCreateOffice = async () => {
    setError('');
    setSuccess('');

    if (!createOfficeName || !createOfficeCode) {
      setError('事務所名と事務所コードを入力してください');
      return;
    }

    const user = getCurrentGlobalUser();
    if (!user) return;

    try {
      const office = await createOffice(user.id, createOfficeName, createOfficeCode);
      setSuccess(`事務所「${office.name}」を作成しました！`);
      setCreateOfficeName('');
      setCreateOfficeCode('');
      setShowCreateForm(false);
      await loadData();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
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
          {/* メッセージ */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
              {success}
            </div>
          )}

          {/* 事務所がない場合 */}
          {offices.length === 0 && (
            <div className="text-center py-16">
              <div className="max-w-md mx-auto">
                <h2 className="text-2xl font-semibold text-gray-900 mb-3">事務所に所属していません</h2>
                <p className="text-gray-600 mb-8">既存の事務所に参加するか、新しく事務所を作成してください</p>
                
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => {
                      setShowJoinForm(!showJoinForm);
                      setShowCreateForm(false);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    事務所に参加
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateForm(!showCreateForm);
                      setShowJoinForm(false);
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    事務所を作成
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 参加フォーム */}
          {showJoinForm && (
            <div className="mb-8 bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
              <h3 className="text-xl font-semibold mb-4 text-gray-900">事務所に参加</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">事務所コード</label>
                  <input
                    type="text"
                    value={joinOfficeCode}
                    onChange={(e) => setJoinOfficeCode(e.target.value.toUpperCase())}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="例: DEMO2025"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">事務所での表示名</label>
                  <input
                    type="text"
                    value={joinDisplayName}
                    onChange={(e) => setJoinDisplayName(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="この事務所での表示名を入力"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleJoinOffice}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
                  >
                    参加リクエストを送信
                  </button>
                  <button
                    onClick={() => {
                      setShowJoinForm(false);
                      setJoinOfficeCode('');
                      setJoinDisplayName('');
                    }}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2.5 rounded-lg font-medium transition-colors"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 作成フォーム */}
          {showCreateForm && (
            <div className="mb-8 bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
              <h3 className="text-xl font-semibold mb-4 text-gray-900">新規事務所を作成</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">事務所名</label>
                  <input
                    type="text"
                    value={createOfficeName}
                    onChange={(e) => setCreateOfficeName(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="例: サンプル事務所"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">事務所コード（英数字のみ）</label>
                  <input
                    type="text"
                    value={createOfficeCode}
                    onChange={(e) => setCreateOfficeCode(e.target.value.toUpperCase())}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="例: OFFICE2025"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleCreateOffice}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
                  >
                    作成
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateForm(false);
                      setCreateOfficeName('');
                      setCreateOfficeCode('');
                    }}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2.5 rounded-lg font-medium transition-colors"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DiscordLayout>
    </AuthGuard>
  );
}
