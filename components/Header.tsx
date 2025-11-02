'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { getCurrentUser, logout, type User } from '@/lib/userManagerDB';

type HeaderProps = {
  title: string;
  showBackButton?: boolean;
};

export default function Header({ title, showBackButton = false }: HeaderProps) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, []);

  const handleLogout = () => {
    if (confirm('ログアウトしますか？')) {
      logout();
      router.push('/login');
    }
  };

  const getRoleLabel = (role: string) => {
    return role === 'admin' ? '管理者' : 'スタッフ';
  };

  return (
    <header className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-100">
      <div className="max-w-7xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            {showBackButton && (
              <Link href="/" className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 text-sm mb-3 font-medium transition-colors group">
                <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                ホームに戻る
              </Link>
            )}
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              {title}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {currentUser && (
              <div className="text-right hidden md:block bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-2 rounded-xl border border-blue-100">
                <p className="text-xs text-gray-600 mb-0.5">ログイン中</p>
                <p className="text-sm font-bold text-gray-900">
                  {currentUser.name} {getRoleLabel(currentUser.role)}
                </p>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-5 py-2.5 rounded-xl hover:from-red-600 hover:to-pink-600 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl whitespace-nowrap font-medium"
            >
              ログアウト
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

