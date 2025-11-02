import { supabase } from './supabase';

// ユーザー管理の型定義
export type UserRole = 'admin' | 'staff';

export type User = {
  id: string;
  username: string;
  password: string;
  name: string;
  role: UserRole;
  email?: string;
  requirePasswordChange: boolean;
  createdAt: string;
};

// ローカルストレージのキー（現在ログイン中のユーザー用）
const CURRENT_USER_KEY = 'office_app_current_user';

// 初期化は不要（Supabaseに既にデータがある）
export function initializeUsers() {
  // Supabase使用時は何もしない
}

// 全ユーザーを取得
export async function getUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('ユーザー取得エラー:', error);
    return [];
  }

  return (data || []).map(user => ({
    id: user.id,
    username: user.username,
    password: user.password,
    name: user.name,
    role: user.role as UserRole,
    email: user.email,
    requirePasswordChange: user.require_password_change,
    createdAt: user.created_at,
  }));
}

// ユーザー名でユーザーを検索
export async function findUserByUsername(username: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    username: data.username,
    password: data.password,
    name: data.name,
    role: data.role as UserRole,
    email: data.email,
    requirePasswordChange: data.require_password_change,
    createdAt: data.created_at,
  };
}

// ログイン認証
export async function authenticateUser(username: string, password: string): Promise<User | null> {
  const user = await findUserByUsername(username);
  if (user && user.password === password) {
    return user;
  }
  return null;
}

// 現在ログイン中のユーザーを保存
export function setCurrentUser(user: User) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  localStorage.setItem('isAuthenticated', 'true');
}

// 現在ログイン中のユーザーを取得
export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null;
  
  const userJson = localStorage.getItem(CURRENT_USER_KEY);
  if (!userJson) return null;
  return JSON.parse(userJson);
}

// ログアウト
export function logout() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CURRENT_USER_KEY);
  localStorage.removeItem('isAuthenticated');
}

// 新しいユーザーを追加（管理者のみ）
export async function addUser(userData: Omit<User, 'id' | 'createdAt' | 'requirePasswordChange'>): Promise<User> {
  // ユーザー名の重複チェック
  const existing = await findUserByUsername(userData.username);
  if (existing) {
    throw new Error('このユーザー名は既に使用されています');
  }

  const newUser = {
    id: `user-${Date.now()}`,
    username: userData.username,
    password: userData.password,
    name: userData.name,
    role: userData.role,
    email: userData.email,
    require_password_change: true,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('users')
    .insert([newUser])
    .select()
    .single();

  if (error) {
    throw new Error('ユーザーの追加に失敗しました');
  }

  return {
    id: data.id,
    username: data.username,
    password: data.password,
    name: data.name,
    role: data.role as UserRole,
    email: data.email,
    requirePasswordChange: data.require_password_change,
    createdAt: data.created_at,
  };
}

// ユーザーを削除（管理者のみ、自分自身は削除不可）
export async function deleteUser(userId: string): Promise<boolean> {
  const currentUser = getCurrentUser();
  
  if (currentUser?.id === userId) {
    throw new Error('自分自身を削除することはできません');
  }

  // 最低1人の管理者は残す
  const users = await getUsers();
  const remainingAdmins = users.filter(u => u.role === 'admin' && u.id !== userId);
  if (remainingAdmins.length === 0) {
    throw new Error('最低1人の管理者が必要です');
  }

  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', userId);

  if (error) {
    throw new Error('ユーザーの削除に失敗しました');
  }

  return true;
}

// ユーザー情報を更新
export async function updateUser(userId: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User> {
  // ユーザー名の重複チェック（自分以外）
  if (updates.username) {
    const duplicate = await findUserByUsername(updates.username);
    if (duplicate && duplicate.id !== userId) {
      throw new Error('このユーザー名は既に使用されています');
    }
  }

  const dbUpdates: any = {};
  if (updates.username) dbUpdates.username = updates.username;
  if (updates.password) dbUpdates.password = updates.password;
  if (updates.name) dbUpdates.name = updates.name;
  if (updates.role) dbUpdates.role = updates.role;
  if (updates.email !== undefined) dbUpdates.email = updates.email;
  if (updates.requirePasswordChange !== undefined) dbUpdates.require_password_change = updates.requirePasswordChange;

  const { data, error } = await supabase
    .from('users')
    .update(dbUpdates)
    .eq('id', userId)
    .select()
    .single();

  if (error || !data) {
    throw new Error('ユーザーの更新に失敗しました');
  }

  const updatedUser = {
    id: data.id,
    username: data.username,
    password: data.password,
    name: data.name,
    role: data.role as UserRole,
    email: data.email,
    requirePasswordChange: data.require_password_change,
    createdAt: data.created_at,
  };

  // 自分自身を更新した場合は、現在のユーザー情報も更新
  const currentUser = getCurrentUser();
  if (currentUser?.id === userId) {
    setCurrentUser(updatedUser);
  }

  return updatedUser;
}

// パスワードを変更
export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
  const users = await getUsers();
  const user = users.find(u => u.id === userId);

  if (!user) {
    throw new Error('ユーザーが見つかりません');
  }

  if (user.password !== currentPassword) {
    throw new Error('現在のパスワードが正しくありません');
  }

  if (newPassword.length < 6) {
    throw new Error('パスワードは6文字以上にしてください');
  }

  await updateUser(userId, { password: newPassword, requirePasswordChange: false });
  return true;
}

// パスワードを再発行（管理者が実行）
export async function resetPassword(userId: string, newPassword: string): Promise<boolean> {
  if (!isAdmin()) {
    throw new Error('管理者のみがパスワードを再発行できます');
  }

  if (newPassword.length < 6) {
    throw new Error('パスワードは6文字以上にしてください');
  }

  await updateUser(userId, { password: newPassword, requirePasswordChange: true });
  return true;
}

// 管理者権限をチェック
export function isAdmin(): boolean {
  const user = getCurrentUser();
  return user?.role === 'admin';
}

