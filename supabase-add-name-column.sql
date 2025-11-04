-- global_usersテーブルにnameカラムを追加
-- SupabaseのSQL Editorで実行してください

ALTER TABLE global_users ADD COLUMN IF NOT EXISTS name TEXT;

-- 既存のデータがある場合、usernameをnameとして設定（オプション）
UPDATE global_users SET name = username WHERE name IS NULL OR name = '';

