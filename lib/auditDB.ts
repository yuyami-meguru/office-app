import { supabase } from './supabase';
import { getCurrentOfficeId, getCurrentGlobalUser } from './authDB';

export type AuditLog = {
  id: number;
  officeId: string;
  userId: number;
  userName: string;
  action: string;
  resourceType: string;
  resourceId: number | null;
  details: Record<string, any> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

// 監査ログを取得
export async function getAuditLogs(limit: number = 100): Promise<AuditLog[]> {
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
    console.error('監査ログ取得エラー:', error);
    return [];
  }

  return (data || []).map(log => ({
    id: log.id,
    officeId: log.office_id,
    userId: log.user_id,
    userName: log.global_users?.name || log.global_users?.username || '不明',
    action: log.action_type || log.action || '不明',
    resourceType: log.entity_type || log.resource_type || '不明',
    resourceId: log.entity_id || log.resource_id || null,
    details: log.details,
    ipAddress: log.ip_address || null,
    userAgent: log.user_agent || null,
    createdAt: log.created_at,
  }));
}

// CSVエクスポート用のデータを取得
export async function getAuditLogsForExport(): Promise<any[]> {
  const logs = await getAuditLogs(10000); // 大量データも対応

  return logs.map(log => ({
    '日時': new Date(log.createdAt).toLocaleString('ja-JP'),
    'ユーザー': log.userName,
    'アクション': log.action,
    'リソースタイプ': log.resourceType,
    'リソースID': log.resourceId || '',
    '詳細': JSON.stringify(log.details || {}),
    'IPアドレス': log.ipAddress || '',
  }));
}

// JSONエクスポート用のデータを取得
export async function getAuditLogsForJSONExport(): Promise<AuditLog[]> {
  return await getAuditLogs(10000);
}

