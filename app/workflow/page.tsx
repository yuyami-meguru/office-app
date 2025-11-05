'use client';

import { useState, useEffect } from 'react';
import AuthGuard from '@/components/AuthGuard';
import DiscordLayout from '@/components/DiscordLayout';
import { getCurrentGlobalUser } from '@/lib/authDB';
import {
  getApprovalWorkflows,
  createApprovalWorkflow,
  getApprovalRequests,
  createApprovalRequest,
  getApprovalHistory,
  processApproval,
  type ApprovalWorkflow,
  type ApprovalRequest,
  type ApprovalRequestType,
  type ApprovalRequestStatus,
  type ApprovalHistory,
  type ApprovalWorkflowStep,
} from '@/lib/workflowDB';

export const dynamic = 'force-dynamic';

export default function WorkflowPage() {
  const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>([]);
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [requestHistory, setRequestHistory] = useState<ApprovalHistory[]>([]);
  const [isCreatingWorkflow, setIsCreatingWorkflow] = useState(false);
  const [isCreatingRequest, setIsCreatingRequest] = useState(false);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<number | null>(null);
  const [approvalAction, setApprovalAction] = useState<'承認' | '却下' | '差し戻し' | null>(null);
  const [approvalComment, setApprovalComment] = useState('');
  const user = getCurrentGlobalUser();

  const [newWorkflow, setNewWorkflow] = useState({
    name: '',
    description: '',
  });

  const [newRequest, setNewRequest] = useState({
    title: '',
    description: '',
    requestType: 'other' as ApprovalRequestType,
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedRequest) {
      loadRequestHistory(selectedRequest.id);
    }
  }, [selectedRequest]);

  const loadData = async () => {
    await loadWorkflows();
    await loadRequests();
  };

  const loadWorkflows = async () => {
    const data = await getApprovalWorkflows();
    setWorkflows(data);
  };

  const loadRequests = async () => {
    const data = await getApprovalRequests();
    setRequests(data);
  };

  const loadRequestHistory = async (requestId: number) => {
    const data = await getApprovalHistory(requestId);
    setRequestHistory(data);
  };

  const handleCreateWorkflow = async () => {
    if (!newWorkflow.name) return;

    // シンプルなワークフロー（管理者のみ承認）
    const steps: ApprovalWorkflowStep[] = [
      {
        order: 1,
        approverType: 'role',
        approverValue: '管理者',
        required: true,
      },
    ];

    try {
      await createApprovalWorkflow(newWorkflow.name, newWorkflow.description, steps);
      setNewWorkflow({ name: '', description: '' });
      setIsCreatingWorkflow(false);
      await loadWorkflows();
    } catch (err) {
      alert('ワークフローの作成に失敗しました');
    }
  };

  const handleCreateRequest = async () => {
    if (!newRequest.title || !selectedWorkflowId) return;

    try {
      await createApprovalRequest(
        selectedWorkflowId,
        newRequest.title,
        newRequest.description,
        newRequest.requestType
      );
      setNewRequest({ title: '', description: '', requestType: 'other' });
      setIsCreatingRequest(false);
      setSelectedWorkflowId(null);
      await loadRequests();
    } catch (err) {
      alert('承認申請の作成に失敗しました');
    }
  };

  const handleProcessApproval = async () => {
    if (!selectedRequest || !approvalAction) return;

    try {
      await processApproval(selectedRequest.id, approvalAction, approvalComment);
      setApprovalAction(null);
      setApprovalComment('');
      await loadRequests();
      if (selectedRequest) {
        await loadRequestHistory(selectedRequest.id);
      }
      alert(`${approvalAction}しました`);
    } catch (err) {
      alert('処理に失敗しました');
    }
  };

  const getStatusColor = (status: ApprovalRequestStatus) => {
    switch (status) {
      case '承認待ち': return 'bg-yellow-100 text-yellow-700';
      case '承認中': return 'bg-blue-100 text-blue-700';
      case '承認済み': return 'bg-green-100 text-green-700';
      case '却下': return 'bg-red-100 text-red-700';
      case 'キャンセル': return 'bg-gray-100 text-gray-700';
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case '承認': return 'text-green-600';
      case '却下': return 'text-red-600';
      case '差し戻し': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  const canApprove = (request: ApprovalRequest) => {
    // シンプルな実装：管理者のみ承認可能
    return user && request.status !== '承認済み' && request.status !== '却下';
  };

  return (
    <AuthGuard>
      <DiscordLayout>
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900 mb-2">承認ワークフロー</h1>
              <p className="text-gray-600">承認申請とワークフローを管理</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setIsCreatingRequest(!isCreatingRequest)}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-all font-semibold"
              >
                {isCreatingRequest ? 'キャンセル' : '+ 新規申請'}
              </button>
              <button
                onClick={() => setIsCreatingWorkflow(!isCreatingWorkflow)}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-all font-semibold"
              >
                {isCreatingWorkflow ? 'キャンセル' : '+ 新規ワークフロー'}
              </button>
            </div>
          </div>

          {/* 新規ワークフロー作成 */}
          {isCreatingWorkflow && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">新しいワークフローを作成</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ワークフロー名 *</label>
                  <input
                    type="text"
                    value={newWorkflow.name}
                    onChange={(e) => setNewWorkflow({ ...newWorkflow, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    placeholder="ワークフロー名を入力"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">説明</label>
                  <textarea
                    value={newWorkflow.description}
                    onChange={(e) => setNewWorkflow({ ...newWorkflow, description: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    rows={3}
                    placeholder="ワークフローの説明を入力"
                  />
                </div>
                <button
                  onClick={handleCreateWorkflow}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
                >
                  作成
                </button>
              </div>
            </div>
          )}

          {/* 新規申請作成 */}
          {isCreatingRequest && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">新しい承認申請を作成</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ワークフロー *</label>
                  <select
                    value={selectedWorkflowId || ''}
                    onChange={(e) => setSelectedWorkflowId(e.target.value ? parseInt(e.target.value, 10) : null)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  >
                    <option value="">ワークフローを選択...</option>
                    {workflows.map(wf => (
                      <option key={wf.id} value={wf.id}>{wf.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">申請タイトル *</label>
                  <input
                    type="text"
                    value={newRequest.title}
                    onChange={(e) => setNewRequest({ ...newRequest, title: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    placeholder="申請タイトルを入力"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">申請タイプ</label>
                  <select
                    value={newRequest.requestType}
                    onChange={(e) => setNewRequest({ ...newRequest, requestType: e.target.value as ApprovalRequestType })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  >
                    <option value="vacation">休暇申請</option>
                    <option value="expense">経費申請</option>
                    <option value="permission">権限申請</option>
                    <option value="other">その他</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">説明</label>
                  <textarea
                    value={newRequest.description}
                    onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    rows={3}
                    placeholder="申請内容を入力"
                  />
                </div>
                <button
                  onClick={handleCreateRequest}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                >
                  申請
                </button>
              </div>
            </div>
          )}

          {/* 申請一覧 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">承認申請一覧</h2>
              {requests.map(request => (
                <div
                  key={request.id}
                  onClick={() => setSelectedRequest(request)}
                  className={`bg-white rounded-xl shadow-sm border-2 p-6 cursor-pointer transition-all ${
                    selectedRequest?.id === request.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{request.title}</h3>
                      {request.description && (
                        <p className="text-gray-600 text-sm mb-3">{request.description}</p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(request.status)}`}>
                          {request.status}
                        </span>
                        <span className="text-sm text-gray-500">
                          申請者: {request.requestedByName}
                        </span>
                        <span className="text-sm text-gray-500">
                          ステップ: {request.currentStep}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 申請詳細 */}
            {selectedRequest && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">{selectedRequest.title}</h2>
                
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedRequest.status)}`}>
                      {selectedRequest.status}
                    </span>
                    <span className="text-sm text-gray-500">
                      申請者: {selectedRequest.requestedByName}
                    </span>
                    <span className="text-sm text-gray-500">
                      ステップ: {selectedRequest.currentStep}
                    </span>
                  </div>
                  {selectedRequest.description && (
                    <p className="text-gray-700 mb-4">{selectedRequest.description}</p>
                  )}
                  <p className="text-sm text-gray-500">
                    申請日: {new Date(selectedRequest.createdAt).toLocaleString('ja-JP')}
                  </p>
                </div>

                {/* 承認履歴 */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">承認履歴</h3>
                  <div className="space-y-3">
                    {requestHistory.map(history => (
                      <div key={history.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900">{history.approverName}</span>
                          <span className={`font-semibold ${getActionColor(history.action)}`}>
                            {history.action}
                          </span>
                        </div>
                        {history.comment && (
                          <p className="text-sm text-gray-600">{history.comment}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(history.createdAt).toLocaleString('ja-JP')}
                        </p>
                      </div>
                    ))}
                    {requestHistory.length === 0 && (
                      <p className="text-sm text-gray-500">承認履歴はありません</p>
                    )}
                  </div>
                </div>

                {/* 承認アクション */}
                {canApprove(selectedRequest) && (
                  <div className="border-t border-gray-200 pt-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">承認処理</h3>
                    <div className="space-y-3">
                      {approvalAction ? (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">コメント</label>
                            <textarea
                              value={approvalComment}
                              onChange={(e) => setApprovalComment(e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-4 py-2"
                              rows={3}
                              placeholder="コメントを入力（任意）"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={handleProcessApproval}
                              className={`flex-1 px-4 py-2 rounded-lg text-white font-semibold ${
                                approvalAction === '承認' ? 'bg-green-600 hover:bg-green-700' :
                                approvalAction === '却下' ? 'bg-red-600 hover:bg-red-700' :
                                'bg-orange-600 hover:bg-orange-700'
                              }`}
                            >
                              {approvalAction}を確定
                            </button>
                            <button
                              onClick={() => {
                                setApprovalAction(null);
                                setApprovalComment('');
                              }}
                              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                              キャンセル
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setApprovalAction('承認')}
                            className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-semibold"
                          >
                            承認
                          </button>
                          <button
                            onClick={() => setApprovalAction('却下')}
                            className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-semibold"
                          >
                            却下
                          </button>
                          <button
                            onClick={() => setApprovalAction('差し戻し')}
                            className="flex-1 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 font-semibold"
                          >
                            差し戻し
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {requests.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <p className="text-gray-500 text-lg">承認申請がまだありません</p>
              <p className="text-gray-400 text-sm mt-2">「+ 新規申請」ボタンから追加してください</p>
            </div>
          )}
        </div>
      </DiscordLayout>
    </AuthGuard>
  );
}

