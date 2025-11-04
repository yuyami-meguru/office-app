-- Supabase Storage バケット作成用SQL
-- Supabase Dashboard の Storage セクションで実行してください

-- アバター画像用のバケットを作成
-- 注意: このSQLはSupabase DashboardのSQL Editorではなく、
-- Storage セクションでバケットを作成する必要があります

-- 手動でバケットを作成する場合:
-- 1. Supabase Dashboard → Storage を開く
-- 2. "New bucket" をクリック
-- 3. バケット名: "avatars"
-- 4. Public bucket: チェックを入れる（公開）
-- 5. Create bucket

-- または、APIで作成する場合:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- ポリシーを設定（全員がアップロード・閲覧可能）
-- Storage セクションでバケットを作成後、以下のポリシーを設定してください

-- アップロードポリシー
CREATE POLICY "誰でもアバターをアップロード可能"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars');

-- 閲覧ポリシー
CREATE POLICY "誰でもアバターを閲覧可能"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- 削除ポリシー（自分のファイルのみ）
CREATE POLICY "自分のアバターを削除可能"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

