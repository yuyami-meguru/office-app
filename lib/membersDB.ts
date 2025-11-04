import { supabase } from './supabase';
import { getCurrentOfficeId, getCurrentGlobalUser } from './authDB';

export type Member = {
  id: number;
  userId: number;
  officeId: string;
  displayName: string;
  role: string;
  departments: string[];
  group?: string | null;
  avatarUrl?: string | null;
  userRole: 'admin' | 'staff';
  username?: string; // グローバルユーザー名（オプション）
};

// 全メンバーを取得（承認済みのみ）
export async function getMembers(): Promise<Member[]> {
  const officeId = getCurrentOfficeId();
  if (!officeId) return [];
  
  const { data, error } = await supabase
    .from('office_memberships')
    .select(`
      *,
      global_users!office_memberships_user_id_fkey(username)
    `)
    .eq('office_id', officeId)
    .eq('status', 'approved')
    .order('display_name', { ascending: true });

  if (error) {
    console.error('メンバー取得エラー:', error);
    return [];
  }

  return (data || []).map((m: any) => ({
    id: m.id,
    userId: m.user_id,
    officeId: m.office_id,
    displayName: m.display_name,
    role: m.role,
    departments: m.departments || [],
    group: m.group ?? null,
    avatarUrl: m.avatar_url ?? null,
    userRole: m.user_role as 'admin' | 'staff',
    username: m.global_users?.username,
  }));
}

// 自分のメンバーシップを取得
export async function getMyMembership(): Promise<Member | null> {
  const user = getCurrentGlobalUser();
  const officeId = getCurrentOfficeId();
  
  if (!user || !officeId) return null;

  const { data, error } = await supabase
    .from('office_memberships')
    .select(`
      *,
      global_users!office_memberships_user_id_fkey(username)
    `)
    .eq('user_id', user.id)
    .eq('office_id', officeId)
    .eq('status', 'approved')
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    userId: data.user_id,
    officeId: data.office_id,
    displayName: data.display_name,
    role: data.role,
    departments: data.departments || [],
    group: data.group ?? null,
    avatarUrl: data.avatar_url ?? null,
    userRole: data.user_role as 'admin' | 'staff',
    username: data.global_users?.username,
  };
}

// メンバーを追加（管理者のみ、グローバルユーザーを指定）
export async function addMember(member: {
  userId: number;
  displayName: string;
  role: string;
  departments: string[];
  group?: string | null;
  userRole: 'admin' | 'staff';
  avatarUrl?: string | null;
}): Promise<Member> {
  const officeId = getCurrentOfficeId();
  if (!officeId) throw new Error('事務所が選択されていません');
  
  const { data, error } = await supabase
    .from('office_memberships')
    .insert([
      {
        office_id: officeId,
        user_id: member.userId,
        display_name: member.displayName,
        role: member.role,
        departments: member.departments,
        group: member.group ?? null,
        user_role: member.userRole,
        avatar_url: member.avatarUrl ?? null,
        status: 'approved',
        require_password_change: false,
      },
    ])
    .select(`
      *,
      global_users!office_memberships_user_id_fkey(username)
    `)
    .single();

  if (error) {
    throw new Error('メンバーの追加に失敗しました');
  }

  return {
    id: data.id,
    userId: data.user_id,
    officeId: data.office_id,
    displayName: data.display_name,
    role: data.role,
    departments: data.departments || [],
    group: data.group ?? null,
    avatarUrl: data.avatar_url ?? null,
    userRole: data.user_role as 'admin' | 'staff',
    username: data.global_users?.username,
  };
}

// メンバーを削除（管理者のみ）
export async function deleteMember(id: number): Promise<boolean> {
  const { error } = await supabase
    .from('office_memberships')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error('メンバーの削除に失敗しました');
  }

  return true;
}

// メンバーを更新
export async function updateMember(
  id: number,
  updates: Partial<{
    displayName: string;
    role: string;
    departments: string[];
    group: string | null;
    avatarUrl: string | null;
    userRole: 'admin' | 'staff';
  }>
): Promise<Member> {
  const dbUpdates: any = {};
  if (updates.displayName !== undefined) dbUpdates.display_name = updates.displayName;
  if (updates.role !== undefined) dbUpdates.role = updates.role;
  if (updates.departments !== undefined) dbUpdates.departments = updates.departments;
  if (updates.group !== undefined) dbUpdates.group = updates.group;
  if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl;
  if (updates.userRole !== undefined) dbUpdates.user_role = updates.userRole;

  const { data, error } = await supabase
    .from('office_memberships')
    .update(dbUpdates)
    .eq('id', id)
    .select(`
      *,
      global_users!office_memberships_user_id_fkey(username)
    `)
    .single();

  if (error || !data) {
    throw new Error('メンバーの更新に失敗しました');
  }

  return {
    id: data.id,
    userId: data.user_id,
    officeId: data.office_id,
    displayName: data.display_name,
    role: data.role,
    departments: data.departments || [],
    group: data.group ?? null,
    avatarUrl: data.avatar_url ?? null,
    userRole: data.user_role as 'admin' | 'staff',
    username: data.global_users?.username,
  };
}

// 部署一覧を取得
export async function getDepartments(): Promise<string[]> {
  const officeId = getCurrentOfficeId();
  if (!officeId) return [];
  const { data, error } = await supabase
    .from('departments')
    .select('name')
    .eq('office_id', officeId)
    .order('id', { ascending: true });

  if (error) {
    console.error('部署取得エラー:', error);
    return [];
  }

  return (data || []).map(d => d.name);
}

// 部署を追加
export async function addDepartment(name: string): Promise<boolean> {
  const officeId = getCurrentOfficeId();
  if (!officeId) throw new Error('事務所が選択されていません');
  const { error } = await supabase
    .from('departments')
    .insert([{ office_id: officeId, name }]);

  if (error) {
    throw new Error('部署の追加に失敗しました');
  }

  return true;
}

// 部署を削除
export async function deleteDepartment(name: string): Promise<boolean> {
  const officeId = getCurrentOfficeId();
  if (!officeId) throw new Error('事務所が選択されていません');
  const { error } = await supabase
    .from('departments')
    .delete()
    .eq('office_id', officeId)
    .eq('name', name);

  if (error) {
    throw new Error('部署の削除に失敗しました');
  }

  return true;
}
