import { supabase } from './supabase';
import { getCurrentOfficeId, getCurrentGlobalUser } from './authDB';
import * as crypto from 'crypto';
import * as OTPAuth from 'otpauth';

export type PasswordPolicy = {
  id: number;
  officeId: string;
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSymbols: boolean;
  maxAgeDays: number | null;
  preventReuseCount: number;
  createdAt: string;
  updatedAt: string;
};

export type TwoFactorAuth = {
  id: number;
  userId: number;
  secret: string;
  enabled: boolean;
  backupCodes: string[];
  createdAt: string;
  updatedAt: string;
};

// パスワードポリシーを取得
export async function getPasswordPolicy(): Promise<PasswordPolicy | null> {
  const officeId = getCurrentOfficeId();
  if (!officeId) return null;

  const { data, error } = await supabase
    .from('password_policies')
    .select('*')
    .eq('office_id', officeId)
    .maybeSingle();

  // テーブルが存在しない、またはレコードが見つからない場合はnullを返す（エラーではない）
  if (error) {
    // PGRST116: 行が見つからない場合は正常
    if (error.code === 'PGRST116') {
      return null;
    }
    // その他のエラー（テーブルが存在しないなど）もログに記録してnullを返す
    console.error('パスワードポリシー取得エラー:', error);
    return null;
  }

  if (!data) return null;

  return {
    id: data.id,
    officeId: data.office_id,
    minLength: data.min_length,
    requireUppercase: data.require_uppercase,
    requireLowercase: data.require_lowercase,
    requireNumbers: data.require_numbers,
    requireSymbols: data.require_symbols,
    maxAgeDays: data.max_age_days,
    preventReuseCount: data.prevent_reuse_count,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

// パスワードを検証
export function validatePassword(password: string, policy: PasswordPolicy | null): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!policy) {
    // デフォルトポリシー
    if (password.length < 8) {
      errors.push('パスワードは8文字以上である必要があります');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('パスワードには大文字を含める必要があります');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('パスワードには小文字を含める必要があります');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('パスワードには数字を含める必要があります');
    }
  } else {
    if (password.length < policy.minLength) {
      errors.push(`パスワードは${policy.minLength}文字以上である必要があります`);
    }
    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('パスワードには大文字を含める必要があります');
    }
    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('パスワードには小文字を含める必要があります');
    }
    if (policy.requireNumbers && !/[0-9]/.test(password)) {
      errors.push('パスワードには数字を含める必要があります');
    }
    if (policy.requireSymbols && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('パスワードには記号を含める必要があります');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// パスワード履歴をチェック（再利用防止）
export async function isPasswordReused(userId: number, passwordHash: string): Promise<boolean> {
  const officeId = getCurrentOfficeId();
  if (!officeId) return false;

  const policy = await getPasswordPolicy();
  const preventCount = policy?.preventReuseCount || 5;

  const { data, error } = await supabase
    .from('password_history')
    .select('password_hash')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(preventCount);

  // テーブルが存在しない場合は再利用チェックをスキップ
  if (error || !data) {
    return false;
  }

  return data.some(history => history.password_hash === passwordHash);
}

// パスワード履歴を追加
export async function addPasswordHistory(userId: number, passwordHash: string): Promise<void> {
  const { error } = await supabase
    .from('password_history')
    .insert([
      {
        user_id: userId,
        password_hash: passwordHash,
      },
    ]);

  // テーブルが存在しない場合はエラーを無視
  if (error && error.code !== '42P01') {
    console.error('パスワード履歴追加エラー:', error);
  }
}

// ログイン試行を記録
export async function logLoginAttempt(
  username: string,
  success: boolean,
  failureReason?: string,
  ipAddress?: string
): Promise<void> {
  const { error } = await supabase
    .from('login_attempts')
    .insert([
      {
        username,
        success,
        failure_reason: failureReason || null,
        ip_address: ipAddress || null,
      },
    ]);

  // テーブルが存在しない場合はエラーを無視（ログに記録しない）
  if (error && error.code !== '42P01') { // 42P01: テーブルが存在しない
    console.error('ログイン試行記録エラー:', error);
  }
}

// 最近の失敗ログイン試行数を取得（ブルートフォース対策）
export async function getRecentFailedAttempts(username: string, minutes: number = 15): Promise<number> {
  const cutoffTime = new Date(Date.now() - minutes * 60 * 1000).toISOString();

  const { count, error } = await supabase
    .from('login_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('username', username)
    .eq('success', false)
    .gte('created_at', cutoffTime);

  // テーブルが存在しない場合は0を返す（ブルートフォースチェックをスキップ）
  if (error) {
    return 0;
  }

  return count || 0;
}

// 二段階認証設定を取得
export async function getTwoFactorAuth(userId: number): Promise<TwoFactorAuth | null> {
  const { data, error } = await supabase
    .from('two_factor_auth')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  // テーブルが存在しない、またはレコードが見つからない場合はnullを返す
  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('二段階認証取得エラー:', error);
    return null;
  }

  if (!data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    secret: data.secret,
    enabled: data.enabled,
    backupCodes: data.backup_codes || [],
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

// 二段階認証のシークレットを生成（TOTP標準準拠）
export function generateTwoFactorSecret(): string {
  // TOTP用のシークレットを生成（20バイト = 160ビット）
  const secret = new OTPAuth.Secret({ size: 20 });
  return secret.base32;
}

// TOTPコードを検証
export function verifyTwoFactorCode(secret: string, token: string): boolean {
  try {
    const totp = new OTPAuth.TOTP({
      secret: OTPAuth.Secret.fromBase32(secret),
      digits: 6,
      period: 30,
    });
    
    const delta = totp.validate({ token, window: 1 });
    // deltaがnullの場合は無効、数値の場合は有効（許容範囲内）
    return delta !== null;
  } catch (error) {
    console.error('TOTP検証エラー:', error);
    return false;
  }
}

// TOTP用のQRコードURLを生成（認証アプリ登録用）
export function generateTwoFactorQRCodeUrl(secret: string, userEmail: string, issuer: string = '事務所管理アプリ'): string {
  const totp = new OTPAuth.TOTP({
    secret: OTPAuth.Secret.fromBase32(secret),
    label: userEmail,
    issuer: issuer,
    digits: 6,
    period: 30,
  });
  
  return totp.toString();
}

// 二段階認証を有効化
export async function enableTwoFactorAuth(userId: number, secret: string, backupCodes: string[]): Promise<TwoFactorAuth> {
  const { data, error } = await supabase
    .from('two_factor_auth')
    .upsert([
      {
        user_id: userId,
        secret,
        enabled: true,
        backup_codes: backupCodes,
        updated_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error('二段階認証の有効化に失敗しました');
  }

  return {
    id: data.id,
    userId: data.user_id,
    secret: data.secret,
    enabled: data.enabled,
    backupCodes: data.backup_codes || [],
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

// 二段階認証を無効化
export async function disableTwoFactorAuth(userId: number): Promise<void> {
  const { error } = await supabase
    .from('two_factor_auth')
    .update({ enabled: false, updated_at: new Date().toISOString() })
    .eq('user_id', userId);

  if (error) {
    throw new Error('二段階認証の無効化に失敗しました');
  }
}

