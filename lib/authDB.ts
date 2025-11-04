import { supabase } from './supabase';

// グローバルユーザー（アカウント作成時）
export type GlobalUser = {
  id: number;
  username: string;
  password: string;
  name: string;
  createdAt: string;
};

// 事務所メンバーシップ
export type OfficeMembership = {
  id: number;
  userId: number;
  officeId: string;
  displayName: string;
  role: string;
  userRole: 'admin' | 'staff';
  departments: string[];
  group?: string | null;
  avatarUrl?: string | null;
  status: 'approved' | 'pending';
  requirePasswordChange: boolean;
  createdAt: string;
};

// 事務所情報
export type Office = {
  id: string;
  name: string;
  code: string;
  createdBy: number;
  createdAt: string;
};

// 参加リクエスト
export type JoinRequest = {
  id: number;
  userId: number;
  officeId: string;
  displayName: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
};

const CURRENT_USER_KEY = 'office_app_global_user';
const CURRENT_OFFICE_KEY = 'office_app_current_office';

// グローバルユーザーを保存
export function setCurrentGlobalUser(user: GlobalUser) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    localStorage.setItem('isAuthenticated', 'true');
  } catch {}
}

// グローバルユーザーを取得
export function getCurrentGlobalUser(): GlobalUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const json = localStorage.getItem(CURRENT_USER_KEY);
    if (!json) return null;
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// 現在の事務所を保存
export function setCurrentOffice(office: Office) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CURRENT_OFFICE_KEY, JSON.stringify(office));
  } catch {}
}

// 現在の事務所IDを取得
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

// ログアウト
export function logout() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.removeItem(CURRENT_OFFICE_KEY);
    localStorage.removeItem('isAuthenticated');
  } catch {}
}

// アカウント作成
export async function createAccount(username: string, password: string, name: string): Promise<GlobalUser> {
  // ユーザー名の重複チェック
  const { data: existing } = await supabase
    .from('global_users')
    .select('id')
    .eq('username', username)
    .maybeSingle();

  if (existing) {
    throw new Error('このユーザー名は既に使用されています');
  }

  if (password.length < 6) {
    throw new Error('パスワードは6文字以上にしてください');
  }

  if (!name || name.trim() === '') {
    throw new Error('名前を入力してください');
  }

  const { data, error } = await supabase
    .from('global_users')
    .insert([{ username, password, name: name.trim() }])
    .select()
    .single();

  if (error) {
    console.error('アカウント作成エラー:', error);
    // nameカラムが存在しない場合のエラーメッセージ
    if (error.message.includes('column') && error.message.includes('name')) {
      throw new Error('データベースにnameカラムが存在しません。Supabaseでsupabase-add-name-column.sqlを実行してください。');
    }
    throw new Error(`アカウントの作成に失敗しました: ${error.message}`);
  }

  if (!data) {
    throw new Error('アカウントの作成に失敗しました（データが返されませんでした）');
  }

  return {
    id: data.id,
    username: data.username,
    password: data.password,
    name: data.name || data.username, // nameカラムがない場合はusernameを使用
    createdAt: data.created_at,
  };
}

// ログイン（グローバルユーザー認証）
export async function login(username: string, password: string): Promise<GlobalUser | null> {
  const { data, error } = await supabase
    .from('global_users')
    .select('*')
    .eq('username', username)
    .eq('password', password)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    username: data.username,
    password: data.password,
    name: data.name || data.username || '', // nameカラムがない場合はusernameを使用
    createdAt: data.created_at,
  };
}

// ユーザーの所属事務所一覧を取得
export async function getUserMemberships(userId: number): Promise<OfficeMembership[]> {
  const { data, error } = await supabase
    .from('office_memberships')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('メンバーシップ取得エラー:', error);
    return [];
  }

  return (data || []).map((m: any) => ({
    id: m.id,
    userId: m.user_id,
    officeId: m.office_id,
    displayName: m.display_name,
    role: m.role,
    userRole: m.user_role as 'admin' | 'staff',
    departments: m.departments || [],
    group: m.group ?? null,
    avatarUrl: m.avatar_url ?? null,
    status: m.status as 'approved' | 'pending',
    requirePasswordChange: m.require_password_change,
    createdAt: m.created_at,
  }));
}

// 事務所情報を取得
export async function getOffice(officeId: string): Promise<Office | null> {
  const { data, error } = await supabase
    .from('offices')
    .select('*')
    .eq('id', officeId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    code: data.code,
    createdBy: data.created_by,
    createdAt: data.created_at,
  };
}

// 参加リクエストを作成
export async function createJoinRequest(
  userId: number,
  officeCode: string,
  displayName: string
): Promise<JoinRequest> {
  // 事務所を検索
  const { data: office, error: officeErr } = await supabase
    .from('offices')
    .select('*')
    .eq('code', officeCode)
    .single();

  if (officeErr || !office) {
    throw new Error('事務所コードが見つかりません');
  }

  // 既に参加済みかチェック
  const { data: existing } = await supabase
    .from('office_memberships')
    .select('id')
    .eq('user_id', userId)
    .eq('office_id', office.id)
    .maybeSingle();

  if (existing) {
    throw new Error('既にこの事務所に参加しています');
  }

  // 既存のリクエストをチェック
  const { data: existingRequest } = await supabase
    .from('join_requests')
    .select('id, status')
    .eq('user_id', userId)
    .eq('office_id', office.id)
    .maybeSingle();

  if (existingRequest) {
    if (existingRequest.status === 'pending') {
      throw new Error('既に参加リクエストを送信しています');
    }
    if (existingRequest.status === 'approved') {
      throw new Error('既に承認済みです');
    }
  }

  // リクエストを作成
  const { data, error } = await supabase
    .from('join_requests')
    .insert([
      {
        user_id: userId,
        office_id: office.id,
        display_name: displayName,
        status: 'pending',
      },
    ])
    .select()
    .single();

  if (error || !data) {
    throw new Error('参加リクエストの送信に失敗しました');
  }

  return {
    id: data.id,
    userId: data.user_id,
    officeId: data.office_id,
    displayName: data.display_name,
    requestedAt: data.requested_at,
    status: data.status as 'pending' | 'approved' | 'rejected',
  };
}

// 新規事務所を作成
export async function createOffice(
  userId: number,
  name: string,
  code: string
): Promise<Office> {
  // コードの重複チェック
  const { data: existing } = await supabase
    .from('offices')
    .select('id')
    .eq('code', code)
    .maybeSingle();

  if (existing) {
    throw new Error('この事務所コードは既に使用されています');
  }

  const officeId = `office-${Date.now()}`;

  const { data, error } = await supabase
    .from('offices')
    .insert([
      {
        id: officeId,
        name,
        code: code.toUpperCase(),
        created_by: userId,
      },
    ])
    .select()
    .single();

  if (error || !data) {
    throw new Error('事務所の作成に失敗しました');
  }

  // 作成者を自動的に管理者として追加
  await supabase.from('office_memberships').insert([
    {
      user_id: userId,
      office_id: officeId,
      display_name: name + '管理者',
      role: 'マネージャー',
      user_role: 'admin',
      departments: ['人事'],
      group: null,
      avatar_url: null,
      status: 'approved',
      require_password_change: false,
    },
  ]);

  return {
    id: data.id,
    name: data.name,
    code: data.code,
    createdBy: data.created_by,
    createdAt: data.created_at,
  };
}

// ユーザーの参加リクエスト一覧を取得
export async function getUserJoinRequests(userId: number): Promise<JoinRequest[]> {
  const { data, error } = await supabase
    .from('join_requests')
    .select('*')
    .eq('user_id', userId)
    .order('requested_at', { ascending: false });

  if (error) {
    return [];
  }

  return (data || []).map((r: any) => ({
    id: r.id,
    userId: r.user_id,
    officeId: r.office_id,
    displayName: r.display_name,
    requestedAt: r.requested_at,
    status: r.status as 'pending' | 'approved' | 'rejected',
  }));
}

// 事務所の参加リクエスト一覧を取得（管理者用）
export async function getOfficeJoinRequests(officeId: string): Promise<(JoinRequest & { username: string })[]> {
  const { data, error } = await supabase
    .from('join_requests')
    .select(`
      *,
      global_users!join_requests_user_id_fkey(username)
    `)
    .eq('office_id', officeId)
    .eq('status', 'pending')
    .order('requested_at', { ascending: false });

  if (error) {
    return [];
  }

  return (data || []).map((r: any) => ({
    id: r.id,
    userId: r.user_id,
    officeId: r.office_id,
    displayName: r.display_name,
    requestedAt: r.requested_at,
    status: r.status as 'pending' | 'approved' | 'rejected',
    username: r.global_users?.username || '',
  }));
}

// 参加リクエストを承認
export async function approveJoinRequest(
  requestId: number,
  role: string = 'メンバー',
  userRole: 'admin' | 'staff' = 'staff',
  departments: string[] = [],
  group: string | null = null
): Promise<void> {
  // リクエストを取得
  const { data: request, error: reqErr } = await supabase
    .from('join_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (reqErr || !request) {
    throw new Error('リクエストが見つかりません');
  }

  // メンバーシップを作成
  const { error: memberErr } = await supabase
    .from('office_memberships')
    .insert([
      {
        user_id: request.user_id,
        office_id: request.office_id,
        display_name: request.display_name,
        role,
        user_role: userRole,
        departments,
        group,
        avatar_url: null,
        status: 'approved',
        require_password_change: false,
      },
    ]);

  if (memberErr) {
    throw new Error('メンバーシップの作成に失敗しました');
  }

  // リクエストのステータスを更新
  const { error: updateErr } = await supabase
    .from('join_requests')
    .update({ status: 'approved' })
    .eq('id', requestId);

  if (updateErr) {
    throw new Error('リクエストの更新に失敗しました');
  }
}

// 参加リクエストを拒否
export async function rejectJoinRequest(requestId: number): Promise<void> {
  const { error } = await supabase
    .from('join_requests')
    .update({ status: 'rejected' })
    .eq('id', requestId);

  if (error) {
    throw new Error('リクエストの拒否に失敗しました');
  }
}

