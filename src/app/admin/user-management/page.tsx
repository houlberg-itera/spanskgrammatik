'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  current_level: string;
  created_at: string;
  updated_at: string;
  is_admin: boolean;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  total_exercises: number;
  total_questions: number;
  last_activity: string | null;
}

interface UserStats {
  totalUsers: number;
  totalAdmins: number;
  activeUsersToday: number;
  newUsersThisWeek: number;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats>({
    totalUsers: 0,
    totalAdmins: 0,
    activeUsersToday: 0,
    newUsersThisWeek: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [adminFilter, setAdminFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'email' | 'created_at' | 'last_activity'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch users with comprehensive data
      const response = await fetch('/api/admin/users');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch users');
      }

      setUsers(data.users);
      setStats(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleAdminStatus = async (userId: string, currentStatus: boolean) => {
    try {
      setProcessingAction(true);
      
      const response = await fetch('/api/admin/users/toggle-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, isAdmin: !currentStatus })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update admin status');
      }

      // Update local state
      setUsers(users.map(user => 
        user.id === userId 
          ? { ...user, is_admin: !currentStatus }
          : user
      ));

      // Update stats
      setStats(prev => ({
        ...prev,
        totalAdmins: currentStatus ? prev.totalAdmins - 1 : prev.totalAdmins + 1
      }));

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update admin status');
    } finally {
      setProcessingAction(false);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Er du sikker på, at du vil slette denne bruger? Denne handling kan ikke fortrydes.')) {
      return;
    }

    try {
      setProcessingAction(true);
      
      const response = await fetch('/api/admin/users/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete user');
      }

      // Remove user from local state
      setUsers(users.filter(user => user.id !== userId));
      setSelectedUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });

      // Update stats
      setStats(prev => ({
        ...prev,
        totalUsers: prev.totalUsers - 1,
        totalAdmins: users.find(u => u.id === userId)?.is_admin ? prev.totalAdmins - 1 : prev.totalAdmins
      }));

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleBulkAction = async (action: 'promote' | 'demote' | 'delete') => {
    if (selectedUsers.size === 0) return;

    const actionText = action === 'promote' ? 'gøre til administratorer' 
                     : action === 'demote' ? 'fjerne administrator rettigheder fra'
                     : 'slette';

    if (!confirm(`Er du sikker på, at du vil ${actionText} ${selectedUsers.size} bruger(e)?`)) {
      return;
    }

    try {
      setProcessingAction(true);
      
      const response = await fetch('/api/admin/users/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userIds: Array.from(selectedUsers), 
          action 
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to perform bulk action');
      }

      // Refresh user data
      await fetchUsers();
      setSelectedUsers(new Set());
      setShowBulkActions(false);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to perform bulk action');
    } finally {
      setProcessingAction(false);
    }
  };

  const filteredAndSortedUsers = users
    .filter(user => {
      const matchesSearch = 
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesLevel = levelFilter === 'all' || user.current_level === levelFilter;
      const matchesAdmin = adminFilter === 'all' || 
                          (adminFilter === 'admin' && user.is_admin) ||
                          (adminFilter === 'user' && !user.is_admin);
      
      return matchesSearch && matchesLevel && matchesAdmin;
    })
    .sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.full_name || a.email;
          bValue = b.full_name || b.email;
          break;
        case 'email':
          aValue = a.email;
          bValue = b.email;
          break;
        case 'created_at':
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        case 'last_activity':
          aValue = a.last_activity ? new Date(a.last_activity) : new Date(0);
          bValue = b.last_activity ? new Date(b.last_activity) : new Date(0);
          break;
        default:
          return 0;
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

  const handleSelectAll = () => {
    if (selectedUsers.size === filteredAndSortedUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredAndSortedUsers.map(user => user.id)));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Indlæser bruger administration...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">👥 Bruger Administration</h1>
              <p className="text-gray-600 mt-2">Administrer brugere og tildel administrator rettigheder</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/admin/dashboard"
                className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors text-center"
              >
                ← Tilbage til Dashboard
              </Link>
              <button
                onClick={fetchUsers}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                🔄 Opdater
              </button>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="text-red-400 mr-3">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-red-800">Fejl</h3>
                <p className="text-red-700 text-sm mt-1">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-400 hover:text-red-600"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="text-2xl font-bold text-blue-600">{stats.totalUsers}</div>
            <div className="text-gray-600 text-sm">Samlede Brugere</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="text-2xl font-bold text-green-600">{stats.totalAdmins}</div>
            <div className="text-gray-600 text-sm">Administratorer</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="text-2xl font-bold text-purple-600">{stats.activeUsersToday}</div>
            <div className="text-gray-600 text-sm">Aktive I Dag</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="text-2xl font-bold text-orange-600">{stats.newUsersThisWeek}</div>
            <div className="text-gray-600 text-sm">Nye Denne Uge</div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
            {/* Search */}
            <div className="flex-1">
              <label htmlFor="search" className="sr-only">Søg brugere</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  id="search"
                  type="text"
                  placeholder="Søg efter email, navn eller ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Alle Niveauer</option>
                <option value="A1">A1</option>
                <option value="A2">A2</option>
                <option value="B1">B1</option>
              </select>

              <select
                value={adminFilter}
                onChange={(e) => setAdminFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Alle Brugertyper</option>
                <option value="admin">Kun Administratorer</option>
                <option value="user">Kun Almindelige Brugere</option>
              </select>

              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field as any);
                  setSortOrder(order as any);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="created_at-desc">Nyeste Først</option>
                <option value="created_at-asc">Ældste Først</option>
                <option value="name-asc">Navn A-Z</option>
                <option value="name-desc">Navn Z-A</option>
                <option value="email-asc">Email A-Z</option>
                <option value="email-desc">Email Z-A</option>
                <option value="last_activity-desc">Seneste Aktivitet</option>
              </select>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedUsers.size > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                <div className="text-sm text-gray-600">
                  {selectedUsers.size} bruger(e) valgt
                </div>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                  <button
                    onClick={() => handleBulkAction('promote')}
                    disabled={processingAction}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
                  >
                    👑 Gør til Admin
                  </button>
                  <button
                    onClick={() => handleBulkAction('demote')}
                    disabled={processingAction}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 text-sm"
                  >
                    👤 Fjern Admin
                  </button>
                  <button
                    onClick={() => handleBulkAction('delete')}
                    disabled={processingAction}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm"
                  >
                    🗑️ Slet
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedUsers.size === filteredAndSortedUsers.length && filteredAndSortedUsers.length > 0}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bruger
                  </th>
                  <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Niveau
                  </th>
                  <th className="hidden lg:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aktivitet
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Handlinger
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(user.id)}
                        onChange={(e) => {
                          const newSelected = new Set(selectedUsers);
                          if (e.target.checked) {
                            newSelected.add(user.id);
                          } else {
                            newSelected.delete(user.id);
                          }
                          setSelectedUsers(newSelected);
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-gray-600 font-medium">
                              {(user.full_name || user.email).charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.full_name || 'Ingen navn'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {user.email}
                          </div>
                          <div className="text-xs text-gray-400 md:hidden">
                            {user.current_level} • {user.total_exercises} øvelser
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.current_level}</div>
                      <div className="text-xs text-gray-500">
                        {user.total_exercises} øvelser • {user.total_questions} spørgsmål
                      </div>
                    </td>
                    <td className="hidden lg:table-cell px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {user.last_activity ? (
                          new Date(user.last_activity).toLocaleDateString('da-DK')
                        ) : (
                          'Aldrig'
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        Oprettet: {new Date(user.created_at).toLocaleDateString('da-DK')}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.is_admin 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.is_admin ? '👑 Administrator' : '👤 Bruger'}
                        </span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.email_confirmed_at 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {user.email_confirmed_at ? '✅ Bekræftet' : '⏳ Ubekræftet'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium space-y-2">
                      <div className="flex flex-col space-y-2">
                        <button
                          onClick={() => toggleAdminStatus(user.id, user.is_admin)}
                          disabled={processingAction}
                          className={`px-3 py-1 text-xs rounded ${
                            user.is_admin
                              ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                              : 'bg-green-100 text-green-800 hover:bg-green-200'
                          } disabled:opacity-50`}
                        >
                          {user.is_admin ? '👤 Fjern Admin' : '👑 Gør til Admin'}
                        </button>
                        <button
                          onClick={() => deleteUser(user.id)}
                          disabled={processingAction}
                          className="px-3 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200 disabled:opacity-50"
                        >
                          🗑️ Slet
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {filteredAndSortedUsers.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Ingen brugere fundet</h3>
              <p className="text-gray-500">Prøv at justere dine søge- eller filterkriterier.</p>
            </div>
          )}
        </div>

        {/* Users Summary */}
        <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Bruger Oversigt</h3>
          <div className="text-sm text-gray-600 space-y-2">
            <p>Viser {filteredAndSortedUsers.length} af {users.length} brugere</p>
            <p>Filtreret efter: {searchTerm && `"${searchTerm}"`} {levelFilter !== 'all' && `niveau ${levelFilter}`} {adminFilter !== 'all' && `${adminFilter === 'admin' ? 'administratorer' : 'almindelige brugere'}`}</p>
            <p>Sorteret efter: {sortBy === 'name' ? 'navn' : sortBy === 'email' ? 'email' : sortBy === 'created_at' ? 'oprettelsesdato' : 'seneste aktivitet'} ({sortOrder === 'asc' ? 'stigende' : 'faldende'})</p>
          </div>
        </div>
      </div>
    </div>
  );
}