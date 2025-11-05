import { supabase } from './supabase';
import { getCurrentOfficeId, getCurrentGlobalUser } from './authDB';
import { uploadAvatar } from './upload';

export type FileFolder = {
  id: number;
  officeId: string;
  department: string | null;
  name: string;
  parentFolderId: number | null;
  createdBy: number;
  createdAt: string;
};

export type FileItem = {
  id: number;
  folderId: number | null;
  officeId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  description: string | null;
  uploadedBy: number;
  uploadedByName: string;
  uploadedAt: string;
  isDeleted: boolean;
};

// フォルダ一覧を取得
export async function getFolders(department?: string): Promise<FileFolder[]> {
  const officeId = getCurrentOfficeId();
  if (!officeId) return [];

  let query = supabase
    .from('file_folders')
    .select('*')
    .eq('office_id', officeId)
    .order('name', { ascending: true });

  if (department) {
    query = query.eq('department', department);
  } else {
    query = query.is('department', null);
  }

  const { data, error } = await query;

  if (error) {
    // テーブルが存在しない場合は空配列を返す（エラーではない）
    if (error.code === '42P01') return [];
    // エラーオブジェクトが空の場合はスキップ
    const errorKeys = Object.keys(error || {});
    if (errorKeys.length === 0) return [];
    console.error('フォルダ取得エラー:', error);
    return [];
  }

  return (data || []).map(folder => ({
    id: folder.id,
    officeId: folder.office_id,
    department: folder.department,
    name: folder.name,
    parentFolderId: folder.parent_folder_id,
    createdBy: folder.created_by,
    createdAt: folder.created_at,
  }));
}

// フォルダを作成
export async function createFolder(name: string, department?: string, parentFolderId?: number): Promise<FileFolder> {
  const officeId = getCurrentOfficeId();
  const user = getCurrentGlobalUser();
  if (!officeId || !user) throw new Error('ログインが必要です');

  const { data, error } = await supabase
    .from('file_folders')
    .insert([
      {
        office_id: officeId,
        department: department || null,
        name,
        parent_folder_id: parentFolderId || null,
        created_by: user.id,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('フォルダ作成エラー:', error);
    throw new Error('フォルダの作成に失敗しました');
  }

  return {
    id: data.id,
    officeId: data.office_id,
    department: data.department,
    name: data.name,
    parentFolderId: data.parent_folder_id,
    createdBy: data.created_by,
    createdAt: data.created_at,
  };
}

// ファイル一覧を取得
export async function getFiles(folderId?: number, department?: string): Promise<FileItem[]> {
  const officeId = getCurrentOfficeId();
  if (!officeId) return [];

  let query = supabase
    .from('files')
    .select(`
      *,
      global_users:uploaded_by (id, name, username)
    `)
    .eq('office_id', officeId)
    .eq('is_deleted', false)
    .order('uploaded_at', { ascending: false });

  if (folderId) {
    query = query.eq('folder_id', folderId);
  } else {
    query = query.is('folder_id', null);
  }

  const { data, error } = await query;

  if (error) {
    console.error('ファイル取得エラー:', error);
    return [];
  }

  return (data || []).map(file => ({
    id: file.id,
    folderId: file.folder_id,
    officeId: file.office_id,
    fileName: file.file_name,
    fileUrl: file.file_url,
    fileSize: file.file_size,
    fileType: file.file_type,
    description: file.description,
    uploadedBy: file.uploaded_by,
    uploadedByName: file.global_users?.name || file.global_users?.username || '不明',
    uploadedAt: file.uploaded_at,
    isDeleted: file.is_deleted,
  }));
}

// ファイルをアップロード
export async function uploadFile(
  file: File,
  folderId?: number,
  description?: string
): Promise<FileItem> {
  const officeId = getCurrentOfficeId();
  const user = getCurrentGlobalUser();
  if (!officeId || !user) throw new Error('ログインが必要です');

  // ファイルサイズチェック（50MB以下）
  if (file.size > 50 * 1024 * 1024) {
    throw new Error('ファイルサイズは50MB以下にしてください');
  }

  // Supabase Storageにアップロード
  const fileUrl = await uploadFileToStorage(file, user.id, officeId);

  const { data, error } = await supabase
    .from('files')
    .insert([
      {
        folder_id: folderId || null,
        office_id: officeId,
        file_name: file.name,
        file_url: fileUrl,
        file_size: file.size,
        file_type: file.type,
        description: description || null,
        uploaded_by: user.id,
      },
    ])
    .select(`
      *,
      global_users:uploaded_by (id, name, username)
    `)
    .single();

  if (error) {
    console.error('ファイル追加エラー:', error);
    throw new Error('ファイルの追加に失敗しました');
  }

  return {
    id: data.id,
    folderId: data.folder_id,
    officeId: data.office_id,
    fileName: data.file_name,
    fileUrl: data.file_url,
    fileSize: data.file_size,
    fileType: data.file_type,
    description: data.description,
    uploadedBy: data.uploaded_by,
    uploadedByName: data.global_users?.name || data.global_users?.username || '不明',
    uploadedAt: data.uploaded_at,
    isDeleted: data.is_deleted,
  };
}

// Supabase Storageにファイルをアップロード（エクスポート用）
export async function uploadFileToStorage(file: File, userId: number, officeId: string): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${officeId}/${userId}_${Date.now()}.${fileExt}`;

  const { error } = await supabase.storage
    .from('files')
    .upload(fileName, file);

  if (error) {
    console.error('Storageアップロードエラー:', error);
    throw new Error('ファイルのアップロードに失敗しました');
  }

  const { data: urlData } = supabase.storage
    .from('files')
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}

// ファイルを削除
export async function deleteFile(id: number): Promise<boolean> {
  const { error } = await supabase
    .from('files')
    .update({ is_deleted: true })
    .eq('id', id);

  if (error) {
    throw new Error('ファイルの削除に失敗しました');
  }

  return true;
}

// フォルダを削除
export async function deleteFolder(id: number): Promise<boolean> {
  const { error } = await supabase
    .from('file_folders')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error('フォルダの削除に失敗しました');
  }

  return true;
}

