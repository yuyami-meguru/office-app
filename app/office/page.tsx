'use client';

import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import Header from '@/components/Header';
import { getCurrentOfficeId } from '@/lib/authDB';

export const dynamic = 'force-dynamic';

export default function OfficePage() {
  const officeId = getCurrentOfficeId();

  if (!officeId) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50">
          <Header title="エラー" showBackButton />
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-600">事務所が選択されていません</p>
              <Link href="/" className="mt-4 inline-block text-blue-600 hover:underline">
                事務所一覧に戻る
              </Link>
            </div>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Header title="事務所管理アプリ" showBackButton />
        
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-3">
              ようこそ
            </h2>
            <p className="text-lg text-gray-600">
              事務所の業務を効率的に管理しましょう
            </p>
          </div>
        </div>

        <main className="max-w-7xl mx-auto pb-12 px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Link href="/members" className="group">
              <div className="relative bg-white rounded-2xl shadow-lg p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-blue-100 overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full -mr-16 -mt-16 opacity-10 group-hover:opacity-20 transition-opacity"></div>
                <div className="relative">
                  <h2 className="text-2xl font-bold mb-4 text-gray-800">メンバー管理</h2>
                  <p className="text-gray-600 mb-6">事務所メンバーの情報を管理</p>
                  <div className="flex items-center text-blue-600 font-semibold group-hover:translate-x-2 transition-transform">
                    開く
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/tasks" className="group">
              <div className="relative bg-white rounded-2xl shadow-lg p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-green-100 overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-400 to-green-600 rounded-full -mr-16 -mt-16 opacity-10 group-hover:opacity-20 transition-opacity"></div>
                <div className="relative">
                  <h2 className="text-2xl font-bold mb-4 text-gray-800">タスク管理</h2>
                  <p className="text-gray-600 mb-6">やることリストを管理</p>
                  <div className="flex items-center text-green-600 font-semibold group-hover:translate-x-2 transition-transform">
                    開く
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/schedule" className="group">
              <div className="relative bg-white rounded-2xl shadow-lg p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-purple-100 overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full -mr-16 -mt-16 opacity-10 group-hover:opacity-20 transition-opacity"></div>
                <div className="relative">
                  <h2 className="text-2xl font-bold mb-4 text-gray-800">スケジュール</h2>
                  <p className="text-gray-600 mb-6">予定を管理</p>
                  <div className="flex items-center text-purple-600 font-semibold group-hover:translate-x-2 transition-transform">
                    開く
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/users" className="group">
              <div className="relative bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -mr-16 -mt-16 opacity-10 group-hover:opacity-20 transition-opacity"></div>
                <div className="relative">
                  <h2 className="text-2xl font-bold mb-4 text-white">ユーザー管理</h2>
                  <p className="text-indigo-100 mb-6">アカウント管理（管理者のみ）</p>
                  <div className="flex items-center text-white font-semibold group-hover:translate-x-2 transition-transform">
                    開く
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}

