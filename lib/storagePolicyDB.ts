import { supabase } from './supabase';
import { getCurrentOfficeId, getCurrentGlobalUser } from './authDB';

export type StorageLifecyclePolicy = {
  id: number;
  officeId: string;
  bucketName: string;
  ruleName: string;
  actionType: 'delete' | 'archive' | 'move';
  triggerDays: number;
  targetPath: string | null;
  enabled: boolean;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
};

export type FileTag = {
  id: number;
  officeId: string;
  fileId: number;
  tagName: string;
  tagValue: string | null;
  createdBy: number | null;
  createdAt: string;
};

export type StorageQuota = {
  id: number;
  officeId: string;
  storageLimitBytes: number;
  currentUsageBytes: number;
  warningThresholdPercent: number;
  lastCalculatedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

// ストレージライフサイクルポリシーを取得
export async function getStorageLifecyclePolicies(): Promise<StorageLifecyclePolicy[]> {
  const officeId = getCurrentOfficeId();
  if (!officeId) return [];

  const { data, error } = await supabase
    .from('storage_lifecycle_policies')
    .select('*')
    .eq('office_id', officeId)
    .order('created_at', { ascending: false });

  if (error) {
    if (error.code === '42P01') return [];
    console.error('ストレージライフサイクルポリシー取得エラー:', error);
    return [];
  }

  return (data || []).map(policy => ({
    id: policy.id,
    officeId: policy.office_id,
    bucketName: policy.bucket_name,
    ruleName: policy.rule_name,
    actionType: policy.action_type as 'delete' | 'archive' | 'move',
    triggerDays: policy.trigger_days,
    targetPath: policy.target_path,
    enabled: policy.enabled,
    createdBy: policy.created_by,
    createdAt: policy.created_at,
    updatedAt: policy.updated_at,
  }));
}

// ストレージライフサイクルポリシーを作成・更新
export async function upsertStorageLifecyclePolicy(
  bucketName: string,
  ruleName: string,
  actionType: 'delete' | 'archive' | 'move',
  triggerDays: number,
  targetPath?: string
): Promise<StorageLifecyclePolicy> {
  const officeId = getCurrentOfficeId();
  const user = getCurrentGlobalUser();
  if (!officeId || !user) throw new Error('ログインが必要です');

  const { data, error } = await supabase
    .from('storage_lifecycle_policies')
    .upsert([
      {
        office_id: officeId,
        bucket_name: bucketName,
        rule_name: ruleName,
        action_type: actionType,
        trigger_days: triggerDays,
        target_path: targetPath || null,
        created_by: user.id,
        updated_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error('ストレージライフサイクルポリシーの保存に失敗しました');
  }

  return {
    id: data.id,
    officeId: data.office_id,
    bucketName: data.bucket_name,
    ruleName: data.rule_name,
    actionType: data.action_type as 'delete' | 'archive' | 'move',
    triggerDays: data.trigger_days,
    targetPath: data.target_path,
    enabled: data.enabled,
    createdBy: data.created_by,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

// ファイルタグを取得
export async function getFileTags(fileId: number): Promise<FileTag[]> {
  const officeId = getCurrentOfficeId();
  if (!officeId) return [];

  const { data, error } = await supabase
    .from('file_tags')
    .select('*')
    .eq('office_id', officeId)
    .eq('file_id', fileId);

  if (error) {
    if (error.code === '42P01') return [];
    console.error('ファイルタグ取得エラー:', error);
    return [];
  }

  return (data || []).map(tag => ({
    id: tag.id,
    officeId: tag.office_id,
    fileId: tag.file_id,
    tagName: tag.tag_name,
    tagValue: tag.tag_value,
    createdBy: tag.created_by,
    createdAt: tag.created_at,
  }));
}

// ファイルタグを追加
export async function addFileTag(fileId: number, tagName: string, tagValue?: string): Promise<FileTag> {
  const officeId = getCurrentOfficeId();
  const user = getCurrentGlobalUser();
  if (!officeId || !user) throw new Error('ログインが必要です');

  const { data, error } = await supabase
    .from('file_tags')
    .upsert([
      {
        office_id: officeId,
        file_id: fileId,
        tag_name: tagName,
        tag_value: tagValue || null,
        created_by: user.id,
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error('ファイルタグの追加に失敗しました');
  }

  return {
    id: data.id,
    officeId: data.office_id,
    fileId: data.file_id,
    tagName: data.tag_name,
    tagValue: data.tag_value,
    createdBy: data.created_by,
    createdAt: data.created_at,
  };
}

// ファイルタグを削除
export async function removeFileTag(fileId: number, tagName: string): Promise<void> {
  const officeId = getCurrentOfficeId();
  if (!officeId) throw new Error('ログインが必要です');

  const { error } = await supabase
    .from('file_tags')
    .delete()
    .eq('office_id', officeId)
    .eq('file_id', fileId)
    .eq('tag_name', tagName);

  if (error) {
    throw new Error('ファイルタグの削除に失敗しました');
  }
}

// ストレージクォータを取得
export async function getStorageQuota(): Promise<StorageQuota | null> {
  const officeId = getCurrentOfficeId();
  if (!officeId) return null;

  const { data, error } = await supabase
    .from('storage_quotas')
    .select('*')
    .eq('office_id', officeId)
    .maybeSingle();

  if (error) {
    if (error.code === 'PGRST116' || error.code === '42P01') return null;
    console.error('ストレージクォータ取得エラー:', error);
    return null;
  }

  if (!data) return null;

  return {
    id: data.id,
    officeId: data.office_id,
    storageLimitBytes: data.storage_limit_bytes,
    currentUsageBytes: data.current_usage_bytes,
    warningThresholdPercent: data.warning_threshold_percent,
    lastCalculatedAt: data.last_calculated_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

// ストレージクォータを更新
export async function updateStorageQuota(
  storageLimitBytes: number,
  warningThresholdPercent: number = 80
): Promise<StorageQuota> {
  const officeId = getCurrentOfficeId();
  if (!officeId) throw new Error('ログインが必要です');

  const { data, error } = await supabase
    .from('storage_quotas')
    .upsert([
      {
        office_id: officeId,
        storage_limit_bytes: storageLimitBytes,
        warning_threshold_percent: warningThresholdPercent,
        updated_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error('ストレージクォータの更新に失敗しました');
  }

  return {
    id: data.id,
    officeId: data.office_id,
    storageLimitBytes: data.storage_limit_bytes,
    currentUsageBytes: data.current_usage_bytes,
    warningThresholdPercent: data.warning_threshold_percent,
    lastCalculatedAt: data.last_calculated_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

// ストレージ使用量を計算（簡易版）
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

