# 権限管理機能のセットアップ手順

## 問題: 「権限定義がまだ設定されていません」と表示される

この問題を解決するには、以下の手順を実行してください。

## 解決手順

### ステップ1: 権限管理のスキーマを実行（まだの場合）

1. Supabase Dashboardにアクセス
2. SQL Editorを開く
3. 「New Query」をクリック
4. `supabase-schema-permissions.sql` の内容をコピー＆ペースト
5. 「Run」をクリック
6. エラーが出ないことを確認

### ステップ2: デフォルト権限定義を作成

1. SQL Editorで「New Query」をクリック
2. `supabase-setup-permissions-simple.sql` の内容をコピー＆ペースト
3. 「Run」をクリック
4. 結果に「Success」と表示されることを確認

### ステップ3: データが作成されたか確認

1. SQL Editorで「New Query」をクリック
2. `supabase-check-permissions.sql` の内容を実行
3. 権限定義が表示されることを確認

### ステップ4: アプリを再読み込み

1. ブラウザで権限管理ページを開く
2. F5キーでページを再読み込み
3. 権限定義が表示されることを確認

## まだ表示されない場合

### 確認事項

1. **ブラウザのコンソール（F12）を確認**
   - エラーメッセージがないか確認
   - 「権限定義データ: []」と表示されていないか確認

2. **Supabaseでデータを確認**
   - Table Editor → `permission_definitions` を開く
   - データが存在するか確認
   - `office_id` が現在選択している事務所と一致しているか確認

3. **事務所IDを確認**
   - アプリでログイン後、どの事務所を選択しているか確認
   - Supabaseでその事務所IDの権限定義が作成されているか確認

### 手動で確認するSQL

```sql
-- 現在の事務所IDを確認（localStorageに保存されている値）
-- アプリで選択している事務所IDを確認

-- その事務所IDの権限定義を確認
SELECT * FROM permission_definitions 
WHERE office_id = 'DEMO2025'; -- 'DEMO2025'を実際の事務所IDに変更

-- 権限定義が存在しない場合、手動で作成
INSERT INTO permission_definitions (office_id, resource_type, action, description)
VALUES 
  ('DEMO2025', 'member', 'view', 'メンバー一覧を閲覧'),
  ('DEMO2025', 'member', 'create', 'メンバーを追加'),
  ('DEMO2025', 'task', 'view', 'タスクを閲覧'),
  ('DEMO2025', 'task', 'create', 'タスクを作成');
-- 'DEMO2025'を実際の事務所IDに変更して実行
```

## エラーが出た場合

エラーメッセージを教えてください。具体的な解決方法を提案します。

