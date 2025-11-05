'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import DiscordLayout from '@/components/DiscordLayout';
import { getCurrentGlobalUser } from '@/lib/authDB';
import { getMyMembership } from '@/lib/membersDB';
import {
  getPasswordPolicy,
  getTwoFactorAuth,
  enableTwoFactorAuth,
  disableTwoFactorAuth,
  generateTwoFactorSecret,
  generateTwoFactorQRCodeUrl,
  validatePassword,
  type PasswordPolicy,
  type TwoFactorAuth,
} from '@/lib/securityDB';

export const dynamic = 'force-dynamic';

export default function SecurityPage() {
  const [passwordPolicy, setPasswordPolicy] = useState<PasswordPolicy | null>(null);
  const [twoFactorAuth, setTwoFactorAuth] = useState<TwoFactorAuth | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [twoFactorSecret, setTwoFactorSecret] = useState<string>('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const router = useRouter();
  const user = getCurrentGlobalUser();

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
    await loadPasswordPolicy();
    if (user) {
      await loadTwoFactorAuth();
    }
  };

  const loadPasswordPolicy = async () => {
    try {
      const policy = await getPasswordPolicy();
      setPasswordPolicy(policy);
    } catch (err) {
      console.error('パスワードポリシー読み込みエラー:', err);
      // エラーが発生してもUIには影響しない（デフォルトポリシーを使用）
      setPasswordPolicy(null);
    }
  };

  const loadTwoFactorAuth = async () => {
    if (!user) return;
    const auth = await getTwoFactorAuth(user.id);
    setTwoFactorAuth(auth);
  };

  const handlePasswordChange = (password: string) => {
    setNewPassword(password);
    const validation = validatePassword(password, passwordPolicy);
    setPasswordErrors(validation.errors);
  };

  const handleSetup2FA = () => {
    const secret = generateTwoFactorSecret();
    setTwoFactorSecret(secret);
    setShow2FASetup(true);
  };

  const handleEnable2FA = async () => {
    if (!user || !twoFactorSecret || !twoFactorCode) return;

    // TOTPコードを検証
    const { verifyTwoFactorCode } = await import('@/lib/securityDB');
    const isValid = verifyTwoFactorCode(twoFactorSecret, twoFactorCode);
    
    if (!isValid) {
      alert('認証コードが無効です。認証アプリで正しいコードを入力してください。');
      return;
    }

    try {
      // バックアップコードを生成（8文字のランダム文字列）
      const backupCodes = Array.from({ length: 10 }, () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 紛らわしい文字を除外
        return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      });

      await enableTwoFactorAuth(user.id, twoFactorSecret, backupCodes);
      setShow2FASetup(false);
      setTwoFactorSecret('');
      setTwoFactorCode('');
      await loadTwoFactorAuth();
      alert('二段階認証が有効化されました。バックアップコードを安全に保管してください。');
    } catch (err) {
      alert('二段階認証の有効化に失敗しました');
    }
  };

  const handleDisable2FA = async () => {
    if (!user || !confirm('二段階認証を無効化しますか？')) return;

    try {
      await disableTwoFactorAuth(user.id);
      await loadTwoFactorAuth();
      alert('二段階認証が無効化されました');
    } catch (err) {
      alert('二段階認証の無効化に失敗しました');
    }
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
              <p className="text-gray-600 mb-6">セキュリティ設定は管理者のみが利用できます。</p>
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
          <div className="mb-6">
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">セキュリティ設定</h1>
            <p className="text-gray-600">パスワードポリシーと二段階認証を管理（管理者専用）</p>
          </div>

          {/* パスワードポリシー */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">パスワードポリシー</h2>
            {passwordPolicy ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">最小文字数</span>
                  <span className="font-medium">{passwordPolicy.minLength}文字</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">大文字必須</span>
                  <span className={passwordPolicy.requireUppercase ? 'text-green-600' : 'text-gray-400'}>
                    {passwordPolicy.requireUppercase ? '必須' : '任意'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">小文字必須</span>
                  <span className={passwordPolicy.requireLowercase ? 'text-green-600' : 'text-gray-400'}>
                    {passwordPolicy.requireLowercase ? '必須' : '任意'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">数字必須</span>
                  <span className={passwordPolicy.requireNumbers ? 'text-green-600' : 'text-gray-400'}>
                    {passwordPolicy.requireNumbers ? '必須' : '任意'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">記号必須</span>
                  <span className={passwordPolicy.requireSymbols ? 'text-green-600' : 'text-gray-400'}>
                    {passwordPolicy.requireSymbols ? '必須' : '任意'}
                  </span>
                </div>
                {passwordPolicy.maxAgeDays && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">パスワード有効期限</span>
                    <span className="font-medium">{passwordPolicy.maxAgeDays}日</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">再利用防止</span>
                  <span className="font-medium">過去{passwordPolicy.preventReuseCount}個のパスワード</span>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">デフォルトポリシーが適用されています</p>
            )}
          </div>

          {/* パスワード検証テスト */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">パスワード検証テスト</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">新しいパスワード</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  placeholder="パスワードを入力"
                />
                {passwordErrors.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {passwordErrors.map((error, index) => (
                      <p key={index} className="text-sm text-red-600">{error}</p>
                    ))}
                  </div>
                )}
                {newPassword && passwordErrors.length === 0 && (
                  <p className="mt-2 text-sm text-green-600">パスワードは有効です</p>
                )}
              </div>
            </div>
          </div>

          {/* 二段階認証 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">二段階認証</h2>
            {twoFactorAuth && twoFactorAuth.enabled ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">二段階認証が有効です</p>
                    <p className="text-sm text-gray-500 mt-1">
                      有効化日: {new Date(twoFactorAuth.createdAt).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                  <button
                    onClick={handleDisable2FA}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm font-semibold"
                  >
                    無効化
                  </button>
                </div>
                {twoFactorAuth.backupCodes.length > 0 && (
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-900 mb-2">バックアップコード</p>
                    <div className="grid grid-cols-2 gap-2">
                      {twoFactorAuth.backupCodes.map((code, index) => (
                        <code key={index} className="text-xs bg-white px-2 py-1 rounded font-mono">
                          {code}
                        </code>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      これらのコードは安全に保管してください。二段階認証デバイスがない場合に使用できます。
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-600">二段階認証を有効化してアカウントを保護</p>
                {!show2FASetup ? (
                  <button
                    onClick={handleSetup2FA}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-all font-semibold"
                  >
                    二段階認証を設定
                  </button>
                ) : (
                  <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">シークレットキー</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={twoFactorSecret}
                          readOnly
                          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 bg-gray-100 font-mono text-sm"
                        />
                        <button
                          onClick={() => navigator.clipboard.writeText(twoFactorSecret)}
                          className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 text-sm"
                        >
                          コピー
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        このキーを認証アプリ（Google Authenticatorなど）に手動で登録するか、QRコードをスキャンしてください
                      </p>
                    </div>
                    {twoFactorSecret && user && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">QRコード（推奨）</label>
                        <div className="bg-white p-4 rounded-lg border border-gray-300 inline-block">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                              generateTwoFactorQRCodeUrl(twoFactorSecret, user.username, '事務所管理アプリ')
                            )}`}
                            alt="QR Code"
                            className="w-48 h-48"
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          認証アプリでQRコードをスキャンすると自動的に登録されます
                        </p>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">認証コード</label>
                      <input
                        type="text"
                        value={twoFactorCode}
                        onChange={(e) => setTwoFactorCode(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2"
                        placeholder="6桁の認証コード"
                        maxLength={6}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleEnable2FA}
                        className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-semibold"
                      >
                        有効化
                      </button>
                      <button
                        onClick={() => {
                          setShow2FASetup(false);
                          setTwoFactorSecret('');
                          setTwoFactorCode('');
                        }}
                        className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 font-semibold"
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DiscordLayout>
    </AuthGuard>
  );
}

