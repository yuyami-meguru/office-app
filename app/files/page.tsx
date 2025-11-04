'use client';

import { useState, useEffect } from 'react';
import AuthGuard from '@/components/AuthGuard';
import DiscordLayout from '@/components/DiscordLayout';
import { getCurrentOfficeId } from '@/lib/authDB';
import { getDepartments } from '@/lib/membersDB';
import {
  getFolders,
  getFiles,
  createFolder,
  uploadFile,
  deleteFile,
  deleteFolder,
  type FileFolder,
  type FileItem,
} from '@/lib/filesDB';

export const dynamic = 'force-dynamic';

export default function FilesPage() {
  const [folders, setFolders] = useState<FileFolder[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('全体');
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadDescription, setUploadDescription] = useState('');

  useEffect(() => {
    loadData();
  }, [selectedDepartment, selectedFolderId]);

  const loadData = async () => {
    try {
      await loadDepartments();
      await loadFolders();
      await loadFiles();
    } catch (err) {
      console.error('データ読み込みエラー:', err);
    }
  };

  const loadDepartments = async () => {
    try {
      const depts = await getDepartments();
      setDepartments(depts);
    } catch (err) {
      console.error('部署読み込みエラー:', err);
      setDepartments([]);
    }
  };

  const loadFolders = async () => {
    try {
      const dept = selectedDepartment === '全体' ? undefined : selectedDepartment;
      const data = await getFolders(dept);
      setFolders(data);
    } catch (err) {
      console.error('フォルダ読み込みエラー:', err);
      setFolders([]);
    }
  };

  const loadFiles = async () => {
    try {
      const dept = selectedDepartment === '全体' ? undefined : selectedDepartment;
      const data = await getFiles(selectedFolderId || undefined, dept);
      setFiles(data);
    } catch (err) {
      console.error('ファイル読み込みエラー:', err);
      setFiles([]);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      alert('フォルダ名を入力してください');
      return;
    }

    try {
      const dept = selectedDepartment === '全体' ? undefined : selectedDepartment;
      await createFolder(newFolderName, dept, selectedFolderId || undefined);
      setNewFolderName('');
      setIsCreatingFolder(false);
      await loadFolders();
    } catch (err) {
      alert('フォルダの作成に失敗しました');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      await uploadFile(file, selectedFolderId || undefined, uploadDescription || undefined);
      setUploadDescription('');
      await loadFiles();
      alert('ファイルのアップロードに成功しました');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ファイルのアップロードに失敗しました');
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const handleDeleteFile = async (id: number) => {
    if (!confirm('このファイルを削除しますか？')) return;
    try {
      await deleteFile(id);
      await loadFiles();
    } catch (err) {
      alert('ファイルの削除に失敗しました');
    }
  };

  const handleDeleteFolder = async (id: number) => {
    if (!confirm('このフォルダを削除しますか？フォルダ内のファイルも削除されます。')) return;
    try {
      await deleteFolder(id);
      await loadFolders();
      if (selectedFolderId === id) {
        setSelectedFolderId(null);
      }
    } catch (err) {
      alert('フォルダの削除に失敗しました');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
    if (fileType.includes('video')) return '🎥';
    if (fileType.includes('audio')) return '🎵';
    return '📎';
  };

  return (
    <AuthGuard>
      <DiscordLayout>
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900 mb-2">ファイル共有</h1>
              <p className="text-gray-600">部署ごとのファイルを整理・共有</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setIsCreatingFolder(!isCreatingFolder)}
                className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-all font-semibold"
              >
                {isCreatingFolder ? 'キャンセル' : '+ フォルダ作成'}
              </button>
              <label className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-all font-semibold cursor-pointer">
                {isUploading ? 'アップロード中...' : '+ ファイルアップロード'}
                <input
                  type="file"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* 部署選択 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700">部署:</span>
              <select
                value={selectedDepartment}
                onChange={(e) => {
                  setSelectedDepartment(e.target.value);
                  setSelectedFolderId(null);
                }}
                className="border border-gray-300 rounded-lg px-4 py-2"
              >
                <option value="全体">全体</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              {selectedFolderId && (
                <button
                  onClick={() => setSelectedFolderId(null)}
                  className="text-sm text-indigo-600 hover:text-indigo-700"
                >
                  ← フォルダ一覧に戻る
                </button>
              )}
            </div>
          </div>

          {/* フォルダ作成フォーム */}
          {isCreatingFolder && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="フォルダ名"
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                />
                <button
                  onClick={handleCreateFolder}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
                >
                  作成
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* フォルダ一覧 */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <h2 className="text-lg font-semibold mb-4">フォルダ</h2>
                <div className="space-y-2">
                  {folders.map(folder => (
                    <div
                      key={folder.id}
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedFolderId === folder.id
                          ? 'bg-indigo-50 border border-indigo-200'
                          : 'hover:bg-gray-50 border border-transparent'
                      }`}
                      onClick={() => setSelectedFolderId(folder.id)}
                    >
                      <div className="flex items-center gap-2">
                        <span>📁</span>
                        <span className="font-medium text-gray-900">{folder.name}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFolder(folder.id);
                        }}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        削除
                      </button>
                    </div>
                  ))}
                  {folders.length === 0 && (
                    <p className="text-gray-500 text-sm text-center py-4">フォルダがありません</p>
                  )}
                </div>
              </div>
            </div>

            {/* ファイル一覧 */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold mb-4">
                  {selectedFolderId ? 'ファイル' : 'ファイル一覧'}
                </h2>
                {files.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">ファイルがありません</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {files.map(file => (
                      <div
                        key={file.id}
                        className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        <span className="text-2xl">{getFileIcon(file.fileType)}</span>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 truncate">{file.fileName}</h3>
                          <div className="text-sm text-gray-500">
                            {formatFileSize(file.fileSize)} • {file.uploadedByName} • {new Date(file.uploadedAt).toLocaleDateString('ja-JP')}
                          </div>
                          {file.description && (
                            <p className="text-sm text-gray-600 mt-1">{file.description}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <a
                            href={file.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
                          >
                            開く
                          </a>
                          <button
                            onClick={() => handleDeleteFile(file.id)}
                            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm"
                          >
                            削除
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DiscordLayout>
    </AuthGuard>
  );
}

