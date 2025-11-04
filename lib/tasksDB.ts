import { supabase } from './supabase';
import { getCurrentOfficeId, getCurrentGlobalUser } from './authDB';

export type TaskStatus = '未着手' | '進行中' | '完了';
export type TaskPriority = '低' | '中' | '高';

export type Task = {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  assignedToUserId: number | null;
  assignedToName: string | null;
  createdByUserId: number | null;
  createdByName: string | null;
};

export type TaskComment = {
  id: number;
  taskId: number;
  userId: number;
  userName: string;
  content: string;
  createdAt: string;
};

// 全タスクを取得
export async function getTasks(): Promise<Task[]> {
  const officeId = getCurrentOfficeId();
  if (!officeId) return [];
  
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      assigned_user:assigned_to_user_id (id, name, username),
      created_user:created_by_user_id (id, name, username)
    `)
    .eq('office_id', officeId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('タスク取得エラー:', error);
    return [];
  }

  return (data || []).map(task => ({
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status as TaskStatus,
    priority: task.priority as TaskPriority,
    dueDate: task.due_date || '',
    assignedToUserId: task.assigned_to_user_id || null,
    assignedToName: task.assigned_user?.name || task.assigned_user?.username || null,
    createdByUserId: task.created_by_user_id || null,
    createdByName: task.created_user?.name || task.created_user?.username || null,
  }));
}

// タスクを追加
export async function addTask(task: Omit<Task, 'id' | 'assignedToName' | 'createdByName' | 'createdByUserId'>): Promise<Task> {
  const officeId = getCurrentOfficeId();
  const user = getCurrentGlobalUser();
  if (!officeId) throw new Error('事務所が選択されていません');
  if (!user) throw new Error('ログインが必要です');
  
  const { data, error } = await supabase
    .from('tasks')
    .insert([
      {
        office_id: officeId,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        due_date: task.dueDate || null,
        assigned_to_user_id: task.assignedToUserId || null,
        created_by_user_id: user.id,
      },
    ])
    .select(`
      *,
      assigned_user:assigned_to_user_id (id, name, username),
      created_user:created_by_user_id (id, name, username)
    `)
    .single();

  if (error) {
    console.error('タスク追加エラー:', error);
    throw new Error('タスクの追加に失敗しました');
  }

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    status: data.status as TaskStatus,
    priority: data.priority as TaskPriority,
    dueDate: data.due_date || '',
    assignedToUserId: data.assigned_to_user_id || null,
    assignedToName: data.assigned_user?.name || data.assigned_user?.username || null,
    createdByUserId: data.created_by_user_id || null,
    createdByName: data.created_user?.name || data.created_user?.username || null,
  };
}

// タスクを削除
export async function deleteTask(id: number): Promise<boolean> {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error('タスクの削除に失敗しました');
  }

  return true;
}

// タスクのステータスを更新
export async function updateTaskStatus(id: number, status: TaskStatus): Promise<boolean> {
  const { error } = await supabase
    .from('tasks')
    .update({ status })
    .eq('id', id);

  if (error) {
    throw new Error('タスクの更新に失敗しました');
  }

  return true;
}

// タスクの担当者を更新
export async function updateTaskAssignee(id: number, assignedToUserId: number | null): Promise<boolean> {
  const { error } = await supabase
    .from('tasks')
    .update({ assigned_to_user_id: assignedToUserId })
    .eq('id', id);

  if (error) {
    throw new Error('担当者の更新に失敗しました');
  }

  return true;
}

// タスクの全情報を更新
export async function updateTask(id: number, task: Partial<Omit<Task, 'id' | 'assignedToName' | 'createdByName'>>): Promise<boolean> {
  const updateData: any = {};
  if (task.title !== undefined) updateData.title = task.title;
  if (task.description !== undefined) updateData.description = task.description;
  if (task.status !== undefined) updateData.status = task.status;
  if (task.priority !== undefined) updateData.priority = task.priority;
  if (task.dueDate !== undefined) updateData.due_date = task.dueDate || null;
  if (task.assignedToUserId !== undefined) updateData.assigned_to_user_id = task.assignedToUserId || null;

  const { error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', id);

  if (error) {
    throw new Error('タスクの更新に失敗しました');
  }

  return true;
}

// タスクコメントを取得
export async function getTaskComments(taskId: number): Promise<TaskComment[]> {
  const { data, error } = await supabase
    .from('task_comments')
    .select(`
      *,
      global_users:user_id (id, name, username)
    `)
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('コメント取得エラー:', error);
    return [];
  }

  return (data || []).map(comment => ({
    id: comment.id,
    taskId: comment.task_id,
    userId: comment.user_id,
    userName: comment.global_users?.name || comment.global_users?.username || '不明',
    content: comment.content,
    createdAt: comment.created_at,
  }));
}

// タスクコメントを追加
export async function addTaskComment(taskId: number, content: string): Promise<TaskComment> {
  const user = getCurrentGlobalUser();
  if (!user) throw new Error('ログインが必要です');

  const { data, error } = await supabase
    .from('task_comments')
    .insert([
      {
        task_id: taskId,
        user_id: user.id,
        content,
      },
    ])
    .select(`
      *,
      global_users:user_id (id, name, username)
    `)
    .single();

  if (error) {
    console.error('コメント追加エラー:', error);
    throw new Error('コメントの追加に失敗しました');
  }

  return {
    id: data.id,
    taskId: data.task_id,
    userId: data.user_id,
    userName: data.global_users?.name || data.global_users?.username || '不明',
    content: data.content,
    createdAt: data.created_at,
  };
}
