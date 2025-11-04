'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createAccount, login, setCurrentGlobalUser } from '@/lib/authDB';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('ユーザー名とパスワードを入力してください');
      return;
    }

    if (password.length < 6) {
      setError('パスワードは6文字以上にしてください');
      return;
    }

    try {
      if (isSignUp) {
        // アカウント作成
        if (!name || name.trim() === '') {
          setError('名前を入力してください');
          return;
        }
        const user = await createAccount(username, password, name);
        setCurrentGlobalUser(user);
        router.push('/');
      } else {
        // ログイン
        const user = await login(username, password);
        if (user) {
          setCurrentGlobalUser(user);
          router.push('/');
        } else {
          setError('ユーザー名またはパスワードが間違っています');
          setPassword('');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
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
            {isSignUp ? '新規アカウントを作成' : 'ログインして続行してください'}
          </p>
        </div>

        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
          {/* タブ切り替え */}
          <div className="flex gap-2 mb-6 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => {
                setIsSignUp(false);
                setError('');
                setUsername('');
                setPassword('');
                setName('');
              }}
              className={`flex-1 py-2 rounded-md font-semibold transition-all ${
                !isSignUp
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              ログイン
            </button>
            <button
              onClick={() => {
                setIsSignUp(true);
                setError('');
                setUsername('');
                setPassword('');
                setName('');
              }}
              className={`flex-1 py-2 rounded-md font-semibold transition-all ${
                isSignUp
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              アカウント作成
            </button>
          </div>

          {/* フォーム */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {isSignUp && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  名前
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError('');
                  }}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  placeholder="名前を入力"
                  required
                />
              </div>
            )}
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
                placeholder="パスワードを入力（6文字以上）"
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
              {isSignUp ? 'アカウントを作成' : 'ログイン'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
