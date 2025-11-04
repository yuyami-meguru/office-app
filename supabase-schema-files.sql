-- ファイル共有機能のテーブル作成

-- ファイルフォルダテーブル
CREATE TABLE IF NOT EXISTS file_folders (
  id BIGSERIAL PRIMARY KEY,
  office_id TEXT NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  department TEXT, -- 部署ごとのフォルダ（NULLの場合は全体）
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

-- 活動履歴テーブル
CREATE TABLE IF NOT EXISTS activity_logs (
  id BIGSERIAL PRIMARY KEY,
  office_id TEXT NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES global_users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- '追加', '削除', '更新', '作成', '参加'
  entity_type TEXT NOT NULL, -- 'メンバー', 'タスク', 'イベント', 'お知らせ', 'ファイル', '事務所'
  entity_id BIGINT,
  details JSONB, -- 詳細情報（JSON形式）
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_activity_logs_office_id ON activity_logs(office_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_type ON activity_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);

