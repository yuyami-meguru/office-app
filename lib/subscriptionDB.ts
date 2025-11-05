import { supabase } from './supabase';
import { getCurrentOfficeId, getCurrentGlobalUser } from './authDB';

export type SubscriptionPlan = {
  id: number;
  name: string;
  displayName: string;
  description: string | null;
  priceMonthly: number;
  priceYearly: number;
  features: Record<string, any> | null;
  maxMembers: number | null;
  maxStorageBytes: number | null;
  maxProjects: number | null;
  maxFiles: number | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type OfficeSubscription = {
  id: number;
  officeId: string;
  planId: number;
  status: 'active' | 'canceled' | 'expired' | 'trial';
  billingCycle: 'monthly' | 'yearly';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEnd: string | null;
  createdAt: string;
  updatedAt: string;
};

export type QuotaUsage = {
  id: number;
  officeId: string;
  quotaType: string;
  usedCount: number;
  limitCount: number | null;
  lastCalculatedAt: string;
  createdAt: string;
  updatedAt: string;
};

// サブスクリプションプランを取得
export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('enabled', true)
    .order('price_monthly', { ascending: true });

  // テーブルが存在しない場合は空配列を返す（エラーではない）
  if (error) {
    // エラーオブジェクトが空（{}）の場合は即座にスキップ
    const errorKeys = Object.keys(error || {});
    if (errorKeys.length === 0) return [];
    
    try {
      const errorStr = JSON.stringify(error);
      if (errorStr === '{}' || errorStr === 'null') return [];
    } catch (e) {
      // JSON.stringifyが失敗した場合はスキップ
      return [];
    }
    
    // エラーコードが特定のものの場合は正常として扱う
    if (error.code === 'PGRST116' || error.code === '42P01') return [];
    
    // エラーメッセージもコードもない場合はスキップ
    if (!error.message && !error.code && !error.details && !error.hint) return [];
    
    // すべてのプロパティが空またはundefinedの場合はスキップ
    const hasValidError = errorKeys.some(key => {
      const value = (error as any)[key];
      if (value === null || value === undefined || value === '') return false;
      if (Array.isArray(value) && value.length === 0) return false;
      if (typeof value === 'object' && Object.keys(value).length === 0) return false;
      return true;
    });
    if (!hasValidError) return [];
    
    // 意味のあるエラーのみログに記録
    console.error('サブスクリプションプラン取得エラー:', error);
    return [];
  }

  return (data || []).map(plan => ({
    id: plan.id,
    name: plan.name,
    displayName: plan.display_name,
    description: plan.description,
    priceMonthly: plan.price_monthly,
    priceYearly: plan.price_yearly,
    features: plan.features,
    maxMembers: plan.max_members,
    maxStorageBytes: plan.max_storage_bytes,
    maxProjects: plan.max_projects,
    maxFiles: plan.max_files,
    enabled: plan.enabled,
    createdAt: plan.created_at,
    updatedAt: plan.updated_at,
  }));
}

// 事務所のサブスクリプションを取得
export async function getOfficeSubscription(): Promise<OfficeSubscription | null> {
  const officeId = getCurrentOfficeId();
  if (!officeId) return null;

  const { data, error } = await supabase
    .from('office_subscriptions')
    .select('*')
    .eq('office_id', officeId)
    .maybeSingle();

  // テーブルが存在しない、またはレコードが見つからない場合はnullを返す（エラーではない）
  if (error) {
    // エラーオブジェクトが空（{}）の場合は即座にスキップ
    const errorKeys = Object.keys(error || {});
    if (errorKeys.length === 0) return null;
    
    try {
      const errorStr = JSON.stringify(error);
      if (errorStr === '{}' || errorStr === 'null') return null;
    } catch (e) {
      // JSON.stringifyが失敗した場合はスキップ
      return null;
    }
    
    // エラーコードが特定のものの場合は正常として扱う
    if (error.code === 'PGRST116' || error.code === '42P01') return null;
    
    // エラーメッセージもコードもない場合はスキップ
    if (!error.message && !error.code && !error.details && !error.hint) return null;
    
    // すべてのプロパティが空またはundefinedの場合はスキップ
    const hasValidError = errorKeys.some(key => {
      const value = (error as any)[key];
      if (value === null || value === undefined || value === '') return false;
      if (Array.isArray(value) && value.length === 0) return false;
      if (typeof value === 'object' && Object.keys(value).length === 0) return false;
      return true;
    });
    if (!hasValidError) return null;
    
    // 意味のあるエラーのみログに記録
    console.error('サブスクリプション取得エラー:', error);
    return null;
  }

  if (!data) return null;

  return {
    id: data.id,
    officeId: data.office_id,
    planId: data.plan_id,
    status: data.status as 'active' | 'canceled' | 'expired' | 'trial',
    billingCycle: data.billing_cycle as 'monthly' | 'yearly',
    currentPeriodStart: data.current_period_start,
    currentPeriodEnd: data.current_period_end,
    cancelAtPeriodEnd: data.cancel_at_period_end,
    trialEnd: data.trial_end,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

// サブスクリプションを更新
export async function updateOfficeSubscription(
  planId: number,
  billingCycle: 'monthly' | 'yearly'
): Promise<OfficeSubscription> {
  const officeId = getCurrentOfficeId();
  if (!officeId) throw new Error('ログインが必要です');

  const now = new Date();
  const periodEnd = new Date(now);
  if (billingCycle === 'monthly') {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  } else {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  }

  const { data, error } = await supabase
    .from('office_subscriptions')
    .upsert([
      {
        office_id: officeId,
        plan_id: planId,
        status: 'active',
        billing_cycle: billingCycle,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        cancel_at_period_end: false,
        updated_at: now.toISOString(),
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error('サブスクリプションの更新に失敗しました');
  }

  return {
    id: data.id,
    officeId: data.office_id,
    planId: data.plan_id,
    status: data.status as 'active' | 'canceled' | 'expired' | 'trial',
    billingCycle: data.billing_cycle as 'monthly' | 'yearly',
    currentPeriodStart: data.current_period_start,
    currentPeriodEnd: data.current_period_end,
    cancelAtPeriodEnd: data.cancel_at_period_end,
    trialEnd: data.trial_end,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

// クォータ使用状況を取得
export async function getQuotaUsage(): Promise<QuotaUsage[]> {
  const officeId = getCurrentOfficeId();
  if (!officeId) return [];

  const { data, error } = await supabase
    .from('quota_usage')
    .select('*')
    .eq('office_id', officeId);

  // テーブルが存在しない場合は空配列を返す（エラーではない）
  if (error) {
    // エラーオブジェクトが空（{}）の場合は即座にスキップ
    const errorKeys = Object.keys(error || {});
    if (errorKeys.length === 0) return [];
    
    try {
      const errorStr = JSON.stringify(error);
      if (errorStr === '{}' || errorStr === 'null') return [];
    } catch (e) {
      // JSON.stringifyが失敗した場合はスキップ
      return [];
    }
    
    // エラーコードが特定のものの場合は正常として扱う
    if (error.code === 'PGRST116' || error.code === '42P01') return [];
    
    // エラーメッセージもコードもない場合はスキップ
    if (!error.message && !error.code && !error.details && !error.hint) return [];
    
    // すべてのプロパティが空またはundefinedの場合はスキップ
    const hasValidError = errorKeys.some(key => {
      const value = (error as any)[key];
      if (value === null || value === undefined || value === '') return false;
      if (Array.isArray(value) && value.length === 0) return false;
      if (typeof value === 'object' && Object.keys(value).length === 0) return false;
      return true;
    });
    if (!hasValidError) return [];
    
    // 意味のあるエラーのみログに記録
    console.error('クォータ使用状況取得エラー:', error);
    return [];
  }

  return (data || []).map(usage => ({
    id: usage.id,
    officeId: usage.office_id,
    quotaType: usage.quota_type,
    usedCount: usage.used_count,
    limitCount: usage.limit_count,
    lastCalculatedAt: usage.last_calculated_at,
    createdAt: usage.created_at,
    updatedAt: usage.updated_at,
  }));
}

// クォータ使用状況を更新
export async function updateQuotaUsage(
  quotaType: string,
  usedCount: number,
  limitCount?: number
): Promise<QuotaUsage> {
  const officeId = getCurrentOfficeId();
  if (!officeId) throw new Error('ログインが必要です');

  const { data, error } = await supabase
    .from('quota_usage')
    .upsert([
      {
        office_id: officeId,
        quota_type: quotaType,
        used_count: usedCount,
        limit_count: limitCount || null,
        last_calculated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error('クォータ使用状況の更新に失敗しました');
  }

  return {
    id: data.id,
    officeId: data.office_id,
    quotaType: data.quota_type,
    usedCount: data.used_count,
    limitCount: data.limit_count,
    lastCalculatedAt: data.last_calculated_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

// クォータ制限をチェック
export async function checkQuotaLimit(quotaType: string, additionalCount: number = 0): Promise<{ allowed: boolean; used: number; limit: number | null }> {
  const usage = await getQuotaUsage();
  const quota = usage.find(q => q.quotaType === quotaType);

  if (!quota || !quota.limitCount) {
    return { allowed: true, used: quota?.usedCount || 0, limit: null };
  }

  const totalUsed = (quota.usedCount || 0) + additionalCount;
  return {
    allowed: totalUsed <= quota.limitCount,
    used: quota.usedCount || 0,
    limit: quota.limitCount,
  };
}

