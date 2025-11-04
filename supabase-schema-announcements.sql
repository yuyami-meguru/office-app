-- お知らせ・通知機能のテーブル作成

-- お知らせテーブル
CREATE TABLE IF NOT EXISTS announcements (
  id BIGSERIAL PRIMARY KEY,
  office_id TEXT NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  author_id INTEGER NOT NULL REFERENCES global_users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('全体', '部署', '個人')),
  target_department TEXT, -- 部署向けの場合の部署名
  target_user_id INTEGER REFERENCES global_users(id) ON DELETE CASCADE, -- 個人向けの場合のユーザーID
  priority TEXT NOT NULL DEFAULT '通常' CHECK (priority IN ('緊急', '通常', 'お知らせ')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 既読管理テーブル
CREATE TABLE IF NOT EXISTS announcement_reads (
  id BIGSERIAL PRIMARY KEY,
  announcement_id BIGINT NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES global_users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(announcement_id, user_id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_announcements_office_id ON announcements(office_id);
CREATE INDEX IF NOT EXISTS idx_announcements_author_id ON announcements(author_id);
CREATE INDEX IF NOT EXISTS idx_announcements_type ON announcements(type);
CREATE INDEX IF NOT EXISTS idx_announcements_target_department ON announcements(target_department);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_announcement_id ON announcement_reads(announcement_id);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_user_id ON announcement_reads(user_id);

-- RLSポリシー
-- 注意: このアプリはSupabase Authを使用していないため、
-- 認証はアプリケーション層で行います。RLSは無効化するか、
-- 全てのアクセスを許可するポリシーを設定します。

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;

-- アプリケーション層で認証を行うため、全てのアクセスを許可
-- （実際の認証はアプリケーションコードで実装）
CREATE POLICY "お知らせは全てのアクセスを許可"
  ON announcements FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "既読管理は全てのアクセスを許可"
  ON announcement_reads FOR ALL
  USING (true)
  WITH CHECK (true);

-- updated_atの自動更新
CREATE OR REPLACE FUNCTION update_announcements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON announcements
  FOR EACH ROW
  EXECUTE FUNCTION update_announcements_updated_at();

