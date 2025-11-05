import { supabase } from './supabase';
import { getCurrentOfficeId } from './authDB';

export type RecurringPattern = 'なし' | '毎日' | '毎週' | '毎月' | '毎年';

export type Event = {
  id: number;
  title: string;
  date: string;
  time: string;
  location: string;
  attendees: string;
  notes: string;
  recurringPattern: RecurringPattern;
  recurringEndDate: string | null;
  reminderMinutes: number | null;
};

// 全イベントを取得（繰り返しイベントも展開）
export async function getEvents(): Promise<Event[]> {
  const officeId = getCurrentOfficeId();
  if (!officeId) return [];
  
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('office_id', officeId)
    .order('date', { ascending: true });

  if (error) {
    // テーブルが存在しない場合は空配列を返す（エラーではない）
    if (error.code === '42P01') return [];
    // エラーオブジェクトが空の場合はスキップ
    const errorKeys = Object.keys(error || {});
    if (errorKeys.length === 0) return [];
    console.error('イベント取得エラー:', error);
    return [];
  }

  const events: Event[] = (data || []).map(event => ({
    id: event.id,
    title: event.title,
    date: event.date,
    time: event.time || '',
    location: event.location || '',
    attendees: event.attendees || '',
    notes: event.notes || '',
    recurringPattern: (event.recurring_pattern || 'なし') as RecurringPattern,
    recurringEndDate: event.recurring_end_date || null,
    reminderMinutes: event.reminder_minutes || null,
  }));

  // 繰り返しイベントを展開
  const expandedEvents: Event[] = [];
  const now = new Date();
  const endDate = new Date();
  endDate.setFullYear(endDate.getFullYear() + 1); // 1年先まで展開

  for (const event of events) {
    if (event.recurringPattern === 'なし') {
      expandedEvents.push(event);
      continue;
    }

    const startDate = new Date(event.date);
    const endRecurringDate = event.recurringEndDate ? new Date(event.recurringEndDate) : endDate;
    const finalEndDate = endRecurringDate < endDate ? endRecurringDate : endDate;

    let currentDate = new Date(startDate);
    let instanceCount = 0;
    const maxInstances = 100; // 無限ループ防止

    while (currentDate <= finalEndDate && instanceCount < maxInstances) {
      if (currentDate >= now) {
        expandedEvents.push({
          ...event,
          id: event.id * 10000 + instanceCount, // 仮ID（重複しないように）
          date: currentDate.toISOString().split('T')[0],
        });
      }

      instanceCount++;
      currentDate = new Date(currentDate);

      switch (event.recurringPattern) {
        case '毎日':
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        case '毎週':
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case '毎月':
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
        case '毎年':
          currentDate.setFullYear(currentDate.getFullYear() + 1);
          break;
      }
    }
  }

  return expandedEvents.sort((a, b) => {
    const dateA = new Date(a.date + ' ' + (a.time || '00:00'));
    const dateB = new Date(b.date + ' ' + (b.time || '00:00'));
    return dateA.getTime() - dateB.getTime();
  });
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
        time: event.time || null,
        location: event.location || null,
        attendees: event.attendees || null,
        notes: event.notes || null,
        recurring_pattern: event.recurringPattern || 'なし',
        recurring_end_date: event.recurringEndDate || null,
        reminder_minutes: event.reminderMinutes || null,
      },
    ])
    .select()
    .single();

  if (error) {
    // エラーオブジェクトが空の場合はスキップ
    const errorKeys = Object.keys(error || {});
    if (errorKeys.length === 0) {
      throw new Error('イベントの追加に失敗しました');
    }
    console.error('イベント追加エラー:', error);
    throw new Error('イベントの追加に失敗しました');
  }

  return {
    id: data.id,
    title: data.title,
    date: data.date,
    time: data.time || '',
    location: data.location || '',
    attendees: data.attendees || '',
    notes: data.notes || '',
    recurringPattern: (data.recurring_pattern || 'なし') as RecurringPattern,
    recurringEndDate: data.recurring_end_date || null,
    reminderMinutes: data.reminder_minutes || null,
  };
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

// イベントを更新
export async function updateEvent(id: number, event: Partial<Omit<Event, 'id'>>): Promise<boolean> {
  const updateData: any = {};
  if (event.title !== undefined) updateData.title = event.title;
  if (event.date !== undefined) updateData.date = event.date;
  if (event.time !== undefined) updateData.time = event.time || null;
  if (event.location !== undefined) updateData.location = event.location || null;
  if (event.attendees !== undefined) updateData.attendees = event.attendees || null;
  if (event.notes !== undefined) updateData.notes = event.notes || null;
  if (event.recurringPattern !== undefined) updateData.recurring_pattern = event.recurringPattern;
  if (event.recurringEndDate !== undefined) updateData.recurring_end_date = event.recurringEndDate || null;
  if (event.reminderMinutes !== undefined) updateData.reminder_minutes = event.reminderMinutes || null;

  const { error } = await supabase
    .from('events')
    .update(updateData)
    .eq('id', id);

  if (error) {
    throw new Error('イベントの更新に失敗しました');
  }

  return true;
}
