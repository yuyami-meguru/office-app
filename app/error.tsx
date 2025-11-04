'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">エラーが発生しました</h2>
        <p className="text-gray-600 mb-4">{error.message || '不明なエラーが発生しました'}</p>
        <button
          onClick={reset}
          className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
        >
          再試行
        </button>
      </div>
    </div>
  );
}

