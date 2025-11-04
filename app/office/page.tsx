'use client';

import AuthGuard from '@/components/AuthGuard';
import DiscordLayout from '@/components/DiscordLayout';
import { getCurrentOfficeId } from '@/lib/authDB';

export const dynamic = 'force-dynamic';

export default function OfficePage() {
  const officeId = getCurrentOfficeId();

  if (!officeId) {
    return (
      <AuthGuard>
        <DiscordLayout>
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-gray-500 mb-4">事務所が選択されていません</p>
              <a href="/" className="text-indigo-600 hover:text-indigo-700 underline">
                事務所一覧に戻る
              </a>
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
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">ダッシュボード</h1>
            <p className="text-gray-600">事務所の業務を効率的に管理しましょう</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <a href="/members" className="group">
              <div className="bg-white rounded-xl p-6 hover:shadow-lg transition-all border border-gray-200">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">メンバー管理</h3>
                </div>
                <p className="text-gray-600 text-sm">事務所メンバーの情報を管理</p>
              </div>
            </a>

            <a href="/tasks" className="group">
              <div className="bg-white rounded-xl p-6 hover:shadow-lg transition-all border border-gray-200">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">タスク管理</h3>
                </div>
                <p className="text-gray-600 text-sm">やることリストを管理</p>
              </div>
            </a>

            <a href="/schedule" className="group">
              <div className="bg-white rounded-xl p-6 hover:shadow-lg transition-all border border-gray-200">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 rounded-lg bg-purple-50 flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">スケジュール</h3>
                </div>
                <p className="text-gray-600 text-sm">予定を管理</p>
              </div>
            </a>

            <a href="/users" className="group">
              <div className="bg-white rounded-xl p-6 hover:shadow-lg transition-all border border-gray-200">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">ユーザー管理</h3>
                </div>
                <p className="text-gray-600 text-sm">アカウント管理（管理者のみ）</p>
              </div>
            </a>
          </div>
        </div>
      </DiscordLayout>
    </AuthGuard>
  );
}
