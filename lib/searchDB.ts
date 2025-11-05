import { supabase } from './supabase';
import { getCurrentOfficeId, getCurrentGlobalUser } from './authDB';

export type SearchResult = {
  type: 'member' | 'task' | 'announcement' | 'event' | 'file';
  id: number;
  title: string;
  description?: string;
  url: string;
  metadata?: Record<string, any>;
};

export type SearchHistory = {
  id: number;
  userId: number;
  officeId: string;
  query: string;
  resultCount: number;
  createdAt: string;
};

// 統合検索を実行
export async function searchAll(query: string): Promise<SearchResult[]> {
  const officeId = getCurrentOfficeId();
  const user = getCurrentGlobalUser();
  if (!officeId || !user) return [];

  const results: SearchResult[] = [];

  // メンバー検索
  const { data: members } = await supabase
    .from('office_memberships')
    .select('id, display_name, departments')
    .eq('office_id', officeId)
    .ilike('display_name', `%${query}%`)
    .limit(10);

  if (members) {
    results.push(...members.map(m => ({
      type: 'member' as const,
      id: m.id,
      title: m.display_name,
      description: Array.isArray(m.departments) ? m.departments.join(', ') : undefined,
      url: `/members`,
      metadata: { departments: m.departments },
    })));
  }

  // タスク検索
  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, description, status')
    .eq('office_id', officeId)
    .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
    .limit(10);

  if (tasks) {
    results.push(...tasks.map(t => ({
      type: 'task' as const,
      id: t.id,
      title: t.title,
      description: t.description,
      url: `/tasks`,
      metadata: { status: t.status },
    })));
  }

  // お知らせ検索
  const { data: announcements } = await supabase
    .from('announcements')
    .select('id, title, content, type')
    .eq('office_id', officeId)
    .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
    .limit(10);

  if (announcements) {
    results.push(...announcements.map(a => ({
      type: 'announcement' as const,
      id: a.id,
      title: a.title,
      description: a.content?.substring(0, 100),
      url: `/announcements`,
      metadata: { type: a.type },
    })));
  }

  // イベント検索
  const { data: events } = await supabase
    .from('events')
    .select('id, title, description, start_time')
    .eq('office_id', officeId)
    .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
    .limit(10);

  if (events) {
    results.push(...events.map(e => ({
      type: 'event' as const,
      id: e.id,
      title: e.title,
      description: e.description,
      url: `/schedule`,
      metadata: { startTime: e.start_time },
    })));
  }

  // ファイル検索
  const { data: files } = await supabase
    .from('files')
    .select('id, name, description')
    .eq('office_id', officeId)
    .eq('is_deleted', false)
    .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
    .limit(10);

  if (files) {
    results.push(...files.map(f => ({
      type: 'file' as const,
      id: f.id,
      title: f.name,
      description: f.description,
      url: `/files`,
    })));
  }

  // 検索履歴を保存
  if (results.length > 0) {
    await saveSearchHistory(query, results.length);
  }

  return results;
}

// 検索履歴を保存
export async function saveSearchHistory(query: string, resultCount: number): Promise<void> {
  const user = getCurrentGlobalUser();
  const officeId = getCurrentOfficeId();
  if (!user || !officeId) return;

  await supabase
    .from('search_history')
    .insert([
      {
        user_id: user.id,
        office_id: officeId,
        query,
        result_count: resultCount,
      },
    ]);
}

// 検索履歴を取得
export async function getSearchHistory(limit: number = 10): Promise<SearchHistory[]> {
  const user = getCurrentGlobalUser();
  const officeId = getCurrentOfficeId();
  if (!user || !officeId) return [];

  const { data, error } = await supabase
    .from('search_history')
    .select('*')
    .eq('user_id', user.id)
    .eq('office_id', officeId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('検索履歴取得エラー:', error);
    return [];
  }

  return (data || []).map(h => ({
    id: h.id,
    userId: h.user_id,
    officeId: h.office_id,
    query: h.query,
    resultCount: h.result_count,
    createdAt: h.created_at,
  }));
}

