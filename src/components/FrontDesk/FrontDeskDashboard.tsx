// src/components/FrontDesk/FrontDeskDashboard.tsx

import React, { useState, useEffect } from 'react';
import { Users, Clock, LogOut, Search, AlertTriangle, UserPlus, Download } from 'lucide-react';
import { Visitor } from '../../types';
import { visitorService } from '../../services/visitorService';

// Helper: Format date/time nicely for Excel
const formatDateTime = (date: Date | null) => {
  if (!date) return '';
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

// Export to Excel function
const exportToExcel = (visitors: Visitor[], filename: string = 'Active_Visitors') => {
  // Create CSV content
  const headers = ['Full Name', 'Phone Number', 'Visiting Resident', 'Room', 'Check-in Time', 'Visitor ID'];
  const rows = visitors.map(v => [
    v.fullName || '',
    v.phoneNumber || '',
    v.residentName || '',
    v.roomNumber || '',
    v.checkInTime ? formatDateTime(v.checkInTime) : '',
    v.visitorIdNumber || '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  // Create and trigger download
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0,10)}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

interface FrontDeskDashboardProps {
  onCheckInClick: () => void;
  emergencyMode?: boolean;
  onEmergencyToggle?: () => void;
}

export const FrontDeskDashboard: React.FC<FrontDeskDashboardProps> = ({
  onCheckInClick,
  emergencyMode = false,
  onEmergencyToggle,
}) => {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [allVisitorsToday, setAllVisitorsToday] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsubscribe = visitorService.subscribeToActiveVisitors((activeVisitors) => {
      setVisitors(activeVisitors);
      setLoading(false);
    });

    const loadTodayVisitors = async () => {
      try {
        const today = await visitorService.getTodayVisitors();
        setAllVisitorsToday(today);
      } catch (err) {
        console.error('Failed to load today visitors', err);
      }
    };

    loadTodayVisitors();

    return () => unsubscribe();
  }, []);

  const handleCheckOut = async (visitorId: string) => {
    if (window.confirm('Check out this visitor?')) {
      try {
        await visitorService.checkOutVisitor(visitorId);
      } catch (err) {
        alert('Checkout failed. Try again.');
      }
    }
  };

  const filteredVisitors = visitors.filter((visitor) => {
    const search = searchTerm.toLowerCase();
    return (
      visitor.fullName?.toLowerCase().includes(search) ||
      visitor.phoneNumber?.includes(search) ||
      visitor.residentName?.toLowerCase().includes(search) ||
      visitor.roomNumber?.toLowerCase().includes(search)
    );
  });

  const stats = {
    totalToday: allVisitorsToday.length,
    currentlyInside: visitors.length,
    checkedOutToday: allVisitorsToday.filter((v) => v.status === 'checked-out').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-16 h-16 border-8 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Emergency Banner */}
      {emergencyMode && (
        <div className="bg-red-600 text-white px-6 py-4 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <AlertTriangle className="w-10 h-10 animate-pulse" />
              <div>
                <h2 className="text-2xl font-bold">EMERGENCY MODE ACTIVE</h2>
                <p className="text-lg">All visitors must evacuate immediately</p>
              </div>
            </div>
            {onEmergencyToggle && (
              <button
                onClick={onEmergencyToggle}
                className="bg-white text-red-600 px-8 py-3 rounded-xl font-bold text-lg hover:bg-gray-100 transition"
              >
                Deactivate Emergency
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="px-4 py-8 lg:px-8 xl:px-12 2xl:px-20">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-3xl shadow-xl p-8 transform hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-lg font-medium">Total Today</p>
                <p className="text-6xl font-bold mt-3">{stats.totalToday}</p>
              </div>
              <Users className="w-20 h-20 opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-600 to-green-700 text-white rounded-3xl shadow-xl p-8 transform hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-lg font-medium">Currently Inside</p>
                <p className="text-6xl font-bold mt-3">{stats.currentlyInside}</p>
              </div>
              <Clock className="w-20 h-20 opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-600 to-purple-700 text-white rounded-3xl shadow-xl p-8 transform hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-lg font-medium">Checked Out</p>
                <p className="text-6xl font-bold mt-3">{stats.checkedOutToday}</p>
              </div>
              <LogOut className="w-20 h-20 opacity-80" />
            </div>
          </div>
        </div>

        {/* Search + Export Button Row */}
        <div className="flex flex-col sm:flex-row gap-6 items-center justify-between mb-10">
          <div className="flex-1 max-w-4xl">
            <div className="relative">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-7 h-7 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, phone, resident, or room..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-16 pr-8 py-5 text-xl rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none shadow-lg transition-all"
              />
            </div>
          </div>

          {/* Export Button */}
          <button
            onClick={() => exportToExcel(filteredVisitors, `Active_Visitors_${searchTerm ? 'Filtered' : 'All'}`)}
            disabled={filteredVisitors.length === 0}
            className={`flex items-center gap-4 px-10 py-5 rounded-2xl font-bold text-xl shadow-xl transition-all transform hover:scale-105 ${
              filteredVisitors.length === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            <Download className="w-8 h-8" />
            Export to Excel ({filteredVisitors.length})
          </button>
        </div>

        {/* Active Visitors Table */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-6">
            <h2 className="text-3xl font-bold">Active Visitors (Currently Inside)</h2>
            <p className="text-blue-100 text-lg mt-1">
              Real-time • {filteredVisitors.length} of {visitors.length} shown
              {searchTerm && ` • Filtered by "${searchTerm}"`}
            </p>
          </div>

          {filteredVisitors.length === 0 ? (
            <div className="text-center py-24 px-8">
              <Users className="w-28 h-28 text-gray-300 mx-auto mb-8" />
              <h3 className="text-2xl font-bold text-gray-700 mb-4">
                {searchTerm ? 'No visitors found' : 'No one is currently checked in'}
              </h3>
              <p className="text-gray-500 text-lg mb-10 max-w-md mx-auto">
                {searchTerm
                  ? 'Try adjusting your search'
                  : 'New check-ins will appear here automatically'}
              </p>
              <button
                onClick={onCheckInClick}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xl px-12 py-5 rounded-2xl shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all flex items-center gap-4 mx-auto"
              >
                <UserPlus className="w-8 h-8" />
                Start New Check-In
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="text-left px-6 py-5 text-lg font-semibold text-gray-700">Visitor</th>
                    <th className="text-left px-6 py-5 text-lg font-semibold text-gray-700">Phone</th>
                    <th className="text-left px-6 py-5 text-lg font-semibold text-gray-700">Visiting</th>
                    <th className="text-left px-6 py-5 text-lg font-semibold text-gray-700">Room</th>
                    <th className="text-left px-6 py-5 text-lg font-semibold text-gray-700">Check-in Time</th>
                    <th className="text-center px-6 py-5 text-lg font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredVisitors.map((visitor) => (
                    <tr key={visitor.id} className="hover:bg-blue-50 transition-colors">
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-5">
                          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                            {visitor.fullName?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 text-xl">{visitor.fullName}</div>
                            <div className="text-sm text-gray-500">ID: {visitor.visitorIdNumber}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6 text-gray-700 font-medium text-lg">
                        {visitor.phoneNumber}
                      </td>
                      <td className="px-6 py-6 text-gray-700 text-lg">
                        {visitor.residentName || '—'}
                      </td>
                      <td className="px-6 py-6">
                        <span className="inline-block bg-blue-100 text-blue-800 font-bold text-lg px-6 py-3 rounded-xl">
                          {visitor.roomNumber || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-6 text-gray-600 text-lg">
                        {visitor.checkInTime
                          ? new Date(visitor.checkInTime).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true,
                            })
                          : '—'}
                      </td>
                      <td className="px-6 py-6 text-center">
                        <button
                          onClick={() => handleCheckOut(visitor.id)}
                          className="bg-red-600 hover:bg-red-700 text-white font-bold text-lg px-10 py-4 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
                        >
                          Check Out
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-gray-500">
          <p className="text-lg">
            Data updates in real-time • Last updated: {new Date().toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
};