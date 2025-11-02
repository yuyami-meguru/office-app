// ユーザー管理の型定義
export type UserRole = 'admin' | 'staff';

export type User = {
  id: string;
  username: string;
  password: string;
  name: string;
  role: UserRole;
  email?: string;
  requirePasswordChange: boolean; // パスワード変更が必要かどうか
  createdAt: string;
};

// ローカルストレージのキー
const USERS_KEY = 'office_app_users';
const CURRENT_USER_KEY = 'office_app_current_user';

// デフォルトの管理者アカウント
const DEFAULT_ADMIN: User = {
  id: 'admin-001',
  username: 'admin',
  password: 'office2025',
  name: '管理者',
  role: 'admin',
  email: 'admin@office.com',
  requirePasswordChange: false, // デフォルト管理者は変更不要
  createdAt: new Date().toISOString(),
};

// 初期化：デフォルトの管理者アカウントを作成
export function initializeUsers() {
  if (typeof window === 'undefined') return;
  
  const users = getUsers();
  if (users.length === 0) {
    localStorage.setItem(USERS_KEY, JSON.stringify([DEFAULT_ADMIN]));
  }
}

// 全ユーザーを取得
export function getUsers(): User[] {
  if (typeof window === 'undefined') return [];
  
  const usersJson = localStorage.getItem(USERS_KEY);
  if (!usersJson) {
    return [DEFAULT_ADMIN];
  }
  return JSON.parse(usersJson);
}

// ユーザー名でユーザーを検索
export function findUserByUsername(username: string): User | undefined {
  const users = getUsers();
  return users.find(u => u.username === username);
}

// ログイン認証
export function authenticateUser(username: string, password: string): User | null {
  const user = findUserByUsername(username);
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
export function addUser(userData: Omit<User, 'id' | 'createdAt' | 'requirePasswordChange'>): User {
  const users = getUsers();
  
  // ユーザー名の重複チェック
  if (users.some(u => u.username === userData.username)) {
    throw new Error('このユーザー名は既に使用されています');
  }
  
  const newUser: User = {
    ...userData,
    id: `user-${Date.now()}`,
    requirePasswordChange: true, // 新規ユーザーは必ずパスワード変更が必要
    createdAt: new Date().toISOString(),
  };
  
  const updatedUsers = [...users, newUser];
  localStorage.setItem(USERS_KEY, JSON.stringify(updatedUsers));
  
  return newUser;
}

// ユーザーを削除（管理者のみ、自分自身は削除不可）
export function deleteUser(userId: string): boolean {
  const currentUser = getCurrentUser();
  
  // 自分自身は削除できない
  if (currentUser?.id === userId) {
    throw new Error('自分自身を削除することはできません');
  }
  
  const users = getUsers();
  const updatedUsers = users.filter(u => u.id !== userId);
  
  // 最低1人の管理者は残す
  const adminCount = updatedUsers.filter(u => u.role === 'admin').length;
  if (adminCount === 0) {
    throw new Error('最低1人の管理者が必要です');
  }
  
  localStorage.setItem(USERS_KEY, JSON.stringify(updatedUsers));
  return true;
}

// ユーザー情報を更新
export function updateUser(userId: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>): User {
  const users = getUsers();
  const userIndex = users.findIndex(u => u.id === userId);
  
  if (userIndex === -1) {
    throw new Error('ユーザーが見つかりません');
  }
  
  // ユーザー名の重複チェック（自分以外）
  if (updates.username) {
    const duplicate = users.find(u => u.username === updates.username && u.id !== userId);
    if (duplicate) {
      throw new Error('このユーザー名は既に使用されています');
    }
  }
  
  const updatedUser = { ...users[userIndex], ...updates };
  users[userIndex] = updatedUser;
  
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  
  // 自分自身を更新した場合は、現在のユーザー情報も更新
  const currentUser = getCurrentUser();
  if (currentUser?.id === userId) {
    setCurrentUser(updatedUser);
  }
  
  return updatedUser;
}

// パスワードを変更
export function changePassword(userId: string, currentPassword: string, newPassword: string): boolean {
  const users = getUsers();
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
  
  updateUser(userId, { password: newPassword, requirePasswordChange: false });
  return true;
}

// パスワードを再発行（管理者が実行）
export function resetPassword(userId: string, newPassword: string): boolean {
  if (!isAdmin()) {
    throw new Error('管理者のみがパスワードを再発行できます');
  }
  
  if (newPassword.length < 6) {
    throw new Error('パスワードは6文字以上にしてください');
  }
  
  updateUser(userId, { password: newPassword, requirePasswordChange: true });
  return true;
}

// 管理者権限をチェック
export function isAdmin(): boolean {
  const user = getCurrentUser();
  return user?.role === 'admin';
}

