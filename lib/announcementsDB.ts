import { supabase } from './supabase';
import { getCurrentOfficeId, getCurrentGlobalUser } from './authDB';

export type AnnouncementType = '全体' | '部署' | '個人';
export type AnnouncementPriority = '緊急' | '通常' | 'お知らせ';

export type Announcement = {
  id: number;
  officeId: string;
  authorId: number; // INTEGER型に修正
  authorName: string;
  title: string;
  content: string;
  type: AnnouncementType;
  targetDepartment: string | null;
  targetUserId: number | null; // INTEGER型に修正
  priority: AnnouncementPriority;
  createdAt: string;
  updatedAt: string;
  isRead: boolean;
  readAt: string | null;
};

// お知らせ一覧を取得（自分の所属部署・個人向けも含む）
export async function getAnnouncements(): Promise<Announcement[]> {
  const officeId = getCurrentOfficeId();
  const user = getCurrentGlobalUser();
  if (!officeId || !user) return [];

  // 自分の所属部署を取得
  const { data: membership } = await supabase
    .from('office_memberships')
    .select('departments')
    .eq('office_id', officeId)
    .eq('user_id', user.id)
    .eq('status', 'approved')
    .single();

  const myDepartments = membership?.departments || [];

  // お知らせを取得
  const { data: announcements, error } = await supabase
    .from('announcements')
    .select(`
      *,
      global_users:author_id (username, name)
    `)
    .eq('office_id', officeId)
    .order('created_at', { ascending: false });

  if (error) {
    // テーブルが存在しない場合は空配列を返す（エラーではない）
    if (error.code === '42P01') return [];
    // エラーオブジェクトが空の場合はスキップ
    const errorKeys = Object.keys(error || {});
    if (errorKeys.length === 0) return [];
    console.error('お知らせ取得エラー:', error);
    return [];
  }

  // 既読状態を取得
  const { data: reads } = await supabase
    .from('announcement_reads')
    .select('announcement_id, read_at')
    .eq('user_id', user.id);

  const readMap = new Map(
    (reads || []).map(r => [r.announcement_id, r.read_at])
  );

  // フィルタリング（自分の所属部署・個人向け・全体向け）
  const filtered = (announcements || []).filter((ann: any) => {
    if (ann.type === '全体') return true;
    if (ann.type === '個人' && ann.target_user_id === user.id) return true;
    if (ann.type === '部署' && myDepartments.includes(ann.target_department)) return true;
    return false;
  });

  return filtered.map((ann: any) => ({
    id: ann.id,
    officeId: ann.office_id,
    authorId: ann.author_id,
    authorName: ann.global_users?.name || ann.global_users?.username || '不明',
    title: ann.title,
    content: ann.content,
    type: ann.type as AnnouncementType,
    targetDepartment: ann.target_department,
    targetUserId: ann.target_user_id,
    priority: ann.priority as AnnouncementPriority,
    createdAt: ann.created_at,
    updatedAt: ann.updated_at,
    isRead: readMap.has(ann.id),
    readAt: readMap.get(ann.id) || null,
  }));
}

// お知らせを作成
export async function createAnnouncement(
  announcement: Omit<Announcement, 'id' | 'officeId' | 'authorId' | 'authorName' | 'createdAt' | 'updatedAt' | 'isRead' | 'readAt'>
): Promise<Announcement> {
  const officeId = getCurrentOfficeId();
  const user = getCurrentGlobalUser();
  if (!officeId || !user) throw new Error('ログインが必要です');

  const { data, error } = await supabase
    .from('announcements')
    .insert([
      {
        office_id: officeId,
        author_id: user.id,
        title: announcement.title,
        content: announcement.content,
        type: announcement.type,
        target_department: announcement.targetDepartment,
        target_user_id: announcement.targetUserId,
        priority: announcement.priority,
      },
    ])
    .select(`
      *,
      global_users:author_id (username, name)
    `)
    .single();

  if (error) {
    console.error('お知らせ作成エラー:', error);
    throw new Error('お知らせの作成に失敗しました');
  }

  return {
    id: data.id,
    officeId: data.office_id,
    authorId: data.author_id,
    authorName: data.global_users?.name || data.global_users?.username || '不明',
    title: data.title,
    content: data.content,
    type: data.type as AnnouncementType,
    targetDepartment: data.target_department,
    targetUserId: data.target_user_id,
    priority: data.priority as AnnouncementPriority,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    isRead: false,
    readAt: null,
  };
}

// お知らせを既読にする
export async function markAnnouncementAsRead(announcementId: number): Promise<void> {
  const user = getCurrentGlobalUser();
  if (!user) throw new Error('ログインが必要です');

  const { error } = await supabase
    .from('announcement_reads')
    .upsert([
      {
        announcement_id: announcementId,
        user_id: user.id,
        read_at: new Date().toISOString(),
      },
    ], {
      onConflict: 'announcement_id,user_id',
    });

  if (error) {
    console.error('既読マークエラー:', error);
    throw new Error('既読マークに失敗しました');
  }
}

// お知らせを削除
export async function deleteAnnouncement(announcementId: number): Promise<void> {
  const { error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', announcementId);

  if (error) {
    console.error('お知らせ削除エラー:', error);
    throw new Error('お知らせの削除に失敗しました');
  }
}

// 未読のお知らせ数を取得
export async function getUnreadCount(): Promise<number> {
  const officeId = getCurrentOfficeId();
  const user = getCurrentGlobalUser();
  if (!officeId || !user) return 0;

  const announcements = await getAnnouncements();
  return announcements.filter(a => !a.isRead).length;
}

