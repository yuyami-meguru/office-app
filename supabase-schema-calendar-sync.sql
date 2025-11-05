-- ============================================
-- Googleカレンダー同期機能
-- ============================================

-- Googleカレンダー同期設定
CREATE TABLE IF NOT EXISTS google_calendar_sync (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES global_users(id) ON DELETE CASCADE,
  office_id TEXT NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  calendar_id TEXT NOT NULL,
  sync_direction TEXT NOT NULL CHECK (sync_direction IN ('import', 'export', 'bidirectional')),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_sync_at TIMESTAMPTZ,
  -- OAuth トークン（暗号化して保存することを推奨）
  access_token TEXT,
  refresh_token TEXT,
  token_expiry TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, office_id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_google_calendar_sync_user_id ON google_calendar_sync(user_id);
CREATE INDEX IF NOT EXISTS idx_google_calendar_sync_office_id ON google_calendar_sync(office_id);

-- RLSポリシー
ALTER TABLE google_calendar_sync ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "google_calendar_sync_select" ON google_calendar_sync;
CREATE POLICY "google_calendar_sync_select" ON google_calendar_sync FOR SELECT USING (true);

DROP POLICY IF EXISTS "google_calendar_sync_insert" ON google_calendar_sync;
CREATE POLICY "google_calendar_sync_insert" ON google_calendar_sync FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "google_calendar_sync_update" ON google_calendar_sync;
CREATE POLICY "google_calendar_sync_update" ON google_calendar_sync FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "google_calendar_sync_delete" ON google_calendar_sync;
CREATE POLICY "google_calendar_sync_delete" ON google_calendar_sync FOR DELETE USING (true);

