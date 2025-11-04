'use client';

import { useState, useEffect } from 'react';
import AuthGuard from '@/components/AuthGuard';
import DiscordLayout from '@/components/DiscordLayout';
import { getCurrentOfficeId, getCurrentGlobalUser } from '@/lib/authDB';
import { getMembers } from '@/lib/membersDB';
import { getTasks } from '@/lib/tasksDB';
import { getEvents } from '@/lib/eventsDB';
import { getAnnouncements, getUnreadCount } from '@/lib/announcementsDB';
import { useRouter } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function OfficePage() {
  const officeId = getCurrentOfficeId();
  const router = useRouter();
  const [stats, setStats] = useState({
    members: 0,
    tasks: 0,
    tasksCompleted: 0,
    events: 0,
    upcomingEvents: 0,
    unreadAnnouncements: 0,
  });
  const [recentAnnouncements, setRecentAnnouncements] = useState<any[]>([]);
  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (officeId) {
      loadDashboardData();
    }
  }, [officeId]);

  const loadDashboardData = async () => {
    try {
      // 並列でデータを取得
      const [members, tasks, events, announcements, unreadCount] = await Promise.all([
        getMembers(),
        getTasks(),
        getEvents(),
        getAnnouncements(),
        getUnreadCount(),
      ]);

      // 統計情報を計算
      const now = new Date();
      const upcomingEventsList = events.filter((e: any) => {
        const eventDate = new Date(e.date);
        return eventDate >= now && eventDate <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      });

      const completedTasks = tasks.filter((t: any) => t.status === '完了');
      const user = getCurrentGlobalUser();
      const myTasksList = tasks.filter((t: any) => {
        // 担当者が設定されていない場合は全て表示（後で実装）
        return t.status !== '完了';
      }).slice(0, 5);

      setStats({
        members: members.length,
        tasks: tasks.length,
        tasksCompleted: completedTasks.length,
        events: events.length,
        upcomingEvents: upcomingEventsList.length,
        unreadAnnouncements: unreadCount,
      });

      setRecentAnnouncements(announcements.slice(0, 3));
      setMyTasks(myTasksList);
      setUpcomingEvents(upcomingEventsList.slice(0, 5));
    } catch (err) {
      console.error('ダッシュボードデータ読み込みエラー:', err);
    } finally {
      setIsLoading(false);
    }
  };

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

  if (isLoading) {
    return (
      <AuthGuard>
        <DiscordLayout>
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">読み込み中...</p>
          </div>
        </DiscordLayout>
      </AuthGuard>
    );
  }

  const taskCompletionRate = stats.tasks > 0 
    ? Math.round((stats.tasksCompleted / stats.tasks) * 100) 
    : 0;

  return (
    <AuthGuard>
      <DiscordLayout>
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">ダッシュボード</h1>
            <p className="text-gray-600">事務所の業務を効率的に管理しましょう</p>
          </div>

          {/* 統計カード */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="メンバー数"
              value={stats.members}
              icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              color="blue"
              onClick={() => router.push('/members')}
            />
            <StatCard
              title="タスク完了率"
              value={`${taskCompletionRate}%`}
              subtitle={`${stats.tasksCompleted}/${stats.tasks} 完了`}
              icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              color="green"
              onClick={() => router.push('/tasks')}
            />
            <StatCard
              title="今週の予定"
              value={stats.upcomingEvents}
              icon="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              color="purple"
              onClick={() => router.push('/schedule')}
            />
            <StatCard
              title="未読お知らせ"
              value={stats.unreadAnnouncements}
              icon="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              color="orange"
              onClick={() => router.push('/announcements')}
              badge={stats.unreadAnnouncements > 0}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* 最新のお知らせ */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">最新のお知らせ</h2>
                <a
                  href="/announcements"
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  全て見る →
                </a>
              </div>
              {recentAnnouncements.length === 0 ? (
                <p className="text-gray-500 text-sm">お知らせはありません</p>
              ) : (
                <div className="space-y-3">
                  {recentAnnouncements.map((ann) => (
                    <div
                      key={ann.id}
                      className={`p-4 rounded-lg border ${
                        !ann.isRead ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900">{ann.title}</h3>
                            {!ann.isRead && (
                              <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                            )}
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              ann.priority === '緊急' ? 'bg-red-100 text-red-700' :
                              ann.priority === '通常' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {ann.priority}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2">{ann.content}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{ann.authorName} • {new Date(ann.createdAt).toLocaleDateString('ja-JP')}</span>
                        <span className="text-gray-400">{ann.type}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 自分のタスク */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">自分のタスク</h2>
                <a
                  href="/tasks"
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  全て見る →
                </a>
              </div>
              {myTasks.length === 0 ? (
                <p className="text-gray-500 text-sm">タスクはありません</p>
              ) : (
                <div className="space-y-2">
                  {myTasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-3 rounded-lg border border-gray-200 hover:bg-gray-50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{task.title}</h3>
                          {task.dueDate && (
                            <p className="text-xs text-gray-500 mt-1">
                              期限: {new Date(task.dueDate).toLocaleDateString('ja-JP')}
                            </p>
                          )}
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${
                          task.status === '完了' ? 'bg-green-100 text-green-700' :
                          task.status === '進行中' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {task.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 今週の予定 */}
          {upcomingEvents.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">今週の予定</h2>
                <a
                  href="/schedule"
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  全て見る →
                </a>
              </div>
              <div className="space-y-2">
                {upcomingEvents.map((event) => (
                  <div
                    key={event.id}
                    className="p-3 rounded-lg border border-gray-200 hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">{event.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {new Date(event.date).toLocaleDateString('ja-JP', {
                            month: 'short',
                            day: 'numeric',
                            weekday: 'short',
                          })}
                          {event.time && ` ${event.time}`}
                          {event.location && ` • ${event.location}`}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* クイックアクセス */}
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">クイックアクセス</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <QuickAccessCard
                title="メンバー管理"
                description="事務所メンバーの情報を管理"
                href="/members"
                icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                color="blue"
              />
              <QuickAccessCard
                title="タスク管理"
                description="やることリストを管理"
                href="/tasks"
                icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                color="green"
              />
              <QuickAccessCard
                title="スケジュール"
                description="予定を管理"
                href="/schedule"
                icon="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                color="purple"
              />
              <QuickAccessCard
                title="お知らせ"
                description="事務所のお知らせを確認"
                href="/announcements"
                icon="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                color="orange"
              />
              <QuickAccessCard
                title="ファイル共有"
                description="部署ごとのファイルを整理・共有"
                href="/files"
                icon="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                color="teal"
              />
              <QuickAccessCard
                title="活動履歴"
                description="最近の活動を確認"
                href="/activity"
                icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                color="gray"
              />
            </div>
          </div>
        </div>
      </DiscordLayout>
    </AuthGuard>
  );
}

function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  color, 
  onClick,
  badge 
}: { 
  title: string; 
  value: string | number; 
  subtitle?: string;
  icon: string; 
  color: 'blue' | 'green' | 'purple' | 'orange'; 
  onClick?: () => void;
  badge?: boolean;
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl p-6 hover:shadow-lg transition-all border border-gray-200 cursor-pointer relative ${
        onClick ? 'hover:scale-105' : ''
      }`}
    >
      {badge && (
        <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full"></span>
      )}
      <div className="flex items-center gap-4 mb-3">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickAccessCard({ 
  title, 
  description, 
  href, 
  icon, 
  color 
}: { 
  title: string; 
  description: string; 
  href: string; 
  icon: string; 
  color: 'blue' | 'green' | 'purple' | 'orange' | 'teal' | 'gray';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
    teal: 'bg-teal-50 text-teal-600',
    gray: 'bg-gray-50 text-gray-600',
  };

  return (
    <a href={href} className="group">
      <div className="bg-white rounded-xl p-6 hover:shadow-lg transition-all border border-gray-200">
        <div className="flex items-center gap-4 mb-3">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        <p className="text-gray-600 text-sm">{description}</p>
      </div>
    </a>
  );
}
