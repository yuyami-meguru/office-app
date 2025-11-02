'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, changePassword } from '@/lib/userManagerDB';

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // クライアントサイドでのみ実行
    if (typeof window === 'undefined') return;
    
    const user = getCurrentUser();
    if (!user) {
      router.push('/login');
      return;
    }
    
    // パスワード変更が必要ない場合はホームに戻す
    if (!user.requirePasswordChange) {
      router.push('/');
      return;
    }
    
    setCurrentUser(user);
    setIsLoading(false);
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!currentUser) return;

    // バリデーション
    if (newPassword.length < 6) {
      setError('新しいパスワードは6文字以上にしてください');
      return;
    }

    if (newPassword === currentPassword) {
      setError('新しいパスワードは現在のパスワードと異なるものにしてください');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('新しいパスワードと確認用パスワードが一致しません');
      return;
    }

    try {
      await changePassword(currentUser.id, currentPassword, newPassword);
      alert('パスワードを変更しました。新しいパスワードでログインしてください。');
      
      // ログアウトして再ログインを促す
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('office_app_current_user');
      router.push('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    }
  };

  if (isLoading || !currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-orange-200">
          {/* タイトル */}
          <div className="text-center mb-6">
            <div className="inline-block px-4 py-2 bg-orange-100 rounded-lg mb-4">
              <p className="text-orange-800 font-bold">パスワード変更が必要です</p>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              パスワードを変更してください
            </h1>
            <p className="text-sm text-gray-600">
              セキュリティのため、初回ログイン時または管理者がパスワードを再発行した後は、パスワードの変更が必要です。
            </p>
          </div>

          {/* フォーム */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                現在のパスワード
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  setError('');
                }}
                className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                placeholder="現在のパスワードを入力"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                新しいパスワード（6文字以上）
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setError('');
                }}
                className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                placeholder="新しいパスワードを入力"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                新しいパスワード（確認）
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError('');
                }}
                className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                placeholder="もう一度入力"
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
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 rounded-xl font-bold hover:from-orange-600 hover:to-red-600 transition-all shadow-lg hover:shadow-xl"
            >
              パスワードを変更
            </button>
          </form>

          {/* 注意事項 */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-700 font-semibold mb-2">注意事項</p>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• パスワードは6文字以上にしてください</li>
              <li>• 現在のパスワードとは異なるものを設定してください</li>
              <li>• 変更後は新しいパスワードで再ログインが必要です</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

