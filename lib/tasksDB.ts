import { supabase } from './supabase';
import { getCurrentOfficeId } from './userManagerDB';

export type TaskStatus = '未着手' | '進行中' | '完了';
export type TaskPriority = '低' | '中' | '高';

export type Task = {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
};

// 全タスクを取得
export async function getTasks(): Promise<Task[]> {
  const officeId = getCurrentOfficeId();
  if (!officeId) return [];
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
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
    dueDate: task.due_date,
  }));
}

// タスクを追加
export async function addTask(task: Omit<Task, 'id'>): Promise<Task> {
  const officeId = getCurrentOfficeId();
  if (!officeId) throw new Error('事務所が選択されていません');
  const { data, error } = await supabase
    .from('tasks')
    .insert([
      {
        office_id: officeId,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        due_date: task.dueDate,
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error('タスクの追加に失敗しました');
  }

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    status: data.status as TaskStatus,
    priority: data.priority as TaskPriority,
    dueDate: data.due_date,
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

