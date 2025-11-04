'use client';

import { useState, useEffect } from 'react';
import AuthGuard from '@/components/AuthGuard';
import DiscordLayout from '@/components/DiscordLayout';
import { getCurrentGlobalUser } from '@/lib/authDB';
import { getMembers } from '@/lib/membersDB';
import { 
  getTasks, 
  addTask as addTaskDB, 
  deleteTask as deleteTaskDB, 
  updateTaskStatus as updateTaskStatusDB,
  updateTask,
  getTaskComments,
  addTaskComment,
  type Task,
  type TaskStatus,
  type TaskPriority,
  type TaskComment,
} from '@/lib/tasksDB';

export const dynamic = 'force-dynamic';

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('全て');
  const [filterPriority, setFilterPriority] = useState<string>('全て');
  const [filterAssignee, setFilterAssignee] = useState<string>('全て');
  const [showOnlyMyTasks, setShowOnlyMyTasks] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);
  const [taskComments, setTaskComments] = useState<Record<number, TaskComment[]>>({});
  const [newComment, setNewComment] = useState<Record<number, string>>({});
  
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    status: '未着手' as TaskStatus,
    priority: '中' as TaskPriority,
    dueDate: '',
    assignedToUserId: null as number | null,
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (expandedTaskId) {
      loadTaskComments(expandedTaskId);
    }
  }, [expandedTaskId]);

  const loadData = async () => {
    await loadTasks();
    await loadMembers();
  };

  const loadTasks = async () => {
    const data = await getTasks();
    setTasks(data);
  };

  const loadMembers = async () => {
    const data = await getMembers();
    setMembers(data);
  };

  const loadTaskComments = async (taskId: number) => {
    const comments = await getTaskComments(taskId);
    setTaskComments(prev => ({ ...prev, [taskId]: comments }));
  };

  const handleAddTask = async () => {
    if (newTask.title) {
      try {
        await addTaskDB(newTask);
        await loadTasks();
        setNewTask({ title: '', description: '', status: '未着手', priority: '中', dueDate: '', assignedToUserId: null });
        setIsAdding(false);
      } catch (err) {
        alert('タスクの追加に失敗しました');
      }
    }
  };

  const handleDeleteTask = async (id: number) => {
    if (!confirm('このタスクを削除しますか？')) return;
    try {
      await deleteTaskDB(id);
      await loadTasks();
    } catch (err) {
      alert('タスクの削除に失敗しました');
    }
  };

  const handleStatusChange = async (id: number, newStatus: TaskStatus) => {
    try {
      await updateTaskStatusDB(id, newStatus);
      await loadTasks();
    } catch (err) {
      alert('ステータスの更新に失敗しました');
    }
  };

  const handleAssigneeChange = async (id: number, assignedToUserId: number | null) => {
    try {
      await updateTask(id, { assignedToUserId });
      await loadTasks();
    } catch (err) {
      alert('担当者の更新に失敗しました');
    }
  };

  const handleAddComment = async (taskId: number) => {
    const content = newComment[taskId];
    if (!content || !content.trim()) return;
    
    try {
      await addTaskComment(taskId, content);
      setNewComment(prev => ({ ...prev, [taskId]: '' }));
      await loadTaskComments(taskId);
    } catch (err) {
      alert('コメントの追加に失敗しました');
    }
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case '未着手': return 'bg-gray-100 text-gray-700';
      case '進行中': return 'bg-blue-100 text-blue-700';
      case '完了': return 'bg-green-100 text-green-700';
    }
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case '低': return 'text-gray-500';
      case '中': return 'text-yellow-600';
      case '高': return 'text-red-600';
    }
  };

  const getPriorityBadgeColor = (priority: TaskPriority) => {
    switch (priority) {
      case '低': return 'bg-gray-100 text-gray-700';
      case '中': return 'bg-yellow-100 text-yellow-700';
      case '高': return 'bg-red-100 text-red-700';
    }
  };

  const isDueSoon = (dueDate: string) => {
    if (!dueDate) return false;
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 3;
  };

  const isOverdue = (dueDate: string) => {
    if (!dueDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    return due < today;
  };

  // フィルタリング
  const user = getCurrentGlobalUser();
  let filteredTasks = tasks;

  // 検索
  if (searchQuery) {
    filteredTasks = filteredTasks.filter(task =>
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  // ステータスフィルタ
  if (filterStatus !== '全て') {
    filteredTasks = filteredTasks.filter(task => task.status === filterStatus);
  }

  // 優先度フィルタ
  if (filterPriority !== '全て') {
    filteredTasks = filteredTasks.filter(task => task.priority === filterPriority);
  }

  // 担当者フィルタ
  if (filterAssignee !== '全て') {
    if (filterAssignee === '未割り当て') {
      filteredTasks = filteredTasks.filter(task => !task.assignedToUserId);
    } else {
      filteredTasks = filteredTasks.filter(task => task.assignedToUserId === parseInt(filterAssignee, 10));
    }
  }

  // 自分のタスクのみ
  if (showOnlyMyTasks && user) {
    filteredTasks = filteredTasks.filter(task => task.assignedToUserId === user.id);
  }

  // 期限が近い順にソート
  filteredTasks.sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  return (
    <AuthGuard>
      <DiscordLayout>
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900 mb-2">タスク管理</h1>
              <p className="text-gray-600">やることリストを効率的に管理</p>
            </div>
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-all font-semibold"
            >
              {isAdding ? 'キャンセル' : '+ 新規タスク'}
            </button>
          </div>

          {/* 検索・フィルタ */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="lg:col-span-2">
                <input
                  type="text"
                  placeholder="タスクを検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                />
              </div>
              <div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                >
                  <option value="全て">全てのステータス</option>
                  <option value="未着手">未着手</option>
                  <option value="進行中">進行中</option>
                  <option value="完了">完了</option>
                </select>
              </div>
              <div>
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                >
                  <option value="全て">全ての優先度</option>
                  <option value="低">低</option>
                  <option value="中">中</option>
                  <option value="高">高</option>
                </select>
              </div>
              <div>
                <select
                  value={filterAssignee}
                  onChange={(e) => setFilterAssignee(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                >
                  <option value="全て">全ての担当者</option>
                  <option value="未割り当て">未割り当て</option>
                  {members.map(member => (
                    <option key={member.id} value={member.userId}>{member.displayName}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showOnlyMyTasks}
                    onChange={(e) => setShowOnlyMyTasks(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">自分のタスクのみ</span>
                </label>
              </div>
            </div>
          </div>

          {/* 新規追加フォーム */}
          {isAdding && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">新しいタスクを追加</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">タスク名 *</label>
                  <input
                    type="text"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    placeholder="タスク名を入力"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">説明</label>
                  <textarea
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    rows={3}
                    placeholder="タスクの詳細を入力"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">ステータス</label>
                    <select
                      value={newTask.status}
                      onChange={(e) => setNewTask({ ...newTask, status: e.target.value as TaskStatus })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    >
                      <option value="未着手">未着手</option>
                      <option value="進行中">進行中</option>
                      <option value="完了">完了</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">優先度</label>
                    <select
                      value={newTask.priority}
                      onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as TaskPriority })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    >
                      <option value="低">低</option>
                      <option value="中">中</option>
                      <option value="高">高</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">期限</label>
                    <input
                      type="date"
                      value={newTask.dueDate}
                      onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">担当者</label>
                    <select
                      value={newTask.assignedToUserId || ''}
                      onChange={(e) => setNewTask({ ...newTask, assignedToUserId: e.target.value ? parseInt(e.target.value, 10) : null })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    >
                      <option value="">未割り当て</option>
                      {members.map(member => (
                        <option key={member.id} value={member.userId}>{member.displayName}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  onClick={handleAddTask}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
                >
                  追加
                </button>
              </div>
            </div>
          )}

          {/* タスクリスト */}
          <div className="space-y-4">
            {filteredTasks.map((task) => (
              <div key={task.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="text-xl font-semibold text-gray-900">{task.title}</h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(task.status)}`}>
                        {task.status}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityBadgeColor(task.priority)}`}>
                        優先度: {task.priority}
                      </span>
                      {task.assignedToName && (
                        <span className="px-3 py-1 rounded-full text-sm bg-indigo-100 text-indigo-700">
                          担当: {task.assignedToName}
                        </span>
                      )}
                      {task.dueDate && (
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          isOverdue(task.dueDate) ? 'bg-red-100 text-red-700' :
                          isDueSoon(task.dueDate) ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {isOverdue(task.dueDate) ? '⚠️ 期限超過' : '期限'} {new Date(task.dueDate).toLocaleDateString('ja-JP')}
                        </span>
                      )}
                    </div>
                    {task.description && (
                      <p className="text-gray-600 mb-3">{task.description}</p>
                    )}
                    {task.createdByName && (
                      <p className="text-xs text-gray-500">作成者: {task.createdByName}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="text-red-500 hover:text-red-700 ml-4 text-sm font-semibold px-2 py-1"
                  >
                    削除
                  </button>
                </div>
                
                <div className="flex items-center gap-2 mb-4">
                  <button
                    onClick={() => handleStatusChange(task.id, '未着手')}
                    className={`px-3 py-1 rounded text-sm ${task.status === '未着手' ? 'bg-gray-200 font-medium' : 'bg-gray-100 hover:bg-gray-200'}`}
                  >
                    未着手
                  </button>
                  <button
                    onClick={() => handleStatusChange(task.id, '進行中')}
                    className={`px-3 py-1 rounded text-sm ${task.status === '進行中' ? 'bg-blue-200 font-medium' : 'bg-blue-100 hover:bg-blue-200'}`}
                  >
                    進行中
                  </button>
                  <button
                    onClick={() => handleStatusChange(task.id, '完了')}
                    className={`px-3 py-1 rounded text-sm ${task.status === '完了' ? 'bg-green-200 font-medium' : 'bg-green-100 hover:bg-green-200'}`}
                  >
                    完了
                  </button>
                  <select
                    value={task.assignedToUserId || ''}
                    onChange={(e) => handleAssigneeChange(task.id, e.target.value ? parseInt(e.target.value, 10) : null)}
                    className="ml-auto border border-gray-300 rounded px-3 py-1 text-sm"
                  >
                    <option value="">未割り当て</option>
                    {members.map(member => (
                      <option key={member.id} value={member.userId}>{member.displayName}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                  >
                    {expandedTaskId === task.id ? 'コメントを閉じる' : 'コメントを見る'}
                  </button>
                </div>

                {/* コメントセクション */}
                {expandedTaskId === task.id && (
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <h4 className="font-semibold text-gray-900 mb-3">コメント</h4>
                    <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                      {taskComments[task.id]?.map(comment => (
                        <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm text-gray-900">{comment.userName}</span>
                            <span className="text-xs text-gray-500">
                              {new Date(comment.createdAt).toLocaleString('ja-JP')}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                        </div>
                      ))}
                      {(!taskComments[task.id] || taskComments[task.id].length === 0) && (
                        <p className="text-sm text-gray-500">コメントはありません</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <textarea
                        value={newComment[task.id] || ''}
                        onChange={(e) => setNewComment(prev => ({ ...prev, [task.id]: e.target.value }))}
                        placeholder="コメントを追加..."
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        rows={2}
                      />
                      <button
                        onClick={() => handleAddComment(task.id)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
                      >
                        投稿
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredTasks.length === 0 && tasks.length > 0 && (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <p className="text-gray-500 text-lg">該当するタスクが見つかりません</p>
              <p className="text-gray-400 text-sm mt-2">フィルターを変更してください</p>
            </div>
          )}

          {tasks.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <p className="text-gray-500 text-lg">タスクがまだ登録されていません</p>
              <p className="text-gray-400 text-sm mt-2">「+ 新規タスク」ボタンから追加してください</p>
            </div>
          )}
        </div>
      </DiscordLayout>
    </AuthGuard>
  );
}
