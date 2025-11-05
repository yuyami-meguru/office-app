-- ============================================
-- ワークフロー/承認機能
-- ============================================

-- 承認ワークフロー定義
CREATE TABLE IF NOT EXISTS approval_workflows (
  id BIGSERIAL PRIMARY KEY,
  office_id TEXT NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  steps JSONB NOT NULL, -- [{order: 1, approver_type: 'role|user|department', approver_value: '...', required: true}]
  created_by INTEGER NOT NULL REFERENCES global_users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 承認申請
CREATE TABLE IF NOT EXISTS approval_requests (
  id BIGSERIAL PRIMARY KEY,
  office_id TEXT NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  workflow_id BIGINT NOT NULL REFERENCES approval_workflows(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  request_type TEXT NOT NULL CHECK (request_type IN ('vacation', 'expense', 'permission', 'other')),
  request_data JSONB,
  requested_by INTEGER NOT NULL REFERENCES global_users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT '承認待ち' CHECK (status IN ('承認待ち', '承認中', '承認済み', '却下', 'キャンセル')),
  current_step INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 承認履歴
CREATE TABLE IF NOT EXISTS approval_history (
  id BIGSERIAL PRIMARY KEY,
  request_id BIGINT NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  approver_id INTEGER NOT NULL REFERENCES global_users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('承認', '却下', '差し戻し')),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_approval_workflows_office_id ON approval_workflows(office_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_office_id ON approval_requests(office_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_workflow_id ON approval_requests(workflow_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_requested_by ON approval_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_history_request_id ON approval_history(request_id);
CREATE INDEX IF NOT EXISTS idx_approval_history_approver_id ON approval_history(approver_id);

