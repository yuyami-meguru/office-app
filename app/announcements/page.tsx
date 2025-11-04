'use client';

import { useState, useEffect } from 'react';
import AuthGuard from '@/components/AuthGuard';
import DiscordLayout from '@/components/DiscordLayout';
import { getCurrentGlobalUser, getCurrentOfficeId } from '@/lib/authDB';
import { 
  getAnnouncements, 
  createAnnouncement, 
  deleteAnnouncement, 
  markAnnouncementAsRead,
  type Announcement,
  type AnnouncementType,
  type AnnouncementPriority 
} from '@/lib/announcementsDB';
import { getDepartments } from '@/lib/membersDB';
import { getMembers } from '@/lib/membersDB';

export const dynamic = 'force-dynamic';

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    type: '全体' as AnnouncementType,
    targetDepartment: '',
    targetUserId: null as number | null,
    priority: '通常' as AnnouncementPriority,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await loadAnnouncements();
    await loadDepartments();
    await loadMembers();
    await checkAdminStatus();
  };

  const loadAnnouncements = async () => {
    const data = await getAnnouncements();
    setAnnouncements(data);
  };

  const loadDepartments = async () => {
    const data = await getDepartments();
    setDepartments(data);
  };

  const loadMembers = async () => {
    const data = await getMembers();
    setMembers(data);
  };

  const checkAdminStatus = async () => {
    const user = getCurrentGlobalUser();
    if (!user) return;
    
    const memberList = await getMembers();
    const myMember = memberList.find(m => m.userId === user.id);
    setIsAdmin(myMember?.userRole === 'admin');
  };

  const handleAddAnnouncement = async () => {
    if (!newAnnouncement.title || !newAnnouncement.content) {
      alert('タイトルと内容を入力してください');
      return;
    }

    if (newAnnouncement.type === '部署' && !newAnnouncement.targetDepartment) {
      alert('対象部署を選択してください');
      return;
    }

    if (newAnnouncement.type === '個人' && !newAnnouncement.targetUserId) {
      alert('対象ユーザーを選択してください');
      return;
    }

    try {
      await createAnnouncement({
        title: newAnnouncement.title,
        content: newAnnouncement.content,
        type: newAnnouncement.type,
        targetDepartment: newAnnouncement.type === '部署' ? newAnnouncement.targetDepartment : null,
        targetUserId: newAnnouncement.type === '個人' ? newAnnouncement.targetUserId : null,
        priority: newAnnouncement.priority,
      });
      await loadAnnouncements();
      setNewAnnouncement({
        title: '',
        content: '',
        type: '全体',
        targetDepartment: '',
        targetUserId: null,
        priority: '通常',
      });
      setIsAdding(false);
    } catch (err) {
      alert('お知らせの作成に失敗しました');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('このお知らせを削除しますか？')) return;
    try {
      await deleteAnnouncement(id);
      await loadAnnouncements();
    } catch (err) {
      alert('お知らせの削除に失敗しました');
    }
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await markAnnouncementAsRead(id);
      await loadAnnouncements();
    } catch (err) {
      console.error('既読マークエラー:', err);
    }
  };

  const getPriorityColor = (priority: AnnouncementPriority) => {
    switch (priority) {
      case '緊急': return 'bg-red-100 text-red-700 border-red-300';
      case '通常': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'お知らせ': return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  return (
    <AuthGuard>
      <DiscordLayout>
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900 mb-2">お知らせ</h1>
              <p className="text-gray-600">事務所全体・部署・個人向けのお知らせを管理</p>
            </div>
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-all font-semibold"
            >
              {isAdding ? 'キャンセル' : '+ 新規お知らせ'}
            </button>
          </div>

          {/* 新規お知らせフォーム */}
          {isAdding && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">新しいお知らせを作成</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">タイトル *</label>
                  <input
                    type="text"
                    value={newAnnouncement.title}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    placeholder="お知らせのタイトル"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">内容 *</label>
                  <textarea
                    value={newAnnouncement.content}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    rows={5}
                    placeholder="お知らせの内容"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">配信先</label>
                    <select
                      value={newAnnouncement.type}
                      onChange={(e) => setNewAnnouncement({ 
                        ...newAnnouncement, 
                        type: e.target.value as AnnouncementType,
                        targetDepartment: '',
                        targetUserId: null,
                      })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    >
                      <option value="全体">事務所全体</option>
                      <option value="部署">部署</option>
                      <option value="個人">個人</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">重要度</label>
                    <select
                      value={newAnnouncement.priority}
                      onChange={(e) => setNewAnnouncement({ ...newAnnouncement, priority: e.target.value as AnnouncementPriority })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    >
                      <option value="お知らせ">お知らせ</option>
                      <option value="通常">通常</option>
                      <option value="緊急">緊急</option>
                    </select>
                  </div>
                </div>

                {newAnnouncement.type === '部署' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">対象部署 *</label>
                    <select
                      value={newAnnouncement.targetDepartment}
                      onChange={(e) => setNewAnnouncement({ ...newAnnouncement, targetDepartment: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    >
                      <option value="">部署を選択</option>
                      {departments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                )}

                {newAnnouncement.type === '個人' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">対象ユーザー *</label>
                    <select
                      value={newAnnouncement.targetUserId || ''}
                      onChange={(e) => setNewAnnouncement({ ...newAnnouncement, targetUserId: e.target.value ? parseInt(e.target.value, 10) : null })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    >
                      <option value="">ユーザーを選択</option>
                      {members.map(member => (
                        <option key={member.id} value={member.userId}>{member.displayName}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleAddAnnouncement}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
                  >
                    投稿
                  </button>
                  <button
                    onClick={() => setIsAdding(false)}
                    className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* お知らせ一覧 */}
          <div className="space-y-4">
            {announcements.map((ann) => (
              <div
                key={ann.id}
                className={`bg-white rounded-xl shadow-sm border p-6 ${
                  !ann.isRead ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                }`}
                onClick={() => !ann.isRead && handleMarkAsRead(ann.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">{ann.title}</h3>
                      {!ann.isRead && (
                        <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                      )}
                      <span className={`text-xs px-2 py-1 rounded border ${getPriorityColor(ann.priority)}`}>
                        {ann.priority}
                      </span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {ann.type}
                      </span>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap mb-3">{ann.content}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>{ann.authorName}</span>
                      <span>•</span>
                      <span>{new Date(ann.createdAt).toLocaleString('ja-JP')}</span>
                      {ann.targetDepartment && (
                        <>
                          <span>•</span>
                          <span>対象: {ann.targetDepartment}</span>
                        </>
                      )}
                      {ann.isRead && ann.readAt && (
                        <>
                          <span>•</span>
                          <span>既読: {new Date(ann.readAt).toLocaleString('ja-JP')}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(ann.id);
                      }}
                      className="text-red-500 hover:text-red-700 text-sm font-semibold px-3 py-1"
                    >
                      削除
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {announcements.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <p className="text-gray-500 text-lg">お知らせはありません</p>
            </div>
          )}
        </div>
      </DiscordLayout>
    </AuthGuard>
  );
}

