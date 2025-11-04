# セットアップ完了手順

## 1. Supabase SQL Editor で実行

### ステップ1: 全機能のスキーマを実行
`supabase-schema-all-improvements.sql` を Supabase SQL Editor で実行してください。

これで以下が作成されます：
- ✅ お知らせ機能（announcements, announcement_reads）
- ✅ タスク管理の改善（task_comments、カラム追加）
- ✅ スケジュール管理の改善（繰り返しイベント対応）
- ✅ ファイル共有機能（file_folders, files）
- ✅ 活動履歴機能（activity_logs）

## 2. Storage バケットの作成

### 手動で作成する場合
1. Supabase Dashboard → **Storage** セクションを開く
2. **"New bucket"** をクリック
3. バケット名: `files`
4. **Public bucket**: チェックを入れる（公開）
5. **Create bucket** をクリック

### SQLで作成する場合
`supabase-storage-files.sql` を Supabase SQL Editor で実行してください。

## 3. 動作確認

1. ローカルで開発サーバーを起動：
   ```bash
   npm run dev
   ```

2. ブラウザで `http://localhost:3000` を開く

3. ログイン：
   - 事務所コード: `DEMO2025`
   - ユーザー名: `admin`
   - パスワード: `office2025`

4. 各機能ページを確認：
   - `/office` - ダッシュボード
   - `/announcements` - お知らせ
   - `/tasks` - タスク管理（担当者・コメント）
   - `/schedule` - スケジュール（カレンダー・繰り返し）
   - `/files` - ファイル共有
   - `/activity` - 活動履歴

## トラブルシューティング

### Internal Server Error が出る場合

1. **ブラウザのコンソールを確認**（F12 → Console）
   - エラーメッセージを確認

2. **Supabase Table Editor で確認**
   - 以下のテーブルが存在するか確認：
     - `announcements`
     - `announcement_reads`
     - `task_comments`
     - `file_folders`
     - `files`
     - `activity_logs`

3. **Storage バケットを確認**
   - `files` バケットが存在するか確認

4. **環境変数を確認**
   - `.env.local` に Supabase のURLとキーが設定されているか確認

### エラーが出たら
ブラウザのコンソール（F12）に表示されるエラーメッセージを確認してください。

