import { supabase } from './supabase';
import { getCurrentOfficeId, getCurrentGlobalUser } from './authDB';

export type ProjectStatus = '計画中' | '進行中' | '保留' | '完了' | 'キャンセル';
export type ProjectMemberRole = 'リーダー' | 'メンバー' | 'オブザーバー';

export type Project = {
  id: number;
  officeId: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  startDate: string | null;
  endDate: string | null;
  createdBy: number;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectMember = {
  id: number;
  projectId: number;
  userId: number;
  userName: string;
  role: ProjectMemberRole;
  createdAt: string;
};

// プロジェクト一覧を取得
export async function getProjects(): Promise<Project[]> {
  const officeId = getCurrentOfficeId();
  if (!officeId) return [];

  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      global_users:created_by (id, name, username)
    `)
    .eq('office_id', officeId)
    .order('created_at', { ascending: false });

  if (error) {
    // テーブルが存在しない場合は空配列を返す（エラーではない）
    if (error.code === '42P01') return [];
    // エラーオブジェクトが空の場合はスキップ
    const errorKeys = Object.keys(error || {});
    if (errorKeys.length === 0) return [];
    console.error('プロジェクト取得エラー:', error);
    return [];
  }

  return (data || []).map(project => ({
    id: project.id,
    officeId: project.office_id,
    name: project.name,
    description: project.description,
    status: project.status as ProjectStatus,
    startDate: project.start_date,
    endDate: project.end_date,
    createdBy: project.created_by,
    createdByName: project.global_users?.name || project.global_users?.username || '不明',
    createdAt: project.created_at,
    updatedAt: project.updated_at,
  }));
}

// プロジェクトを作成
export async function createProject(
  name: string,
  description: string,
  status: ProjectStatus = '進行中',
  startDate?: string,
  endDate?: string
): Promise<Project> {
  const officeId = getCurrentOfficeId();
  const user = getCurrentGlobalUser();
  if (!officeId || !user) throw new Error('ログインが必要です');

  const { data, error } = await supabase
    .from('projects')
    .insert([
      {
        office_id: officeId,
        name,
        description: description || null,
        status,
        start_date: startDate || null,
        end_date: endDate || null,
        created_by: user.id,
      },
    ])
    .select(`
      *,
      global_users:created_by (id, name, username)
    `)
    .single();

  if (error) {
    throw new Error('プロジェクトの作成に失敗しました');
  }

  return {
    id: data.id,
    officeId: data.office_id,
    name: data.name,
    description: data.description,
    status: data.status as ProjectStatus,
    startDate: data.start_date,
    endDate: data.end_date,
    createdBy: data.created_by,
    createdByName: data.global_users?.name || data.global_users?.username || '不明',
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

// プロジェクトを更新
export async function updateProject(
  id: number,
  updates: {
    name?: string;
    description?: string;
    status?: ProjectStatus;
    startDate?: string | null;
    endDate?: string | null;
  }
): Promise<Project> {
  const updateData: any = {
    updated_at: new Date().toISOString(),
  };
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.status !== undefined) updateData.status = updates.status;
  if (updates.startDate !== undefined) updateData.start_date = updates.startDate;
  if (updates.endDate !== undefined) updateData.end_date = updates.endDate;

  const { data, error } = await supabase
    .from('projects')
    .update(updateData)
    .eq('id', id)
    .select(`
      *,
      global_users:created_by (id, name, username)
    `)
    .single();

  if (error) {
    throw new Error('プロジェクトの更新に失敗しました');
  }

  return {
    id: data.id,
    officeId: data.office_id,
    name: data.name,
    description: data.description,
    status: data.status as ProjectStatus,
    startDate: data.start_date,
    endDate: data.end_date,
    createdBy: data.created_by,
    createdByName: data.global_users?.name || data.global_users?.username || '不明',
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

// プロジェクトを削除
export async function deleteProject(id: number): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error('プロジェクトの削除に失敗しました');
  }
}

// プロジェクトメンバー一覧を取得
export async function getProjectMembers(projectId: number): Promise<ProjectMember[]> {
  const { data, error } = await supabase
    .from('project_members')
    .select(`
      *,
      global_users:user_id (id, name, username)
    `)
    .eq('project_id', projectId);

  if (error) {
    console.error('プロジェクトメンバー取得エラー:', error);
    return [];
  }

  return (data || []).map(member => ({
    id: member.id,
    projectId: member.project_id,
    userId: member.user_id,
    userName: member.global_users?.name || member.global_users?.username || '不明',
    role: member.role as ProjectMemberRole,
    createdAt: member.created_at,
  }));
}

// プロジェクトメンバーを追加
export async function addProjectMember(
  projectId: number,
  userId: number,
  role: ProjectMemberRole = 'メンバー'
): Promise<ProjectMember> {
  const { data, error } = await supabase
    .from('project_members')
    .insert([
      {
        project_id: projectId,
        user_id: userId,
        role,
      },
    ])
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
    projectId: data.project_id,
    userId: data.user_id,
    userName: data.global_users?.name || data.global_users?.username || '不明',
    role: data.role as ProjectMemberRole,
    createdAt: data.created_at,
  };
}

// プロジェクトメンバーを削除
export async function removeProjectMember(id: number): Promise<void> {
  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error('メンバーの削除に失敗しました');
  }
}

// タスクをプロジェクトに紐付け
export async function linkTaskToProject(projectId: number, taskId: number): Promise<void> {
  const { error } = await supabase
    .from('project_tasks')
    .insert([{ project_id: projectId, task_id: taskId }]);

  if (error) {
    throw new Error('タスクの紐付けに失敗しました');
  }
}

// プロジェクトのタスク一覧を取得
export async function getProjectTasks(projectId: number): Promise<number[]> {
  const { data, error } = await supabase
    .from('project_tasks')
    .select('task_id')
    .eq('project_id', projectId);

  if (error) {
    console.error('プロジェクトタスク取得エラー:', error);
    return [];
  }

  return (data || []).map(item => item.task_id);
}

