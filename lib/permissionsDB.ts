import { supabase } from './supabase';
import { getCurrentOfficeId, getCurrentGlobalUser } from './authDB';
import { getMyMembership } from './membersDB';

export type ResourceType = 'member' | 'task' | 'schedule' | 'announcement' | 'file' | 'project' | 'chat' | 'workflow';
export type Action = 'view' | 'create' | 'edit' | 'delete' | 'approve';

export type PermissionDefinition = {
  id: number;
  officeId: string;
  resourceType: ResourceType;
  action: Action;
  description: string | null;
  createdAt: string;
};

export type PermissionAssignment = {
  id: number;
  officeId: string;
  permissionId: number;
  targetType: 'role' | 'department' | 'user';
  targetValue: string;
  createdAt: string;
};

// 権限チェック
export async function hasPermission(resourceType: ResourceType, action: Action): Promise<boolean> {
  const officeId = getCurrentOfficeId();
  const user = getCurrentGlobalUser();
  if (!officeId || !user) return false;

  // 管理者は常に全権限を持つ
  const membership = await getMyMembership();
  if (membership && membership.userRole === 'admin') {
    return true;
  }

  // 権限定義を取得
  const { data: permission } = await supabase
    .from('permission_definitions')
    .select('id')
    .eq('office_id', officeId)
    .eq('resource_type', resourceType)
    .eq('action', action)
    .single();

  if (!permission) return false;

  // 権限割り当てをチェック
  const { data: assignments } = await supabase
    .from('permission_assignments')
    .select('*')
    .eq('permission_id', permission.id);

  if (!assignments || assignments.length === 0) return false;

  // ロールチェック
  if (membership) {
    const roleMatch = assignments.some(
      a => a.target_type === 'role' && a.target_value === membership.userRole
    );
    if (roleMatch) return true;

    // 部署チェック
    const deptMatch = assignments.some(
      a => a.target_type === 'department' && membership.departments.includes(a.target_value)
    );
    if (deptMatch) return true;
  }

  // ユーザーチェック
  const userMatch = assignments.some(
    a => a.target_type === 'user' && a.target_value === user.id.toString()
  );
  if (userMatch) return true;

  return false;
}

// 権限定義一覧を取得（管理者用）
export async function getPermissionDefinitions(): Promise<PermissionDefinition[]> {
  const officeId = getCurrentOfficeId();
  if (!officeId) return [];

  const { data, error } = await supabase
    .from('permission_definitions')
    .select('*')
    .eq('office_id', officeId)
    .order('resource_type', { ascending: true })
    .order('action', { ascending: true });

  if (error) {
    console.error('権限定義取得エラー:', error);
    return [];
  }

  return (data || []).map(perm => ({
    id: perm.id,
    officeId: perm.office_id,
    resourceType: perm.resource_type as ResourceType,
    action: perm.action as Action,
    description: perm.description,
    createdAt: perm.created_at,
  }));
}

// 権限割り当て一覧を取得（管理者用）
export async function getPermissionAssignments(permissionId: number): Promise<PermissionAssignment[]> {
  const { data, error } = await supabase
    .from('permission_assignments')
    .select('*')
    .eq('permission_id', permissionId);

  if (error) {
    console.error('権限割り当て取得エラー:', error);
    return [];
  }

  return (data || []).map(assign => ({
    id: assign.id,
    officeId: assign.office_id,
    permissionId: assign.permission_id,
    targetType: assign.target_type as 'role' | 'department' | 'user',
    targetValue: assign.target_value,
    createdAt: assign.created_at,
  }));
}

// 権限割り当てを追加（管理者用）
export async function addPermissionAssignment(
  permissionId: number,
  targetType: 'role' | 'department' | 'user',
  targetValue: string
): Promise<PermissionAssignment> {
  const officeId = getCurrentOfficeId();
  if (!officeId) throw new Error('事務所が選択されていません');

  const { data, error } = await supabase
    .from('permission_assignments')
    .insert([
      {
        office_id: officeId,
        permission_id: permissionId,
        target_type: targetType,
        target_value: targetValue,
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error('権限割り当ての追加に失敗しました');
  }

  return {
    id: data.id,
    officeId: data.office_id,
    permissionId: data.permission_id,
    targetType: data.target_type as 'role' | 'department' | 'user',
    targetValue: data.target_value,
    createdAt: data.created_at,
  };
}

// 権限割り当てを削除（管理者用）
export async function removePermissionAssignment(id: number): Promise<void> {
  const { error } = await supabase
    .from('permission_assignments')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error('権限割り当ての削除に失敗しました');
  }
}

