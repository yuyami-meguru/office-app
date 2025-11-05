'use client';

import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import DiscordLayout from '@/components/DiscordLayout';

export const dynamic = 'force-dynamic';

export default function SubscriptionPage() {
  const router = useRouter();

  return (
    <AuthGuard>
      <DiscordLayout>
        <div className="p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">サブスクリプション</h1>
            <p className="text-gray-600">プランとクォータ使用状況を管理（管理者専用）</p>
          </div>

          {/* 一時的に無効化 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-center py-12">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">サブスクリプション機能は現在無効化されています</h2>
              <p className="text-gray-600 mb-6">
                この機能は今後実装予定です。
              </p>
              <button
                onClick={() => router.push('/office')}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-all font-semibold"
              >
                ダッシュボードに戻る
              </button>
            </div>
          </div>
        </div>
      </DiscordLayout>
    </AuthGuard>
  );
}
