import { supabase } from './supabase';
import { getCurrentOfficeId, getCurrentGlobalUser } from './authDB';
import { getTasks } from './tasksDB';
import { getMembers } from './membersDB';
import { getEvents } from './eventsDB';
import { getAnnouncements } from './announcementsDB';
import { getProjects } from './projectsDB';

export type BackupConfiguration = {
  id: number;
  officeId: string;
  scheduleType: 'daily' | 'weekly' | 'monthly' | 'manual';
  scheduleConfig: Record<string, any> | null;
  retentionDays: number;
  enabled: boolean;
  lastBackupAt: string | null;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
};

export type BackupHistory = {
  id: number;
  officeId: string;
  backupType: 'full' | 'incremental';
  backupData: Record<string, any>;
  fileSizeBytes: number | null;
  storagePath: string | null;
  status: 'pending' | 'completed' | 'failed';
  errorMessage: string | null;
  createdBy: number;
  createdAt: string;
};

export type DataRetentionPolicy = {
  id: number;
  officeId: string;
  resourceType: string;
  retentionDays: number | null;
  autoDelete: boolean;
  archiveBeforeDelete: boolean;
  createdAt: string;
  updatedAt: string;
};

// バックアップ設定を取得
export async function getBackupConfiguration(): Promise<BackupConfiguration | null> {
  const officeId = getCurrentOfficeId();
  if (!officeId) return null;

  const { data, error } = await supabase
    .from('backup_configurations')
    .select('*')
    .eq('office_id', officeId)
    .maybeSingle();

  // テーブルが存在しない、またはレコードが見つからない場合はnullを返す（エラーではない）
  if (error) {
    if (error.code === 'PGRST116' || error.code === '42P01') {
      return null;
    }
    console.error('バックアップ設定取得エラー:', error);
    return null;
  }

  if (!data) return null;

  return {
    id: data.id,
    officeId: data.office_id,
    scheduleType: data.schedule_type as 'daily' | 'weekly' | 'monthly' | 'manual',
    scheduleConfig: data.schedule_config,
    retentionDays: data.retention_days,
    enabled: data.enabled,
    lastBackupAt: data.last_backup_at,
    createdBy: data.created_by,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

// バックアップ設定を作成・更新
export async function upsertBackupConfiguration(
  scheduleType: 'daily' | 'weekly' | 'monthly' | 'manual',
  scheduleConfig: Record<string, any> | null = null,
  retentionDays: number = 30,
  enabled: boolean = true
): Promise<BackupConfiguration> {
  const officeId = getCurrentOfficeId();
  const user = getCurrentGlobalUser();
  if (!officeId || !user) throw new Error('ログインが必要です');

  const { data, error } = await supabase
    .from('backup_configurations')
    .upsert([
      {
        office_id: officeId,
        schedule_type: scheduleType,
        schedule_config: scheduleConfig,
        retention_days: retentionDays,
        enabled,
        created_by: user.id,
        updated_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error('バックアップ設定の保存に失敗しました');
  }

  return {
    id: data.id,
    officeId: data.office_id,
    scheduleType: data.schedule_type as 'daily' | 'weekly' | 'monthly' | 'manual',
    scheduleConfig: data.schedule_config,
    retentionDays: data.retention_days,
    enabled: data.enabled,
    lastBackupAt: data.last_backup_at,
    createdBy: data.created_by,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

// バックアップを実行
export async function createBackup(backupType: 'full' | 'incremental' = 'full'): Promise<BackupHistory> {
  const officeId = getCurrentOfficeId();
  const user = getCurrentGlobalUser();
  if (!officeId || !user) throw new Error('ログインが必要です');

  try {
    // データを取得
    const [tasks, members, events, announcements, projects] = await Promise.all([
      getTasks(),
      getMembers(),
      getEvents(),
      getAnnouncements(),
      getProjects(),
    ]);

    const backupData = {
      officeId,
      timestamp: new Date().toISOString(),
      version: '1.0',
      data: {
        tasks,
        members,
        events,
        announcements,
        projects,
      },
    };

    // バックアップ履歴を作成
    const { data, error } = await supabase
      .from('backup_history')
      .insert([
        {
          office_id: officeId,
          backup_type: backupType,
          backup_data: backupData,
          file_size_bytes: JSON.stringify(backupData).length,
          status: 'pending',
          created_by: user.id,
        },
      ])
      .select()
      .single();

    if (error) {
      // テーブルが存在しない場合はエラーメッセージを改善
      if (error.code === '42P01') {
        throw new Error('バックアップ機能を有効にするには、Supabaseでsupabase-schema-backup.sqlを実行してください');
      }
      throw new Error('バックアップの作成に失敗しました');
    }

    // バックアップ設定の最終バックアップ時刻を更新（エラーを無視）
    await supabase
      .from('backup_configurations')
      .update({ last_backup_at: new Date().toISOString() })
      .eq('office_id', officeId);

    // バックアップを完了状態に更新
    const { error: updateError } = await supabase
      .from('backup_history')
      .update({ status: 'completed' })
      .eq('id', data.id);

    if (updateError) {
      console.error('バックアップ状態更新エラー:', updateError);
    }

    return {
      id: data.id,
      officeId: data.office_id,
      backupType: data.backup_type as 'full' | 'incremental',
      backupData: data.backup_data,
      fileSizeBytes: data.file_size_bytes,
      storagePath: data.storage_path,
      status: 'completed',
      errorMessage: data.error_message,
      createdBy: data.created_by,
      createdAt: data.created_at,
    };
  } catch (error: any) {
    // エラーを記録（テーブルが存在しない場合はスキップ）
    try {
      await supabase
        .from('backup_history')
        .insert([
          {
            office_id: officeId,
            backup_type: backupType,
            backup_data: {},
            status: 'failed',
            error_message: error.message || 'バックアップに失敗しました',
            created_by: user!.id,
          },
        ]);
    } catch (insertError: any) {
      // テーブルが存在しない場合はエラーログを記録しない
      if (insertError.code !== '42P01') {
        console.error('バックアップエラー記録失敗:', insertError);
      }
    }

    throw error;
  }
}

// バックアップ履歴を取得
export async function getBackupHistory(limit: number = 50): Promise<BackupHistory[]> {
  const officeId = getCurrentOfficeId();
  if (!officeId) return [];

  const { data, error } = await supabase
    .from('backup_history')
    .select('*')
    .eq('office_id', officeId)
    .order('created_at', { ascending: false })
    .limit(limit);

  // テーブルが存在しない場合は空配列を返す（エラーではない）
  if (error) {
    if (error.code === '42P01') { // テーブルが存在しない
      return [];
    }
    console.error('バックアップ履歴取得エラー:', error);
    return [];
  }

  return (data || []).map(backup => ({
    id: backup.id,
    officeId: backup.office_id,
    backupType: backup.backup_type as 'full' | 'incremental',
    backupData: backup.backup_data,
    fileSizeBytes: backup.file_size_bytes,
    storagePath: backup.storage_path,
    status: backup.status as 'pending' | 'completed' | 'failed',
    errorMessage: backup.error_message,
    createdBy: backup.created_by,
    createdAt: backup.created_at,
  }));
}

// バックアップからリストア
export async function restoreFromBackup(backupId: number): Promise<void> {
  const officeId = getCurrentOfficeId();
  const user = getCurrentGlobalUser();
  if (!officeId || !user) throw new Error('ログインが必要です');

  // バックアップを取得
  const { data: backup, error: backupError } = await supabase
    .from('backup_history')
    .select('*')
    .eq('id', backupId)
    .eq('office_id', officeId)
    .single();

  if (backupError || !backup || backup.status !== 'completed') {
    throw new Error('バックアップが見つかりません');
  }

  const backupData = backup.backup_data as any;

  // データをリストア（実際の実装では、各テーブルにデータを挿入）
  // 注意: 本番環境では、トランザクション処理やバックアップの作成が必要
  // ここでは簡易的な実装として、データの存在確認のみ

  if (!backupData.data) {
    throw new Error('バックアップデータが無効です');
  }

  // 実際のリストア処理は、各テーブルへのデータ挿入を実装する必要があります
  // セキュリティ上の理由から、管理者のみが実行可能にする必要があります
}

// データ保持ポリシーを取得
export async function getDataRetentionPolicies(): Promise<DataRetentionPolicy[]> {
  const officeId = getCurrentOfficeId();
  if (!officeId) return [];

  const { data, error } = await supabase
    .from('data_retention_policies')
    .select('*')
    .eq('office_id', officeId);

  // テーブルが存在しない場合は空配列を返す（エラーではない）
  if (error) {
    if (error.code === '42P01') { // テーブルが存在しない
      return [];
    }
    console.error('データ保持ポリシー取得エラー:', error);
    return [];
  }

  return (data || []).map(policy => ({
    id: policy.id,
    officeId: policy.office_id,
    resourceType: policy.resource_type,
    retentionDays: policy.retention_days,
    autoDelete: policy.auto_delete,
    archiveBeforeDelete: policy.archive_before_delete,
    createdAt: policy.created_at,
    updatedAt: policy.updated_at,
  }));
}

// データ保持ポリシーを作成・更新
export async function upsertDataRetentionPolicy(
  resourceType: string,
  retentionDays: number | null,
  autoDelete: boolean = false,
  archiveBeforeDelete: boolean = true
): Promise<DataRetentionPolicy> {
  const officeId = getCurrentOfficeId();
  if (!officeId) throw new Error('ログインが必要です');

  const { data, error } = await supabase
    .from('data_retention_policies')
    .upsert([
      {
        office_id: officeId,
        resource_type: resourceType,
        retention_days: retentionDays,
        auto_delete: autoDelete,
        archive_before_delete: archiveBeforeDelete,
        updated_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error('データ保持ポリシーの保存に失敗しました');
  }

  return {
    id: data.id,
    officeId: data.office_id,
    resourceType: data.resource_type,
    retentionDays: data.retention_days,
    autoDelete: data.auto_delete,
    archiveBeforeDelete: data.archive_before_delete,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

