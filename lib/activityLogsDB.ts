import { supabase } from './supabase';
import { getCurrentOfficeId, getCurrentGlobalUser } from './authDB';

export type ActivityLog = {
  id: number;
  officeId: string;
  userId: number;
  userName: string;
  actionType: string;
  entityType: string;
  entityId: number | null;
  details: any;
  createdAt: string;
};

// 活動履歴を取得
export async function getActivityLogs(limit: number = 50): Promise<ActivityLog[]> {
  const officeId = getCurrentOfficeId();
  if (!officeId) return [];

  const { data, error } = await supabase
    .from('activity_logs')
    .select(`
      *,
      global_users:user_id (id, name, username)
    `)
    .eq('office_id', officeId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    // テーブルが存在しない場合は空配列を返す（エラーではない）
    if (error.code === '42P01') return [];
    // エラーオブジェクトが空の場合はスキップ
    const errorKeys = Object.keys(error || {});
    if (errorKeys.length === 0) return [];
    console.error('活動履歴取得エラー:', error);
    return [];
  }

  return (data || []).map(log => ({
    id: log.id,
    officeId: log.office_id,
    userId: log.user_id,
    userName: log.global_users?.name || log.global_users?.username || '不明',
    actionType: log.action_type,
    entityType: log.entity_type,
    entityId: log.entity_id,
    details: log.details,
    createdAt: log.created_at,
  }));
}

// 活動履歴を記録
export async function logActivity(
  actionType: string,
  entityType: string,
  entityId: number | null,
  details?: any
): Promise<void> {
  const officeId = getCurrentOfficeId();
  const user = getCurrentGlobalUser();
  if (!officeId || !user) return; // ログインしていない場合は記録しない

  const { error } = await supabase
    .from('activity_logs')
    .insert([
      {
        office_id: officeId,
        user_id: user.id,
        action_type: actionType,
        entity_type: entityType,
        entity_id: entityId,
        details: details || {},
      },
    ]);

  if (error) {
    console.error('活動履歴記録エラー:', error);
  }
}

