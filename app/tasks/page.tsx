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
import {
  getTaskTags,
  createTaskTag,
  getTaskTagsForTask,
  addTagToTask,
  removeTagFromTask,
  getTaskAttachments,
  addTaskAttachment,
  deleteTaskAttachment,
  getTaskDependencies,
  addTaskDependency,
  removeTaskDependency,
  getTaskTemplates,
  createTaskFromTemplate,
  type TaskTag,
  type TaskAttachment,
  type TaskDependency,
  type TaskTemplate,
} from '@/lib/tasksAdvancedDB';

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
  const [taskTags, setTaskTags] = useState<TaskTag[]>([]);
  const [taskTagsForTasks, setTaskTagsForTasks] = useState<Record<number, TaskTag[]>>({});
  const [taskAttachments, setTaskAttachments] = useState<Record<number, TaskAttachment[]>>({});
  const [taskDependencies, setTaskDependencies] = useState<Record<number, TaskDependency[]>>({});
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([]);
  const [showTagManager, setShowTagManager] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');
  
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
      loadTaskDetails(expandedTaskId);
    }
  }, [expandedTaskId]);

  const loadData = async () => {
    await loadTasks();
    await loadMembers();
    await loadTaskTags();
    await loadTaskTemplates();
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

  const loadTaskTags = async () => {
    const data = await getTaskTags();
    setTaskTags(data);
  };

  const loadTaskTemplates = async () => {
    const data = await getTaskTemplates();
    setTaskTemplates(data);
  };

  const loadTaskDetails = async (taskId: number) => {
    const [tags, attachments, dependencies] = await Promise.all([
      getTaskTagsForTask(taskId),
      getTaskAttachments(taskId),
      getTaskDependencies(taskId),
    ]);
    setTaskTagsForTasks(prev => ({ ...prev, [taskId]: tags }));
    setTaskAttachments(prev => ({ ...prev, [taskId]: attachments }));
    setTaskDependencies(prev => ({ ...prev, [taskId]: dependencies }));
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    try {
      await createTaskTag(newTagName, newTagColor);
      setNewTagName('');
      setNewTagColor('#3B82F6');
      await loadTaskTags();
    } catch (err) {
      alert('タグの作成に失敗しました');
    }
  };

  const handleAddTagToTask = async (taskId: number, tagId: number) => {
    try {
      await addTagToTask(taskId, tagId);
      await loadTaskDetails(taskId);
    } catch (err) {
      alert('タグの追加に失敗しました');
    }
  };

  const handleRemoveTagFromTask = async (taskId: number, tagId: number) => {
    try {
      await removeTagFromTask(taskId, tagId);
      await loadTaskDetails(taskId);
    } catch (err) {
      alert('タグの削除に失敗しました');
    }
  };

  const handleAddAttachment = async (taskId: number, file: File) => {
    try {
      await addTaskAttachment(taskId, file);
      await loadTaskDetails(taskId);
    } catch (err: any) {
      alert(err.message || '添付ファイルの追加に失敗しました');
    }
  };

  const handleDeleteAttachment = async (attachmentId: number, taskId: number) => {
    try {
      await deleteTaskAttachment(attachmentId);
      await loadTaskDetails(taskId);
    } catch (err) {
      alert('添付ファイルの削除に失敗しました');
    }
  };

  const handleAddDependency = async (taskId: number, dependsOnTaskId: number) => {
    try {
      await addTaskDependency(taskId, dependsOnTaskId);
      await loadTaskDetails(taskId);
    } catch (err: any) {
      alert(err.message || '依存関係の追加に失敗しました');
    }
  };

  const handleRemoveDependency = async (dependencyId: number, taskId: number) => {
    try {
      await removeTaskDependency(dependencyId);
      await loadTaskDetails(taskId);
    } catch (err) {
      alert('依存関係の削除に失敗しました');
    }
  };

  const handleCreateFromTemplate = async (templateId: number) => {
    try {
      await createTaskFromTemplate(templateId);
      await loadTasks();
      setIsAdding(false);
    } catch (err: any) {
      alert(err.message || 'タスクの作成に失敗しました');
    }
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
            <div className="flex gap-3">
              <button
                onClick={() => setShowTagManager(!showTagManager)}
                className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-all font-semibold"
              >
                タグ管理
              </button>
              <button
                onClick={() => setIsAdding(!isAdding)}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-all font-semibold"
              >
                {isAdding ? 'キャンセル' : '+ 新規タスク'}
              </button>
            </div>
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

          {/* タグ管理 */}
          {showTagManager && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">タグ管理</h2>
                <button
                  onClick={() => setShowTagManager(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  閉じる
                </button>
              </div>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="タグ名"
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2"
                />
                <input
                  type="color"
                  value={newTagColor}
                  onChange={(e) => setNewTagColor(e.target.value)}
                  className="w-20 h-10 border border-gray-300 rounded"
                />
                <button
                  onClick={handleCreateTag}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  作成
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {taskTags.map(tag => (
                  <span
                    key={tag.id}
                    className="px-3 py-1 rounded-full text-sm font-medium"
                    style={{ backgroundColor: tag.color + '20', color: tag.color }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 新規追加フォーム */}
          {isAdding && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">新しいタスクを追加</h2>
                {taskTemplates.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">テンプレートから:</span>
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleCreateFromTemplate(parseInt(e.target.value, 10));
                        }
                      }}
                      className="border border-gray-300 rounded px-3 py-1 text-sm"
                    >
                      <option value="">選択...</option>
                      {taskTemplates.map(tmpl => (
                        <option key={tmpl.id} value={tmpl.id}>{tmpl.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
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

                {/* 詳細セクション */}
                {expandedTaskId === task.id && (
                  <div className="border-t border-gray-200 pt-4 mt-4 space-y-4">
                    {/* タグ */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">タグ</h4>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {taskTagsForTasks[task.id]?.map(tag => (
                          <span
                            key={tag.id}
                            className="px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2"
                            style={{ backgroundColor: tag.color + '20', color: tag.color }}
                          >
                            {tag.name}
                            <button
                              onClick={() => handleRemoveTagFromTask(task.id, tag.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAddTagToTask(task.id, parseInt(e.target.value, 10));
                            e.target.value = '';
                          }
                        }}
                        className="border border-gray-300 rounded px-3 py-1 text-sm"
                      >
                        <option value="">タグを追加...</option>
                        {taskTags
                          .filter(tag => !taskTagsForTasks[task.id]?.some(t => t.id === tag.id))
                          .map(tag => (
                            <option key={tag.id} value={tag.id}>{tag.name}</option>
                          ))}
                      </select>
                    </div>

                    {/* 依存関係 */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">依存関係</h4>
                      <div className="space-y-2 mb-2">
                        {taskDependencies[task.id]?.map(dep => (
                          <div key={dep.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span className="text-sm text-gray-700">{dep.dependsOnTaskTitle}</span>
                            <button
                              onClick={() => handleRemoveDependency(dep.id, task.id)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              削除
                            </button>
                          </div>
                        ))}
                      </div>
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAddDependency(task.id, parseInt(e.target.value, 10));
                            e.target.value = '';
                          }
                        }}
                        className="border border-gray-300 rounded px-3 py-1 text-sm"
                      >
                        <option value="">依存タスクを追加...</option>
                        {tasks
                          .filter(t => t.id !== task.id)
                          .map(t => (
                            <option key={t.id} value={t.id}>{t.title}</option>
                          ))}
                      </select>
                    </div>

                    {/* 添付ファイル */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">添付ファイル</h4>
                      <div className="space-y-2 mb-2">
                        {taskAttachments[task.id]?.map(att => (
                          <div key={att.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-700">{att.fileName}</span>
                              <span className="text-xs text-gray-500">
                                ({(att.fileSize / 1024).toFixed(1)} KB)
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <a
                                href={att.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 text-sm"
                              >
                                開く
                              </a>
                              <button
                                onClick={() => handleDeleteAttachment(att.id, task.id)}
                                className="text-red-600 hover:text-red-800 text-sm"
                              >
                                削除
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <input
                        type="file"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleAddAttachment(task.id, file);
                            e.target.value = '';
                          }
                        }}
                        className="text-sm"
                      />
                    </div>

                    {/* コメント */}
                    <div>
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
