-- 権限定義が作成されているか確認
SELECT 
  office_id,
  resource_type,
  action,
  description,
  COUNT(*) as count
FROM permission_definitions
GROUP BY office_id, resource_type, action, description
ORDER BY office_id, resource_type, action;

-- 権限割り当てが作成されているか確認
SELECT 
  pa.office_id,
  pd.resource_type,
  pd.action,
  pa.target_type,
  pa.target_value,
  COUNT(*) as count
FROM permission_assignments pa
JOIN permission_definitions pd ON pa.permission_id = pd.id
GROUP BY pa.office_id, pd.resource_type, pd.action, pa.target_type, pa.target_value
ORDER BY pa.office_id, pd.resource_type, pd.action;

-- 事務所一覧を確認
SELECT id, name FROM offices;

