-- スケジュール管理の改善：繰り返しイベント

-- eventsテーブルにカラムを追加
ALTER TABLE events ADD COLUMN IF NOT EXISTS recurring_pattern TEXT CHECK (recurring_pattern IN ('なし', '毎日', '毎週', '毎月', '毎年'));
ALTER TABLE events ADD COLUMN IF NOT EXISTS recurring_end_date DATE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS reminder_minutes INTEGER; -- リマインダー（何分前に通知）

-- デフォルト値設定
UPDATE events SET recurring_pattern = 'なし' WHERE recurring_pattern IS NULL;

