import { supabase } from './supabase';
import { getCurrentOfficeId, getCurrentGlobalUser } from './authDB';
import { uploadFileToStorage } from './filesDB';

export type TaskTag = {
  id: number;
  officeId: string;
  name: string;
  color: string;
};

export type TaskAttachment = {
  id: number;
  taskId: number;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedBy: number;
  uploadedByName: string;
  uploadedAt: string;
};

export type TaskDependency = {
  id: number;
  taskId: number;
  dependsOnTaskId: number;
  dependsOnTaskTitle: string;
};

export type TaskTemplate = {
  id: number;
  officeId: string;
  name: string;
  title: string;
  description: string;
  priority: '低' | '中' | '高';
  department: string | null;
  createdBy: number;
  createdAt: string;
};

// タスクタグ一覧を取得
export async function getTaskTags(): Promise<TaskTag[]> {
  const officeId = getCurrentOfficeId();
  if (!officeId) return [];

  const { data, error } = await supabase
    .from('task_tags')
    .select('*')
    .eq('office_id', officeId)
    .order('name', { ascending: true });

  if (error) {
    console.error('タグ取得エラー:', error);
    return [];
  }

  return (data || []).map(tag => ({
    id: tag.id,
    officeId: tag.office_id,
    name: tag.name,
    color: tag.color,
  }));
}

// タスクタグを作成
export async function createTaskTag(name: string, color: string = '#3B82F6'): Promise<TaskTag> {
  const officeId = getCurrentOfficeId();
  if (!officeId) throw new Error('事務所が選択されていません');

  const { data, error } = await supabase
    .from('task_tags')
    .insert([{ office_id: officeId, name, color }])
    .select()
    .single();

  if (error) {
    throw new Error('タグの作成に失敗しました');
  }

  return {
    id: data.id,
    officeId: data.office_id,
    name: data.name,
    color: data.color,
  };
}

// タスクにタグを追加
export async function addTagToTask(taskId: number, tagId: number): Promise<void> {
  const { error } = await supabase
    .from('task_tag_assignments')
    .insert([{ task_id: taskId, tag_id: tagId }]);

  if (error) {
    throw new Error('タグの追加に失敗しました');
  }
}

// タスクからタグを削除
export async function removeTagFromTask(taskId: number, tagId: number): Promise<void> {
  const { error } = await supabase
    .from('task_tag_assignments')
    .delete()
    .eq('task_id', taskId)
    .eq('tag_id', tagId);

  if (error) {
    throw new Error('タグの削除に失敗しました');
  }
}

// タスクのタグ一覧を取得
export async function getTaskTagsForTask(taskId: number): Promise<TaskTag[]> {
  const { data, error } = await supabase
    .from('task_tag_assignments')
    .select(`
      task_tags (*)
    `)
    .eq('task_id', taskId);

  if (error) {
    console.error('タスクタグ取得エラー:', error);
    return [];
  }

  return (data || []).map((item: any) => ({
    id: item.task_tags.id,
    officeId: item.task_tags.office_id,
    name: item.task_tags.name,
    color: item.task_tags.color,
  }));
}

// タスクの添付ファイルを取得
export async function getTaskAttachments(taskId: number): Promise<TaskAttachment[]> {
  const { data, error } = await supabase
    .from('task_attachments')
    .select(`
      *,
      global_users:uploaded_by (id, name, username)
    `)
    .eq('task_id', taskId)
    .order('uploaded_at', { ascending: false });

  if (error) {
    console.error('添付ファイル取得エラー:', error);
    return [];
  }

  return (data || []).map(att => ({
    id: att.id,
    taskId: att.task_id,
    fileUrl: att.file_url,
    fileName: att.file_name,
    fileSize: att.file_size,
    fileType: att.file_type,
    uploadedBy: att.uploaded_by,
    uploadedByName: att.global_users?.name || att.global_users?.username || '不明',
    uploadedAt: att.uploaded_at,
  }));
}

// タスクに添付ファイルを追加
export async function addTaskAttachment(taskId: number, file: File): Promise<TaskAttachment> {
  const user = getCurrentGlobalUser();
  const officeId = getCurrentOfficeId();
  if (!user || !officeId) throw new Error('ログインが必要です');

  // ファイルサイズチェック（50MB以下）
  if (file.size > 50 * 1024 * 1024) {
    throw new Error('ファイルサイズは50MB以下にしてください');
  }

  // Storageにアップロード
  const fileUrl = await uploadFileToStorage(file, user.id, officeId);

  const { data, error } = await supabase
    .from('task_attachments')
    .insert([
      {
        task_id: taskId,
        file_url: fileUrl,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        uploaded_by: user.id,
      },
    ])
    .select(`
      *,
      global_users:uploaded_by (id, name, username)
    `)
    .single();

  if (error) {
    throw new Error('添付ファイルの追加に失敗しました');
  }

  return {
    id: data.id,
    taskId: data.task_id,
    fileUrl: data.file_url,
    fileName: data.file_name,
    fileSize: data.file_size,
    fileType: data.file_type,
    uploadedBy: data.uploaded_by,
    uploadedByName: data.global_users?.name || data.global_users?.username || '不明',
    uploadedAt: data.uploaded_at,
  };
}

// タスクの添付ファイルを削除
export async function deleteTaskAttachment(id: number): Promise<void> {
  const { error } = await supabase
    .from('task_attachments')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error('添付ファイルの削除に失敗しました');
  }
}

// タスクの依存関係を取得
export async function getTaskDependencies(taskId: number): Promise<TaskDependency[]> {
  const { data, error } = await supabase
    .from('task_dependencies')
    .select(`
      *,
      depends_on_task:tasks!task_dependencies_depends_on_task_id_fkey (id, title)
    `)
    .eq('task_id', taskId);

  if (error) {
    console.error('依存関係取得エラー:', error);
    return [];
  }

  return (data || []).map(dep => ({
    id: dep.id,
    taskId: dep.task_id,
    dependsOnTaskId: dep.depends_on_task_id,
    dependsOnTaskTitle: dep.depends_on_task?.title || '不明',
  }));
}

// タスクの依存関係を追加
export async function addTaskDependency(taskId: number, dependsOnTaskId: number): Promise<void> {
  if (taskId === dependsOnTaskId) {
    throw new Error('自分自身に依存することはできません');
  }

  const { error } = await supabase
    .from('task_dependencies')
    .insert([{ task_id: taskId, depends_on_task_id: dependsOnTaskId }]);

  if (error) {
    if (error.code === '23505') {
      throw new Error('この依存関係は既に存在します');
    }
    throw new Error('依存関係の追加に失敗しました');
  }
}

// タスクの依存関係を削除
export async function removeTaskDependency(id: number): Promise<void> {
  const { error } = await supabase
    .from('task_dependencies')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error('依存関係の削除に失敗しました');
  }
}

// タスクテンプレート一覧を取得
export async function getTaskTemplates(): Promise<TaskTemplate[]> {
  const officeId = getCurrentOfficeId();
  if (!officeId) return [];

  const { data, error } = await supabase
    .from('task_templates')
    .select('*')
    .eq('office_id', officeId)
    .order('name', { ascending: true });

  if (error) {
    console.error('テンプレート取得エラー:', error);
    return [];
  }

  return (data || []).map(tmpl => ({
    id: tmpl.id,
    officeId: tmpl.office_id,
    name: tmpl.name,
    title: tmpl.title,
    description: tmpl.description,
    priority: tmpl.priority,
    department: tmpl.department,
    createdBy: tmpl.created_by,
    createdAt: tmpl.created_at,
  }));
}

// タスクテンプレートを作成
export async function createTaskTemplate(
  name: string,
  title: string,
  description: string,
  priority: '低' | '中' | '高',
  department?: string
): Promise<TaskTemplate> {
  const officeId = getCurrentOfficeId();
  const user = getCurrentGlobalUser();
  if (!officeId || !user) throw new Error('ログインが必要です');

  const { data, error } = await supabase
    .from('task_templates')
    .insert([
      {
        office_id: officeId,
        name,
        title,
        description,
        priority,
        department: department || null,
        created_by: user.id,
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error('テンプレートの作成に失敗しました');
  }

  return {
    id: data.id,
    officeId: data.office_id,
    name: data.name,
    title: data.title,
    description: data.description,
    priority: data.priority,
    department: data.department,
    createdBy: data.created_by,
    createdAt: data.created_at,
  };
}

// タスクテンプレートからタスクを作成
export async function createTaskFromTemplate(templateId: number, assignedToUserId?: number): Promise<any> {
  const template = await getTaskTemplates().then(templates => 
    templates.find(t => t.id === templateId)
  );

  if (!template) {
    throw new Error('テンプレートが見つかりません');
  }

  const { addTask } = await import('./tasksDB');
  return await addTask({
    title: template.title,
    description: template.description,
    status: '未着手',
    priority: template.priority,
    dueDate: '',
    assignedToUserId: assignedToUserId || null,
  });
}

