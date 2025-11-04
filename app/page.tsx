'use client';

import { useState, useEffect } from 'react';
import AuthGuard from '@/components/AuthGuard';
import Header from '@/components/Header';
import {
  getCurrentGlobalUser,
  getUserMemberships,
  getOffice,
  createJoinRequest,
  createOffice,
  type OfficeMembership,
  type Office,
} from '@/lib/authDB';
import { setCurrentOffice } from '@/lib/authDB';

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

    // 事務所情報を取得
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

  const handleEnterOffice = async (officeId: string) => {
    const office = offices.find((o) => o.id === officeId);
    if (!office) return;

    const membership = memberships.find((m) => m.officeId === officeId);
    if (!membership || membership.status !== 'approved') {
      setError('この事務所はまだ承認されていません');
      return;
    }

    setCurrentOffice(office);
    window.location.href = '/office';
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

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Header title="事務所一覧" showBackButton={false} />
        
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* メッセージ */}
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

          {/* 所属事務所一覧 */}
          {offices.length > 0 ? (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">所属事務所</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {offices.map((office) => {
                  const membership = memberships.find((m) => m.officeId === office.id);
                  const isApproved = membership?.status === 'approved';
                  
                  return (
                    <div
                      key={office.id}
                      className={`bg-white rounded-xl shadow-lg p-6 border-2 ${
                        isApproved ? 'border-green-200 hover:border-green-300' : 'border-orange-200'
                      } transition-all`}
                    >
                      <h3 className="text-xl font-bold text-gray-800 mb-2">{office.name}</h3>
                      <p className="text-sm text-gray-600 mb-2">表示名: {office.displayName}</p>
                      <p className="text-sm text-gray-600 mb-4">コード: {office.code}</p>
                      
                      {membership?.status === 'approved' ? (
                        <button
                          onClick={() => handleEnterOffice(office.id)}
                          className="w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition-all"
                        >
                          開く
                        </button>
                      ) : (
                        <div className="w-full bg-orange-100 text-orange-700 py-2 rounded-lg text-center">
                          承認待ち
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="mb-8 text-center py-12 bg-white rounded-xl shadow">
              <p className="text-gray-600 text-lg mb-4">事務所に所属していません</p>
              <p className="text-gray-500">既存の事務所に参加するか、新しく事務所を作成してください</p>
            </div>
          )}

          {/* アクションボタン */}
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => {
                setShowJoinForm(!showJoinForm);
                setShowCreateForm(false);
                setError('');
                setSuccess('');
              }}
              className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-all font-semibold"
            >
              既存の事務所に参加
            </button>
            <button
              onClick={() => {
                setShowCreateForm(!showCreateForm);
                setShowJoinForm(false);
                setError('');
                setSuccess('');
              }}
              className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-all font-semibold"
            >
              新しく事務所を作る
            </button>
          </div>

          {/* 参加フォーム */}
          {showJoinForm && (
            <div className="mt-6 bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4">事務所に参加</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    事務所コード
                  </label>
                  <input
                    type="text"
                    value={joinOfficeCode}
                    onChange={(e) => setJoinOfficeCode(e.target.value.toUpperCase())}
                    className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                    placeholder="例: DEMO2025"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    事務所での表示名
                  </label>
                  <input
                    type="text"
                    value={joinDisplayName}
                    onChange={(e) => setJoinDisplayName(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                    placeholder="この事務所での表示名を入力"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleJoinOffice}
                    className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
                  >
                    参加リクエストを送信
                  </button>
                  <button
                    onClick={() => {
                      setShowJoinForm(false);
                      setJoinOfficeCode('');
                      setJoinDisplayName('');
                    }}
                    className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 作成フォーム */}
          {showCreateForm && (
            <div className="mt-6 bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4">新規事務所を作成</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    事務所名
                  </label>
                  <input
                    type="text"
                    value={createOfficeName}
                    onChange={(e) => setCreateOfficeName(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500"
                    placeholder="例: サンプル事務所"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    事務所コード（英数字のみ）
                  </label>
                  <input
                    type="text"
                    value={createOfficeCode}
                    onChange={(e) => setCreateOfficeCode(e.target.value.toUpperCase())}
                    className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500"
                    placeholder="例: OFFICE2025"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleCreateOffice}
                    className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600"
                  >
                    作成
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateForm(false);
                      setCreateOfficeName('');
                      setCreateOfficeCode('');
                    }}
                    className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
