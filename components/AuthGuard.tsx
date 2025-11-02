'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // ログイン状態をチェック
    const authStatus = localStorage.getItem('isAuthenticated');
    
    if (authStatus === 'true') {
      setIsAuthenticated(true);
      setIsLoading(false);
    } else {
      // ログインしていない場合はログインページへリダイレクト
      router.push('/login');
    }
  }, [router]);

  // ローディング中
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  // 認証済みの場合のみコンテンツを表示
  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

