import React, { useState, useEffect } from 'react';
import { Users, Settings, Shield, UserPlus, Edit, Trash2, Eye, LogOut, Printer } from 'lucide-react';
import { User, UserRole } from '../../types';
import { authService } from '../../services/authService';
import { CreateUserModal } from './CreateUserModal';
import { EditUserModal } from './EditUserModal';
import { printService, PrintData } from '../../services/printService';
import { BackupSettings } from './BackupSettings';

interface AdminDashboardProps {
  currentUser: User;
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser, onLogout }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const allUsers = await authService.getAllUsers();
      setUsers(allUsers);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  // const handleCreateUser = async (userData: Omit<User, 'id' | 'createdAt'>) => {
  //   try {
  //     await authService.createUser(userData);
  //     setShowCreateModal(false);
  //     loadUsers();
  //   } catch (err: any) {
  //     setError(err.message || 'Failed to create user');
  //   }
  // };

  const handleUpdateUser = async (userId: string, updates: Partial<User>) => {
    try {
      await authService.updateUser(userId, updates);
      setEditingUser(null);
      loadUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to update user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      await authService.deleteUser(userId);
      loadUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to delete user');
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'super-admin':
        return 'bg-red-100 text-red-800';
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'hierarchy-person':
        return 'bg-blue-100 text-blue-800';
      case 'front-desk':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const canManageUsers = authService.canManageUsers(currentUser);

  const printUserList = async () => {
    try {
      const userListHTML = `
        <div class="section">
          <h2 class="section-title">User Management Report</h2>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Total Users</div>
              <div class="info-value">${users.length}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Super Admins</div>
              <div class="info-value">${users.filter(u => u.role === 'super-admin').length}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Admins</div>
              <div class="info-value">${users.filter(u => u.role === 'admin').length}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Active Users</div>
              <div class="info-value">${users.filter(u => u.isActive).length}</div>
            </div>
          </div>
        </div>
        
        <div class="section">
          <h2 class="section-title">User Details</h2>
          <div class="info-grid">
            ${users.map(user => `
              <div class="info-item">
                <div class="info-label">${user.firstName} ${user.lastName}</div>
                <div class="info-value">
                  Email: ${user.email}<br>
                  Role: ${user.role.replace('-', ' ')}<br>
                  Department: ${user.department || 'N/A'}<br>
                  Status: ${user.isActive ? 'Active' : 'Inactive'}<br>
                  Last Login: ${user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;

      // const printData: PrintData = {
      //   type: 'report',
      //   content: {
      //     title: 'User Management Report',
      //     date: new Date().toLocaleDateString(),
      //     html: userListHTML
      //   }
      // };

      //const success = await printService.printReport(printData);
      // if (success) {
      //   alert('User list sent to printer successfully!');
      // } else {
      //   alert('Printing failed. Please try again or check your printer connection.');
      // }
    } catch (error) {
      console.error('Error printing user list:', error);
      alert('Printing failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Shield className="w-8 h-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Welcome, {currentUser.firstName} {currentUser.lastName}
              </div>
              <button
                onClick={onLogout}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Backup Settings */}
        <BackupSettings />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                    <dd className="text-lg font-medium text-gray-900">{users.length}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Shield className="h-6 w-6 text-red-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Super Admins</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {users.filter(u => u.role === 'super-admin').length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Settings className="h-6 w-6 text-purple-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Admins</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {users.filter(u => u.role === 'admin').length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Active Users</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {users.filter(u => u.isActive).length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">User Management</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">Manage system users and permissions</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={printUserList}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print User List
              </button>
              {canManageUsers && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Create User
                </button>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Login
                    </th>
                    {canManageUsers && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-700">
                                {user.firstName[0]}{user.lastName[0]}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                          {user.role.replace('-', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.department || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                      </td>
                      {canManageUsers && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setEditingUser(user)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            {user.id !== currentUser.id && (
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {/* {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onCreateUser={handleCreateUser}
        />
      )} */}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onUpdateUser={handleUpdateUser}
        />
      )}
    </div>
  );
}; 