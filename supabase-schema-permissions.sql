-- ============================================
-- 権限の細分化（機能×部署×ロールのACL）
-- ============================================

-- 権限定義テーブル
CREATE TABLE IF NOT EXISTS permission_definitions (
  id BIGSERIAL PRIMARY KEY,
  office_id TEXT NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL, -- 'member', 'task', 'schedule', 'announcement', 'file', 'project', 'chat', 'workflow'
  action TEXT NOT NULL, -- 'view', 'create', 'edit', 'delete', 'approve'
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(office_id, resource_type, action)
);

-- 権限割り当てテーブル
CREATE TABLE IF NOT EXISTS permission_assignments (
  id BIGSERIAL PRIMARY KEY,
  office_id TEXT NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  permission_id BIGINT NOT NULL REFERENCES permission_definitions(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('role', 'department', 'user')),
  target_value TEXT NOT NULL, -- 'admin', 'staff', 部署名, ユーザーID
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(permission_id, target_type, target_value)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_permission_definitions_office_id ON permission_definitions(office_id);
CREATE INDEX IF NOT EXISTS idx_permission_definitions_resource_type ON permission_definitions(resource_type);
CREATE INDEX IF NOT EXISTS idx_permission_assignments_office_id ON permission_assignments(office_id);
CREATE INDEX IF NOT EXISTS idx_permission_assignments_permission_id ON permission_assignments(permission_id);
CREATE INDEX IF NOT EXISTS idx_permission_assignments_target ON permission_assignments(target_type, target_value);

-- RLSポリシー（認証済みユーザーは全データにアクセス可能）
ALTER TABLE permission_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "permission_definitions_select" ON permission_definitions;
CREATE POLICY "permission_definitions_select" ON permission_definitions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "permission_definitions_insert" ON permission_definitions;
CREATE POLICY "permission_definitions_insert" ON permission_definitions
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "permission_definitions_update" ON permission_definitions;
CREATE POLICY "permission_definitions_update" ON permission_definitions
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "permission_definitions_delete" ON permission_definitions;
CREATE POLICY "permission_definitions_delete" ON permission_definitions
  FOR DELETE USING (true);

DROP POLICY IF EXISTS "permission_assignments_select" ON permission_assignments;
CREATE POLICY "permission_assignments_select" ON permission_assignments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "permission_assignments_insert" ON permission_assignments;
CREATE POLICY "permission_assignments_insert" ON permission_assignments
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "permission_assignments_update" ON permission_assignments;
CREATE POLICY "permission_assignments_update" ON permission_assignments
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "permission_assignments_delete" ON permission_assignments;
CREATE POLICY "permission_assignments_delete" ON permission_assignments
  FOR DELETE USING (true);

-- デフォルト権限を設定する関数（管理者は全権限、スタッフは基本権限）
CREATE OR REPLACE FUNCTION setup_default_permissions(office_id_param TEXT)
RETURNS void AS $$
DECLARE
  perm_id BIGINT;
BEGIN
  -- メンバー管理権限
  INSERT INTO permission_definitions (office_id, resource_type, action, description)
  VALUES 
    (office_id_param, 'member', 'view', 'メンバー一覧を閲覧')
    ON CONFLICT (office_id, resource_type, action) DO NOTHING
    RETURNING id INTO perm_id;
  
  IF perm_id IS NOT NULL THEN
    INSERT INTO permission_assignments (office_id, permission_id, target_type, target_value)
    VALUES (office_id_param, perm_id, 'role', 'admin'),
           (office_id_param, perm_id, 'role', 'staff')
    ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO permission_definitions (office_id, resource_type, action, description)
  VALUES 
    (office_id_param, 'member', 'create', 'メンバーを追加'),
    (office_id_param, 'member', 'edit', 'メンバーを編集'),
    (office_id_param, 'member', 'delete', 'メンバーを削除')
    ON CONFLICT (office_id, resource_type, action) DO NOTHING
    RETURNING id INTO perm_id;
  
  IF perm_id IS NOT NULL THEN
    INSERT INTO permission_assignments (office_id, permission_id, target_type, target_value)
    VALUES (office_id_param, perm_id, 'role', 'admin')
    ON CONFLICT DO NOTHING;
  END IF;

  -- タスク管理権限（全員が閲覧・作成・編集可能、削除は管理者のみ）
  INSERT INTO permission_definitions (office_id, resource_type, action, description)
  VALUES 
    (office_id_param, 'task', 'view', 'タスクを閲覧'),
    (office_id_param, 'task', 'create', 'タスクを作成'),
    (office_id_param, 'task', 'edit', 'タスクを編集')
    ON CONFLICT (office_id, resource_type, action) DO NOTHING
    RETURNING id INTO perm_id;
  
  IF perm_id IS NOT NULL THEN
    INSERT INTO permission_assignments (office_id, permission_id, target_type, target_value)
    VALUES (office_id_param, perm_id, 'role', 'admin'),
           (office_id_param, perm_id, 'role', 'staff')
    ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO permission_definitions (office_id, resource_type, action, description)
  VALUES 
    (office_id_param, 'task', 'delete', 'タスクを削除')
    ON CONFLICT (office_id, resource_type, action) DO NOTHING
    RETURNING id INTO perm_id;
  
  IF perm_id IS NOT NULL THEN
    INSERT INTO permission_assignments (office_id, permission_id, target_type, target_value)
    VALUES (office_id_param, perm_id, 'role', 'admin')
    ON CONFLICT DO NOTHING;
  END IF;

  -- 他のリソースも同様に設定...
END;
$$ LANGUAGE plpgsql;

