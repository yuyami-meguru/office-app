'use client';

import { useState, useEffect } from 'react';
import AuthGuard from '@/components/AuthGuard';
import Header from '@/components/Header';
import { 
  getEvents, 
  addEvent as addEventDB, 
  deleteEvent as deleteEventDB,
  type Event 
} from '@/lib/eventsDB';

export const dynamic = 'force-dynamic';

export default function SchedulePage() {
  const [events, setEvents] = useState<Event[]>([]);

  const [isAdding, setIsAdding] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    date: '',
    time: '',
    location: '',
    attendees: '',
    notes: '',
  });

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    const data = await getEvents();
    setEvents(data);
  };

  const handleAddEvent = async () => {
    if (newEvent.title && newEvent.date) {
      try {
        await addEventDB(newEvent);
        await loadEvents();
        setNewEvent({ title: '', date: '', time: '', location: '', attendees: '', notes: '' });
        setIsAdding(false);
      } catch (err) {
        alert('イベントの追加に失敗しました');
      }
    }
  };

  const handleDeleteEvent = async (id: number) => {
    try {
      await deleteEventDB(id);
      await loadEvents();
    } catch (err) {
      alert('イベントの削除に失敗しました');
    }
  };

  // イベントを日付順にソート
  const sortedEvents = [...events].sort((a, b) => {
    const dateA = new Date(a.date + ' ' + (a.time || '00:00'));
    const dateB = new Date(b.date + ' ' + (b.time || '00:00'));
    return dateA.getTime() - dateB.getTime();
  });

  // 日付を見やすい形式に変換
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayOfWeek = days[date.getDay()];
    return `${month}月${day}日（${dayOfWeek}）`;
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        {/* ヘッダー */}
        <Header title="スケジュール管理" showBackButton />
        
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
          >
            {isAdding ? 'キャンセル' : '+ 新規予定'}
          </button>
        </div>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto py-6 px-4">
        {/* 新規追加フォーム */}
        {isAdding && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">新しい予定を追加</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">予定名 *</label>
                <input
                  type="text"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="会議、イベント名など"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">日付 *</label>
                  <input
                    type="date"
                    value={newEvent.date}
                    onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">時刻</label>
                  <input
                    type="time"
                    value={newEvent.time}
                    onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">場所</label>
                <input
                  type="text"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="会議室、オンラインなど"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">参加者</label>
                <input
                  type="text"
                  value={newEvent.attendees}
                  onChange={(e) => setNewEvent({ ...newEvent, attendees: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="参加者名をカンマ区切りで"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">メモ</label>
                <textarea
                  value={newEvent.notes}
                  onChange={(e) => setNewEvent({ ...newEvent, notes: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  rows={3}
                  placeholder="その他メモや詳細"
                />
              </div>
              <button
                onClick={handleAddEvent}
                className="bg-purple-500 text-white px-6 py-2 rounded hover:bg-purple-600"
              >
                追加
              </button>
            </div>
          </div>
        )}

        {/* スケジュールリスト */}
        <div className="space-y-4">
          {sortedEvents.map((event) => (
            <div key={event.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-xl font-semibold">{event.title}</h3>
                  </div>
                  <div className="space-y-2">
                    <p className="text-gray-700">
                      {formatDate(event.date)}
                      {event.time && ` ${event.time}`}
                    </p>
                    {event.location && (
                      <p className="text-gray-600">場所: {event.location}</p>
                    )}
                    {event.attendees && (
                      <p className="text-gray-600">参加者: {event.attendees}</p>
                    )}
                    {event.notes && (
                      <p className="text-gray-600 mt-3 p-3 bg-gray-50 rounded">
                        メモ: {event.notes}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteEvent(event.id)}
                  className="text-red-500 hover:text-red-700 ml-4 text-xs font-semibold px-2 py-1"
                >
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>

        {events.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">予定がまだ登録されていません</p>
            <p className="text-gray-400 text-sm mt-2">「+ 新規予定」ボタンから追加してください</p>
          </div>
        )}
      </main>
      </div>
    </AuthGuard>
  );
}

