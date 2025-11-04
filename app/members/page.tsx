'use client';

import { useState, useEffect } from 'react';
import AuthGuard from '@/components/AuthGuard';
import Header from '@/components/Header';
import { getCurrentGlobalUser, getCurrentOfficeId } from '@/lib/authDB';
import { 
  getMembers, 
  getMyMembership,
  updateMember,
  deleteMember,
  getDepartments,
  addDepartment,
  deleteDepartment,
  type Member 
} from '@/lib/membersDB';

const ROLES = ['マネージャー', 'リーダー', 'メンバー', 'アシスタント'];

export const dynamic = 'force-dynamic';

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [myProfile, setMyProfile] = useState<Member | null>(null);
  const [departments, setDepartments] = useState<string[]>([]);
  const [isEditingMyProfile, setIsEditingMyProfile] = useState(false);
  const [editingMyProfile, setEditingMyProfile] = useState<Partial<Member>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', role: '', departments: [] as string[], group: '' });
  const [userIsAdmin, setUserIsAdmin] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'department' | 'role' | 'group'>('department');
  const [filterDepartment, setFilterDepartment] = useState<string>('全て');
  const [filterGroup, setFilterGroup] = useState<string>('全て');
  
  // 部署管理UI
  const [isManagingDepartments, setIsManagingDepartments] = useState(false);
  const [newDepartment, setNewDepartment] = useState('');
  
  // 編集UI
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await loadMembers();
    await loadMyProfile();
    await loadDepartments();
  };

  const loadMembers = async () => {
    const data = await getMembers();
    setMembers(data);
    
    // 管理者権限チェック
    const user = getCurrentGlobalUser();
    if (user) {
      const myMember = data.find(m => m.userId === user.id);
      setUserIsAdmin(myMember?.userRole === 'admin');
    }
  };

  const loadMyProfile = async () => {
    const profile = await getMyMembership();
    setMyProfile(profile);
  };

  const loadDepartments = async () => {
    const data = await getDepartments();
    setDepartments(data);
  };

  const handleSaveMyProfile = async () => {
    if (!myProfile || !editingMyProfile) return;
    
    try {
      await updateMember(myProfile.id, {
        displayName: editingMyProfile.displayName,
        role: editingMyProfile.role,
        departments: editingMyProfile.departments,
        group: editingMyProfile.group,
        avatarUrl: editingMyProfile.avatarUrl,
      });
      await loadData();
      setIsEditingMyProfile(false);
      setEditingMyProfile({});
    } catch (err) {
      alert('プロフィールの更新に失敗しました');
    }
  };

  const handleStartEditMyProfile = () => {
    if (!myProfile) return;
    setEditingMyProfile({
      displayName: myProfile.displayName,
      role: myProfile.role,
      departments: myProfile.departments,
      group: myProfile.group,
      avatarUrl: myProfile.avatarUrl,
    });
    setIsEditingMyProfile(true);
  };

  const handleAddMember = async () => {
    if (newMember.name && newMember.role && newMember.departments.length > 0) {
      try {
        // ユーザー名でグローバルユーザーを検索する必要がある
        // 簡易実装: ユーザー名を表示名として扱う
        alert('この機能は管理者がユーザー管理からメンバーを追加してください');
        // await addMemberDB(newMember);
        // await loadMembers();
        setNewMember({ name: '', role: '', departments: [], group: '' });
        setIsAdding(false);
      } catch (err) {
        alert('メンバーの追加に失敗しました');
      }
    }
  };

  const handleDeleteMember = async (id: number) => {
    if (!confirm('このメンバーを削除しますか？')) return;
    try {
      await deleteMember(id);
      await loadMembers();
    } catch (err) {
      alert('メンバーの削除に失敗しました');
    }
  };

  // 編集を開始
  const handleStartEdit = (member: Member) => {
    setEditingId(member.id);
    setEditingMember({ ...member });
  };

  // 編集をキャンセル
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingMember(null);
  };

  // 編集を保存
  const handleSaveEdit = async () => {
    if (editingMember && editingMember.displayName && editingMember.role && editingMember.departments.length > 0 && editingId) {
      try {
        await updateMember(editingId, {
          displayName: editingMember.displayName,
          role: editingMember.role,
          departments: editingMember.departments,
          group: editingMember.group,
          avatarUrl: editingMember.avatarUrl,
        });
        await loadMembers();
        setEditingId(null);
        setEditingMember(null);
      } catch (err) {
        alert('メンバーの更新に失敗しました');
      }
    }
  };

  // 編集中の部署をトグル
  const toggleEditingDepartment = (dept: string) => {
    if (!editingMember) return;
    
    if (editingMember.departments.includes(dept)) {
      setEditingMember({
        ...editingMember,
        departments: editingMember.departments.filter(d => d !== dept)
      });
    } else {
      setEditingMember({
        ...editingMember,
        departments: [...editingMember.departments, dept]
      });
    }
  };

  const toggleMyProfileDepartment = (dept: string) => {
    if (!editingMyProfile.departments) return;
    
    const current = editingMyProfile.departments || [];
    if (current.includes(dept)) {
      setEditingMyProfile({
        ...editingMyProfile,
        departments: current.filter(d => d !== dept)
      });
    } else {
      setEditingMyProfile({
        ...editingMyProfile,
        departments: [...current, dept]
      });
    }
  };

  // 部署の追加
  const handleAddDepartment = async () => {
    if (newDepartment && !departments.includes(newDepartment)) {
      try {
        await addDepartment(newDepartment);
        await loadDepartments();
        setNewDepartment('');
      } catch (err) {
        alert('部署の追加に失敗しました');
      }
    }
  };

  // 部署の削除
  const handleDeleteDepartment = async (dept: string) => {
    if (confirm(`「${dept}」を削除しますか？\nこの部署に所属しているメンバーからも削除されます。`)) {
      try {
        // メンバーから該当部署を削除
        const updatePromises = members
          .filter(m => m.departments.includes(dept))
          .map(m => updateMember(m.id, {
            displayName: m.displayName,
            role: m.role,
            departments: m.departments.filter(d => d !== dept),
            group: m.group,
            avatarUrl: m.avatarUrl,
          }));
        
        await Promise.all(updatePromises);
        await deleteDepartment(dept);
        await loadDepartments();
        await loadMembers();
      } catch (err) {
        alert('部署の削除に失敗しました');
      }
    }
  };

  // フィルタリング（複数部署対応）
  let filteredMembers = filterDepartment === '全て' 
    ? members 
    : members.filter(m => m.departments.includes(filterDepartment));

  // グループフィルター
  if (filterGroup !== '全て') {
    filteredMembers = filteredMembers.filter(m => m.group === filterGroup);
  }

  // ソート
  const sortedMembers = [...filteredMembers].sort((a, b) => {
    if (sortBy === 'name') {
      return a.displayName.localeCompare(b.displayName, 'ja');
    } else if (sortBy === 'department') {
      const aDept = a.departments[0] || '';
      const bDept = b.departments[0] || '';
      if (aDept === bDept) {
        const aGroup = a.group || '';
        const bGroup = b.group || '';
        if (aGroup === bGroup) {
          return a.displayName.localeCompare(b.displayName, 'ja');
        }
        return aGroup.localeCompare(bGroup, 'ja');
      }
      return aDept.localeCompare(bDept, 'ja');
    } else if (sortBy === 'role') {
      const roleOrder = ROLES;
      const aIndex = roleOrder.indexOf(a.role);
      const bIndex = roleOrder.indexOf(b.role);
      if (aIndex === bIndex) {
        return a.displayName.localeCompare(b.displayName, 'ja');
      }
      return aIndex - bIndex;
    } else if (sortBy === 'group') {
      const aGroup = a.group || 'zzz';
      const bGroup = b.group || 'zzz';
      if (aGroup === bGroup) {
        return a.displayName.localeCompare(b.displayName, 'ja');
      }
      return aGroup.localeCompare(bGroup, 'ja');
    }
    return 0;
  });

  // 部署ごとの人数をカウント
  const departmentCounts = members.reduce((acc, member) => {
    member.departments.forEach(dept => {
      acc[dept] = (acc[dept] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  // グループ一覧を取得
  const allGroups = Array.from(new Set(members.filter(m => m.group).map(m => m.group!)));
  
  // グループごとの人数をカウント
  const groupCounts = members.reduce((acc, member) => {
    if (member.group) {
      acc[member.group] = (acc[member.group] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  // アバター表示用の関数
  const getAvatarUrl = (member: Member | null) => {
    if (!member) return null;
    if (member.avatarUrl) return member.avatarUrl;
    return null;
  };

  const getAvatarInitial = (member: Member | null) => {
    if (!member) return '?';
    return member.displayName.charAt(0);
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Header title="メンバー管理" showBackButton />
        
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <p className="text-gray-600 mb-2">
                {userIsAdmin ? '管理者として全ての操作が可能です' : '閲覧モード（編集は管理者のみ）'}
              </p>
              <p className="text-sm text-gray-500">
                全 {members.length} 名 / 表示中 {sortedMembers.length} 名
              </p>
            </div>
            {userIsAdmin && (
              <div className="flex gap-3">
                <button
                  onClick={() => setIsManagingDepartments(!isManagingDepartments)}
                  className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-5 py-2.5 rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg font-medium"
                >
                  部署管理
                </button>
              </div>
            )}
          </div>

          {/* 自分のプロフィール */}
          {myProfile && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-lg p-6 mb-6 border-2 border-blue-200">
              <h2 className="text-xl font-bold text-gray-800 mb-4">自分のプロフィール</h2>
              
              {isEditingMyProfile ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      {getAvatarUrl(myProfile) ? (
                        <img
                          src={getAvatarUrl(myProfile)!}
                          alt={myProfile.displayName}
                          className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-2xl font-bold border-4 border-white shadow-lg">
                          {getAvatarInitial(myProfile)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        アバター画像URL
                      </label>
                      <input
                        type="text"
                        value={editingMyProfile.avatarUrl || ''}
                        onChange={(e) => setEditingMyProfile({ ...editingMyProfile, avatarUrl: e.target.value || null })}
                        className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm"
                        placeholder="https://example.com/avatar.jpg"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">表示名</label>
                    <input
                      type="text"
                      value={editingMyProfile.displayName || ''}
                      onChange={(e) => setEditingMyProfile({ ...editingMyProfile, displayName: e.target.value })}
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">役職</label>
                    <select
                      value={editingMyProfile.role || ''}
                      onChange={(e) => setEditingMyProfile({ ...editingMyProfile, role: e.target.value })}
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2"
                    >
                      {ROLES.map(role => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">部署（複数選択可）</label>
                    <div className="flex flex-wrap gap-2">
                      {departments.map(dept => (
                        <button
                          key={dept}
                          type="button"
                          onClick={() => toggleMyProfileDepartment(dept)}
                          className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                            editingMyProfile.departments?.includes(dept)
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {dept}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">グループ</label>
                    <input
                      type="text"
                      value={editingMyProfile.group || ''}
                      onChange={(e) => setEditingMyProfile({ ...editingMyProfile, group: e.target.value || null })}
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2"
                      placeholder="グループ名"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveMyProfile}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                    >
                      保存
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingMyProfile(false);
                        setEditingMyProfile({});
                      }}
                      className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-6">
                  <div className="relative">
                    {getAvatarUrl(myProfile) ? (
                      <img
                        src={getAvatarUrl(myProfile)!}
                        alt={myProfile.displayName}
                        className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                      />
                    ) : (
                      <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-3xl font-bold border-4 border-white shadow-lg">
                        {getAvatarInitial(myProfile)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">{myProfile.displayName}</h3>
                    <div className="flex gap-2 mb-2 flex-wrap">
                      <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded-full">
                        {myProfile.role}
                      </span>
                      {myProfile.departments.map((dept, index) => (
                        <span key={index} className="inline-block px-3 py-1 bg-purple-100 text-purple-700 text-sm font-semibold rounded-full">
                          {dept}
                        </span>
                      ))}
                      {myProfile.group && (
                        <span className="inline-block px-3 py-1 bg-green-100 text-green-700 text-sm font-semibold rounded-full">
                          {myProfile.group}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={handleStartEditMyProfile}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-semibold"
                    >
                      編集
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* フィルター＆ソート */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-md border border-gray-100 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">部署で絞り込み</label>
                <select
                  value={filterDepartment}
                  onChange={(e) => {
                    setFilterDepartment(e.target.value);
                    setFilterGroup('全て');
                  }}
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                >
                  <option value="全て">全ての部署 ({members.length}名)</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept} ({departmentCounts[dept] || 0}名)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">グループで絞り込み</label>
                <select
                  value={filterGroup}
                  onChange={(e) => setFilterGroup(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                >
                  <option value="全て">全てのグループ</option>
                  {allGroups.map(group => (
                    <option key={group} value={group}>{group} ({groupCounts[group] || 0}名)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">並び替え</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'name' | 'department' | 'role' | 'group')}
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                >
                  <option value="department">部署順</option>
                  <option value="group">グループ順</option>
                  <option value="name">名前順（五十音）</option>
                  <option value="role">役職順</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <main className="max-w-7xl mx-auto py-6 px-4">
          {/* 部署管理フォーム（管理者のみ） */}
          {userIsAdmin && isManagingDepartments && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl shadow-lg p-8 mb-6 border-2 border-purple-200">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">部署管理</h2>
              
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">新しい部署を追加</label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddDepartment()}
                    className="flex-1 border-2 border-purple-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="例：マネージャー、企画"
                  />
                  <button
                    onClick={handleAddDepartment}
                    className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-2.5 rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all font-semibold"
                  >
                    追加
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">現在の部署一覧</label>
                <div className="flex flex-wrap gap-3">
                  {departments.map(dept => (
                    <div key={dept} className="bg-white rounded-lg px-4 py-2 border-2 border-purple-200 flex items-center gap-3">
                      <span className="font-semibold text-gray-800">{dept}</span>
                      <span className="text-xs text-gray-500">({departmentCounts[dept] || 0}名)</span>
                      <button
                        onClick={() => handleDeleteDepartment(dept)}
                        className="text-red-500 hover:text-red-700 font-bold text-sm"
                      >
                        削除
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* メンバーリスト */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedMembers.map((member) => (
              <div key={member.id} className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border border-gray-100">
                {editingId === member.id && editingMember ? (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">メンバー情報を編集</h3>
                    
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        {getAvatarUrl(editingMember) ? (
                          <img
                            src={getAvatarUrl(editingMember)!}
                            alt={editingMember.displayName}
                            className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                            {getAvatarInitial(editingMember)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">アバター画像URL</label>
                        <input
                          type="text"
                          value={editingMember.avatarUrl || ''}
                          onChange={(e) => setEditingMember({ ...editingMember, avatarUrl: e.target.value || null })}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
                          placeholder="https://..."
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">表示名</label>
                      <input
                        type="text"
                        value={editingMember.displayName}
                        onChange={(e) => setEditingMember({ ...editingMember, displayName: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">役職</label>
                      <select
                        value={editingMember.role}
                        onChange={(e) => setEditingMember({ ...editingMember, role: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      >
                        {ROLES.map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-2">部署（複数選択可）</label>
                      <div className="flex flex-wrap gap-2">
                        {departments.map(dept => (
                          <button
                            key={dept}
                            type="button"
                            onClick={() => toggleEditingDepartment(dept)}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                              editingMember.departments.includes(dept)
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {dept}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">グループ</label>
                      <input
                        type="text"
                        value={editingMember.group || ''}
                        onChange={(e) => setEditingMember({ ...editingMember, group: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="グループ名"
                      />
                    </div>

                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={handleSaveEdit}
                        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all text-sm font-semibold"
                      >
                        保存
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-all text-sm font-semibold"
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        {getAvatarUrl(member) ? (
                          <img
                            src={getAvatarUrl(member)!}
                            alt={member.displayName}
                            className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                            {getAvatarInitial(member)}
                          </div>
                        )}
                        <div>
                          <h3 className="text-xl font-bold text-gray-800">{member.displayName}</h3>
                          <div className="flex gap-2 mt-1 flex-wrap">
                            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                              {member.role}
                            </span>
                            {member.departments.map((dept, index) => (
                              <span key={index} className="inline-block px-3 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">
                                {dept}
                              </span>
                            ))}
                            {member.group && (
                              <span className="inline-block px-3 py-1 bg-gradient-to-r from-green-100 to-teal-100 text-green-800 text-xs font-semibold rounded-full border border-green-200">
                                {member.group}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {userIsAdmin && (
                        <button
                          onClick={() => handleDeleteMember(member.id)}
                          className="text-red-500 hover:text-red-700 transition-colors px-2 py-1 text-xs font-semibold"
                        >
                          削除
                        </button>
                      )}
                    </div>
                    {userIsAdmin && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <button
                          onClick={() => handleStartEdit(member)}
                          className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-4 py-2 rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all text-sm font-semibold"
                        >
                          編集
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          {sortedMembers.length === 0 && members.length > 0 && (
            <div className="text-center py-16">
              <p className="text-gray-500 text-xl font-medium mb-2">該当するメンバーが見つかりません</p>
              <p className="text-gray-400 text-sm">フィルターを変更してください</p>
            </div>
          )}

          {members.length === 0 && (
            <div className="text-center py-16">
              <p className="text-gray-500 text-xl font-medium mb-2">メンバーがまだ登録されていません</p>
            </div>
          )}

          {!userIsAdmin && (
            <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-5">
              <p className="font-semibold text-amber-900 mb-1">閲覧モード</p>
              <p className="text-sm text-amber-800">
                メンバー情報の追加・削除・編集は管理者のみが行えます。一覧の閲覧のみ可能です。
              </p>
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
