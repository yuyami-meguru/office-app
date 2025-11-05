-- ============================================
-- クイックセットアップ: デフォルト権限の設定（簡易版）
-- このSQLを実行すると、全事務所にデフォルト権限が設定されます
-- ============================================

-- 全事務所に対してデフォルト権限を設定
DO $$
DECLARE
  office_record RECORD;
  perm_id BIGINT;
BEGIN
  FOR office_record IN SELECT id FROM offices LOOP
    -- メンバー管理権限
    INSERT INTO permission_definitions (office_id, resource_type, action, description)
    VALUES 
      (office_record.id, 'member', 'view', 'メンバー一覧を閲覧'),
      (office_record.id, 'member', 'create', 'メンバーを追加'),
      (office_record.id, 'member', 'edit', 'メンバーを編集'),
      (office_record.id, 'member', 'delete', 'メンバーを削除')
    ON CONFLICT (office_id, resource_type, action) DO NOTHING;

    -- タスク管理権限
    INSERT INTO permission_definitions (office_id, resource_type, action, description)
    VALUES 
      (office_record.id, 'task', 'view', 'タスクを閲覧'),
      (office_record.id, 'task', 'create', 'タスクを作成'),
      (office_record.id, 'task', 'edit', 'タスクを編集'),
      (office_record.id, 'task', 'delete', 'タスクを削除')
    ON CONFLICT (office_id, resource_type, action) DO NOTHING;

    -- スケジュール管理権限
    INSERT INTO permission_definitions (office_id, resource_type, action, description)
    VALUES 
      (office_record.id, 'schedule', 'view', 'スケジュールを閲覧'),
      (office_record.id, 'schedule', 'create', 'スケジュールを作成'),
      (office_record.id, 'schedule', 'edit', 'スケジュールを編集'),
      (office_record.id, 'schedule', 'delete', 'スケジュールを削除')
    ON CONFLICT (office_id, resource_type, action) DO NOTHING;

    -- お知らせ管理権限
    INSERT INTO permission_definitions (office_id, resource_type, action, description)
    VALUES 
      (office_record.id, 'announcement', 'view', 'お知らせを閲覧'),
      (office_record.id, 'announcement', 'create', 'お知らせを作成'),
      (office_record.id, 'announcement', 'edit', 'お知らせを編集'),
      (office_record.id, 'announcement', 'delete', 'お知らせを削除')
    ON CONFLICT (office_id, resource_type, action) DO NOTHING;

    -- ファイル管理権限
    INSERT INTO permission_definitions (office_id, resource_type, action, description)
    VALUES 
      (office_record.id, 'file', 'view', 'ファイルを閲覧'),
      (office_record.id, 'file', 'create', 'ファイルをアップロード'),
      (office_record.id, 'file', 'edit', 'ファイルを編集'),
      (office_record.id, 'file', 'delete', 'ファイルを削除')
    ON CONFLICT (office_id, resource_type, action) DO NOTHING;

    -- プロジェクト管理権限
    INSERT INTO permission_definitions (office_id, resource_type, action, description)
    VALUES 
      (office_record.id, 'project', 'view', 'プロジェクトを閲覧'),
      (office_record.id, 'project', 'create', 'プロジェクトを作成'),
      (office_record.id, 'project', 'edit', 'プロジェクトを編集'),
      (office_record.id, 'project', 'delete', 'プロジェクトを削除')
    ON CONFLICT (office_id, resource_type, action) DO NOTHING;

    -- チャット権限
    INSERT INTO permission_definitions (office_id, resource_type, action, description)
    VALUES 
      (office_record.id, 'chat', 'view', 'チャットを閲覧'),
      (office_record.id, 'chat', 'create', 'メッセージを送信'),
      (office_record.id, 'chat', 'edit', 'メッセージを編集'),
      (office_record.id, 'chat', 'delete', 'メッセージを削除')
    ON CONFLICT (office_id, resource_type, action) DO NOTHING;

    -- 承認ワークフロー権限
    INSERT INTO permission_definitions (office_id, resource_type, action, description)
    VALUES 
      (office_record.id, 'workflow', 'view', '承認申請を閲覧'),
      (office_record.id, 'workflow', 'create', '承認申請を作成'),
      (office_record.id, 'workflow', 'approve', '承認申請を承認')
    ON CONFLICT (office_id, resource_type, action) DO NOTHING;

    -- 権限割り当て（メンバー管理: 閲覧は全員、作成・編集・削除は管理者のみ）
    FOR perm_id IN 
      SELECT id FROM permission_definitions 
      WHERE office_id = office_record.id AND resource_type = 'member'
    LOOP
      IF (SELECT action FROM permission_definitions WHERE id = perm_id) = 'view' THEN
        INSERT INTO permission_assignments (office_id, permission_id, target_type, target_value)
        VALUES (office_record.id, perm_id, 'role', 'admin'),
               (office_record.id, perm_id, 'role', 'staff')
        ON CONFLICT DO NOTHING;
      ELSE
        INSERT INTO permission_assignments (office_id, permission_id, target_type, target_value)
        VALUES (office_record.id, perm_id, 'role', 'admin')
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;

    -- 権限割り当て（タスク管理: 閲覧・作成・編集は全員、削除は管理者のみ）
    FOR perm_id IN 
      SELECT id FROM permission_definitions 
      WHERE office_id = office_record.id AND resource_type = 'task'
    LOOP
      IF (SELECT action FROM permission_definitions WHERE id = perm_id) = 'delete' THEN
        INSERT INTO permission_assignments (office_id, permission_id, target_type, target_value)
        VALUES (office_record.id, perm_id, 'role', 'admin')
        ON CONFLICT DO NOTHING;
      ELSE
        INSERT INTO permission_assignments (office_id, permission_id, target_type, target_value)
        VALUES (office_record.id, perm_id, 'role', 'admin'),
               (office_record.id, perm_id, 'role', 'staff')
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;

    -- 権限割り当て（その他: 閲覧・作成は全員、編集・削除は管理者のみ）
    FOR perm_id IN 
      SELECT id FROM permission_definitions 
      WHERE office_id = office_record.id 
        AND resource_type IN ('schedule', 'announcement', 'file', 'project', 'chat', 'workflow')
    LOOP
      IF (SELECT action FROM permission_definitions WHERE id = perm_id) IN ('view', 'create', 'approve') THEN
        INSERT INTO permission_assignments (office_id, permission_id, target_type, target_value)
        VALUES (office_record.id, perm_id, 'role', 'admin'),
               (office_record.id, perm_id, 'role', 'staff')
        ON CONFLICT DO NOTHING;
      ELSE
        INSERT INTO permission_assignments (office_id, permission_id, target_type, target_value)
        VALUES (office_record.id, perm_id, 'role', 'admin')
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END LOOP;
END $$;

