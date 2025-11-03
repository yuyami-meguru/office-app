import { supabase } from './supabase';
import { getCurrentOfficeId } from './userManagerDB';

export type Event = {
  id: number;
  title: string;
  date: string;
  time: string;
  location: string;
  attendees: string;
  notes: string;
};

// 全イベントを取得
export async function getEvents(): Promise<Event[]> {
  const officeId = getCurrentOfficeId();
  if (!officeId) return [];
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('office_id', officeId)
    .order('date', { ascending: true });

  if (error) {
    console.error('イベント取得エラー:', error);
    return [];
  }

  return data || [];
}

// イベントを追加
export async function addEvent(event: Omit<Event, 'id'>): Promise<Event> {
  const officeId = getCurrentOfficeId();
  if (!officeId) throw new Error('事務所が選択されていません');
  const { data, error } = await supabase
    .from('events')
    .insert([
      {
        office_id: officeId,
        title: event.title,
        date: event.date,
        time: event.time,
        location: event.location,
        attendees: event.attendees,
        notes: event.notes,
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error('イベントの追加に失敗しました');
  }

  return data;
}

// イベントを削除
export async function deleteEvent(id: number): Promise<boolean> {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error('イベントの削除に失敗しました');
  }

  return true;
}

