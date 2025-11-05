import { supabase } from './supabase';
import { getCurrentOfficeId, getCurrentGlobalUser } from './authDB';

export type ChatRoomType = 'department' | 'direct' | 'group';

export type ChatRoom = {
  id: number;
  officeId: string;
  name: string;
  type: ChatRoomType;
  department: string | null;
  createdBy: number;
  createdAt: string;
};

export type ChatMessage = {
  id: number;
  roomId: number;
  userId: number;
  userName: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  mentions?: number[];
};

export type ChatRoomMember = {
  id: number;
  roomId: number;
  userId: number;
  userName: string;
  joinedAt: string;
};

// チャットルーム一覧を取得
export async function getChatRooms(): Promise<ChatRoom[]> {
  const officeId = getCurrentOfficeId();
  if (!officeId) return [];

  const { data, error } = await supabase
    .from('chat_rooms')
    .select('*')
    .eq('office_id', officeId)
    .order('created_at', { ascending: false });

  if (error) {
    // テーブルが存在しない場合は空配列を返す（エラーではない）
    if (error.code === '42P01') return [];
    // エラーオブジェクトが空の場合はスキップ
    const errorKeys = Object.keys(error || {});
    if (errorKeys.length === 0) return [];
    console.error('チャットルーム取得エラー:', error);
    return [];
  }

  return (data || []).map(room => ({
    id: room.id,
    officeId: room.office_id,
    name: room.name,
    type: room.type as ChatRoomType,
    department: room.department,
    createdBy: room.created_by,
    createdAt: room.created_at,
  }));
}

// チャットルームを作成
export async function createChatRoom(
  name: string,
  type: ChatRoomType,
  department?: string
): Promise<ChatRoom> {
  const officeId = getCurrentOfficeId();
  const user = getCurrentGlobalUser();
  if (!officeId || !user) throw new Error('ログインが必要です');

  const { data, error } = await supabase
    .from('chat_rooms')
    .insert([
      {
        office_id: officeId,
        name,
        type,
        department: department || null,
        created_by: user.id,
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error('チャットルームの作成に失敗しました');
  }

  // 作成者をメンバーに追加
  await addChatRoomMember(data.id, user.id);

  return {
    id: data.id,
    officeId: data.office_id,
    name: data.name,
    type: data.type as ChatRoomType,
    department: data.department,
    createdBy: data.created_by,
    createdAt: data.created_at,
  };
}

// チャットルームメンバーを追加
export async function addChatRoomMember(roomId: number, userId: number): Promise<ChatRoomMember> {
  const { data, error } = await supabase
    .from('chat_room_members')
    .insert([{ room_id: roomId, user_id: userId }])
    .select(`
      *,
      global_users:user_id (id, name, username)
    `)
    .single();

  if (error) {
    throw new Error('メンバーの追加に失敗しました');
  }

  return {
    id: data.id,
    roomId: data.room_id,
    userId: data.user_id,
    userName: data.global_users?.name || data.global_users?.username || '不明',
    joinedAt: data.joined_at,
  };
}

// チャットメッセージを取得
export async function getChatMessages(roomId: number, limit: number = 50): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select(`
      *,
      global_users:user_id (id, name, username)
    `)
    .eq('room_id', roomId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('メッセージ取得エラー:', error);
    return [];
  }

  // メンションを取得
  const messageIds = (data || []).map(m => m.id);
  const { data: mentions } = await supabase
    .from('message_mentions')
    .select('message_id, user_id')
    .in('message_id', messageIds);

  const mentionsMap = (mentions || []).reduce((acc, m) => {
    if (!acc[m.message_id]) acc[m.message_id] = [];
    acc[m.message_id].push(m.user_id);
    return acc;
  }, {} as Record<number, number[]>);

  return (data || [])
    .reverse()
    .map(msg => ({
      id: msg.id,
      roomId: msg.room_id,
      userId: msg.user_id,
      userName: msg.global_users?.name || msg.global_users?.username || '不明',
      content: msg.content,
      createdAt: msg.created_at,
      updatedAt: msg.updated_at,
      isDeleted: msg.is_deleted,
      mentions: mentionsMap[msg.id] || [],
    }));
}

// チャットメッセージを送信
export async function sendChatMessage(
  roomId: number,
  content: string,
  mentionedUserIds: number[] = []
): Promise<ChatMessage> {
  const user = getCurrentGlobalUser();
  if (!user) throw new Error('ログインが必要です');

  const { data: message, error } = await supabase
    .from('chat_messages')
    .insert([
      {
        room_id: roomId,
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
    throw new Error('メッセージの送信に失敗しました');
  }

  // メンションを追加
  if (mentionedUserIds.length > 0) {
    await supabase.from('message_mentions').insert(
      mentionedUserIds.map(userId => ({
        message_id: message.id,
        user_id: userId,
      }))
    );
  }

  return {
    id: message.id,
    roomId: message.room_id,
    userId: message.user_id,
    userName: message.global_users?.name || message.global_users?.username || '不明',
    content: message.content,
    createdAt: message.created_at,
    updatedAt: message.updated_at,
    isDeleted: message.is_deleted,
    mentions: mentionedUserIds,
  };
}

// メッセージを既読にする
export async function markMessageAsRead(messageId: number): Promise<void> {
  const user = getCurrentGlobalUser();
  if (!user) return;

  await supabase.from('message_reads').upsert([
    {
      message_id: messageId,
      user_id: user.id,
    },
  ]);
}

