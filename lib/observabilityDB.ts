import { supabase } from './supabase';
import { getCurrentOfficeId, getCurrentGlobalUser } from './authDB';

export type ErrorLog = {
  id: number;
  officeId: string | null;
  userId: number | null;
  errorType: string;
  errorMessage: string;
  errorStack: string | null;
  url: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
  createdAt: string;
};

export type PerformanceMetric = {
  id: number;
  officeId: string | null;
  metricType: string;
  metricName: string;
  value: number;
  unit: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
};

export type FeatureFlag = {
  id: number;
  officeId: string;
  flagName: string;
  enabled: boolean;
  description: string | null;
  targetUsers: string[];
  targetRoles: string[];
  rolloutPercentage: number;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
};

// エラーログを記録
export async function logError(
  errorType: string,
  errorMessage: string,
  errorStack?: string,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
  url?: string,
  userAgent?: string,
  ipAddress?: string
): Promise<void> {
  const officeId = getCurrentOfficeId();
  const user = getCurrentGlobalUser();

  try {
    await supabase
      .from('error_logs')
      .insert([
        {
          office_id: officeId,
          user_id: user?.id,
          error_type: errorType,
          error_message: errorMessage,
          error_stack: errorStack || null,
          url: url || null,
          user_agent: userAgent || null,
          ip_address: ipAddress || null,
          severity,
        },
      ]);
  } catch (err) {
    // エラーログの記録に失敗してもアプリの動作は続行
    console.error('エラーログの記録に失敗:', err);
  }
}

// エラーログを取得（管理者用）
export async function getErrorLogs(limit: number = 100): Promise<ErrorLog[]> {
  const officeId = getCurrentOfficeId();
  if (!officeId) return [];

  const { data, error } = await supabase
    .from('error_logs')
    .select('*')
    .eq('office_id', officeId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    if (error.code === '42P01') return [];
    console.error('エラーログ取得エラー:', error);
    return [];
  }

  return (data || []).map(log => ({
    id: log.id,
    officeId: log.office_id,
    userId: log.user_id,
    errorType: log.error_type,
    errorMessage: log.error_message,
    errorStack: log.error_stack,
    url: log.url,
    userAgent: log.user_agent,
    ipAddress: log.ip_address,
    severity: log.severity as 'low' | 'medium' | 'high' | 'critical',
    resolved: log.resolved,
    createdAt: log.created_at,
  }));
}

// エラーログを解決済みにマーク
export async function resolveErrorLog(id: number): Promise<void> {
  const { error } = await supabase
    .from('error_logs')
    .update({ resolved: true })
    .eq('id', id);

  if (error) {
    throw new Error('エラーログの更新に失敗しました');
  }
}

// パフォーマンスメトリクスを記録
export async function logPerformanceMetric(
  metricType: string,
  metricName: string,
  value: number,
  unit?: string,
  metadata?: Record<string, any>
): Promise<void> {
  const officeId = getCurrentOfficeId();

  try {
    await supabase
      .from('performance_metrics')
      .insert([
        {
          office_id: officeId,
          metric_type: metricType,
          metric_name: metricName,
          value,
          unit: unit || null,
          metadata: metadata || null,
        },
      ]);
  } catch (err) {
    // メトリクスの記録に失敗してもアプリの動作は続行
    console.error('パフォーマンスメトリクスの記録に失敗:', err);
  }
}

// パフォーマンスメトリクスを取得
export async function getPerformanceMetrics(
  metricType?: string,
  limit: number = 100
): Promise<PerformanceMetric[]> {
  const officeId = getCurrentOfficeId();
  if (!officeId) return [];

  let query = supabase
    .from('performance_metrics')
    .select('*')
    .eq('office_id', officeId);

  if (metricType) {
    query = query.eq('metric_type', metricType);
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    if (error.code === '42P01') return [];
    console.error('パフォーマンスメトリクス取得エラー:', error);
    return [];
  }

  return (data || []).map(metric => ({
    id: metric.id,
    officeId: metric.office_id,
    metricType: metric.metric_type,
    metricName: metric.metric_name,
    value: metric.value,
    unit: metric.unit,
    metadata: metric.metadata,
    createdAt: metric.created_at,
  }));
}

// Feature Flagを取得
export async function getFeatureFlags(): Promise<FeatureFlag[]> {
  const officeId = getCurrentOfficeId();
  if (!officeId) return [];

  const { data, error } = await supabase
    .from('feature_flags')
    .select('*')
    .eq('office_id', officeId);

  if (error) {
    if (error.code === '42P01') return [];
    console.error('Feature Flag取得エラー:', error);
    return [];
  }

  return (data || []).map(flag => ({
    id: flag.id,
    officeId: flag.office_id,
    flagName: flag.flag_name,
    enabled: flag.enabled,
    description: flag.description,
    targetUsers: flag.target_users || [],
    targetRoles: flag.target_roles || [],
    rolloutPercentage: flag.rollout_percentage,
    createdBy: flag.created_by,
    createdAt: flag.created_at,
    updatedAt: flag.updated_at,
  }));
}

// Feature Flagが有効かチェック
export async function isFeatureEnabled(flagName: string): Promise<boolean> {
  const officeId = getCurrentOfficeId();
  const user = getCurrentGlobalUser();
  if (!officeId) return false;

  const flags = await getFeatureFlags();
  const flag = flags.find(f => f.flagName === flagName);

  if (!flag || !flag.enabled) return false;

  // ロールアウト率チェック
  if (flag.rolloutPercentage < 100) {
    // 簡易的な確率的チェック（実際の実装では、より複雑なロジックが必要）
    const random = Math.random() * 100;
    if (random > flag.rolloutPercentage) return false;
  }

  // 対象ユーザーチェック
  if (flag.targetUsers.length > 0 && user) {
    if (!flag.targetUsers.includes(user.id.toString())) return false;
  }

  // 対象ロールチェック
  if (flag.targetRoles.length > 0) {
    // ユーザーのロールを取得する必要がある（簡易実装）
    // 実際の実装では、getMyMembership()を使用
  }

  return true;
}

// Feature Flagを作成・更新
export async function upsertFeatureFlag(
  flagName: string,
  enabled: boolean,
  description?: string,
  targetUsers: string[] = [],
  targetRoles: string[] = [],
  rolloutPercentage: number = 100
): Promise<FeatureFlag> {
  const officeId = getCurrentOfficeId();
  const user = getCurrentGlobalUser();
  if (!officeId || !user) throw new Error('ログインが必要です');

  const { data, error } = await supabase
    .from('feature_flags')
    .upsert([
      {
        office_id: officeId,
        flag_name: flagName,
        enabled,
        description: description || null,
        target_users: targetUsers,
        target_roles: targetRoles,
        rollout_percentage: rolloutPercentage,
        created_by: user.id,
        updated_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error('Feature Flagの保存に失敗しました');
  }

  return {
    id: data.id,
    officeId: data.office_id,
    flagName: data.flag_name,
    enabled: data.enabled,
    description: data.description,
    targetUsers: data.target_users || [],
    targetRoles: data.target_roles || [],
    rolloutPercentage: data.rollout_percentage,
    createdBy: data.created_by,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

