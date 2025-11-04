'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import DiscordLayout from '@/components/DiscordLayout';
import { getCurrentOfficeId } from '@/lib/authDB';
import { getMembers, getMyMembership, type Member } from '@/lib/membersDB';
import { getTasks, type Task } from '@/lib/tasksDB';
import { getEvents, type Event } from '@/lib/eventsDB';

export const dynamic = 'force-dynamic';

export default function DepartmentPage() {
  const params = useParams();
  const department = decodeURIComponent(params.department as string);
  const [members, setMembers] = useState<Member[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [myMembership, setMyMembership] = useState<Member | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [department]);

  const loadData = async () => {
    const officeId = getCurrentOfficeId();
    if (!officeId) {
      setIsLoading(false);
      return;
    }

    // 自分のメンバーシップを確認（所属部署チェック）
    const membership = await getMyMembership();
    if (!membership || !membership.departments.includes(department)) {
      setIsLoading(false);
      return;
    }

    setMyMembership(membership);

    // この部署のメンバーを取得
    const allMembers = await getMembers();
    const deptMembers = allMembers.filter(m => m.departments.includes(department));
    setMembers(deptMembers);

    // タスクとイベントは後で部署フィルタリングを追加する必要がある
    // 今は全タスク・全イベントを取得
    const allTasks = await getTasks();
    setTasks(allTasks);

    const allEvents = await getEvents();
    setEvents(allEvents);

    setIsLoading(false);
  };

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

  if (!myMembership || !myMembership.departments.includes(department)) {
    return (
      <AuthGuard>
        <DiscordLayout>
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-gray-500 mb-4">この部署に所属していません</p>
              <a href="/office" className="text-indigo-600 hover:text-indigo-700 underline">
                ダッシュボードに戻る
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
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">#{department}</h1>
            <p className="text-gray-600">この部署の情報を管理</p>
          </div>

          {/* メンバー */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">メンバー ({members.length}名)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {members.map((member) => (
                <div key={member.id} className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-3">
                    {member.avatarUrl ? (
                      <img
                        src={member.avatarUrl}
                        alt={member.displayName}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold">
                        {member.displayName.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-gray-900">{member.displayName}</div>
                      <div className="text-sm text-gray-600">{member.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* タスク */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">タスク</h2>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              {tasks.length === 0 ? (
                <p className="text-gray-500">タスクがありません</p>
              ) : (
                <div className="space-y-2">
                  {tasks.slice(0, 5).map((task) => (
                    <div key={task.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded">
                      <div className={`w-2 h-2 rounded-full ${
                        task.status === '完了' ? 'bg-green-500' :
                        task.status === '進行中' ? 'bg-blue-500' : 'bg-gray-300'
                      }`}></div>
                      <span className="text-gray-900">{task.title}</span>
                      <span className="text-xs text-gray-500 ml-auto">{task.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* スケジュール */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">スケジュール</h2>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              {events.length === 0 ? (
                <p className="text-gray-500">イベントがありません</p>
              ) : (
                <div className="space-y-2">
                  {events.slice(0, 5).map((event) => (
                    <div key={event.id} className="p-2 hover:bg-gray-50 rounded">
                      <div className="font-medium text-gray-900">{event.title}</div>
                      <div className="text-sm text-gray-600">{event.date} {event.time}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </DiscordLayout>
    </AuthGuard>
  );
}

