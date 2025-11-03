-- 新しいマルチテナント対応スキーマ
-- 既存のテーブルを削除して再作成します

-- 既存テーブルを削除
DROP TABLE IF EXISTS offices CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS members CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 事務所テーブル（新規）
CREATE TABLE offices (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL, -- 事務所コード（ログイン時に使用）
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- デフォルト事務所を追加
INSERT INTO offices (id, name, code, created_at)
VALUES ('office-default', 'デモ事務所', 'DEMO2025', NOW());

-- メンバー/ユーザー統合テーブル（改良版）
CREATE TABLE members (
  id SERIAL PRIMARY KEY,
  office_id TEXT NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  
  -- 基本情報
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  departments TEXT[] NOT NULL,
  "group" TEXT,
  
  -- ログイン情報
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  user_role TEXT NOT NULL CHECK (user_role IN ('admin', 'staff')),
  require_password_change BOOLEAN DEFAULT true,
  
  -- その他
  email TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- デフォルト管理者を追加
INSERT INTO members (office_id, name, role, departments, "group", username, password, user_role, require_password_change, created_at)
VALUES ('office-default', '管理者', 'マネージャー', ARRAY['人事'], NULL, 'admin', 'office2025', 'admin', false, NOW());

-- サンプルメンバー/ユーザーを追加
INSERT INTO members (office_id, name, role, departments, "group", username, password, user_role, require_password_change) VALUES 
  ('office-default', '音羽ユキ', 'リーダー', ARRAY['歌い手'], 'Aグループ', 'yuki', 'temp123456', 'staff', true),
  ('office-default', '桜井ハル', 'リーダー', ARRAY['歌い手', '編集'], 'Bグループ', 'haru', 'temp123456', 'staff', true),
  ('office-default', '神崎レン', 'リーダー', ARRAY['編集'], '動画編集チーム', 'ren', 'temp123456', 'staff', true),
  ('office-default', '星野ミナ', 'マネージャー', ARRAY['人事'], NULL, 'mina', 'temp123456', 'staff', true),
  ('office-default', '夏目ソラ', 'メンバー', ARRAY['歌い手'], 'Aグループ', 'sora', 'temp123456', 'staff', true),
  ('office-default', '月城アオイ', 'メンバー', ARRAY['歌い手'], 'Bグループ', 'aoi', 'temp123456', 'staff', true);

-- 部署テーブル
CREATE TABLE departments (
  id SERIAL PRIMARY KEY,
  office_id TEXT NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(office_id, name) -- 同じ事務所内で部署名は一意
);

-- デフォルト部署を追加
INSERT INTO departments (office_id, name) VALUES 
  ('office-default', '歌い手'),
  ('office-default', '編集'),
  ('office-default', '人事');

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

-- サンプルタスクを追加
INSERT INTO tasks (office_id, title, description, status, priority, due_date) VALUES 
  ('office-default', '見積書作成', 'A社向けの見積書を作成する', '進行中', '高', '2025-11-05'),
  ('office-default', '会議資料準備', '月次ミーティングの資料準備', '未着手', '中', '2025-11-10'),
  ('office-default', '備品発注', '事務用品の在庫確認と発注', '完了', '低', '2025-11-01');

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

-- サンプルイベントを追加
INSERT INTO events (office_id, title, date, time, location, attendees, notes) VALUES 
  ('office-default', 'クライアントミーティング', '2025-11-05', '14:00', '会議室A', '山田、佐藤', 'プロジェクトの進捗報告'),
  ('office-default', '月次定例会', '2025-11-10', '10:00', 'オンライン', '全員', '月次報告と次月の予定確認'),
  ('office-default', '研修', '2025-11-15', '13:00', '研修室', '新人スタッフ', '業務フロー研修');

-- インデックスを作成（パフォーマンス向上）
CREATE INDEX idx_members_office_id ON members(office_id);
CREATE INDEX idx_members_username ON members(username);
CREATE INDEX idx_departments_office_id ON departments(office_id);
CREATE INDEX idx_tasks_office_id ON tasks(office_id);
CREATE INDEX idx_events_office_id ON events(office_id);

-- Row Level Security (RLS) を有効化
ALTER TABLE offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- 全てのユーザーに読み取り・書き込み権限を付与
CREATE POLICY "誰でも読み取り可能" ON offices FOR SELECT USING (true);
CREATE POLICY "誰でも挿入可能" ON offices FOR INSERT WITH CHECK (true);

CREATE POLICY "誰でも読み取り可能" ON members FOR SELECT USING (true);
CREATE POLICY "誰でも更新可能" ON members FOR UPDATE USING (true);
CREATE POLICY "誰でも挿入可能" ON members FOR INSERT WITH CHECK (true);
CREATE POLICY "誰でも削除可能" ON members FOR DELETE USING (true);

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

