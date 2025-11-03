'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authenticateUser, setCurrentUser, initializeUsers } from '@/lib/userManagerDB';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const [officeCode, setOfficeCode] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    // ユーザーデータを初期化
    initializeUsers();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!officeCode) {
      setError('事務所コードを入力してください');
      return;
    }
    const user = await authenticateUser(officeCode, username, password);
    
    if (user) {
      // ログイン成功
      setCurrentUser(user);
      
      // パスワード変更が必要な場合は専用ページへ
      if (user.requirePasswordChange) {
        router.push('/change-password');
      } else {
        router.push('/');
      }
    } else {
      setError('ユーザー名またはパスワードが間違っています');
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center px-4 relative overflow-hidden">
      {/* 背景の装飾 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-md w-full relative z-10">
        {/* ロゴ・タイトル */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-3 drop-shadow-lg">
            事務所管理アプリ
          </h1>
          <p className="text-white/90 text-lg">
            ログインして続行してください
          </p>
        </div>

        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">

          {/* ログインフォーム */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                事務所コード
              </label>
              <input
                type="text"
                value={officeCode}
                onChange={(e) => {
                  setOfficeCode(e.target.value.toUpperCase());
                  setError('');
                }}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                placeholder="例: DEMO2025"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                ユーザー名
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError('');
                }}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                placeholder="ユーザー名を入力"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                パスワード
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                placeholder="パスワードを入力"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
                <p className="text-red-700 text-sm font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-xl font-bold hover:from-indigo-700 hover:to-purple-700 transform hover:scale-[1.02] transition-all shadow-lg hover:shadow-xl"
            >
              ログイン
            </button>
          </form>

          {/* デモ用のヒント */}
          <div className="mt-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
            <div>
              <p className="text-sm font-bold text-indigo-900 mb-2">
                初回ログイン情報
              </p>
                <div className="space-y-1 text-sm text-indigo-800">
                  <p><strong>事務所コード:</strong> DEMO2025</p>
                  <p><strong>ユーザー名:</strong> admin</p>
                  <p><strong>パスワード:</strong> office2025</p>
                </div>
              <p className="text-xs text-indigo-600 mt-2">
                ※ログイン後、ユーザー管理で新しいユーザーを追加できます
              </p>
            </div>
          </div>
        </div>

        {/* セキュリティ注意 */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm">
            <span>個人情報は保護されています</span>
          </div>
        </div>
      </div>
    </div>
  );
}

