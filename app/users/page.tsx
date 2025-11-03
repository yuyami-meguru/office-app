'use client';

import { useState, useEffect } from 'react';
import AuthGuard from '@/components/AuthGuard';
import Header from '@/components/Header';
import { getUsers, addUser, deleteUser, getCurrentUser, isAdmin, resetPassword, type User, type UserRole } from '@/lib/userManagerDB';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null);
  const [newPasswordForReset, setNewPasswordForReset] = useState('');
  
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    name: '',
    role: 'staff' as UserRole,
    email: '',
  });

  useEffect(() => {
    loadUsers();
    setCurrentUser(getCurrentUser());
  }, []);

  const loadUsers = async () => {
    const usersData = await getUsers();
    setUsers(usersData);
  };

  const handleAddUser = async () => {
    setError('');
    setSuccess('');
    
    if (!newUser.username || !newUser.password || !newUser.name) {
      setError('ユーザー名、パスワード、名前は必須です');
      return;
    }

    if (newUser.password.length < 6) {
      setError('パスワードは6文字以上にしてください');
      return;
    }

    try {
      await addUser(newUser);
      const passwordToShare = newUser.password;
      setSuccess(`ユーザーを追加しました！\n\n【本人に伝えてください】\nユーザー名: ${newUser.username}\nパスワード: ${passwordToShare}\n\n※初回ログイン時にパスワード変更が求められます`);
      setNewUser({ username: '', password: '', name: '', role: 'staff', email: '' });
      setIsAdding(false);
      await loadUsers();
      
      setTimeout(() => setSuccess(''), 10000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!confirm(`${username} を削除してもよろしいですか？`)) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      await deleteUser(userId);
      setSuccess('ユーザーを削除しました');
      await loadUsers();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    }
  };

  const handleResetPassword = async () => {
    if (!resetPasswordUserId) return;

    setError('');
    setSuccess('');

    if (newPasswordForReset.length < 6) {
      setError('パスワードは6文字以上にしてください');
      return;
    }

    try {
      const userToReset = users.find(u => u.id === resetPasswordUserId);
      await resetPassword(resetPasswordUserId, newPasswordForReset);
      setSuccess(`パスワードを再発行しました！\n\n【本人に伝えてください】\nユーザー名: ${userToReset?.username}\n新しいパスワード: ${newPasswordForReset}\n\n※次回ログイン時にパスワード変更が求められます`);
      setResetPasswordUserId(null);
      setNewPasswordForReset('');
      await loadUsers();
      
      setTimeout(() => setSuccess(''), 10000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    return role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700';
  };

  const getRoleLabel = (role: UserRole) => {
    return role === 'admin' ? '管理者' : 'スタッフ';
  };

  // 管理者でない場合はアクセス拒否
  if (!isAdmin()) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50">
          <Header title="アクセス拒否" showBackButton />
          <main className="max-w-7xl mx-auto py-12 px-4">
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                管理者権限が必要です
              </h2>
              <p className="text-gray-600">
                このページは管理者のみアクセスできます
              </p>
            </div>
          </main>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <Header title="ユーザー管理" showBackButton />
        
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-gray-600">
              ログイン中: <strong>{currentUser?.name}</strong> ({getRoleLabel(currentUser?.role || 'staff')})
            </p>
            <button
              onClick={() => {
                setIsAdding(!isAdding);
                setError('');
                setSuccess('');
              }}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              {isAdding ? 'キャンセル' : '+ 新規ユーザー'}
            </button>
          </div>

          {/* 成功/エラーメッセージ */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 whitespace-pre-line">
              {success}
            </div>
          )}
        </div>

        <main className="max-w-7xl mx-auto py-6 px-4">
          {/* パスワード再発行フォーム */}
          {resetPasswordUserId && (
            <div className="bg-orange-50 rounded-2xl shadow-lg p-8 mb-6 border-2 border-orange-200">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">パスワード再発行</h2>
              <p className="text-sm text-gray-600 mb-4">
                新しいパスワードを設定してください。ユーザーは次回ログイン時にパスワード変更を求められます。
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    新しいパスワード（6文字以上）
                  </label>
                  <input
                    type="text"
                    value={newPasswordForReset}
                    onChange={(e) => setNewPasswordForReset(e.target.value)}
                    className="w-full border-2 border-orange-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="新しいパスワードを入力"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleResetPassword}
                    className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition-all font-semibold"
                  >
                    再発行
                  </button>
                  <button
                    onClick={() => {
                      setResetPasswordUserId(null);
                      setNewPasswordForReset('');
                    }}
                    className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-all font-semibold"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 新規追加フォーム */}
          {isAdding && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">新しいユーザーを追加</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ユーザー名 *
                    </label>
                    <input
                      type="text"
                      value={newUser.username}
                      onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                      placeholder="yamada"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      名前 *
                    </label>
                    <input
                      type="text"
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                      placeholder="山田太郎"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      パスワード * (6文字以上)
                    </label>
                    <input
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                      placeholder="••••••"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      権限
                    </label>
                    <select
                      value={newUser.role}
                      onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    >
                      <option value="staff">スタッフ</option>
                      <option value="admin">管理者</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    メールアドレス
                  </label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="yamada@office.com"
                  />
                </div>

                <button
                  onClick={handleAddUser}
                  className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600"
                >
                  追加
                </button>
              </div>
            </div>
          )}

          {/* ユーザーリスト */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ユーザー
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ユーザー名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    権限
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ステータス
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className={user.id === currentUser?.id ? 'bg-blue-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {user.name}
                            {user.id === currentUser?.id && (
                              <span className="ml-2 text-xs text-blue-600">(あなた)</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.username}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.requirePasswordChange ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-700">
                          パスワード変更必要
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-700">
                          正常
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            setResetPasswordUserId(user.id);
                            setNewPasswordForReset('');
                            setError('');
                            setSuccess('');
                          }}
                          className="text-orange-600 hover:text-orange-900"
                        >
                          パスワード再発行
                        </button>
                        {user.id !== currentUser?.id && (
                          <button
                            onClick={() => handleDeleteUser(user.id, user.name)}
                            className="text-red-600 hover:text-red-900"
                          >
                            削除
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 情報 */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">ユーザー管理について</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>管理者</strong>: 全ての機能にアクセス可能（ユーザー管理含む）</li>
              <li>• <strong>スタッフ</strong>: 通常の機能のみ利用可能（ユーザー管理は不可）</li>
              <li>• 新規ユーザーは初回ログイン時にパスワード変更が必須です</li>
              <li>• パスワード再発行後も変更が必須になります</li>
              <li>• 自分自身は削除できません</li>
              <li>• 最低1人の管理者が必要です</li>
            </ul>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}

