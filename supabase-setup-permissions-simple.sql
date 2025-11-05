-- ============================================
-- 権限定義の簡単セットアップ（確実版）
-- このSQLを実行すると、全事務所に権限定義が作成されます
-- ============================================

-- まず、現在の事務所IDを確認
SELECT id, name FROM offices;

-- 全事務所に権限定義を作成（事務所IDを自動取得）
INSERT INTO permission_definitions (office_id, resource_type, action, description)
SELECT 
  o.id,
  'member',
  'view',
  'メンバー一覧を閲覧'
FROM offices o
ON CONFLICT (office_id, resource_type, action) DO NOTHING;

INSERT INTO permission_definitions (office_id, resource_type, action, description)
SELECT 
  o.id,
  'member',
  'create',
  'メンバーを追加'
FROM offices o
ON CONFLICT (office_id, resource_type, action) DO NOTHING;

INSERT INTO permission_definitions (office_id, resource_type, action, description)
SELECT 
  o.id,
  'member',
  'edit',
  'メンバーを編集'
FROM offices o
ON CONFLICT (office_id, resource_type, action) DO NOTHING;

INSERT INTO permission_definitions (office_id, resource_type, action, description)
SELECT 
  o.id,
  'member',
  'delete',
  'メンバーを削除'
FROM offices o
ON CONFLICT (office_id, resource_type, action) DO NOTHING;

-- タスク管理
INSERT INTO permission_definitions (office_id, resource_type, action, description)
SELECT 
  o.id,
  'task',
  'view',
  'タスクを閲覧'
FROM offices o
ON CONFLICT (office_id, resource_type, action) DO NOTHING;

INSERT INTO permission_definitions (office_id, resource_type, action, description)
SELECT 
  o.id,
  'task',
  'create',
  'タスクを作成'
FROM offices o
ON CONFLICT (office_id, resource_type, action) DO NOTHING;

INSERT INTO permission_definitions (office_id, resource_type, action, description)
SELECT 
  o.id,
  'task',
  'edit',
  'タスクを編集'
FROM offices o
ON CONFLICT (office_id, resource_type, action) DO NOTHING;

INSERT INTO permission_definitions (office_id, resource_type, action, description)
SELECT 
  o.id,
  'task',
  'delete',
  'タスクを削除'
FROM offices o
ON CONFLICT (office_id, resource_type, action) DO NOTHING;

-- スケジュール管理
INSERT INTO permission_definitions (office_id, resource_type, action, description)
SELECT 
  o.id,
  'schedule',
  'view',
  'スケジュールを閲覧'
FROM offices o
ON CONFLICT (office_id, resource_type, action) DO NOTHING;

INSERT INTO permission_definitions (office_id, resource_type, action, description)
SELECT 
  o.id,
  'schedule',
  'create',
  'スケジュールを作成'
FROM offices o
ON CONFLICT (office_id, resource_type, action) DO NOTHING;

INSERT INTO permission_definitions (office_id, resource_type, action, description)
SELECT 
  o.id,
  'schedule',
  'edit',
  'スケジュールを編集'
FROM offices o
ON CONFLICT (office_id, resource_type, action) DO NOTHING;

INSERT INTO permission_definitions (office_id, resource_type, action, description)
SELECT 
  o.id,
  'schedule',
  'delete',
  'スケジュールを削除'
FROM offices o
ON CONFLICT (office_id, resource_type, action) DO NOTHING;

-- お知らせ管理
INSERT INTO permission_definitions (office_id, resource_type, action, description)
SELECT 
  o.id,
  'announcement',
  'view',
  'お知らせを閲覧'
FROM offices o
ON CONFLICT (office_id, resource_type, action) DO NOTHING;

INSERT INTO permission_definitions (office_id, resource_type, action, description)
SELECT 
  o.id,
  'announcement',
  'create',
  'お知らせを作成'
FROM offices o
ON CONFLICT (office_id, resource_type, action) DO NOTHING;

INSERT INTO permission_definitions (office_id, resource_type, action, description)
SELECT 
  o.id,
  'announcement',
  'edit',
  'お知らせを編集'
FROM offices o
ON CONFLICT (office_id, resource_type, action) DO NOTHING;

INSERT INTO permission_definitions (office_id, resource_type, action, description)
SELECT 
  o.id,
  'announcement',
  'delete',
  'お知らせを削除'
FROM offices o
ON CONFLICT (office_id, resource_type, action) DO NOTHING;

-- ファイル管理
INSERT INTO permission_definitions (office_id, resource_type, action, description)
SELECT 
  o.id,
  'file',
  'view',
  'ファイルを閲覧'
FROM offices o
ON CONFLICT (office_id, resource_type, action) DO NOTHING;

INSERT INTO permission_definitions (office_id, resource_type, action, description)
SELECT 
  o.id,
  'file',
  'create',
  'ファイルをアップロード'
FROM offices o
ON CONFLICT (office_id, resource_type, action) DO NOTHING;

INSERT INTO permission_definitions (office_id, resource_type, action, description)
SELECT 
  o.id,
  'file',
  'edit',
  'ファイルを編集'
FROM offices o
ON CONFLICT (office_id, resource_type, action) DO NOTHING;

INSERT INTO permission_definitions (office_id, resource_type, action, description)
SELECT 
  o.id,
  'file',
  'delete',
  'ファイルを削除'
FROM offices o
ON CONFLICT (office_id, resource_type, action) DO NOTHING;

-- プロジェクト管理
INSERT INTO permission_definitions (office_id, resource_type, action, description)
SELECT 
  o.id,
  'project',
  'view',
  'プロジェクトを閲覧'
FROM offices o
ON CONFLICT (office_id, resource_type, action) DO NOTHING;

INSERT INTO permission_definitions (office_id, resource_type, action, description)
SELECT 
  o.id,
  'project',
  'create',
  'プロジェクトを作成'
FROM offices o
ON CONFLICT (office_id, resource_type, action) DO NOTHING;

INSERT INTO permission_definitions (office_id, resource_type, action, description)
SELECT 
  o.id,
  'project',
  'edit',
  'プロジェクトを編集'
FROM offices o
ON CONFLICT (office_id, resource_type, action) DO NOTHING;

INSERT INTO permission_definitions (office_id, resource_type, action, description)
SELECT 
  o.id,
  'project',
  'delete',
  'プロジェクトを削除'
FROM offices o
ON CONFLICT (office_id, resource_type, action) DO NOTHING;

-- チャット
INSERT INTO permission_definitions (office_id, resource_type, action, description)
SELECT 
  o.id,
  'chat',
  'view',
  'チャットを閲覧'
FROM offices o
ON CONFLICT (office_id, resource_type, action) DO NOTHING;

INSERT INTO permission_definitions (office_id, resource_type, action, description)
SELECT 
  o.id,
  'chat',
  'create',
  'メッセージを送信'
FROM offices o
ON CONFLICT (office_id, resource_type, action) DO NOTHING;

INSERT INTO permission_definitions (office_id, resource_type, action, description)
SELECT 
  o.id,
  'chat',
  'edit',
  'メッセージを編集'
FROM offices o
ON CONFLICT (office_id, resource_type, action) DO NOTHING;

INSERT INTO permission_definitions (office_id, resource_type, action, description)
SELECT 
  o.id,
  'chat',
  'delete',
  'メッセージを削除'
FROM offices o
ON CONFLICT (office_id, resource_type, action) DO NOTHING;

-- 承認ワークフロー
INSERT INTO permission_definitions (office_id, resource_type, action, description)
SELECT 
  o.id,
  'workflow',
  'view',
  '承認申請を閲覧'
FROM offices o
ON CONFLICT (office_id, resource_type, action) DO NOTHING;

INSERT INTO permission_definitions (office_id, resource_type, action, description)
SELECT 
  o.id,
  'workflow',
  'create',
  '承認申請を作成'
FROM offices o
ON CONFLICT (office_id, resource_type, action) DO NOTHING;

INSERT INTO permission_definitions (office_id, resource_type, action, description)
SELECT 
  o.id,
  'workflow',
  'approve',
  '承認申請を承認'
FROM offices o
ON CONFLICT (office_id, resource_type, action) DO NOTHING;

-- 権限割り当て（メンバー管理: 閲覧は全員、それ以外は管理者のみ）
INSERT INTO permission_assignments (office_id, permission_id, target_type, target_value)
SELECT 
  pd.office_id,
  pd.id,
  'role',
  'admin'
FROM permission_definitions pd
WHERE pd.resource_type = 'member'
ON CONFLICT DO NOTHING;

INSERT INTO permission_assignments (office_id, permission_id, target_type, target_value)
SELECT 
  pd.office_id,
  pd.id,
  'role',
  'staff'
FROM permission_definitions pd
WHERE pd.resource_type = 'member' AND pd.action = 'view'
ON CONFLICT DO NOTHING;

-- 権限割り当て（タスク管理: 閲覧・作成・編集は全員、削除は管理者のみ）
INSERT INTO permission_assignments (office_id, permission_id, target_type, target_value)
SELECT 
  pd.office_id,
  pd.id,
  'role',
  'admin'
FROM permission_definitions pd
WHERE pd.resource_type = 'task'
ON CONFLICT DO NOTHING;

INSERT INTO permission_assignments (office_id, permission_id, target_type, target_value)
SELECT 
  pd.office_id,
  pd.id,
  'role',
  'staff'
FROM permission_definitions pd
WHERE pd.resource_type = 'task' AND pd.action != 'delete'
ON CONFLICT DO NOTHING;

-- 権限割り当て（その他: 閲覧・作成は全員、編集・削除は管理者のみ）
INSERT INTO permission_assignments (office_id, permission_id, target_type, target_value)
SELECT 
  pd.office_id,
  pd.id,
  'role',
  'admin'
FROM permission_definitions pd
WHERE pd.resource_type IN ('schedule', 'announcement', 'file', 'project', 'chat', 'workflow')
ON CONFLICT DO NOTHING;

INSERT INTO permission_assignments (office_id, permission_id, target_type, target_value)
SELECT 
  pd.office_id,
  pd.id,
  'role',
  'staff'
FROM permission_definitions pd
WHERE pd.resource_type IN ('schedule', 'announcement', 'file', 'project', 'chat', 'workflow')
  AND pd.action IN ('view', 'create', 'approve')
ON CONFLICT DO NOTHING;

-- 確認用: 作成された権限定義を表示
SELECT 
  office_id,
  resource_type,
  action,
  description,
  COUNT(*) as count
FROM permission_definitions
GROUP BY office_id, resource_type, action, description
ORDER BY office_id, resource_type, action;

