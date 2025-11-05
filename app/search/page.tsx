'use client';

import { useState, useEffect } from 'react';
import AuthGuard from '@/components/AuthGuard';
import DiscordLayout from '@/components/DiscordLayout';
import { searchAll, getSearchHistory, type SearchResult, type SearchHistory } from '@/lib/searchDB';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [history, setHistory] = useState<SearchHistory[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const data = await getSearchHistory(10);
    setHistory(data);
  };

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const data = await searchAll(searchQuery);
      setResults(data);
      await loadHistory();
    } catch (err) {
      console.error('検索エラー:', err);
      alert('検索に失敗しました');
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(query);
    }
  };

  const getResultIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'member': return '👤';
      case 'task': return '📋';
      case 'announcement': return '📢';
      case 'event': return '📅';
      case 'file': return '📄';
    }
  };

  const getResultColor = (type: SearchResult['type']) => {
    switch (type) {
      case 'member': return 'bg-blue-100 text-blue-700';
      case 'task': return 'bg-green-100 text-green-700';
      case 'announcement': return 'bg-yellow-100 text-yellow-700';
      case 'event': return 'bg-purple-100 text-purple-700';
      case 'file': return 'bg-gray-100 text-gray-700';
    }
  };

  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = [];
    }
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  return (
    <AuthGuard>
      <DiscordLayout>
        <div className="p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">統合検索</h1>
            <p className="text-gray-600">メンバー、タスク、お知らせ、イベント、ファイルを横断検索</p>
          </div>

          {/* 検索バー */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="検索キーワードを入力..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-lg"
              />
              <button
                onClick={() => handleSearch(query)}
                disabled={isSearching}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-all font-semibold disabled:opacity-50"
              >
                {isSearching ? '検索中...' : '検索'}
              </button>
            </div>

            {/* 検索履歴 */}
            {history.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-2">最近の検索</p>
                <div className="flex flex-wrap gap-2">
                  {history.map(item => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setQuery(item.query);
                        handleSearch(item.query);
                      }}
                      className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-700"
                    >
                      {item.query}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 検索結果 */}
          {results.length > 0 && (
            <div className="space-y-6">
              {Object.entries(groupedResults).map(([type, typeResults]) => (
                <div key={type} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getResultColor(type as SearchResult['type'])}`}>
                      {type === 'member' && 'メンバー'}
                      {type === 'task' && 'タスク'}
                      {type === 'announcement' && 'お知らせ'}
                      {type === 'event' && 'イベント'}
                      {type === 'file' && 'ファイル'}
                    </span>
                    <span className="text-gray-500 text-base font-normal">({typeResults.length}件)</span>
                  </h2>
                  <div className="space-y-3">
                    {typeResults.map(result => (
                      <Link
                        key={`${result.type}-${result.id}`}
                        href={result.url}
                        className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">{getResultIcon(result.type)}</span>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 mb-1">{result.title}</h3>
                            {result.description && (
                              <p className="text-sm text-gray-600 line-clamp-2">{result.description}</p>
                            )}
                            {result.metadata && Object.keys(result.metadata).length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {Object.entries(result.metadata).map(([key, value]) => (
                                  <span key={key} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                                    {key}: {String(value)}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {query && results.length === 0 && !isSearching && (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <p className="text-gray-500 text-lg">検索結果が見つかりませんでした</p>
              <p className="text-gray-400 text-sm mt-2">別のキーワードで検索してください</p>
            </div>
          )}

          {!query && results.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <p className="text-gray-500 text-lg">検索キーワードを入力してください</p>
              <p className="text-gray-400 text-sm mt-2">メンバー、タスク、お知らせ、イベント、ファイルを横断検索できます</p>
            </div>
          )}
        </div>
      </DiscordLayout>
    </AuthGuard>
  );
}

