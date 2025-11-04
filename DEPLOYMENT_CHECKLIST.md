# デプロイメントチェックリスト

## Supabase設定確認

### 1. テーブル作成
以下のSQLファイルを Supabase SQL Editor で実行してください：

- ✅ `supabase-schema-v3.sql` - 基本テーブル（既に実行済み）
- ✅ `supabase-schema-announcements.sql` - お知らせ機能
- ✅ `supabase-schema-tasks-improved.sql` - タスク管理改善
- ✅ `supabase-schema-events-improved.sql` - スケジュール管理改善
- ✅ `supabase-schema-files.sql` - ファイル共有機能

### 2. Storageバケット作成
Supabase Dashboard → Storage セクションで以下を確認：

- ✅ `avatars` バケット（アバター画像用）
- ✅ `files` バケット（ファイル共有用）

`files` バケットが存在しない場合：
1. Storage セクションを開く
2. "New bucket" をクリック
3. バケット名: `files`
4. Public bucket: チェックを入れる
5. Create bucket

その後、`supabase-storage-files.sql` を実行

### 3. 環境変数確認
`.env.local` ファイルに以下が設定されているか確認：

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Vercelにデプロイしている場合：
1. Vercel Dashboard → Project → Settings → Environment Variables
2. 上記の2つの環境変数が設定されているか確認

## エラーデバッグ

### Internal Server Error が発生する場合

1. **ブラウザのコンソールを確認**
   - F12キーを押して開発者ツールを開く
   - Console タブでエラーメッセージを確認
   - Network タブで失敗しているリクエストを確認

2. **サーバーログを確認**
   - ターミナルで `npm run dev` を実行中の場合、エラーメッセージが表示されます

3. **よくあるエラーと対処法**

   **エラー: "relation does not exist"**
   - 該当するテーブルが作成されていません
   - 上記のSQLファイルを実行してください

   **エラー: "column does not exist"**
   - テーブルにカラムが追加されていません
   - 該当するSQLファイルを再実行してください

   **エラー: "supabaseUrl is required"**
   - 環境変数が設定されていません
   - `.env.local` または Vercel の環境変数を確認してください

## 動作確認手順

1. ログインページ（`/login`）が開けるか
2. ログインできるか（事務所コード: DEMO2025, ユーザー名: admin, パスワード: office2025）
3. 事務所一覧ページ（`/`）が表示されるか
4. 各機能ページが開けるか：
   - `/office` - ダッシュボード
   - `/members` - メンバー管理
   - `/tasks` - タスク管理
   - `/schedule` - スケジュール管理
   - `/announcements` - お知らせ
   - `/files` - ファイル共有
   - `/activity` - 活動履歴

