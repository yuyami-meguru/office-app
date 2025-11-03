import { supabase } from './supabase';
import { getCurrentOfficeId } from './userManagerDB';

export type Member = {
  id: number;
  officeId: string;
  name: string;
  role: string;
  departments: string[];
  group?: string | null;
  username?: string;
  userRole?: 'admin' | 'staff';
  requirePasswordChange?: boolean;
};

// 全メンバーを取得
export async function getMembers(): Promise<Member[]> {
  const officeId = getCurrentOfficeId();
  if (!officeId) return [];
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('office_id', officeId)
    .order('name', { ascending: true });

  if (error) {
    console.error('メンバー取得エラー:', error);
    return [];
  }

  return (data || []).map((m: any) => ({
    id: m.id,
    officeId: m.office_id,
    name: m.name,
    role: m.role,
    departments: m.departments || [],
    group: m.group ?? null,
  }));
}

// メンバーを追加
export async function addMember(member: Omit<Member, 'id' | 'officeId'>): Promise<Member> {
  const officeId = getCurrentOfficeId();
  if (!officeId) throw new Error('事務所が選択されていません');
  const { data, error } = await supabase
    .from('members')
    .insert([
      {
        office_id: officeId,
        name: member.name,
        role: member.role,
        departments: member.departments,
        group: member.group ?? null,
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error('メンバーの追加に失敗しました');
  }

  return {
    id: data.id,
    officeId: data.office_id,
    name: data.name,
    role: data.role,
    departments: data.departments || [],
    group: data.group ?? null,
  };
}

// メンバーを削除
export async function deleteMember(id: number): Promise<boolean> {
  const { error } = await supabase
    .from('members')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error('メンバーの削除に失敗しました');
  }

  return true;
}

// メンバーを更新
export async function updateMember(id: number, updates: Partial<Omit<Member, 'id' | 'officeId'>>): Promise<Member> {
  const { data, error } = await supabase
    .from('members')
    .update({
      name: updates.name,
      role: updates.role,
      departments: updates.departments,
      group: updates.group ?? null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    throw new Error('メンバーの更新に失敗しました');
  }

  return {
    id: data.id,
    officeId: data.office_id,
    name: data.name,
    role: data.role,
    departments: data.departments || [],
    group: data.group ?? null,
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

