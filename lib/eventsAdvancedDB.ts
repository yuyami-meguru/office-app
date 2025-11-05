import { supabase } from './supabase';
import { getCurrentOfficeId, getCurrentGlobalUser } from './authDB';
import { uploadFileToStorage } from './filesDB';

export type EventParticipantStatus = '参加' | '不参加' | '未回答';

export type EventParticipant = {
  id: number;
  eventId: number;
  userId: number;
  userName: string;
  status: EventParticipantStatus;
  createdAt: string;
  updatedAt: string;
};

export type EventComment = {
  id: number;
  eventId: number;
  userId: number;
  userName: string;
  content: string;
  createdAt: string;
};

export type EventAttachment = {
  id: number;
  eventId: number;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedBy: number;
  uploadedByName: string;
  uploadedAt: string;
};

// イベント参加者を取得
export async function getEventParticipants(eventId: number): Promise<EventParticipant[]> {
  const { data, error } = await supabase
    .from('event_participants')
    .select(`
      *,
      global_users:user_id (id, name, username)
    `)
    .eq('event_id', eventId);

  if (error) {
    console.error('参加者取得エラー:', error);
    return [];
  }

  return (data || []).map(part => ({
    id: part.id,
    eventId: part.event_id,
    userId: part.user_id,
    userName: part.global_users?.name || part.global_users?.username || '不明',
    status: part.status as EventParticipantStatus,
    createdAt: part.created_at,
    updatedAt: part.updated_at,
  }));
}

// イベント参加者を追加
export async function addEventParticipant(eventId: number, userId: number, status: EventParticipantStatus = '未回答'): Promise<EventParticipant> {
  const { data, error } = await supabase
    .from('event_participants')
    .insert([
      {
        event_id: eventId,
        user_id: userId,
        status,
      },
    ])
    .select(`
      *,
      global_users:user_id (id, name, username)
    `)
    .single();

  if (error) {
    throw new Error('参加者の追加に失敗しました');
  }

  return {
    id: data.id,
    eventId: data.event_id,
    userId: data.user_id,
    userName: data.global_users?.name || data.global_users?.username || '不明',
    status: data.status as EventParticipantStatus,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

// イベント参加者のステータスを更新
export async function updateEventParticipantStatus(id: number, status: EventParticipantStatus): Promise<EventParticipant> {
  const { data, error } = await supabase
    .from('event_participants')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(`
      *,
      global_users:user_id (id, name, username)
    `)
    .single();

  if (error) {
    throw new Error('参加者ステータスの更新に失敗しました');
  }

  return {
    id: data.id,
    eventId: data.event_id,
    userId: data.user_id,
    userName: data.global_users?.name || data.global_users?.username || '不明',
    status: data.status as EventParticipantStatus,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

// イベント参加者を削除
export async function removeEventParticipant(id: number): Promise<void> {
  const { error } = await supabase
    .from('event_participants')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error('参加者の削除に失敗しました');
  }
}

// イベントコメントを取得
export async function getEventComments(eventId: number): Promise<EventComment[]> {
  const { data, error } = await supabase
    .from('event_comments')
    .select(`
      *,
      global_users:user_id (id, name, username)
    `)
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('コメント取得エラー:', error);
    return [];
  }

  return (data || []).map(comment => ({
    id: comment.id,
    eventId: comment.event_id,
    userId: comment.user_id,
    userName: comment.global_users?.name || comment.global_users?.username || '不明',
    content: comment.content,
    createdAt: comment.created_at,
  }));
}

// イベントコメントを追加
export async function addEventComment(eventId: number, content: string): Promise<EventComment> {
  const user = getCurrentGlobalUser();
  if (!user) throw new Error('ログインが必要です');

  const { data, error } = await supabase
    .from('event_comments')
    .insert([
      {
        event_id: eventId,
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
    eventId: data.event_id,
    userId: data.user_id,
    userName: data.global_users?.name || data.global_users?.username || '不明',
    content: data.content,
    createdAt: data.created_at,
  };
}

// イベントの添付ファイルを取得
export async function getEventAttachments(eventId: number): Promise<EventAttachment[]> {
  const { data, error } = await supabase
    .from('event_attachments')
    .select(`
      *,
      global_users:uploaded_by (id, name, username)
    `)
    .eq('event_id', eventId)
    .order('uploaded_at', { ascending: false });

  if (error) {
    console.error('添付ファイル取得エラー:', error);
    return [];
  }

  return (data || []).map(att => ({
    id: att.id,
    eventId: att.event_id,
    fileUrl: att.file_url,
    fileName: att.file_name,
    fileSize: att.file_size,
    fileType: att.file_type,
    uploadedBy: att.uploaded_by,
    uploadedByName: att.global_users?.name || att.global_users?.username || '不明',
    uploadedAt: att.uploaded_at,
  }));
}

// イベントに添付ファイルを追加
export async function addEventAttachment(eventId: number, file: File): Promise<EventAttachment> {
  const user = getCurrentGlobalUser();
  const officeId = getCurrentOfficeId();
  if (!user || !officeId) throw new Error('ログインが必要です');

  // ファイルサイズチェック（50MB以下）
  if (file.size > 50 * 1024 * 1024) {
    throw new Error('ファイルサイズは50MB以下にしてください');
  }

  // Storageにアップロード
  const fileUrl = await uploadFileToStorage(file, user.id, officeId);

  const { data, error } = await supabase
    .from('event_attachments')
    .insert([
      {
        event_id: eventId,
        file_url: fileUrl,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        uploaded_by: user.id,
      },
    ])
    .select(`
      *,
      global_users:uploaded_by (id, name, username)
    `)
    .single();

  if (error) {
    throw new Error('添付ファイルの追加に失敗しました');
  }

  return {
    id: data.id,
    eventId: data.event_id,
    fileUrl: data.file_url,
    fileName: data.file_name,
    fileSize: data.file_size,
    fileType: data.file_type,
    uploadedBy: data.uploaded_by,
    uploadedByName: data.global_users?.name || data.global_users?.username || '不明',
    uploadedAt: data.uploaded_at,
  };
}

// イベントの添付ファイルを削除
export async function deleteEventAttachment(id: number): Promise<void> {
  const { error } = await supabase
    .from('event_attachments')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error('添付ファイルの削除に失敗しました');
  }
}

