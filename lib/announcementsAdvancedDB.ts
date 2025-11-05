import { supabase } from './supabase';
import { getCurrentOfficeId, getCurrentGlobalUser } from './authDB';

export type AnnouncementComment = {
  id: number;
  announcementId: number;
  userId: number;
  userName: string;
  content: string;
  createdAt: string;
};

export type AnnouncementMention = {
  id: number;
  announcementId: number;
  userId: number;
  userName: string;
  createdAt: string;
};

// お知らせコメントを取得
export async function getAnnouncementComments(announcementId: number): Promise<AnnouncementComment[]> {
  const { data, error } = await supabase
    .from('announcement_comments')
    .select(`
      *,
      global_users:user_id (id, name, username)
    `)
    .eq('announcement_id', announcementId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('コメント取得エラー:', error);
    return [];
  }

  return (data || []).map(comment => ({
    id: comment.id,
    announcementId: comment.announcement_id,
    userId: comment.user_id,
    userName: comment.global_users?.name || comment.global_users?.username || '不明',
    content: comment.content,
    createdAt: comment.created_at,
  }));
}

// お知らせコメントを追加
export async function addAnnouncementComment(announcementId: number, content: string): Promise<AnnouncementComment> {
  const user = getCurrentGlobalUser();
  if (!user) throw new Error('ログインが必要です');

  const { data, error } = await supabase
    .from('announcement_comments')
    .insert([
      {
        announcement_id: announcementId,
        user_id: user.id,
        content,
      },
    ])
    .select(`
      *,
      global_users:user_id (id, name, username)
    `)
    .single();

  if (error) {
    throw new Error('コメントの追加に失敗しました');
  }

  return {
    id: data.id,
    announcementId: data.announcement_id,
    userId: data.user_id,
    userName: data.global_users?.name || data.global_users?.username || '不明',
    content: data.content,
    createdAt: data.created_at,
  };
}

// お知らせコメントを削除
export async function deleteAnnouncementComment(id: number): Promise<void> {
  const { error } = await supabase
    .from('announcement_comments')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error('コメントの削除に失敗しました');
  }
}

// お知らせにメンションを追加
export async function addAnnouncementMention(announcementId: number, userId: number): Promise<AnnouncementMention> {
  const { data, error } = await supabase
    .from('announcement_mentions')
    .insert([
      {
        announcement_id: announcementId,
        user_id: userId,
      },
    ])
    .select(`
      *,
      global_users:user_id (id, name, username)
    `)
    .single();

  if (error) {
    throw new Error('メンションの追加に失敗しました');
  }

  return {
    id: data.id,
    announcementId: data.announcement_id,
    userId: data.user_id,
    userName: data.global_users?.name || data.global_users?.username || '不明',
    createdAt: data.created_at,
  };
}

// お知らせのメンション一覧を取得
export async function getAnnouncementMentions(announcementId: number): Promise<AnnouncementMention[]> {
  const { data, error } = await supabase
    .from('announcement_mentions')
    .select(`
      *,
      global_users:user_id (id, name, username)
    `)
    .eq('announcement_id', announcementId);

  if (error) {
    console.error('メンション取得エラー:', error);
    return [];
  }

  return (data || []).map(mention => ({
    id: mention.id,
    announcementId: mention.announcement_id,
    userId: mention.user_id,
    userName: mention.global_users?.name || mention.global_users?.username || '不明',
    createdAt: mention.created_at,
  }));
}

