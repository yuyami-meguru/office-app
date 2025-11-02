# 事務所管理アプリ

クリエイター事務所向けの包括的な管理アプリケーション

## 機能

- **メンバー管理**: 部署・グループ・役職の管理、複数部署対応
- **タスク管理**: ステータス・優先度・期限の管理
- **スケジュール管理**: イベント・会議の予定管理
- **ユーザー管理**: 権限管理（管理者/スタッフ）、パスワード管理

## セキュリティ

- ログイン認証必須
- 初回ログイン時のパスワード変更強制
- パスワード再発行機能
- 権限に基づいたアクセス制御

## 技術スタック

- **Frontend**: Next.js 16, React, TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Hosting**: Vercel

## セットアップ

詳細な手順は `SETUP.md` を参照してください。

### 開発環境

```bash
npm install
npm run dev
```

### 環境変数

`.env.local` ファイルを作成:

```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## デフォルトログイン

- ユーザー名: `admin`
- パスワード: `office2025`

## ライセンス

Private
