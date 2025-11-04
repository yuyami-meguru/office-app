-- ============================================
-- 事務所管理アプリ：全機能のスキーマ統合版
-- ============================================
-- このファイルを Supabase SQL Editor で実行してください
-- 既存のテーブルやポリシーは自動的に処理されます
-- ============================================

-- ============================================
-- 1. お知らせ・通知機能
-- ============================================

-- お知らせテーブル
CREATE TABLE IF NOT EXISTS announcements (
  id BIGSERIAL PRIMARY KEY,
  office_id TEXT NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  author_id INTEGER NOT NULL REFERENCES global_users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('全体', '部署', '個人')),
  target_department TEXT,
  target_user_id INTEGER REFERENCES global_users(id) ON DELETE CASCADE,
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

-- RLSポリシー（既存のポリシーを削除してから再作成）
DROP POLICY IF EXISTS "お知らせは全てのアクセスを許可" ON announcements;
DROP POLICY IF EXISTS "既読管理は全てのアクセスを許可" ON announcement_reads;

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;

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

DROP TRIGGER IF EXISTS update_announcements_updated_at ON announcements;

CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON announcements
  FOR EACH ROW
  EXECUTE FUNCTION update_announcements_updated_at();

-- ============================================
-- 2. タスク管理の改善（担当者・コメント機能）
-- ============================================

-- tasksテーブルにカラムを追加
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_to_user_id INTEGER REFERENCES global_users(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by_user_id INTEGER REFERENCES global_users(id) ON DELETE SET NULL;

-- タスクコメントテーブル
CREATE TABLE IF NOT EXISTS task_comments (
  id BIGSERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES global_users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to_user_id ON tasks(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by_user_id ON tasks(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_user_id ON task_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_created_at ON task_comments(created_at DESC);

-- ============================================
-- 3. スケジュール管理の改善（繰り返しイベント）
-- ============================================

-- eventsテーブルにカラムを追加
ALTER TABLE events ADD COLUMN IF NOT EXISTS recurring_pattern TEXT CHECK (recurring_pattern IN ('なし', '毎日', '毎週', '毎月', '毎年'));
ALTER TABLE events ADD COLUMN IF NOT EXISTS recurring_end_date DATE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS reminder_minutes INTEGER;

-- デフォルト値設定
UPDATE events SET recurring_pattern = 'なし' WHERE recurring_pattern IS NULL;

-- ============================================
-- 4. ファイル共有機能
-- ============================================

-- ファイルフォルダテーブル
CREATE TABLE IF NOT EXISTS file_folders (
  id BIGSERIAL PRIMARY KEY,
  office_id TEXT NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  department TEXT,
  name TEXT NOT NULL,
  parent_folder_id BIGINT REFERENCES file_folders(id) ON DELETE CASCADE,
  created_by INTEGER NOT NULL REFERENCES global_users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ファイルテーブル
CREATE TABLE IF NOT EXISTS files (
  id BIGSERIAL PRIMARY KEY,
  folder_id BIGINT REFERENCES file_folders(id) ON DELETE CASCADE,
  office_id TEXT NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  description TEXT,
  uploaded_by INTEGER NOT NULL REFERENCES global_users(id) ON DELETE CASCADE,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT false
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_file_folders_office_id ON file_folders(office_id);
CREATE INDEX IF NOT EXISTS idx_file_folders_department ON file_folders(department);
CREATE INDEX IF NOT EXISTS idx_file_folders_parent_folder_id ON file_folders(parent_folder_id);
CREATE INDEX IF NOT EXISTS idx_files_folder_id ON files(folder_id);
CREATE INDEX IF NOT EXISTS idx_files_office_id ON files(office_id);
CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_files_is_deleted ON files(is_deleted);

-- ============================================
-- 5. 活動履歴・ログ機能
-- ============================================

-- 活動履歴テーブル
CREATE TABLE IF NOT EXISTS activity_logs (
  id BIGSERIAL PRIMARY KEY,
  office_id TEXT NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES global_users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id BIGINT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_activity_logs_office_id ON activity_logs(office_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_type ON activity_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- ============================================
-- 完了
-- ============================================
-- 全てのテーブルとインデックスが作成されました
-- 次に Storage バケットを作成してください（手動または supabase-storage-files.sql）

