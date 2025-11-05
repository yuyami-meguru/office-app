# GoogleカレンダーIDの説明

## カレンダーIDとは

Googleカレンダーには複数のカレンダー（プライマリカレンダー、カスタムカレンダーなど）があり、それぞれに固有のIDが割り当てられています。

## 一般的なカレンダーID

### 1. `primary`（推奨）

- **意味**: あなたのGoogleアカウントのプライマリ（メイン）カレンダー
- **使用例**: 個人のスケジュール管理に使用
- **特徴**: 
  - すべてのGoogleアカウントに自動的に存在
  - カレンダーIDとして `primary` をそのまま使用できる
  - 最も一般的で推奨される設定

### 2. カスタムカレンダーのID

カスタムカレンダー（自分で作成したカレンダー）のIDは、通常以下の形式です：

```
xxxxxxxxxxxxxxxxxxxxxxxxxx@group.calendar.google.com
```

例：
```
abc123def456ghi789jkl012mno345pq@group.calendar.google.com
```

## カレンダーIDの取得方法

### 方法1: Googleカレンダー設定から取得

1. [Googleカレンダー](https://calendar.google.com/)にアクセス
2. 左側のカレンダーリストで、カレンダー名の横にある「設定」アイコン（⚙️）をクリック
3. 「設定と共有」を選択
4. 「カレンダーの統合」セクションまでスクロール
5. 「カレンダーID」をコピー

### 方法2: カレンダーURLから取得

カレンダーの共有URLから取得できます：

```
https://calendar.google.com/calendar/embed?src=CALENDAR_ID&ctz=Asia/Tokyo
```

`CALENDAR_ID`の部分がカレンダーIDです。

### 方法3: Google Calendar APIで取得

APIを使用してカレンダー一覧を取得できます：

```javascript
const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
const response = await calendar.calendarList.list();
console.log(response.data.items); // カレンダー一覧
```

## 推奨設定

### 通常の使用

- **カレンダーID**: `primary`
- **理由**: 最もシンプルで、個人のメインカレンダーに同期される

### 特定のカレンダーを使用する場合

- カスタムカレンダーを作成し、そのカレンダーIDを設定
- 例: 仕事用カレンダー、個人用カレンダーなど

## アプリでの設定

現在のアプリでは、デフォルトで `primary` が使用されます：

```typescript
calendar_id: 'primary', // デフォルト値
```

カスタムカレンダーIDを設定する場合は、カレンダー同期ページの「カレンダーID」入力欄に直接入力してください。

## 注意事項

1. **カレンダーIDは大文字小文字を区別します**
2. **カスタムカレンダーのIDは長い文字列になることがあります**
3. **共有されたカレンダーのIDも使用可能です**（共有権限がある場合）
4. **`primary`は常に存在し、最も安全な選択です**

