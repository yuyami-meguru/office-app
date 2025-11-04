import { supabase } from './supabase';

// 画像をアップロードしてURLを返す
export async function uploadAvatar(file: File, userId: number, officeId: string): Promise<string> {
  // ファイル名を生成（重複を避けるためタイムスタンプを使用）
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}_${officeId}_${Date.now()}.${fileExt}`;
  const filePath = `avatars/${fileName}`;

  // Supabase Storageにアップロード
  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    throw new Error('画像のアップロードに失敗しました: ' + error.message);
  }

  // 公開URLを取得
  const { data: urlData } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath);

  if (!urlData?.publicUrl) {
    throw new Error('画像URLの取得に失敗しました');
  }

  return urlData.publicUrl;
}

// 画像を削除
export async function deleteAvatar(avatarUrl: string): Promise<void> {
  // URLからファイルパスを抽出
  const urlParts = avatarUrl.split('/');
  const fileName = urlParts[urlParts.length - 1];
  const filePath = `avatars/${fileName}`;

  const { error } = await supabase.storage
    .from('avatars')
    .remove([filePath]);

  if (error) {
    console.error('画像の削除に失敗しました:', error);
    // エラーでも続行（既に削除されている可能性があるため）
  }
}

