'use client';

import { useState, useEffect } from 'react';
import AuthGuard from '@/components/AuthGuard';
import DiscordLayout from '@/components/DiscordLayout';
import { getCurrentGlobalUser } from '@/lib/authDB';
import { getMembers } from '@/lib/membersDB';
import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  getProjectMembers,
  addProjectMember,
  removeProjectMember,
  getProjectTasks,
  linkTaskToProject,
  type Project,
  type ProjectStatus,
  type ProjectMemberRole,
  type ProjectMember,
} from '@/lib/projectsDB';
import { getTasks } from '@/lib/tasksDB';

export const dynamic = 'force-dynamic';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectMembers, setProjectMembers] = useState<Record<number, ProjectMember[]>>({});
  const [projectTasks, setProjectTasks] = useState<Record<number, number[]>>({});
  const [filterStatus, setFilterStatus] = useState<string>('全て');

  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    status: '進行中' as ProjectStatus,
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadProjectDetails(selectedProject.id);
    }
  }, [selectedProject]);

  const loadData = async () => {
    await loadProjects();
    await loadMembers();
    await loadTasks();
  };

  const loadProjects = async () => {
    const data = await getProjects();
    setProjects(data);
  };

  const loadMembers = async () => {
    const data = await getMembers();
    setMembers(data);
  };

  const loadTasks = async () => {
    const data = await getTasks();
    setTasks(data);
  };

  const loadProjectDetails = async (projectId: number) => {
    const [membersData, tasksData] = await Promise.all([
      getProjectMembers(projectId),
      getProjectTasks(projectId),
    ]);
    setProjectMembers(prev => ({ ...prev, [projectId]: membersData }));
    setProjectTasks(prev => ({ ...prev, [projectId]: tasksData }));
  };

  const handleAddProject = async () => {
    if (!newProject.name) return;

    try {
      await createProject(
        newProject.name,
        newProject.description,
        newProject.status,
        newProject.startDate || undefined,
        newProject.endDate || undefined
      );
      await loadProjects();
      setNewProject({ name: '', description: '', status: '進行中', startDate: '', endDate: '' });
      setIsAdding(false);
    } catch (err) {
      alert('プロジェクトの作成に失敗しました');
    }
  };

  const handleDeleteProject = async (id: number) => {
    if (!confirm('このプロジェクトを削除しますか？')) return;
    try {
      await deleteProject(id);
      await loadProjects();
      if (selectedProject?.id === id) {
        setSelectedProject(null);
      }
    } catch (err) {
      alert('プロジェクトの削除に失敗しました');
    }
  };

  const handleStatusChange = async (id: number, status: ProjectStatus) => {
    try {
      await updateProject(id, { status });
      await loadProjects();
      if (selectedProject?.id === id) {
        setSelectedProject({ ...selectedProject, status });
      }
    } catch (err) {
      alert('ステータスの更新に失敗しました');
    }
  };

  const handleAddMember = async (projectId: number, userId: number, role: ProjectMemberRole) => {
    try {
      await addProjectMember(projectId, userId, role);
      await loadProjectDetails(projectId);
    } catch (err) {
      alert('メンバーの追加に失敗しました');
    }
  };

  const handleRemoveMember = async (memberId: number, projectId: number) => {
    if (!confirm('このメンバーを削除しますか？')) return;
    try {
      await removeProjectMember(memberId);
      await loadProjectDetails(projectId);
    } catch (err) {
      alert('メンバーの削除に失敗しました');
    }
  };

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case '計画中': return 'bg-gray-100 text-gray-700';
      case '進行中': return 'bg-blue-100 text-blue-700';
      case '保留': return 'bg-yellow-100 text-yellow-700';
      case '完了': return 'bg-green-100 text-green-700';
      case 'キャンセル': return 'bg-red-100 text-red-700';
    }
  };

  const filteredProjects = filterStatus === '全て'
    ? projects
    : projects.filter(p => p.status === filterStatus);

  return (
    <AuthGuard>
      <DiscordLayout>
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900 mb-2">プロジェクト管理</h1>
              <p className="text-gray-600">プロジェクトの進捗とメンバーを管理</p>
            </div>
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-all font-semibold"
            >
              {isAdding ? 'キャンセル' : '+ 新規プロジェクト'}
            </button>
          </div>

          {/* フィルタ */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2"
            >
              <option value="全て">全てのステータス</option>
              <option value="計画中">計画中</option>
              <option value="進行中">進行中</option>
              <option value="保留">保留</option>
              <option value="完了">完了</option>
              <option value="キャンセル">キャンセル</option>
            </select>
          </div>

          {/* 新規追加フォーム */}
          {isAdding && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">新しいプロジェクトを追加</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">プロジェクト名 *</label>
                  <input
                    type="text"
                    value={newProject.name}
                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    placeholder="プロジェクト名を入力"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">説明</label>
                  <textarea
                    value={newProject.description}
                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    rows={3}
                    placeholder="プロジェクトの説明を入力"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">ステータス</label>
                    <select
                      value={newProject.status}
                      onChange={(e) => setNewProject({ ...newProject, status: e.target.value as ProjectStatus })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    >
                      <option value="計画中">計画中</option>
                      <option value="進行中">進行中</option>
                      <option value="保留">保留</option>
                      <option value="完了">完了</option>
                      <option value="キャンセル">キャンセル</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">開始日</label>
                    <input
                      type="date"
                      value={newProject.startDate}
                      onChange={(e) => setNewProject({ ...newProject, startDate: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">終了日</label>
                    <input
                      type="date"
                      value={newProject.endDate}
                      onChange={(e) => setNewProject({ ...newProject, endDate: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    />
                  </div>
                </div>
                <button
                  onClick={handleAddProject}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
                >
                  追加
                </button>
              </div>
            </div>
          )}

          {/* プロジェクトリスト */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => setSelectedProject(project)}
                  className={`bg-white rounded-xl shadow-sm border-2 p-6 cursor-pointer transition-all ${
                    selectedProject?.id === project.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">{project.name}</h3>
                      {project.description && (
                        <p className="text-gray-600 text-sm mb-3">{project.description}</p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(project.status)}`}>
                          {project.status}
                        </span>
                        {project.startDate && (
                          <span className="text-sm text-gray-500">
                            開始: {new Date(project.startDate).toLocaleDateString('ja-JP')}
                          </span>
                        )}
                        {project.endDate && (
                          <span className="text-sm text-gray-500">
                            終了: {new Date(project.endDate).toLocaleDateString('ja-JP')}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProject(project.id);
                      }}
                      className="text-red-500 hover:text-red-700 text-sm font-semibold px-2 py-1"
                    >
                      削除
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <select
                      value={project.status}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleStatusChange(project.id, e.target.value as ProjectStatus);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 border border-gray-300 rounded px-3 py-1 text-sm"
                    >
                      <option value="計画中">計画中</option>
                      <option value="進行中">進行中</option>
                      <option value="保留">保留</option>
                      <option value="完了">完了</option>
                      <option value="キャンセル">キャンセル</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>

            {/* プロジェクト詳細 */}
            {selectedProject && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">{selectedProject.name}</h2>
                
                {/* メンバーセクション */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">メンバー</h3>
                  <div className="space-y-2 mb-4">
                    {projectMembers[selectedProject.id]?.map(member => (
                      <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <span className="font-medium text-gray-900">{member.userName}</span>
                          <span className="ml-2 text-sm text-gray-500">({member.role})</span>
                        </div>
                        <button
                          onClick={() => handleRemoveMember(member.id, selectedProject.id)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          削除
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <select
                      id="member-select"
                      className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
                    >
                      <option value="">メンバーを選択...</option>
                      {members
                        .filter(m => !projectMembers[selectedProject.id]?.some(pm => pm.userId === m.userId))
                        .map(member => (
                          <option key={member.id} value={member.userId}>{member.displayName}</option>
                        ))}
                    </select>
                    <select
                      id="role-select"
                      className="border border-gray-300 rounded px-3 py-2 text-sm"
                    >
                      <option value="メンバー">メンバー</option>
                      <option value="リーダー">リーダー</option>
                      <option value="オブザーバー">オブザーバー</option>
                    </select>
                    <button
                      onClick={() => {
                        const memberSelect = document.getElementById('member-select') as HTMLSelectElement;
                        const roleSelect = document.getElementById('role-select') as HTMLSelectElement;
                        const userId = parseInt(memberSelect.value, 10);
                        const role = roleSelect.value as ProjectMemberRole;
                        if (userId) {
                          handleAddMember(selectedProject.id, userId, role);
                          memberSelect.value = '';
                          roleSelect.value = 'メンバー';
                        }
                      }}
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
                    >
                      追加
                    </button>
                  </div>
                </div>

                {/* タスクセクション */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">関連タスク</h3>
                  <div className="space-y-2">
                    {projectTasks[selectedProject.id]?.length > 0 ? (
                      projectTasks[selectedProject.id].map(taskId => {
                        const task = tasks.find(t => t.id === taskId);
                        return task ? (
                          <div key={taskId} className="p-3 bg-gray-50 rounded-lg">
                            <span className="font-medium text-gray-900">{task.title}</span>
                            <span className="ml-2 text-sm text-gray-500">({task.status})</span>
                          </div>
                        ) : null;
                      })
                    ) : (
                      <p className="text-sm text-gray-500">関連タスクはありません</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {filteredProjects.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <p className="text-gray-500 text-lg">プロジェクトがまだ登録されていません</p>
              <p className="text-gray-400 text-sm mt-2">「+ 新規プロジェクト」ボタンから追加してください</p>
            </div>
          )}
        </div>
      </DiscordLayout>
    </AuthGuard>
  );
}

