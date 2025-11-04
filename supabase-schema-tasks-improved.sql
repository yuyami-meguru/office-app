-- タスク管理の改善：担当者・コメント機能

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

