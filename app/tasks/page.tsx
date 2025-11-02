'use client';

import { useState, useEffect } from 'react';
import AuthGuard from '@/components/AuthGuard';
import Header from '@/components/Header';
import { 
  getTasks, 
  addTask as addTaskDB, 
  deleteTask as deleteTaskDB, 
  updateTaskStatus as updateTaskStatusDB,
  type Task,
  type TaskStatus,
  type TaskPriority
} from '@/lib/tasksDB';

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);

  const [isAdding, setIsAdding] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    status: '未着手' as TaskStatus,
    priority: '中' as TaskPriority,
    dueDate: '',
  });

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    const data = await getTasks();
    setTasks(data);
  };

  const handleAddTask = async () => {
    if (newTask.title) {
      try {
        await addTaskDB(newTask);
        await loadTasks();
        setNewTask({ title: '', description: '', status: '未着手', priority: '中', dueDate: '' });
        setIsAdding(false);
      } catch (err) {
        alert('タスクの追加に失敗しました');
      }
    }
  };

  const handleDeleteTask = async (id: number) => {
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

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        {/* ヘッダー */}
        <Header title="タスク管理" showBackButton />
        
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            {isAdding ? 'キャンセル' : '+ 新規タスク'}
          </button>
        </div>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto py-6 px-4">
        {/* 新規追加フォーム */}
        {isAdding && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">新しいタスクを追加</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">タスク名 *</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="タスク名を入力"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">説明</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  rows={3}
                  placeholder="タスクの詳細を入力"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ステータス</label>
                  <select
                    value={newTask.status}
                    onChange={(e) => setNewTask({ ...newTask, status: e.target.value as TaskStatus })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
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
                    className="w-full border border-gray-300 rounded px-3 py-2"
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
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
              </div>
              <button
                onClick={handleAddTask}
                className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600"
              >
                追加
              </button>
            </div>
          </div>
        )}

        {/* タスクリスト */}
        <div className="space-y-4">
          {tasks.map((task) => (
            <div key={task.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold">{task.title}</h3>
                    <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(task.status)}`}>
                      {task.status}
                    </span>
                    <span className={`font-medium ${getPriorityColor(task.priority)}`}>
                      優先度: {task.priority}
                    </span>
                  </div>
                  {task.description && (
                    <p className="text-gray-600 mb-3">{task.description}</p>
                  )}
                  {task.dueDate && (
                    <p className="text-gray-500 text-sm">期限: {task.dueDate}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteTask(task.id)}
                  className="text-red-500 hover:text-red-700 ml-4 text-xs font-semibold px-2 py-1"
                >
                  削除
                </button>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleStatusChange(task.id, '未着手')}
                  className={`px-3 py-1 rounded text-sm ${task.status === '未着手' ? 'bg-gray-200' : 'bg-gray-100 hover:bg-gray-200'}`}
                >
                  未着手
                </button>
                <button
                  onClick={() => handleStatusChange(task.id, '進行中')}
                  className={`px-3 py-1 rounded text-sm ${task.status === '進行中' ? 'bg-blue-200' : 'bg-blue-100 hover:bg-blue-200'}`}
                >
                  進行中
                </button>
                <button
                  onClick={() => handleStatusChange(task.id, '完了')}
                  className={`px-3 py-1 rounded text-sm ${task.status === '完了' ? 'bg-green-200' : 'bg-green-100 hover:bg-green-200'}`}
                >
                  完了
                </button>
              </div>
            </div>
          ))}
        </div>

        {tasks.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">タスクがまだ登録されていません</p>
            <p className="text-gray-400 text-sm mt-2">「+ 新規タスク」ボタンから追加してください</p>
          </div>
        )}
      </main>
      </div>
    </AuthGuard>
  );
}

