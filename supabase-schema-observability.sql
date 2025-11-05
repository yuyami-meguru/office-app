-- ============================================
-- 運用可観測性（メトリクス/Feature Flag）
-- ============================================

-- エラーログ
CREATE TABLE IF NOT EXISTS error_logs (
  id BIGSERIAL PRIMARY KEY,
  office_id TEXT REFERENCES offices(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES global_users(id) ON DELETE SET NULL,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  url TEXT,
  user_agent TEXT,
  ip_address TEXT,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- パフォーマンスメトリクス
CREATE TABLE IF NOT EXISTS performance_metrics (
  id BIGSERIAL PRIMARY KEY,
  office_id TEXT REFERENCES offices(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL, -- 'page_load', 'api_response', 'query_time'など
  metric_name TEXT NOT NULL,
  value NUMERIC NOT NULL, -- メトリクスの値（ミリ秒、バイトなど）
  unit TEXT, -- 'ms', 'bytes', 'count'など
  metadata JSONB, -- 追加情報
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Feature Flags（機能フラグ）
CREATE TABLE IF NOT EXISTS feature_flags (
  id BIGSERIAL PRIMARY KEY,
  office_id TEXT NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  flag_name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT,
  target_users TEXT[], -- 対象ユーザーID（空の場合は全ユーザー）
  target_roles TEXT[], -- 対象ロール（'admin', 'staff'など、空の場合は全ロール）
  rollout_percentage INTEGER DEFAULT 100, -- ロールアウト率（0-100）
  created_by INTEGER REFERENCES global_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(office_id, flag_name)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_error_logs_office_id ON error_logs(office_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_office_id ON performance_metrics(office_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_created_at ON performance_metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_metric_type ON performance_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_feature_flags_office_id ON feature_flags(office_id);
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON feature_flags(enabled);

-- RLSポリシー
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "error_logs_select" ON error_logs;
CREATE POLICY "error_logs_select" ON error_logs FOR SELECT USING (true);

DROP POLICY IF EXISTS "error_logs_insert" ON error_logs;
CREATE POLICY "error_logs_insert" ON error_logs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "error_logs_update" ON error_logs;
CREATE POLICY "error_logs_update" ON error_logs FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "performance_metrics_select" ON performance_metrics;
CREATE POLICY "performance_metrics_select" ON performance_metrics FOR SELECT USING (true);

DROP POLICY IF EXISTS "performance_metrics_insert" ON performance_metrics;
CREATE POLICY "performance_metrics_insert" ON performance_metrics FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "feature_flags_select" ON feature_flags;
CREATE POLICY "feature_flags_select" ON feature_flags FOR SELECT USING (true);

DROP POLICY IF EXISTS "feature_flags_insert" ON feature_flags;
CREATE POLICY "feature_flags_insert" ON feature_flags FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "feature_flags_update" ON feature_flags;
CREATE POLICY "feature_flags_update" ON feature_flags FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "feature_flags_delete" ON feature_flags;
CREATE POLICY "feature_flags_delete" ON feature_flags FOR DELETE USING (true);

