-- ============================================
-- DLP/ストレージポリシー（ライフサイクル/タグ）
-- ============================================

-- ストレージライフサイクルポリシー
CREATE TABLE IF NOT EXISTS storage_lifecycle_policies (
  id BIGSERIAL PRIMARY KEY,
  office_id TEXT NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  bucket_name TEXT NOT NULL,
  rule_name TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('delete', 'archive', 'move')),
  trigger_days INTEGER NOT NULL, -- トリガーとなる日数（作成日から）
  target_path TEXT, -- 移動先パス（moveの場合）
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_by INTEGER NOT NULL REFERENCES global_users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(office_id, bucket_name, rule_name)
);

-- ファイルタグ
CREATE TABLE IF NOT EXISTS file_tags (
  id BIGSERIAL PRIMARY KEY,
  office_id TEXT NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  file_id BIGINT NOT NULL, -- filesテーブルのID
  tag_name TEXT NOT NULL,
  tag_value TEXT,
  created_by INTEGER REFERENCES global_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(office_id, file_id, tag_name)
);

-- ストレージクォータ設定
CREATE TABLE IF NOT EXISTS storage_quotas (
  id BIGSERIAL PRIMARY KEY,
  office_id TEXT NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  storage_limit_bytes BIGINT NOT NULL DEFAULT 1073741824, -- デフォルト1GB
  current_usage_bytes BIGINT NOT NULL DEFAULT 0,
  warning_threshold_percent INTEGER NOT NULL DEFAULT 80, -- 警告閾値（%）
  last_calculated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(office_id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_storage_lifecycle_policies_office_id ON storage_lifecycle_policies(office_id);
CREATE INDEX IF NOT EXISTS idx_storage_lifecycle_policies_enabled ON storage_lifecycle_policies(enabled);
CREATE INDEX IF NOT EXISTS idx_file_tags_office_id ON file_tags(office_id);
CREATE INDEX IF NOT EXISTS idx_file_tags_file_id ON file_tags(file_id);
CREATE INDEX IF NOT EXISTS idx_file_tags_tag_name ON file_tags(tag_name);
CREATE INDEX IF NOT EXISTS idx_storage_quotas_office_id ON storage_quotas(office_id);

-- RLSポリシー
ALTER TABLE storage_lifecycle_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_quotas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "storage_lifecycle_policies_select" ON storage_lifecycle_policies;
CREATE POLICY "storage_lifecycle_policies_select" ON storage_lifecycle_policies FOR SELECT USING (true);

DROP POLICY IF EXISTS "storage_lifecycle_policies_insert" ON storage_lifecycle_policies;
CREATE POLICY "storage_lifecycle_policies_insert" ON storage_lifecycle_policies FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "storage_lifecycle_policies_update" ON storage_lifecycle_policies;
CREATE POLICY "storage_lifecycle_policies_update" ON storage_lifecycle_policies FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "storage_lifecycle_policies_delete" ON storage_lifecycle_policies;
CREATE POLICY "storage_lifecycle_policies_delete" ON storage_lifecycle_policies FOR DELETE USING (true);

DROP POLICY IF EXISTS "file_tags_select" ON file_tags;
CREATE POLICY "file_tags_select" ON file_tags FOR SELECT USING (true);

DROP POLICY IF EXISTS "file_tags_insert" ON file_tags;
CREATE POLICY "file_tags_insert" ON file_tags FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "file_tags_update" ON file_tags;
CREATE POLICY "file_tags_update" ON file_tags FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "file_tags_delete" ON file_tags;
CREATE POLICY "file_tags_delete" ON file_tags FOR DELETE USING (true);

DROP POLICY IF EXISTS "storage_quotas_select" ON storage_quotas;
CREATE POLICY "storage_quotas_select" ON storage_quotas FOR SELECT USING (true);

DROP POLICY IF EXISTS "storage_quotas_insert" ON storage_quotas;
CREATE POLICY "storage_quotas_insert" ON storage_quotas FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "storage_quotas_update" ON storage_quotas;
CREATE POLICY "storage_quotas_update" ON storage_quotas FOR UPDATE USING (true) WITH CHECK (true);

