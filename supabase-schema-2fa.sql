-- ============================================
-- 二段階認証とパスワードポリシー
-- ============================================

-- 二段階認証設定
CREATE TABLE IF NOT EXISTS two_factor_auth (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES global_users(id) ON DELETE CASCADE,
  secret TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  backup_codes TEXT[], -- バックアップコード（ハッシュ化）
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- パスワードポリシー設定（事務所単位）
CREATE TABLE IF NOT EXISTS password_policies (
  id BIGSERIAL PRIMARY KEY,
  office_id TEXT NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  min_length INTEGER NOT NULL DEFAULT 8,
  require_uppercase BOOLEAN NOT NULL DEFAULT TRUE,
  require_lowercase BOOLEAN NOT NULL DEFAULT TRUE,
  require_numbers BOOLEAN NOT NULL DEFAULT TRUE,
  require_symbols BOOLEAN NOT NULL DEFAULT FALSE,
  max_age_days INTEGER, -- パスワード有効期限（日数、NULLの場合は無期限）
  prevent_reuse_count INTEGER DEFAULT 5, -- 過去N個のパスワードを再利用禁止
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(office_id)
);

-- パスワード履歴（再利用防止用）
CREATE TABLE IF NOT EXISTS password_history (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES global_users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ログイン試行履歴（ブルートフォース対策）
CREATE TABLE IF NOT EXISTS login_attempts (
  id BIGSERIAL PRIMARY KEY,
  username TEXT NOT NULL,
  ip_address TEXT,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_two_factor_auth_user_id ON two_factor_auth(user_id);
CREATE INDEX IF NOT EXISTS idx_password_policies_office_id ON password_policies(office_id);
CREATE INDEX IF NOT EXISTS idx_password_history_user_id ON password_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_attempts_username ON login_attempts(username);
CREATE INDEX IF NOT EXISTS idx_login_attempts_created_at ON login_attempts(created_at DESC);

-- RLSポリシー
ALTER TABLE two_factor_auth ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "two_factor_auth_select" ON two_factor_auth;
CREATE POLICY "two_factor_auth_select" ON two_factor_auth FOR SELECT USING (true);

DROP POLICY IF EXISTS "two_factor_auth_insert" ON two_factor_auth;
CREATE POLICY "two_factor_auth_insert" ON two_factor_auth FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "two_factor_auth_update" ON two_factor_auth;
CREATE POLICY "two_factor_auth_update" ON two_factor_auth FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "password_policies_select" ON password_policies;
CREATE POLICY "password_policies_select" ON password_policies FOR SELECT USING (true);

DROP POLICY IF EXISTS "password_policies_insert" ON password_policies;
CREATE POLICY "password_policies_insert" ON password_policies FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "password_policies_update" ON password_policies;
CREATE POLICY "password_policies_update" ON password_policies FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "password_history_select" ON password_history;
CREATE POLICY "password_history_select" ON password_history FOR SELECT USING (true);

DROP POLICY IF EXISTS "password_history_insert" ON password_history;
CREATE POLICY "password_history_insert" ON password_history FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "login_attempts_select" ON login_attempts;
CREATE POLICY "login_attempts_select" ON login_attempts FOR SELECT USING (true);

DROP POLICY IF EXISTS "login_attempts_insert" ON login_attempts;
CREATE POLICY "login_attempts_insert" ON login_attempts FOR INSERT WITH CHECK (true);

