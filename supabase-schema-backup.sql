-- ============================================
-- バックアップ/リストアとデータ保持ポリシー
-- ============================================

-- バックアップ設定
CREATE TABLE IF NOT EXISTS backup_configurations (
  id BIGSERIAL PRIMARY KEY,
  office_id TEXT NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('daily', 'weekly', 'monthly', 'manual')),
  schedule_config JSONB, -- スケジュール設定（例: { "day_of_week": 1, "time": "02:00" }）
  retention_days INTEGER NOT NULL DEFAULT 30, -- 保持期間（日数）
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_backup_at TIMESTAMPTZ,
  created_by INTEGER NOT NULL REFERENCES global_users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(office_id)
);

-- バックアップ履歴
CREATE TABLE IF NOT EXISTS backup_history (
  id BIGSERIAL PRIMARY KEY,
  office_id TEXT NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  backup_type TEXT NOT NULL CHECK (backup_type IN ('full', 'incremental')),
  backup_data JSONB NOT NULL, -- バックアップデータ（JSON形式）
  file_size_bytes BIGINT,
  storage_path TEXT, -- ストレージパス（Supabase Storageなど）
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  error_message TEXT,
  created_by INTEGER NOT NULL REFERENCES global_users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- データ保持ポリシー
CREATE TABLE IF NOT EXISTS data_retention_policies (
  id BIGSERIAL PRIMARY KEY,
  office_id TEXT NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL, -- リソースタイプ（例: 'tasks', 'events', 'announcements', 'files'）
  retention_days INTEGER NOT NULL, -- 保持期間（日数、NULLの場合は無期限）
  auto_delete BOOLEAN NOT NULL DEFAULT FALSE, -- 自動削除するか
  archive_before_delete BOOLEAN NOT NULL DEFAULT TRUE, -- 削除前にアーカイブするか
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(office_id, resource_type)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_backup_configurations_office_id ON backup_configurations(office_id);
CREATE INDEX IF NOT EXISTS idx_backup_history_office_id ON backup_history(office_id);
CREATE INDEX IF NOT EXISTS idx_backup_history_created_at ON backup_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_retention_policies_office_id ON data_retention_policies(office_id);
CREATE INDEX IF NOT EXISTS idx_data_retention_policies_resource_type ON data_retention_policies(resource_type);

-- RLSポリシー
ALTER TABLE backup_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_retention_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "backup_configurations_select" ON backup_configurations;
CREATE POLICY "backup_configurations_select" ON backup_configurations FOR SELECT USING (true);

DROP POLICY IF EXISTS "backup_configurations_insert" ON backup_configurations;
CREATE POLICY "backup_configurations_insert" ON backup_configurations FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "backup_configurations_update" ON backup_configurations;
CREATE POLICY "backup_configurations_update" ON backup_configurations FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "backup_configurations_delete" ON backup_configurations;
CREATE POLICY "backup_configurations_delete" ON backup_configurations FOR DELETE USING (true);

DROP POLICY IF EXISTS "backup_history_select" ON backup_history;
CREATE POLICY "backup_history_select" ON backup_history FOR SELECT USING (true);

DROP POLICY IF EXISTS "backup_history_insert" ON backup_history;
CREATE POLICY "backup_history_insert" ON backup_history FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "data_retention_policies_select" ON data_retention_policies;
CREATE POLICY "data_retention_policies_select" ON data_retention_policies FOR SELECT USING (true);

DROP POLICY IF EXISTS "data_retention_policies_insert" ON data_retention_policies;
CREATE POLICY "data_retention_policies_insert" ON data_retention_policies FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "data_retention_policies_update" ON data_retention_policies;
CREATE POLICY "data_retention_policies_update" ON data_retention_policies FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "data_retention_policies_delete" ON data_retention_policies;
CREATE POLICY "data_retention_policies_delete" ON data_retention_policies FOR DELETE USING (true);

