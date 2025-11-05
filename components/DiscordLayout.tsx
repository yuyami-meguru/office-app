'use client';

import { useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  getCurrentGlobalUser,
  getUserMemberships,
  getOffice,
  setCurrentOffice,
  logout,
  type OfficeMembership,
  type Office,
} from '@/lib/authDB';
import { getMyMembership } from '@/lib/membersDB';

interface DiscordLayoutProps {
  children: ReactNode;
}

export default function DiscordLayout({ children }: DiscordLayoutProps) {
  const [offices, setOffices] = useState<(Office & { status: string; displayName: string })[]>([]);
  const [selectedOfficeId, setSelectedOfficeId] = useState<string | null>(null);
  const [myDepartments, setMyDepartments] = useState<string[]>([]); // 自分の所属部署
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    loadOffices();
  }, []);

  useEffect(() => {
    // 事務所が変更されたら部署を再読み込み
    if (selectedOfficeId) {
      loadMyDepartments();
    }
  }, [selectedOfficeId]);

  const loadOffices = async () => {
    try {
      const user = getCurrentGlobalUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const membershipList = await getUserMemberships(user.id);
      
      const officeList = await Promise.all(
        membershipList.map(async (m) => {
          const office = await getOffice(m.officeId);
          return {
            ...(office as Office),
            status: m.status,
            displayName: m.displayName,
          } as Office & { status: string; displayName: string };
        })
      );
      
      setOffices(officeList);
      
      // 現在の事務所を設定
      const currentOfficeId = localStorage.getItem('office_app_current_office');
      if (currentOfficeId) {
        try {
          const office = JSON.parse(currentOfficeId);
          setSelectedOfficeId(office.id);
        } catch {}
      }
    } catch (err) {
      console.error('事務所読み込みエラー:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMyDepartments = async () => {
    try {
      const myMembership = await getMyMembership();
      if (myMembership) {
        setMyDepartments(myMembership.departments || []);
        setIsAdmin(myMembership.userRole === 'admin');
        
        // URLから部署を取得（例: /office/department/歌い手）
        const deptMatch = pathname.match(/\/office\/department\/(.+)$/);
        if (deptMatch) {
          const deptFromUrl = decodeURIComponent(deptMatch[1]);
          if (myMembership.departments.includes(deptFromUrl)) {
            setSelectedDepartment(deptFromUrl);
          }
        }
      } else {
        setMyDepartments([]);
        setIsAdmin(false);
      }
    } catch (err) {
      console.error('部署読み込みエラー:', err);
      setMyDepartments([]);
      setIsAdmin(false);
    }
  };

  const handleOfficeClick = (office: Office & { status: string; displayName: string }) => {
    if (office.status !== 'approved') {
      alert('この事務所はまだ承認されていません');
      return;
    }
    
    setCurrentOffice(office);
    setSelectedOfficeId(office.id);
    setSelectedDepartment(null);
    
    // 事務所ページに遷移
    if (pathname === '/' || !pathname.startsWith('/office')) {
      router.push('/office');
    }
  };

  const handleDepartmentClick = (department: string) => {
    setSelectedDepartment(department);
    router.push(`/office/department/${encodeURIComponent(department)}`);
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const user = getCurrentGlobalUser();

  // 時間帯に応じた挨拶
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 0 && hour <= 5) return 'こんばんは';
    if (hour >= 6 && hour <= 10) return 'おはようございます';
    if (hour >= 11 && hour <= 17) return 'こんにちは';
    return 'こんばんは';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 overflow-hidden">
      {/* 左サイドバー: 事務所一覧 */}
      <div className="w-20 bg-white border-r border-gray-200 flex flex-col items-center py-4 space-y-3">
        {/* ホームアイコン */}
        <button
          onClick={() => router.push('/')}
          className={`w-14 h-14 rounded-xl bg-indigo-50 hover:bg-indigo-100 transition-all flex items-center justify-center ${
            pathname === '/' ? 'bg-indigo-100 shadow-sm' : ''
          }`}
          title="ホーム"
        >
          <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </button>

        <div className="w-10 h-px bg-gray-200"></div>

        {/* 事務所一覧 */}
        {offices.map((office) => {
          const isSelected = selectedOfficeId === office.id;
          const isApproved = office.status === 'approved';
          
          return (
            <button
              key={office.id}
              onClick={() => handleOfficeClick(office)}
              className={`relative w-14 h-14 rounded-xl transition-all group ${
                isSelected
                  ? 'bg-indigo-100 shadow-sm'
                  : isApproved
                  ? 'bg-gray-50 hover:bg-gray-100'
                  : 'bg-gray-50 opacity-50 cursor-not-allowed'
              }`}
              title={office.name}
            >
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-sm font-semibold text-gray-700">
                  {office.name.charAt(0)}
                </span>
              </div>
              
              {isSelected && (
                <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-600 rounded-r-full"></div>
              )}
              
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-gray-900 text-white px-3 py-1.5 rounded text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity shadow-lg">
                {office.name}
                {!isApproved && ' (承認待ち)'}
              </div>
            </button>
          );
        })}

        <div className="w-10 h-px bg-gray-200"></div>
        <button
          onClick={() => router.push('/')}
          className="w-14 h-14 rounded-xl bg-gray-50 hover:bg-green-50 transition-all flex items-center justify-center text-gray-600 hover:text-green-600"
          title="事務所を追加"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>

        <div className="mt-auto">
          <button
            onClick={handleLogout}
            className="w-14 h-14 rounded-xl bg-gray-50 hover:bg-red-50 transition-all flex items-center justify-center text-gray-600 hover:text-red-600"
            title="ログアウト"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>

      {/* 中央サイドバー: 部署（チャンネル）リスト */}
      {selectedOfficeId && (
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
          {/* 事務所名 */}
          <div className="h-16 px-4 border-b border-gray-200 flex items-center">
            <h2 className="font-semibold text-gray-900 truncate">
              {offices.find((o) => o.id === selectedOfficeId)?.name || '事務所'}
            </h2>
          </div>

          {/* 部署（チャンネル）リスト */}
          <div className="flex-1 overflow-y-auto px-2 py-3">
            {/* お知らせリンク */}
            <a
              href="/announcements"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors mb-2 ${
                pathname === '/announcements'
                  ? 'bg-indigo-50 text-indigo-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span>お知らせ</span>
            </a>

            {/* ファイル共有リンク */}
            <a
              href="/files"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors mb-2 ${
                pathname === '/files'
                  ? 'bg-indigo-50 text-indigo-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span>ファイル</span>
            </a>

            {/* 活動履歴リンク */}
            <a
              href="/activity"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors mb-2 ${
                pathname === '/activity'
                  ? 'bg-indigo-50 text-indigo-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>活動履歴</span>
            </a>
            
            {/* 検索リンク */}
            <a
              href="/search"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors mb-2 ${
                pathname === '/search'
                  ? 'bg-indigo-50 text-indigo-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>検索</span>
            </a>
            
            {/* プロジェクト管理リンク */}
            <a
              href="/projects"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors mb-2 ${
                pathname === '/projects'
                  ? 'bg-indigo-50 text-indigo-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span>プロジェクト</span>
            </a>
            
            {/* チャットリンク */}
            <a
              href="/chat"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors mb-2 ${
                pathname === '/chat'
                  ? 'bg-indigo-50 text-indigo-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>チャット</span>
            </a>
            
            {/* 承認ワークフローリンク */}
            <a
              href="/workflow"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors mb-2 ${
                pathname === '/workflow'
                  ? 'bg-indigo-50 text-indigo-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>承認</span>
            </a>
            
            {/* 監査ログリンク（管理者のみ） */}
            {isAdmin && (
              <a
                href="/audit"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors mb-2 ${
                  pathname === '/audit'
                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>監査ログ</span>
              </a>
            )}
            
            {/* 権限管理リンク（管理者のみ） */}
            {isAdmin && (
              <a
                href="/permissions"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors mb-2 ${
                  pathname === '/permissions'
                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>権限管理</span>
              </a>
            )}
            
            {/* セキュリティ設定リンク（管理者のみ） */}
            {isAdmin && (
              <a
                href="/security"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors mb-2 ${
                  pathname === '/security'
                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>セキュリティ</span>
              </a>
            )}
            
            {/* Googleカレンダー同期リンク */}
            <a
              href="/calendar-sync"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors mb-2 ${
                pathname === '/calendar-sync'
                  ? 'bg-indigo-50 text-indigo-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>カレンダー同期</span>
            </a>
            
            {/* Webhook設定リンク（管理者のみ） */}
            {isAdmin && (
              <a
                href="/webhooks"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors mb-2 ${
                  pathname === '/webhooks'
                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Webhook</span>
              </a>
            )}
            
            {/* バックアップ設定リンク（管理者のみ） */}
            {isAdmin && (
              <a
                href="/backup"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors mb-2 ${
                  pathname === '/backup'
                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                <span>バックアップ</span>
              </a>
            )}
            
            {/* 運用可観測性リンク（管理者のみ） */}
            {isAdmin && (
              <a
                href="/observability"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors mb-2 ${
                  pathname === '/observability'
                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>運用可観測性</span>
              </a>
            )}
            
            {/* ストレージポリシーリンク（管理者のみ） */}
            {isAdmin && (
              <a
                href="/storage-policy"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors mb-2 ${
                  pathname === '/storage-policy'
                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                </svg>
                <span>ストレージポリシー</span>
              </a>
            )}
            
            {/* サブスクリプションリンク（一時的に無効化） */}
            {false && isAdmin && (
              <a
                href="/subscription"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors mb-2 ${
                  pathname === '/subscription'
                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <span>サブスクリプション</span>
              </a>
            )}
            
            <div className="h-px bg-gray-200 my-2"></div>
            
            {myDepartments.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">
                所属している部署がありません
              </div>
            ) : (
              <div className="space-y-1">
                <DepartmentLink
                  department="全部署"
                  isSelected={!selectedDepartment && pathname.startsWith('/office') && !pathname.includes('/department')}
                  onClick={() => {
                    setSelectedDepartment(null);
                    router.push('/office');
                  }}
                />
                {myDepartments.map((dept) => (
                  <DepartmentLink
                    key={dept}
                    department={dept}
                    isSelected={selectedDepartment === dept}
                    onClick={() => handleDepartmentClick(dept)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ユーザー情報 */}
          <div className="h-20 bg-gray-50 border-t border-gray-200 px-3 py-3">
            <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-white hover:bg-gray-50 transition-colors border border-gray-200">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-semibold text-indigo-700">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {user?.name || 'ユーザー'}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {getGreeting()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* メインコンテンツエリア */}
      <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
        {/* ヘッダー */}
        <div className="h-16 bg-white border-b border-gray-200 px-6 flex items-center shadow-sm">
          {selectedDepartment && (
            <div className="flex items-center gap-2">
              <span className="text-gray-400">#</span>
              <h1 className="text-lg font-semibold text-gray-900">{selectedDepartment}</h1>
            </div>
          )}
          {pathname === '/' && user?.name && !selectedDepartment && (
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                {getGreeting()}、{user.name}さん
              </h1>
            </div>
          )}
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

function DepartmentLink({ 
  department, 
  isSelected, 
  onClick 
}: { 
  department: string; 
  isSelected: boolean; 
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
        isSelected
          ? 'bg-indigo-50 text-indigo-700 font-medium'
          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <span className="text-gray-400">#</span>
      <span>{department}</span>
    </button>
  );
}
