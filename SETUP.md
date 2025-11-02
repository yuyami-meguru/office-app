# 事務所管理アプリ セットアップガイド

## ステップ1: Supabaseプロジェクトを作成

1. [Supabase](https://supabase.com) にアクセス
2. 「Start your project」をクリック
3. GitHubアカウントでサインイン（無料）
4. 「New Project」をクリック
5. プロジェクト情報を入力:
   - Name: `office-app`（任意）
   - Database Password: 強力なパスワードを設定（メモしておく）
   - Region: `Northeast Asia (Tokyo)` を選択
6. 「Create new project」をクリック
7. 数分待つ（データベースが作成されます）

## ステップ2: データベースを作成

1. Supabaseのダッシュボードで「SQL Editor」をクリック
2. 「New Query」をクリック
3. `supabase-schema.sql` ファイルの内容を全てコピー
4. SQL Editorに貼り付け
5. 「Run」をクリック
6. 成功メッセージが表示されればOK

## ステップ3: 接続情報を取得

1. Supabaseのダッシュボードで「Settings」→「API」をクリック
2. 以下の2つをコピー:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGc...`（長い文字列）

## ステップ4: 環境変数を設定

1. `.env.local` ファイルを開く
2. 以下のように書き換え:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...（長い文字列）
```

3. 保存

## ステップ5: 開発サーバーを再起動

ターミナルで:
1. Ctrl + C でサーバーを停止
2. `npm run dev` で再起動

## ステップ6: Vercelにデプロイ

### 6-1: GitHubにアップロード

```bash
cd /Users/shugo/Desktop/office-app
git init
git add .
git commit -m "初期コミット"
```

GitHubで新しいリポジトリを作成してから:

```bash
git remote add origin https://github.com/あなたのユーザー名/office-app.git
git branch -M main
git push -u origin main
```

### 6-2: Vercelでデプロイ

1. [Vercel](https://vercel.com) にアクセス
2. GitHubアカウントでサインイン
3. 「Add New」→「Project」をクリック
4. `office-app` リポジトリを選択
5. 「Environment Variables」で環境変数を追加:
   - `NEXT_PUBLIC_SUPABASE_URL`: Supabaseの値
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabaseの値
6. 「Deploy」をクリック
7. 数分で完成！

## 完成！

デプロイが完了すると、URLが発行されます:
`https://office-app-xxxx.vercel.app`

このURLをスタッフに共有すれば、どこからでもアクセスできます！

## 初回ログイン

- ユーザー名: `admin`
- パスワード: `office2025`

## トラブルシューティング

### データベース接続エラーが出る場合
- `.env.local` の値が正しいか確認
- 開発サーバーを再起動

### Vercelでエラーが出る場合
- Environment Variablesが正しく設定されているか確認
- Supabaseプロジェクトが稼働中か確認

