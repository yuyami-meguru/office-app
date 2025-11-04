'use client';

import { useState, useEffect } from 'react';
import AuthGuard from '@/components/AuthGuard';
import DiscordLayout from '@/components/DiscordLayout';
import { 
  getEvents, 
  addEvent as addEventDB, 
  deleteEvent as deleteEventDB,
  type Event,
  type RecurringPattern,
} from '@/lib/eventsDB';

export const dynamic = 'force-dynamic';

export default function SchedulePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    date: '',
    time: '',
    location: '',
    attendees: '',
    notes: '',
    recurringPattern: 'なし' as RecurringPattern,
    recurringEndDate: '',
    reminderMinutes: null as number | null,
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
        setNewEvent({ 
          title: '', 
          date: '', 
          time: '', 
          location: '', 
          attendees: '', 
          notes: '',
          recurringPattern: 'なし',
          recurringEndDate: '',
          reminderMinutes: null,
        });
        setIsAdding(false);
      } catch (err) {
        alert('イベントの追加に失敗しました');
      }
    }
  };

  const handleDeleteEvent = async (id: number) => {
    if (!confirm('この予定を削除しますか？')) return;
    try {
      await deleteEventDB(id);
      await loadEvents();
    } catch (err) {
      alert('イベントの削除に失敗しました');
    }
  };

  // カレンダー用の日付取得
  const getCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];
    
    // 前月の余白
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // 今月の日付
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  // 指定日付のイベントを取得
  const getEventsForDate = (date: Date | null) => {
    if (!date) return [];
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(event => event.date === dateStr);
  };

  // 日付を見やすい形式に変換
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayOfWeek = days[date.getDay()];
    return `${month}月${day}日（${dayOfWeek}）`;
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const today = new Date();
  const isToday = (date: Date | null) => {
    if (!date) return false;
    return date.toDateString() === today.toDateString();
  };

  return (
    <AuthGuard>
      <DiscordLayout>
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900 mb-2">スケジュール管理</h1>
              <p className="text-gray-600">予定を効率的に管理</p>
            </div>
            <div className="flex gap-3">
              <div className="flex gap-2 bg-white rounded-lg border border-gray-200 p-1">
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                    viewMode === 'calendar'
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  カレンダー
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                    viewMode === 'list'
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  リスト
                </button>
              </div>
              <button
                onClick={() => setIsAdding(!isAdding)}
                className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-all font-semibold"
              >
                {isAdding ? 'キャンセル' : '+ 新規予定'}
              </button>
            </div>
          </div>

          {/* 新規追加フォーム */}
          {isAdding && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">新しい予定を追加</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">予定名 *</label>
                  <input
                    type="text"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
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
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">時刻</label>
                    <input
                      type="time"
                      value={newEvent.time}
                      onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">繰り返し</label>
                    <select
                      value={newEvent.recurringPattern}
                      onChange={(e) => setNewEvent({ ...newEvent, recurringPattern: e.target.value as RecurringPattern })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    >
                      <option value="なし">なし</option>
                      <option value="毎日">毎日</option>
                      <option value="毎週">毎週</option>
                      <option value="毎月">毎月</option>
                      <option value="毎年">毎年</option>
                    </select>
                  </div>
                  {newEvent.recurringPattern !== 'なし' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">繰り返し終了日</label>
                      <input
                        type="date"
                        value={newEvent.recurringEndDate}
                        onChange={(e) => setNewEvent({ ...newEvent, recurringEndDate: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2"
                      />
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">場所</label>
                  <input
                    type="text"
                    value={newEvent.location}
                    onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    placeholder="会議室、オンラインなど"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">参加者</label>
                  <input
                    type="text"
                    value={newEvent.attendees}
                    onChange={(e) => setNewEvent({ ...newEvent, attendees: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    placeholder="参加者名をカンマ区切りで"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">メモ</label>
                  <textarea
                    value={newEvent.notes}
                    onChange={(e) => setNewEvent({ ...newEvent, notes: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    rows={3}
                    placeholder="その他メモや詳細"
                  />
                </div>
                <button
                  onClick={handleAddEvent}
                  className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700"
                >
                  追加
                </button>
              </div>
            </div>
          )}

          {/* カレンダービュー */}
          {viewMode === 'calendar' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={prevMonth}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  ← 前月
                </button>
                <h2 className="text-2xl font-semibold text-gray-900">
                  {currentDate.getFullYear()}年{currentDate.getMonth() + 1}月
                </h2>
                <button
                  onClick={nextMonth}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  次月 →
                </button>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {['日', '月', '火', '水', '木', '金', '土'].map(day => (
                  <div key={day} className="text-center font-semibold text-gray-700 py-2">
                    {day}
                  </div>
                ))}
                {getCalendarDays().map((date, index) => {
                  const dayEvents = getEventsForDate(date);
                  const isSelected = date && selectedDate === date.toISOString().split('T')[0];
                  
                  return (
                    <div
                      key={index}
                      className={`min-h-[100px] border border-gray-200 rounded-lg p-2 ${
                        !date ? 'bg-gray-50' : ''
                      } ${
                        isToday(date) ? 'bg-blue-50 border-blue-300' : ''
                      } ${
                        isSelected ? 'bg-indigo-50 border-indigo-400' : ''
                      } hover:bg-gray-50 cursor-pointer transition-colors`}
                      onClick={() => date && setSelectedDate(date.toISOString().split('T')[0])}
                    >
                      {date && (
                        <>
                          <div className={`text-sm font-medium mb-1 ${
                            isToday(date) ? 'text-blue-700' : 'text-gray-900'
                          }`}>
                            {date.getDate()}
                          </div>
                          <div className="space-y-1">
                            {dayEvents.slice(0, 2).map(event => (
                              <div
                                key={event.id}
                                className="text-xs bg-purple-100 text-purple-700 px-1 py-0.5 rounded truncate"
                                title={event.title}
                              >
                                {event.time && `${event.time} `}{event.title}
                              </div>
                            ))}
                            {dayEvents.length > 2 && (
                              <div className="text-xs text-gray-500">
                                +{dayEvents.length - 2}件
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 選択日付のイベント詳細 */}
              {selectedDate && (
                <div className="mt-6 border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold mb-4">
                    {formatDate(selectedDate)}の予定
                  </h3>
                  <div className="space-y-3">
                    {getEventsForDate(new Date(selectedDate)).map(event => (
                      <div key={event.id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 mb-2">{event.title}</h4>
                            <div className="space-y-1 text-sm text-gray-600">
                              {event.time && <p>時刻: {event.time}</p>}
                              {event.location && <p>場所: {event.location}</p>}
                              {event.attendees && <p>参加者: {event.attendees}</p>}
                              {event.notes && <p>メモ: {event.notes}</p>}
                              {event.recurringPattern !== 'なし' && (
                                <p className="text-purple-600">繰り返し: {event.recurringPattern}</p>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteEvent(event.id)}
                            className="text-red-500 hover:text-red-700 text-sm font-semibold px-2 py-1"
                          >
                            削除
                          </button>
                        </div>
                      </div>
                    ))}
                    {getEventsForDate(new Date(selectedDate)).length === 0 && (
                      <p className="text-gray-500 text-center py-4">この日の予定はありません</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* リストビュー */}
          {viewMode === 'list' && (
            <div className="space-y-4">
              {events.map((event) => (
                <div key={event.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-xl font-semibold text-gray-900">{event.title}</h3>
                        {event.recurringPattern !== 'なし' && (
                          <span className="px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-700">
                            繰り返し: {event.recurringPattern}
                          </span>
                        )}
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
                      className="text-red-500 hover:text-red-700 ml-4 text-sm font-semibold px-2 py-1"
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {events.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <p className="text-gray-500 text-lg">予定がまだ登録されていません</p>
              <p className="text-gray-400 text-sm mt-2">「+ 新規予定」ボタンから追加してください</p>
            </div>
          )}
        </div>
      </DiscordLayout>
    </AuthGuard>
  );
}
