import { supabase } from './supabase';
import { getCurrentOfficeId, getCurrentGlobalUser } from './authDB';
import { uploadFileToStorage } from './filesDB';

export type FileVersion = {
  id: number;
  fileId: number;
  version: number;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  uploadedBy: number;
  uploadedByName: string;
  uploadedAt: string;
};

export type FileTag = {
  id: number;
  officeId: string;
  name: string;
  color: string;
};

export type FileComment = {
  id: number;
  fileId: number;
  userId: number;
  userName: string;
  content: string;
  createdAt: string;
};

export type FileShareLink = {
  id: number;
  fileId: number;
  token: string;
  expiresAt: string | null;
  downloadCount: number;
  createdBy: number;
  createdAt: string;
};

// ファイルバージョン一覧を取得
export async function getFileVersions(fileId: number): Promise<FileVersion[]> {
  const { data, error } = await supabase
    .from('file_versions')
    .select(`
      *,
      global_users:uploaded_by (id, name, username)
    `)
    .eq('file_id', fileId)
    .order('version', { ascending: false });

  if (error) {
    console.error('バージョン取得エラー:', error);
    return [];
  }

  return (data || []).map(version => ({
    id: version.id,
    fileId: version.file_id,
    version: version.version,
    fileUrl: version.file_url,
    fileName: version.file_name,
    fileSize: version.file_size,
    uploadedBy: version.uploaded_by,
    uploadedByName: version.global_users?.name || version.global_users?.username || '不明',
    uploadedAt: version.uploaded_at,
  }));
}

// ファイルの新しいバージョンを追加
export async function addFileVersion(fileId: number, file: File): Promise<FileVersion> {
  const user = getCurrentGlobalUser();
  const officeId = getCurrentOfficeId();
  if (!user || !officeId) throw new Error('ログインが必要です');

  // 現在の最新バージョンを取得
  const versions = await getFileVersions(fileId);
  const nextVersion = versions.length > 0 ? versions[0].version + 1 : 1;

  // Storageにアップロード
  const fileUrl = await uploadFileToStorage(file, user.id, officeId);

  const { data, error } = await supabase
    .from('file_versions')
    .insert([
      {
        file_id: fileId,
        version: nextVersion,
        file_url: fileUrl,
        file_name: file.name,
        file_size: file.size,
        uploaded_by: user.id,
      },
    ])
    .select(`
      *,
      global_users:uploaded_by (id, name, username)
    `)
    .single();

  if (error) {
    throw new Error('バージョンの追加に失敗しました');
  }

  return {
    id: data.id,
    fileId: data.file_id,
    version: data.version,
    fileUrl: data.file_url,
    fileName: data.file_name,
    fileSize: data.file_size,
    uploadedBy: data.uploaded_by,
    uploadedByName: data.global_users?.name || data.global_users?.username || '不明',
    uploadedAt: data.uploaded_at,
  };
}

// ファイルタグ一覧を取得
export async function getFileTags(): Promise<FileTag[]> {
  const officeId = getCurrentOfficeId();
  if (!officeId) return [];

  const { data, error } = await supabase
    .from('file_tags')
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

// ファイルタグを作成
export async function createFileTag(name: string, color: string = '#3B82F6'): Promise<FileTag> {
  const officeId = getCurrentOfficeId();
  if (!officeId) throw new Error('事務所が選択されていません');

  const { data, error } = await supabase
    .from('file_tags')
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

// ファイルにタグを追加
export async function addTagToFile(fileId: number, tagId: number): Promise<void> {
  const { error } = await supabase
    .from('file_tag_assignments')
    .insert([{ file_id: fileId, tag_id: tagId }]);

  if (error) {
    throw new Error('タグの追加に失敗しました');
  }
}

// ファイルからタグを削除
export async function removeTagFromFile(fileId: number, tagId: number): Promise<void> {
  const { error } = await supabase
    .from('file_tag_assignments')
    .delete()
    .eq('file_id', fileId)
    .eq('tag_id', tagId);

  if (error) {
    throw new Error('タグの削除に失敗しました');
  }
}

// ファイルのタグ一覧を取得
export async function getFileTagsForFile(fileId: number): Promise<FileTag[]> {
  const { data, error } = await supabase
    .from('file_tag_assignments')
    .select(`
      file_tags (*)
    `)
    .eq('file_id', fileId);

  if (error) {
    console.error('ファイルタグ取得エラー:', error);
    return [];
  }

  return (data || []).map((item: any) => ({
    id: item.file_tags.id,
    officeId: item.file_tags.office_id,
    name: item.file_tags.name,
    color: item.file_tags.color,
  }));
}

// ファイルコメントを取得
export async function getFileComments(fileId: number): Promise<FileComment[]> {
  const { data, error } = await supabase
    .from('file_comments')
    .select(`
      *,
      global_users:user_id (id, name, username)
    `)
    .eq('file_id', fileId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('コメント取得エラー:', error);
    return [];
  }

  return (data || []).map(comment => ({
    id: comment.id,
    fileId: comment.file_id,
    userId: comment.user_id,
    userName: comment.global_users?.name || comment.global_users?.username || '不明',
    content: comment.content,
    createdAt: comment.created_at,
  }));
}

// ファイルコメントを追加
export async function addFileComment(fileId: number, content: string): Promise<FileComment> {
  const user = getCurrentGlobalUser();
  if (!user) throw new Error('ログインが必要です');

  const { data, error } = await supabase
    .from('file_comments')
    .insert([
      {
        file_id: fileId,
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
    throw new Error('コメントの追加に失敗しました');
  }

  return {
    id: data.id,
    fileId: data.file_id,
    userId: data.user_id,
    userName: data.global_users?.name || data.global_users?.username || '不明',
    content: data.content,
    createdAt: data.created_at,
  };
}

// ファイル共有リンクを作成
export async function createFileShareLink(fileId: number, expiresAt?: string): Promise<FileShareLink> {
  const user = getCurrentGlobalUser();
  if (!user) throw new Error('ログインが必要です');

  // ランダムなトークンを生成
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const { data, error } = await supabase
    .from('file_share_links')
    .insert([
      {
        file_id: fileId,
        token,
        expires_at: expiresAt || null,
        created_by: user.id,
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error('共有リンクの作成に失敗しました');
  }

  return {
    id: data.id,
    fileId: data.file_id,
    token: data.token,
    expiresAt: data.expires_at,
    downloadCount: data.download_count,
    createdBy: data.created_by,
    createdAt: data.created_at,
  };
}

// ファイル共有リンクを取得（トークンから）
export async function getFileShareLinkByToken(token: string): Promise<FileShareLink | null> {
  const { data, error } = await supabase
    .from('file_share_links')
    .select('*')
    .eq('token', token)
    .single();

  if (error || !data) {
    return null;
  }

  // 有効期限チェック
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return null;
  }

  return {
    id: data.id,
    fileId: data.file_id,
    token: data.token,
    expiresAt: data.expires_at,
    downloadCount: data.download_count,
    createdBy: data.created_by,
    createdAt: data.created_at,
  };
}

// ファイル共有リンクのダウンロード数を増やす
export async function incrementFileShareLinkDownload(token: string): Promise<void> {
  const { error } = await supabase.rpc('increment_file_share_link_download', { link_token: token });
  
  if (error) {
    // RPC関数がない場合は直接更新
    const { data: link } = await supabase
      .from('file_share_links')
      .select('download_count')
      .eq('token', token)
      .single();

    if (link) {
      await supabase
        .from('file_share_links')
        .update({ download_count: link.download_count + 1 })
        .eq('token', token);
    }
  }
}

