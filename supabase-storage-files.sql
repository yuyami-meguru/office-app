-- Supabase Storage: ファイル用バケット作成

-- filesバケットを作成（既に存在する場合はスキップ）
INSERT INTO storage.buckets (id, name, public)
VALUES ('files', 'files', true)
ON CONFLICT (id) DO NOTHING;

-- ファイルアップロードのポリシー（事務所メンバー全員がアップロード可能）
-- 注意: このアプリはSupabase Authを使用していないため、ポリシーは簡素化されています
-- 実際の認証はアプリケーション層で実装されています

-- 既存のポリシーを削除（エラーを防ぐため）
DROP POLICY IF EXISTS "事務所メンバーはファイルをアップロード可能" ON storage.objects;
DROP POLICY IF EXISTS "事務所メンバーはファイルを閲覧可能" ON storage.objects;
DROP POLICY IF EXISTS "アップロード者のみファイルを削除可能" ON storage.objects;

-- ファイルアップロードのポリシー（全員がアップロード可能 - アプリケーション層で認証）
CREATE POLICY "事務所メンバーはファイルをアップロード可能"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'files');

-- ファイル閲覧のポリシー（全員が閲覧可能 - アプリケーション層で認証）
CREATE POLICY "事務所メンバーはファイルを閲覧可能"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'files');

-- ファイル削除のポリシー（全員が削除可能 - アプリケーション層で認証）
CREATE POLICY "アップロード者のみファイルを削除可能"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'files');

