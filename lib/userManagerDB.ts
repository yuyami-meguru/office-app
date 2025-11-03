import { supabase } from './supabase';

// ユーザー管理（members統合）
export type UserRole = 'admin' | 'staff';

export type User = {
  id: number;
  officeId: string;
  username: string;
  password: string;
  name: string;
  role: string; // メンバーの役割（例: リーダー、メンバー）
  userRole: UserRole; // ログイン権限の役割（admin/staff）
  departments: string[];
  group?: string | null;
  requirePasswordChange: boolean;
  createdAt: string;
};

type Office = {
  id: string;
  name: string;
  code: string;
};

const CURRENT_USER_KEY = 'office_app_current_user';
const CURRENT_OFFICE_KEY = 'office_app_current_office';

export function setCurrentUser(user: User) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    localStorage.setItem('isAuthenticated', 'true');
  } catch {}
}

export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const json = localStorage.getItem(CURRENT_USER_KEY);
    if (!json) return null;
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function setCurrentOffice(office: Office) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CURRENT_OFFICE_KEY, JSON.stringify(office));
  } catch {}
}

export function getCurrentOfficeId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const json = localStorage.getItem(CURRENT_OFFICE_KEY);
    if (!json) return null;
    const office = JSON.parse(json) as Office;
    return office.id;
  } catch {
    return null;
  }
}

export function logout() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.removeItem(CURRENT_OFFICE_KEY);
    localStorage.removeItem('isAuthenticated');
  } catch {}
}

export async function authenticateUser(
  officeCode: string,
  username: string,
  password: string
): Promise<User | null> {
  // 事務所コード → office取得
  const { data: office, error: officeErr } = await supabase
    .from('offices')
    .select('*')
    .eq('code', officeCode)
    .single();

  if (officeErr || !office) {
    return null;
  }

  // membersから認証
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('office_id', office.id)
    .eq('username', username)
    .eq('password', password)
    .single();

  if (error || !data) return null;

  const user: User = {
    id: data.id,
    officeId: data.office_id,
    username: data.username,
    password: data.password,
    name: data.name,
    role: data.role,
    userRole: data.user_role as UserRole,
    departments: data.departments || [],
    group: data.group ?? null,
    requirePasswordChange: data.require_password_change,
    createdAt: data.created_at,
  };

  setCurrentOffice({ id: office.id, name: office.name, code: office.code });
  setCurrentUser(user);
  return user;
}

export async function getUsers(): Promise<User[]> {
  const officeId = getCurrentOfficeId();
  if (!officeId) return [];
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('office_id', officeId)
    .order('created_at', { ascending: true });

  if (error) return [];
  return (data || []).map((m: any) => ({
    id: m.id,
    officeId: m.office_id,
    username: m.username,
    password: m.password,
    name: m.name,
    role: m.role,
    userRole: m.user_role as UserRole,
    departments: m.departments || [],
    group: m.group ?? null,
    requirePasswordChange: m.require_password_change,
    createdAt: m.created_at,
  }));
}

export async function addUser(
  userData: {
    username: string;
    password: string;
    name: string;
    role: string;
    userRole: UserRole;
    departments: string[];
    group?: string | null;
  }
): Promise<User> {
  const officeId = getCurrentOfficeId();
  if (!officeId) throw new Error('事務所が選択されていません');

  // 同一事務所内のユーザー名重複チェック
  const { data: dup } = await supabase
    .from('members')
    .select('id')
    .eq('office_id', officeId)
    .eq('username', userData.username)
    .maybeSingle();
  if (dup) throw new Error('このユーザー名は既に使用されています');

  const { data, error } = await supabase
    .from('members')
    .insert([
      {
        office_id: officeId,
        name: userData.name,
        role: userData.role,
        departments: userData.departments,
        group: userData.group ?? null,
        username: userData.username,
        password: userData.password,
        user_role: userData.userRole,
        require_password_change: true,
      },
    ])
    .select()
    .single();

  if (error || !data) throw new Error('ユーザーの追加に失敗しました');

  return {
    id: data.id,
    officeId: data.office_id,
    username: data.username,
    password: data.password,
    name: data.name,
    role: data.role,
    userRole: data.user_role as UserRole,
    departments: data.departments || [],
    group: data.group ?? null,
    requirePasswordChange: data.require_password_change,
    createdAt: data.created_at,
  };
}

export async function deleteUser(userId: number): Promise<boolean> {
  const currentUser = getCurrentUser();
  if (currentUser?.id === userId) throw new Error('自分自身を削除することはできません');

  // 最低1人の管理者は残す
  const users = await getUsers();
  const remainingAdmins = users.filter(u => u.userRole === 'admin' && u.id !== userId);
  if (remainingAdmins.length === 0) throw new Error('最低1人の管理者が必要です');

  const { error } = await supabase.from('members').delete().eq('id', userId);
  if (error) throw new Error('ユーザーの削除に失敗しました');
  return true;
}

export async function updateUser(
  userId: number,
  updates: Partial<{
    username: string;
    password: string;
    name: string;
    role: string;
    userRole: UserRole;
    departments: string[];
    group?: string | null;
    requirePasswordChange: boolean;
  }>
): Promise<User> {
  const dbUpdates: any = {};
  if (updates.username !== undefined) dbUpdates.username = updates.username;
  if (updates.password !== undefined) dbUpdates.password = updates.password;
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.role !== undefined) dbUpdates.role = updates.role;
  if (updates.userRole !== undefined) dbUpdates.user_role = updates.userRole;
  if (updates.departments !== undefined) dbUpdates.departments = updates.departments;
  if (updates.group !== undefined) dbUpdates.group = updates.group;
  if (updates.requirePasswordChange !== undefined)
    dbUpdates.require_password_change = updates.requirePasswordChange;

  const { data, error } = await supabase
    .from('members')
    .update(dbUpdates)
    .eq('id', userId)
    .select()
    .single();

  if (error || !data) throw new Error('ユーザーの更新に失敗しました');

  const updated: User = {
    id: data.id,
    officeId: data.office_id,
    username: data.username,
    password: data.password,
    name: data.name,
    role: data.role,
    userRole: data.user_role as UserRole,
    departments: data.departments || [],
    group: data.group ?? null,
    requirePasswordChange: data.require_password_change,
    createdAt: data.created_at,
  };

  const currentUser = getCurrentUser();
  if (currentUser?.id === userId) setCurrentUser(updated);
  return updated;
}

export async function changePassword(
  userId: number,
  currentPassword: string,
  newPassword: string
): Promise<boolean> {
  const users = await getUsers();
  const user = users.find(u => u.id === userId);
  if (!user) throw new Error('ユーザーが見つかりません');
  if (user.password !== currentPassword) throw new Error('現在のパスワードが正しくありません');
  if (newPassword.length < 6) throw new Error('パスワードは6文字以上にしてください');
  await updateUser(userId, { password: newPassword, requirePasswordChange: false });
  return true;
}

export async function resetPassword(userId: number, newPassword: string): Promise<boolean> {
  const me = getCurrentUser();
  if (me?.userRole !== 'admin') throw new Error('管理者のみがパスワードを再発行できます');
  if (newPassword.length < 6) throw new Error('パスワードは6文字以上にしてください');
  await updateUser(userId, { password: newPassword, requirePasswordChange: true });
  return true;
}

export function isAdmin(): boolean {
  const user = getCurrentUser();
  return user?.userRole === 'admin';
}

export function initializeUsers() {
  // Supabase運用では初期化処理は不要
}

