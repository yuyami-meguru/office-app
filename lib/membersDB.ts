import { supabase } from './supabase';

export type Member = {
  id: number;
  name: string;
  role: string;
  departments: string[];
  group?: string;
};

// 全メンバーを取得
export async function getMembers(): Promise<Member[]> {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('メンバー取得エラー:', error);
    return [];
  }

  return data || [];
}

// メンバーを追加
export async function addMember(member: Omit<Member, 'id'>): Promise<Member> {
  const { data, error } = await supabase
    .from('members')
    .insert([{
      name: member.name,
      role: member.role,
      departments: member.departments,
      group: member.group || null,
    }])
    .select()
    .single();

  if (error) {
    throw new Error('メンバーの追加に失敗しました');
  }

  return data;
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
export async function updateMember(id: number, updates: Partial<Omit<Member, 'id'>>): Promise<Member> {
  const { data, error } = await supabase
    .from('members')
    .update({
      name: updates.name,
      role: updates.role,
      departments: updates.departments,
      group: updates.group || null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    throw new Error('メンバーの更新に失敗しました');
  }

  return data;
}

// 部署一覧を取得
export async function getDepartments(): Promise<string[]> {
  const { data, error } = await supabase
    .from('departments')
    .select('name')
    .order('id', { ascending: true });

  if (error) {
    console.error('部署取得エラー:', error);
    return [];
  }

  return (data || []).map(d => d.name);
}

// 部署を追加
export async function addDepartment(name: string): Promise<boolean> {
  const { error } = await supabase
    .from('departments')
    .insert([{ name }]);

  if (error) {
    throw new Error('部署の追加に失敗しました');
  }

  return true;
}

// 部署を削除
export async function deleteDepartment(name: string): Promise<boolean> {
  const { error } = await supabase
    .from('departments')
    .delete()
    .eq('name', name);

  if (error) {
    throw new Error('部署の削除に失敗しました');
  }

  return true;
}

