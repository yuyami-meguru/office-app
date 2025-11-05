-- ============================================
-- 課金/サブスクリプションとクォータ管理
-- ============================================

-- サブスクリプションプラン
CREATE TABLE IF NOT EXISTS subscription_plans (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  price_monthly NUMERIC NOT NULL DEFAULT 0,
  price_yearly NUMERIC NOT NULL DEFAULT 0,
  features JSONB, -- 機能一覧（例: {"max_members": 100, "max_storage_gb": 50}）
  max_members INTEGER,
  max_storage_bytes BIGINT,
  max_projects INTEGER,
  max_files INTEGER,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 事務所のサブスクリプション
CREATE TABLE IF NOT EXISTS office_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  office_id TEXT NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  plan_id BIGINT NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'expired', 'trial')),
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  trial_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(office_id)
);

-- クォータ使用状況
CREATE TABLE IF NOT EXISTS quota_usage (
  id BIGSERIAL PRIMARY KEY,
  office_id TEXT NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  quota_type TEXT NOT NULL, -- 'members', 'storage', 'projects', 'files'
  used_count BIGINT NOT NULL DEFAULT 0,
  limit_count BIGINT,
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(office_id, quota_type)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_office_subscriptions_office_id ON office_subscriptions(office_id);
CREATE INDEX IF NOT EXISTS idx_office_subscriptions_status ON office_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_quota_usage_office_id ON quota_usage(office_id);
CREATE INDEX IF NOT EXISTS idx_quota_usage_quota_type ON quota_usage(quota_type);

-- RLSポリシー
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quota_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscription_plans_select" ON subscription_plans;
CREATE POLICY "subscription_plans_select" ON subscription_plans FOR SELECT USING (true);

DROP POLICY IF EXISTS "office_subscriptions_select" ON office_subscriptions;
CREATE POLICY "office_subscriptions_select" ON office_subscriptions FOR SELECT USING (true);

DROP POLICY IF EXISTS "office_subscriptions_insert" ON office_subscriptions;
CREATE POLICY "office_subscriptions_insert" ON office_subscriptions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "office_subscriptions_update" ON office_subscriptions;
CREATE POLICY "office_subscriptions_update" ON office_subscriptions FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "quota_usage_select" ON quota_usage;
CREATE POLICY "quota_usage_select" ON quota_usage FOR SELECT USING (true);

DROP POLICY IF EXISTS "quota_usage_insert" ON quota_usage;
CREATE POLICY "quota_usage_insert" ON quota_usage FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "quota_usage_update" ON quota_usage;
CREATE POLICY "quota_usage_update" ON quota_usage FOR UPDATE USING (true) WITH CHECK (true);

-- デフォルトプランの作成
INSERT INTO subscription_plans (name, display_name, description, price_monthly, price_yearly, features, max_members, max_storage_bytes, max_projects, max_files)
VALUES 
  ('free', '無料プラン', '基本的な機能が利用可能', 0, 0, '{}', 10, 1073741824, 5, 100),
  ('basic', 'ベーシックプラン', '小規模チーム向け', 980, 9800, '{}', 50, 5368709120, 20, 500),
  ('professional', 'プロフェッショナルプラン', '中規模チーム向け', 2980, 29800, '{}', 200, 21474836480, 100, 2000),
  ('enterprise', 'エンタープライズプラン', '大規模チーム向け', 9800, 98000, '{}', 1000, 107374182400, 500, 10000)
ON CONFLICT (name) DO NOTHING;

