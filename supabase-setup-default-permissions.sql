-- ============================================
-- デフォルト権限の設定
-- このSQLを実行すると、現在の事務所にデフォルト権限が設定されます
-- ============================================

-- まず、事務所IDを確認（必要に応じて変更してください）
-- 例: 'DEMO2025' を実際の事務所IDに変更

-- デフォルト権限を設定する関数（既に作成済みの場合はスキップ）
CREATE OR REPLACE FUNCTION setup_default_permissions(office_id_param TEXT)
RETURNS void AS $$
DECLARE
  perm_id BIGINT;
BEGIN
  -- メンバー管理権限
  -- 閲覧: 全員
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
  ELSE
    SELECT id INTO perm_id FROM permission_definitions 
    WHERE office_id = office_id_param AND resource_type = 'member' AND action = 'view';
  END IF;
  
  IF perm_id IS NOT NULL THEN
    INSERT INTO permission_assignments (office_id, permission_id, target_type, target_value)
    VALUES (office_id_param, perm_id, 'role', 'admin'),
           (office_id_param, perm_id, 'role', 'staff')
    ON CONFLICT DO NOTHING;
  END IF;

  -- 作成・編集・削除: 管理者のみ
  INSERT INTO permission_definitions (office_id, resource_type, action, description)
  VALUES 
    (office_id_param, 'member', 'create', 'メンバーを追加'),
    (office_id_param, 'member', 'edit', 'メンバーを編集'),
    (office_id_param, 'member', 'delete', 'メンバーを削除')
    ON CONFLICT (office_id, resource_type, action) DO NOTHING;

  -- タスク管理権限
  -- 閲覧・作成・編集: 全員
  INSERT INTO permission_definitions (office_id, resource_type, action, description)
  VALUES 
    (office_id_param, 'task', 'view', 'タスクを閲覧'),
    (office_id_param, 'task', 'create', 'タスクを作成'),
    (office_id_param, 'task', 'edit', 'タスクを編集')
    ON CONFLICT (office_id, resource_type, action) DO NOTHING;

  -- 削除: 管理者のみ
  INSERT INTO permission_definitions (office_id, resource_type, action, description)
  VALUES 
    (office_id_param, 'task', 'delete', 'タスクを削除')
    ON CONFLICT (office_id, resource_type, action) DO NOTHING;

  -- スケジュール管理権限
  INSERT INTO permission_definitions (office_id, resource_type, action, description)
  VALUES 
    (office_id_param, 'schedule', 'view', 'スケジュールを閲覧'),
    (office_id_param, 'schedule', 'create', 'スケジュールを作成'),
    (office_id_param, 'schedule', 'edit', 'スケジュールを編集'),
    (office_id_param, 'schedule', 'delete', 'スケジュールを削除')
    ON CONFLICT (office_id, resource_type, action) DO NOTHING;

  -- お知らせ管理権限
  INSERT INTO permission_definitions (office_id, resource_type, action, description)
  VALUES 
    (office_id_param, 'announcement', 'view', 'お知らせを閲覧'),
    (office_id_param, 'announcement', 'create', 'お知らせを作成'),
    (office_id_param, 'announcement', 'edit', 'お知らせを編集'),
    (office_id_param, 'announcement', 'delete', 'お知らせを削除')
    ON CONFLICT (office_id, resource_type, action) DO NOTHING;

  -- ファイル管理権限
  INSERT INTO permission_definitions (office_id, resource_type, action, description)
  VALUES 
    (office_id_param, 'file', 'view', 'ファイルを閲覧'),
    (office_id_param, 'file', 'create', 'ファイルをアップロード'),
    (office_id_param, 'file', 'edit', 'ファイルを編集'),
    (office_id_param, 'file', 'delete', 'ファイルを削除')
    ON CONFLICT (office_id, resource_type, action) DO NOTHING;

  -- プロジェクト管理権限
  INSERT INTO permission_definitions (office_id, resource_type, action, description)
  VALUES 
    (office_id_param, 'project', 'view', 'プロジェクトを閲覧'),
    (office_id_param, 'project', 'create', 'プロジェクトを作成'),
    (office_id_param, 'project', 'edit', 'プロジェクトを編集'),
    (office_id_param, 'project', 'delete', 'プロジェクトを削除')
    ON CONFLICT (office_id, resource_type, action) DO NOTHING;

  -- チャット権限
  INSERT INTO permission_definitions (office_id, resource_type, action, description)
  VALUES 
    (office_id_param, 'chat', 'view', 'チャットを閲覧'),
    (office_id_param, 'chat', 'create', 'メッセージを送信'),
    (office_id_param, 'chat', 'edit', 'メッセージを編集'),
    (office_id_param, 'chat', 'delete', 'メッセージを削除')
    ON CONFLICT (office_id, resource_type, action) DO NOTHING;

  -- 承認ワークフロー権限
  INSERT INTO permission_definitions (office_id, resource_type, action, description)
  VALUES 
    (office_id_param, 'workflow', 'view', '承認申請を閲覧'),
    (office_id_param, 'workflow', 'create', '承認申請を作成'),
    (office_id_param, 'workflow', 'approve', '承認申請を承認')
    ON CONFLICT (office_id, resource_type, action) DO NOTHING;

  -- 権限割り当て（全員に閲覧権限、管理者に全権限）
  -- メンバー管理
  FOR perm_id IN SELECT id FROM permission_definitions WHERE office_id = office_id_param AND resource_type = 'member' LOOP
    INSERT INTO permission_assignments (office_id, permission_id, target_type, target_value)
    SELECT office_id_param, perm_id, 'role', 'admin'
    WHERE NOT EXISTS (
      SELECT 1 FROM permission_assignments WHERE permission_id = perm_id AND target_type = 'role' AND target_value = 'admin'
    );
    
    IF (SELECT action FROM permission_definitions WHERE id = perm_id) = 'view' THEN
      INSERT INTO permission_assignments (office_id, permission_id, target_type, target_value)
      SELECT office_id_param, perm_id, 'role', 'staff'
      WHERE NOT EXISTS (
        SELECT 1 FROM permission_assignments WHERE permission_id = perm_id AND target_type = 'role' AND target_value = 'staff'
      );
    END IF;
  END LOOP;

  -- タスク管理
  FOR perm_id IN SELECT id FROM permission_definitions WHERE office_id = office_id_param AND resource_type = 'task' LOOP
    INSERT INTO permission_assignments (office_id, permission_id, target_type, target_value)
    SELECT office_id_param, perm_id, 'role', 'admin'
    WHERE NOT EXISTS (
      SELECT 1 FROM permission_assignments WHERE permission_id = perm_id AND target_type = 'role' AND target_value = 'admin'
    );
    
    IF (SELECT action FROM permission_definitions WHERE id = perm_id) != 'delete' THEN
      INSERT INTO permission_assignments (office_id, permission_id, target_type, target_value)
      SELECT office_id_param, perm_id, 'role', 'staff'
      WHERE NOT EXISTS (
        SELECT 1 FROM permission_assignments WHERE permission_id = perm_id AND target_type = 'role' AND target_value = 'staff'
      );
    END IF;
  END LOOP;

  -- その他のリソース（全員に閲覧・作成権限、管理者に全権限）
  FOR perm_id IN SELECT id FROM permission_definitions WHERE office_id = office_id_param AND resource_type IN ('schedule', 'announcement', 'file', 'project', 'chat', 'workflow') LOOP
    INSERT INTO permission_assignments (office_id, permission_id, target_type, target_value)
    SELECT office_id_param, perm_id, 'role', 'admin'
    WHERE NOT EXISTS (
      SELECT 1 FROM permission_assignments WHERE permission_id = perm_id AND target_type = 'role' AND target_value = 'admin'
    );
    
    IF (SELECT action FROM permission_definitions WHERE id = perm_id) IN ('view', 'create') THEN
      INSERT INTO permission_assignments (office_id, permission_id, target_type, target_value)
      SELECT office_id_param, perm_id, 'role', 'staff'
      WHERE NOT EXISTS (
        SELECT 1 FROM permission_assignments WHERE permission_id = perm_id AND target_type = 'role' AND target_value = 'staff'
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 全事務所にデフォルト権限を設定
DO $$
DECLARE
  office_record RECORD;
BEGIN
  FOR office_record IN SELECT id FROM offices LOOP
    PERFORM setup_default_permissions(office_record.id);
  END LOOP;
END $$;

-- 特定の事務所のみに設定する場合（上記の代わりにこちらを使用）
-- SELECT setup_default_permissions('DEMO2025'); -- 'DEMO2025'を実際の事務所IDに変更

