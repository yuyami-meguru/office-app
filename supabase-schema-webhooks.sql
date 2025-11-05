-- ============================================
-- Webhook設定
-- ============================================

-- Webhook設定テーブル
CREATE TABLE IF NOT EXISTS webhook_configurations (
  id BIGSERIAL PRIMARY KEY,
  office_id TEXT NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL, -- 購読するイベントのリスト
  secret TEXT NOT NULL, -- 署名検証用のシークレット
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_by INTEGER NOT NULL REFERENCES global_users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Webhook送信履歴
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id BIGSERIAL PRIMARY KEY,
  webhook_id BIGINT NOT NULL REFERENCES webhook_configurations(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_webhook_configurations_office_id ON webhook_configurations(office_id);
CREATE INDEX IF NOT EXISTS idx_webhook_configurations_enabled ON webhook_configurations(enabled);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_delivered_at ON webhook_deliveries(delivered_at DESC);

-- RLSポリシー
ALTER TABLE webhook_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "webhook_configurations_select" ON webhook_configurations;
CREATE POLICY "webhook_configurations_select" ON webhook_configurations FOR SELECT USING (true);

DROP POLICY IF EXISTS "webhook_configurations_insert" ON webhook_configurations;
CREATE POLICY "webhook_configurations_insert" ON webhook_configurations FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "webhook_configurations_update" ON webhook_configurations;
CREATE POLICY "webhook_configurations_update" ON webhook_configurations FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "webhook_configurations_delete" ON webhook_configurations;
CREATE POLICY "webhook_configurations_delete" ON webhook_configurations FOR DELETE USING (true);

DROP POLICY IF EXISTS "webhook_deliveries_select" ON webhook_deliveries;
CREATE POLICY "webhook_deliveries_select" ON webhook_deliveries FOR SELECT USING (true);

DROP POLICY IF EXISTS "webhook_deliveries_insert" ON webhook_deliveries;
CREATE POLICY "webhook_deliveries_insert" ON webhook_deliveries FOR INSERT WITH CHECK (true);

