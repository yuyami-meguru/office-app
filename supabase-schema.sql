-- このSQLをSupabaseのSQL Editorで実行してください

-- ユーザーテーブル
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'staff')),
  email TEXT,
  require_password_change BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- デフォルト管理者を追加
INSERT INTO users (id, username, password, name, role, email, require_password_change, created_at)
VALUES ('admin-001', 'admin', 'office2025', '管理者', 'admin', 'admin@office.com', false, NOW());

-- 部署テーブル
CREATE TABLE departments (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- デフォルト部署を追加
INSERT INTO departments (name) VALUES 
  ('歌い手'),
  ('編集'),
  ('人事');

-- メンバーテーブル
CREATE TABLE members (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  departments TEXT[] NOT NULL,
  "group" TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- サンプルメンバーを追加
INSERT INTO members (name, role, departments, "group") VALUES 
  ('音羽ユキ', 'リーダー', ARRAY['歌い手'], 'Aグループ'),
  ('桜井ハル', 'リーダー', ARRAY['歌い手', '編集'], 'Bグループ'),
  ('神崎レン', 'リーダー', ARRAY['編集'], '動画編集チーム'),
  ('星野ミナ', 'マネージャー', ARRAY['人事'], NULL),
  ('夏目ソラ', 'メンバー', ARRAY['歌い手'], 'Aグループ'),
  ('月城アオイ', 'メンバー', ARRAY['歌い手'], 'Bグループ');

-- タスクテーブル
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('未着手', '進行中', '完了')),
  priority TEXT NOT NULL CHECK (priority IN ('低', '中', '高')),
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- サンプルタスクを追加
INSERT INTO tasks (title, description, status, priority, due_date) VALUES 
  ('見積書作成', 'A社向けの見積書を作成する', '進行中', '高', '2025-11-05'),
  ('会議資料準備', '月次ミーティングの資料準備', '未着手', '中', '2025-11-10'),
  ('備品発注', '事務用品の在庫確認と発注', '完了', '低', '2025-11-01');

-- スケジュール（イベント）テーブル
CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  time TEXT,
  location TEXT,
  attendees TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- サンプルイベントを追加
INSERT INTO events (title, date, time, location, attendees, notes) VALUES 
  ('クライアントミーティング', '2025-11-05', '14:00', '会議室A', '山田、佐藤', 'プロジェクトの進捗報告'),
  ('月次定例会', '2025-11-10', '10:00', 'オンライン', '全員', '月次報告と次月の予定確認'),
  ('研修', '2025-11-15', '13:00', '研修室', '新人スタッフ', '業務フロー研修');

-- Row Level Security (RLS) を有効化
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- 全てのユーザーに読み取り・書き込み権限を付与（認証済みユーザーのみ）
-- 注意: 本番環境ではより厳密な権限設定が推奨されます

CREATE POLICY "誰でも読み取り可能" ON users FOR SELECT USING (true);
CREATE POLICY "誰でも更新可能" ON users FOR UPDATE USING (true);
CREATE POLICY "誰でも挿入可能" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "誰でも削除可能" ON users FOR DELETE USING (true);

CREATE POLICY "誰でも読み取り可能" ON departments FOR SELECT USING (true);
CREATE POLICY "誰でも更新可能" ON departments FOR UPDATE USING (true);
CREATE POLICY "誰でも挿入可能" ON departments FOR INSERT WITH CHECK (true);
CREATE POLICY "誰でも削除可能" ON departments FOR DELETE USING (true);

CREATE POLICY "誰でも読み取り可能" ON members FOR SELECT USING (true);
CREATE POLICY "誰でも更新可能" ON members FOR UPDATE USING (true);
CREATE POLICY "誰でも挿入可能" ON members FOR INSERT WITH CHECK (true);
CREATE POLICY "誰でも削除可能" ON members FOR DELETE USING (true);

CREATE POLICY "誰でも読み取り可能" ON tasks FOR SELECT USING (true);
CREATE POLICY "誰でも更新可能" ON tasks FOR UPDATE USING (true);
CREATE POLICY "誰でも挿入可能" ON tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "誰でも削除可能" ON tasks FOR DELETE USING (true);

CREATE POLICY "誰でも読み取り可能" ON events FOR SELECT USING (true);
CREATE POLICY "誰でも更新可能" ON events FOR UPDATE USING (true);
CREATE POLICY "誰でも挿入可能" ON events FOR INSERT WITH CHECK (true);
CREATE POLICY "誰でも削除可能" ON events FOR DELETE USING (true);

