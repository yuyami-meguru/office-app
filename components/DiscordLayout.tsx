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
    const user = getCurrentGlobalUser();
    if (!user) return;

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
    
    setIsLoading(false);
  };

  const loadMyDepartments = async () => {
    const myMembership = await getMyMembership();
    if (myMembership) {
      setMyDepartments(myMembership.departments || []);
      
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
