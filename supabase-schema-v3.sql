-- 新しいフロー対応スキーマ（承認制事務所参加）
-- 既存のテーブルを削除して再作成します

-- 既存テーブルを削除
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS members CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS offices CASCADE;
DROP TABLE IF EXISTS office_memberships CASCADE;
DROP TABLE IF EXISTS join_requests CASCADE;
DROP TABLE IF EXISTS global_users CASCADE;

-- グローバルユーザーテーブル（アカウント作成時）
CREATE TABLE global_users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 事務所テーブル
CREATE TABLE offices (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL, -- 事務所コード（参加時に使用）
  created_by INTEGER REFERENCES global_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 事務所メンバーシップ（承認済みのメンバー）
CREATE TABLE office_memberships (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES global_users(id) ON DELETE CASCADE,
  office_id TEXT NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL, -- 事務所での表示名
  role TEXT NOT NULL, -- メンバーの役割（例: リーダー、メンバー）
  user_role TEXT NOT NULL CHECK (user_role IN ('admin', 'staff')), -- ログイン権限
  departments TEXT[] NOT NULL,
  "group" TEXT,
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'pending')),
  require_password_change BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, office_id) -- 1ユーザーは1事務所に1回だけ参加可能
);

-- 参加リクエスト（承認待ち）
CREATE TABLE join_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES global_users(id) ON DELETE CASCADE,
  office_id TEXT NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL, -- 事務所での表示名
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  UNIQUE(user_id, office_id) -- 重複リクエスト防止
);

-- 部署テーブル
CREATE TABLE departments (
  id SERIAL PRIMARY KEY,
  office_id TEXT NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(office_id, name)
);

-- タスクテーブル
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  office_id TEXT NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('未着手', '進行中', '完了')),
  priority TEXT NOT NULL CHECK (priority IN ('低', '中', '高')),
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- イベント（スケジュール）テーブル
CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  office_id TEXT NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  time TEXT,
  location TEXT,
  attendees TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_global_users_username ON global_users(username);
CREATE INDEX idx_office_memberships_user_id ON office_memberships(user_id);
CREATE INDEX idx_office_memberships_office_id ON office_memberships(office_id);
CREATE INDEX idx_join_requests_user_id ON join_requests(user_id);
CREATE INDEX idx_join_requests_office_id ON join_requests(office_id);
CREATE INDEX idx_departments_office_id ON departments(office_id);
CREATE INDEX idx_tasks_office_id ON tasks(office_id);
CREATE INDEX idx_events_office_id ON events(office_id);

-- Row Level Security (RLS) を有効化
ALTER TABLE global_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- 全てのユーザーに読み取り・書き込み権限を付与
CREATE POLICY "誰でも読み取り可能" ON global_users FOR SELECT USING (true);
CREATE POLICY "誰でも挿入可能" ON global_users FOR INSERT WITH CHECK (true);

CREATE POLICY "誰でも読み取り可能" ON offices FOR SELECT USING (true);
CREATE POLICY "誰でも挿入可能" ON offices FOR INSERT WITH CHECK (true);
CREATE POLICY "誰でも更新可能" ON offices FOR UPDATE USING (true);

CREATE POLICY "誰でも読み取り可能" ON office_memberships FOR SELECT USING (true);
CREATE POLICY "誰でも更新可能" ON office_memberships FOR UPDATE USING (true);
CREATE POLICY "誰でも挿入可能" ON office_memberships FOR INSERT WITH CHECK (true);
CREATE POLICY "誰でも削除可能" ON office_memberships FOR DELETE USING (true);

CREATE POLICY "誰でも読み取り可能" ON join_requests FOR SELECT USING (true);
CREATE POLICY "誰でも更新可能" ON join_requests FOR UPDATE USING (true);
CREATE POLICY "誰でも挿入可能" ON join_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "誰でも削除可能" ON join_requests FOR DELETE USING (true);

CREATE POLICY "誰でも読み取り可能" ON departments FOR SELECT USING (true);
CREATE POLICY "誰でも更新可能" ON departments FOR UPDATE USING (true);
CREATE POLICY "誰でも挿入可能" ON departments FOR INSERT WITH CHECK (true);
CREATE POLICY "誰でも削除可能" ON departments FOR DELETE USING (true);

CREATE POLICY "誰でも読み取り可能" ON tasks FOR SELECT USING (true);
CREATE POLICY "誰でも更新可能" ON tasks FOR UPDATE USING (true);
CREATE POLICY "誰でも挿入可能" ON tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "誰でも削除可能" ON tasks FOR DELETE USING (true);

CREATE POLICY "誰でも読み取り可能" ON events FOR SELECT USING (true);
CREATE POLICY "誰でも更新可能" ON events FOR UPDATE USING (true);
CREATE POLICY "誰でも挿入可能" ON events FOR INSERT WITH CHECK (true);
CREATE POLICY "誰でも削除可能" ON events FOR DELETE USING (true);

-- サンプルデータ（デモ事務所）
INSERT INTO global_users (username, password) VALUES ('demo_admin', 'demo2025');

INSERT INTO offices (id, name, code, created_by) 
VALUES ('office-demo', 'デモ事務所', 'DEMO2025', 1);

INSERT INTO office_memberships (user_id, office_id, display_name, role, user_role, departments, "group", status, require_password_change)
VALUES (1, 'office-demo', 'デモ管理者', 'マネージャー', 'admin', ARRAY['人事'], NULL, 'approved', false);

INSERT INTO departments (office_id, name) VALUES 
  ('office-demo', '歌い手'),
  ('office-demo', '編集'),
  ('office-demo', '人事');

INSERT INTO tasks (office_id, title, description, status, priority, due_date) VALUES 
  ('office-demo', '見積書作成', 'A社向けの見積書を作成する', '進行中', '高', '2025-11-05');

INSERT INTO events (office_id, title, date, time, location, attendees, notes) VALUES 
  ('office-demo', 'クライアントミーティング', '2025-11-05', '14:00', '会議室A', '山田、佐藤', 'プロジェクトの進捗報告');

