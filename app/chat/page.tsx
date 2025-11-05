'use client';

import { useState, useEffect, useRef } from 'react';
import AuthGuard from '@/components/AuthGuard';
import DiscordLayout from '@/components/DiscordLayout';
import { getCurrentGlobalUser } from '@/lib/authDB';
import { getMembers } from '@/lib/membersDB';
import {
  getChatRooms,
  createChatRoom,
  getChatMessages,
  sendChatMessage,
  addChatRoomMember,
  type ChatRoom,
  type ChatMessage,
  type ChatRoomType,
} from '@/lib/chatDB';

export const dynamic = 'force-dynamic';

export default function ChatPage() {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomType, setNewRoomType] = useState<ChatRoomType>('group');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const user = getCurrentGlobalUser();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedRoom) {
      loadMessages();
      const interval = setInterval(loadMessages, 3000); // 3秒ごとに更新
      return () => clearInterval(interval);
    }
  }, [selectedRoom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadData = async () => {
    await loadRooms();
    await loadMembers();
  };

  const loadRooms = async () => {
    const data = await getChatRooms();
    setRooms(data);
    if (data.length > 0 && !selectedRoom) {
      setSelectedRoom(data[0]);
    }
  };

  const loadMembers = async () => {
    const data = await getMembers();
    setMembers(data);
  };

  const loadMessages = async () => {
    if (!selectedRoom) return;
    const data = await getChatMessages(selectedRoom.id);
    setMessages(data);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!selectedRoom || !newMessage.trim()) return;

    // メンションを検出（@username形式）
    const mentionRegex = /@(\w+)/g;
    const mentionedNames: string[] = [];
    let match;
    while ((match = mentionRegex.exec(newMessage)) !== null) {
      mentionedNames.push(match[1]);
    }

    const mentionedUserIds = members
      .filter(m => mentionedNames.some(name => 
        m.displayName.includes(name) || m.username?.includes(name)
      ))
      .map(m => m.userId);

    try {
      await sendChatMessage(selectedRoom.id, newMessage, mentionedUserIds);
      setNewMessage('');
      await loadMessages();
    } catch (err) {
      alert('メッセージの送信に失敗しました');
    }
  };

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) return;

    try {
      await createChatRoom(newRoomName, newRoomType);
      setNewRoomName('');
      setNewRoomType('group');
      setIsCreatingRoom(false);
      await loadRooms();
    } catch (err) {
      alert('チャットルームの作成に失敗しました');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessage = (content: string) => {
    // メンションをハイライト
    const mentionRegex = /@(\w+)/g;
    const parts = content.split(mentionRegex);
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return <span key={i} className="text-blue-600 font-semibold">@{part}</span>;
      }
      return part;
    });
  };

  return (
    <AuthGuard>
      <DiscordLayout>
        <div className="flex h-[calc(100vh-2rem)] p-4 gap-4">
          {/* ルーム一覧 */}
          <div className="w-64 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">チャット</h2>
              <button
                onClick={() => setIsCreatingRoom(!isCreatingRoom)}
                className="text-blue-600 hover:text-blue-700 text-sm font-semibold"
              >
                {isCreatingRoom ? 'キャンセル' : '+ 新規'}
              </button>
            </div>

            {isCreatingRoom && (
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <input
                  type="text"
                  placeholder="ルーム名"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm mb-2"
                />
                <select
                  value={newRoomType}
                  onChange={(e) => setNewRoomType(e.target.value as ChatRoomType)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm mb-2"
                >
                  <option value="group">グループ</option>
                  <option value="department">部署</option>
                  <option value="direct">直接</option>
                </select>
                <button
                  onClick={handleCreateRoom}
                  className="w-full bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 text-sm"
                >
                  作成
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              {rooms.map(room => (
                <button
                  key={room.id}
                  onClick={() => setSelectedRoom(room)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition ${
                    selectedRoom?.id === room.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                  }`}
                >
                  <div className="font-medium text-gray-900">{room.name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {room.type === 'department' && '部署'}
                    {room.type === 'direct' && '直接'}
                    {room.type === 'group' && 'グループ'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* メッセージエリア */}
          {selectedRoom ? (
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">{selectedRoom.name}</h3>
                <p className="text-sm text-gray-500">
                  {selectedRoom.type === 'department' && '部署チャット'}
                  {selectedRoom.type === 'direct' && '直接チャット'}
                  {selectedRoom.type === 'group' && 'グループチャット'}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map(message => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.userId === user?.id ? 'flex-row-reverse' : ''
                    }`}
                  >
                    <div className={`flex flex-col ${message.userId === user?.id ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-gray-900">{message.userName}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(message.createdAt).toLocaleTimeString('ja-JP', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div
                        className={`px-4 py-2 rounded-lg max-w-md ${
                          message.userId === user?.id
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{formatMessage(message.content)}</p>
                        {message.mentions && message.mentions.length > 0 && (
                          <div className="mt-1 text-xs opacity-75">
                            {message.mentions.length}件のメンション
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 border-t border-gray-200">
                <div className="flex gap-2">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={`${selectedRoom.name}にメッセージを送信... (@でメンション)`}
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-2 resize-none"
                    rows={2}
                  />
                  <button
                    onClick={handleSendMessage}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
                  >
                    送信
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Enterで送信、Shift+Enterで改行。@でメンション
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex items-center justify-center">
              <p className="text-gray-500">チャットルームを選択してください</p>
            </div>
          )}
        </div>
      </DiscordLayout>
    </AuthGuard>
  );
}

