import { supabase } from './supabase';
import { getCurrentOfficeId, getCurrentGlobalUser } from './authDB';

export type ApprovalWorkflowStep = {
  order: number;
  approverType: 'role' | 'user' | 'department';
  approverValue: string;
  required: boolean;
};

export type ApprovalWorkflow = {
  id: number;
  officeId: string;
  name: string;
  description: string | null;
  steps: ApprovalWorkflowStep[];
  createdBy: number;
  createdAt: string;
  updatedAt: string;
};

export type ApprovalRequestType = 'vacation' | 'expense' | 'permission' | 'other';
export type ApprovalRequestStatus = '承認待ち' | '承認中' | '承認済み' | '却下' | 'キャンセル';

export type ApprovalRequest = {
  id: number;
  officeId: string;
  workflowId: number;
  title: string;
  description: string | null;
  requestType: ApprovalRequestType;
  requestData: Record<string, any> | null;
  requestedBy: number;
  requestedByName: string;
  status: ApprovalRequestStatus;
  currentStep: number;
  createdAt: string;
  updatedAt: string;
};

export type ApprovalHistory = {
  id: number;
  requestId: number;
  stepOrder: number;
  approverId: number;
  approverName: string;
  action: '承認' | '却下' | '差し戻し';
  comment: string | null;
  createdAt: string;
};

// 承認ワークフロー一覧を取得
export async function getApprovalWorkflows(): Promise<ApprovalWorkflow[]> {
  const officeId = getCurrentOfficeId();
  if (!officeId) return [];

  const { data, error } = await supabase
    .from('approval_workflows')
    .select('*')
    .eq('office_id', officeId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('ワークフロー取得エラー:', error);
    return [];
  }

  return (data || []).map(workflow => ({
    id: workflow.id,
    officeId: workflow.office_id,
    name: workflow.name,
    description: workflow.description,
    steps: workflow.steps as ApprovalWorkflowStep[],
    createdBy: workflow.created_by,
    createdAt: workflow.created_at,
    updatedAt: workflow.updated_at,
  }));
}

// 承認ワークフローを作成
export async function createApprovalWorkflow(
  name: string,
  description: string,
  steps: ApprovalWorkflowStep[]
): Promise<ApprovalWorkflow> {
  const officeId = getCurrentOfficeId();
  const user = getCurrentGlobalUser();
  if (!officeId || !user) throw new Error('ログインが必要です');

  const { data, error } = await supabase
    .from('approval_workflows')
    .insert([
      {
        office_id: officeId,
        name,
        description: description || null,
        steps,
        created_by: user.id,
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error('ワークフローの作成に失敗しました');
  }

  return {
    id: data.id,
    officeId: data.office_id,
    name: data.name,
    description: data.description,
    steps: data.steps as ApprovalWorkflowStep[],
    createdBy: data.created_by,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

// 承認申請を作成
export async function createApprovalRequest(
  workflowId: number,
  title: string,
  description: string,
  requestType: ApprovalRequestType,
  requestData?: Record<string, any>
): Promise<ApprovalRequest> {
  const officeId = getCurrentOfficeId();
  const user = getCurrentGlobalUser();
  if (!officeId || !user) throw new Error('ログインが必要です');

  const { data, error } = await supabase
    .from('approval_requests')
    .insert([
      {
        office_id: officeId,
        workflow_id: workflowId,
        title,
        description: description || null,
        request_type: requestType,
        request_data: requestData || null,
        requested_by: user.id,
        status: '承認待ち',
        current_step: 1,
      },
    ])
    .select(`
      *,
      global_users:requested_by (id, name, username)
    `)
    .single();

  if (error) {
    throw new Error('承認申請の作成に失敗しました');
  }

  return {
    id: data.id,
    officeId: data.office_id,
    workflowId: data.workflow_id,
    title: data.title,
    description: data.description,
    requestType: data.request_type as ApprovalRequestType,
    requestData: data.request_data,
    requestedBy: data.requested_by,
    requestedByName: data.global_users?.name || data.global_users?.username || '不明',
    status: data.status as ApprovalRequestStatus,
    currentStep: data.current_step,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

// 承認申請一覧を取得
export async function getApprovalRequests(): Promise<ApprovalRequest[]> {
  const officeId = getCurrentOfficeId();
  if (!officeId) return [];

  const { data, error } = await supabase
    .from('approval_requests')
    .select(`
      *,
      global_users:requested_by (id, name, username)
    `)
    .eq('office_id', officeId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('承認申請取得エラー:', error);
    return [];
  }

  return (data || []).map(request => ({
    id: request.id,
    officeId: request.office_id,
    workflowId: request.workflow_id,
    title: request.title,
    description: request.description,
    requestType: request.request_type as ApprovalRequestType,
    requestData: request.request_data,
    requestedBy: request.requested_by,
    requestedByName: request.global_users?.name || request.global_users?.username || '不明',
    status: request.status as ApprovalRequestStatus,
    currentStep: request.current_step,
    createdAt: request.created_at,
    updatedAt: request.updated_at,
  }));
}

// 承認履歴を取得
export async function getApprovalHistory(requestId: number): Promise<ApprovalHistory[]> {
  const { data, error } = await supabase
    .from('approval_history')
    .select(`
      *,
      global_users:approver_id (id, name, username)
    `)
    .eq('request_id', requestId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('承認履歴取得エラー:', error);
    return [];
  }

  return (data || []).map(history => ({
    id: history.id,
    requestId: history.request_id,
    stepOrder: history.step_order,
    approverId: history.approver_id,
    approverName: history.global_users?.name || history.global_users?.username || '不明',
    action: history.action as '承認' | '却下' | '差し戻し',
    comment: history.comment,
    createdAt: history.created_at,
  }));
}

// 承認・却下・差し戻し
export async function processApproval(
  requestId: number,
  action: '承認' | '却下' | '差し戻し',
  comment?: string
): Promise<void> {
  const user = getCurrentGlobalUser();
  if (!user) throw new Error('ログインが必要です');

  const { data: request } = await supabase
    .from('approval_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (!request) throw new Error('申請が見つかりません');

  // 承認履歴を追加
  await supabase.from('approval_history').insert([
    {
      request_id: requestId,
      step_order: request.current_step,
      approver_id: user.id,
      action,
      comment: comment || null,
    },
  ]);

  // 申請ステータスを更新
  let newStatus: ApprovalRequestStatus;
  let newStep = request.current_step;

  if (action === '却下') {
    newStatus = '却下';
  } else if (action === '差し戻し') {
    newStatus = '承認待ち';
    newStep = Math.max(1, newStep - 1);
  } else if (action === '承認') {
    // ワークフローのステップ数を確認して完了判定
    const { data: workflow } = await supabase
      .from('approval_workflows')
      .select('steps')
      .eq('id', request.workflow_id)
      .single();

    if (workflow) {
      const steps = workflow.steps as ApprovalWorkflowStep[];
      if (newStep >= steps.length) {
        newStatus = '承認済み';
      } else {
        newStatus = '承認中';
        newStep += 1;
      }
    } else {
      newStatus = '承認済み';
    }
  } else {
    newStatus = request.status;
  }

  await supabase
    .from('approval_requests')
    .update({
      status: newStatus,
      current_step: newStep,
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId);
}

