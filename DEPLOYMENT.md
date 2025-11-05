# Vercelへのデプロイ手順

## 前提条件

- GitHubアカウント
- Vercelアカウント（GitHubでサインアップ可能）
- Supabaseプロジェクトが作成済み

## デプロイ手順

### 1. GitHubにコードをプッシュ

```bash
# Gitリポジトリが初期化されていない場合
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/office-app.git
git push -u origin main
```

### 2. Vercelでプロジェクトを作成

1. [Vercel](https://vercel.com/)にアクセス
2. GitHubでサインイン
3. 「New Project」をクリック
4. リポジトリを選択
5. 「Import」をクリック

### 3. 環境変数を設定

Vercelのプロジェクト設定で、以下の環境変数を追加：

#### 必須の環境変数

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

#### オプションの環境変数（Googleカレンダー同期を使用する場合）

```
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://your-domain.vercel.app/api/auth/google
```

**重要**: 本番環境のリダイレクトURIは、Vercelのデプロイ後のURLに変更してください。

### 4. デプロイ

1. 「Deploy」をクリック
2. ビルドが完了するまで待機（通常1-2分）
3. デプロイ完了後、URLが表示されます

### 5. 本番環境での設定確認

#### Google OAuth設定（カレンダー同期を使用する場合）

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. OAuth 2.0クライアントIDを編集
3. 「承認済みのリダイレクト URI」に以下を追加：
   ```
   https://your-domain.vercel.app/api/auth/google
   ```
4. 保存

#### Supabase設定

- 本番環境でも同じSupabaseプロジェクトを使用できます
- または、本番用のSupabaseプロジェクトを作成することも可能です

## トラブルシューティング

### ビルドエラー

- 環境変数が正しく設定されているか確認
- ローカルで`npm run build`が成功するか確認

### 環境変数が読み込まれない

- Vercelの環境変数設定を確認
- デプロイを再実行（環境変数変更後は再デプロイが必要）

### リダイレクトURI不一致エラー

- Google Cloud ConsoleのリダイレクトURIが本番URLと一致しているか確認

## 注意事項

- `.env.local`ファイルはGitにコミットされません（`.gitignore`に含まれています）
- 環境変数はVercelのダッシュボードで設定してください
- 本番環境と開発環境で異なるSupabaseプロジェクトを使用する場合は、環境変数を適切に設定してください

