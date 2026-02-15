// src/components/FrontDesk/FrontDeskDashboard.tsx

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, Clock, LogOut, Search, AlertTriangle, UserPlus, Download,
  Calendar, CheckSquare, Square, Trash2, Cloud
} from 'lucide-react';
import DatePicker from 'react-datepicker';
import { format, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import "react-datepicker/dist/react-datepicker.css";
import { googleDriveService } from '../../services/googleDriveService';
import { Visitor } from '../../types';
import { visitorService } from '../../services/visitorService';

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

const exportToExcel = (visitors: Visitor[], filename: string = 'Visitors_Report') => {
  const headers = ['Full Name', 'Phone Number', 'Visiting Resident', 'Room', 'Check-in Time', 'Check-out Time', 'Status', 'Visitor ID'];
  const rows = visitors.map(v => [
    v.fullName || '',
    v.phoneNumber || '',
    v.residentName || '',
    v.roomNumber || '',
    v.checkInTime ? formatDateTime(v.checkInTime) : '',
    v.checkOutTime ? formatDateTime(v.checkOutTime) : '',
    v.status || '',
    v.visitorIdNumber || '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
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
  const [activeVisitors, setActiveVisitors] = useState<Visitor[]>([]);
  const [allVisitors, setAllVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(startOfDay(new Date()));
  const [endDate, setEndDate] = useState<Date | null>(endOfDay(new Date()));

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    const unsubscribeActive = visitorService.subscribeToActiveVisitors((visitors) => {
      setActiveVisitors(visitors);
      setLoading(false);
    });

    const loadAllVisitors = async () => {
      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const all = await visitorService.getVisitorsByDateRange(thirtyDaysAgo, new Date());
        setAllVisitors(all);
      } catch (err) {
        console.error('Failed to load visitors', err);
      }
    };

    loadAllVisitors();
    return () => unsubscribeActive();
  }, []);

  // Filter by date range
  const filteredByDate = useMemo(() => {
    if (!startDate || !endDate) return [];
    return allVisitors.filter(visitor => {
      if (!visitor.checkInTime) return false;
      return isWithinInterval(visitor.checkInTime, {
        start: startOfDay(startDate),
        end: endOfDay(endDate)
      });
    });
  }, [allVisitors, startDate, endDate]);

  // Apply search
  const displayedVisitors = useMemo(() => {
    const search = searchTerm.toLowerCase();
    return filteredByDate
      .filter(visitor =>
        visitor.fullName?.toLowerCase().includes(search) ||
        visitor.phoneNumber?.includes(search) ||
        visitor.residentName?.toLowerCase().includes(search) ||
        visitor.roomNumber?.toLowerCase().includes(search) ||
        visitor.visitorIdNumber?.toLowerCase().includes(search)
      )
      .sort((a, b) => (b.checkInTime?.getTime() || 0) - (a.checkInTime?.getTime() || 0));
  }, [filteredByDate, searchTerm]);

  // Only show currently checked-in visitors for selection/checkout
  const checkInVisitorsInView = displayedVisitors.filter(v => v.status === 'checked-in');

  // Update select all state
  useEffect(() => {
    if (checkInVisitorsInView.length === 0) {
      setSelectAll(false);
    } else {
      const allSelected = checkInVisitorsInView.every(v => selectedIds.has(v.id));
      setSelectAll(allSelected);
    }
  }, [selectedIds, checkInVisitorsInView]);

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(checkInVisitorsInView.map(v => v.id)));
    }
  };

  const toggleVisitor = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleSingleCheckOut = async (visitorId: string) => {
    if (!window.confirm('Check out this visitor?')) return;
    try {
      await visitorService.checkOutVisitor(visitorId);
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(visitorId);
        return next;
      });
    } catch (err) {
      alert('Checkout failed. Please try again.');
    }
  };

  const handleBulkCheckOut = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Check out ${selectedIds.size} visitor(s)?`)) return;

    try {
      await Promise.all(
        Array.from(selectedIds).map(id => visitorService.checkOutVisitor(id))
      );
      setSelectedIds(new Set());
      alert(`${selectedIds.size} visitors checked out successfully!`);
    } catch (err) {
      alert('Some checkouts failed. Please try again.');
    }
  };

  const stats = useMemo(() => {
    const total = filteredByDate.length;
    const checkedIn = filteredByDate.filter(v => v.status === 'checked-in').length;
    const checkedOut = total - checkedIn;
    return { total, checkedIn, checkedOut };
  }, [filteredByDate]);

  const dateRangeText = startDate && endDate
    ? `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`
    : 'Select Date Range';

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
              <button onClick={onEmergencyToggle} className="bg-white text-red-600 px-8 py-3 rounded-xl font-bold text-lg hover:bg-gray-100 transition">
                Deactivate Emergency
              </button>
            )}
          </div>
        </div>
      )}

      <div className="px-4 py-8 lg:px-8 xl:px-12 2xl:px-20">
        {/* Header */}
        <div className="mb-10 bg-white rounded-3xl shadow-xl p-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-800">Visitor History & Management</h1>
              <p className="text-xl text-gray-600 mt-2">View logs, check out visitors, and export reports</p>
            </div>
            <DatePicker
              selectsRange
              startDate={startDate}
              endDate={endDate}
              onChange={(update: [Date | null, Date | null]) => {
                setStartDate(update[0]);
                setEndDate(update[1]);
              }}
              customInput={
                <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-5 rounded-2xl shadow-lg flex items-center gap-3 transition-all hover:scale-105">
                  <Calendar className="w-6 h-6" />
                  {dateRangeText}
                </button>
              }
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-3xl shadow-xl p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-lg font-medium">Total</p>
                <p className="text-6xl font-bold mt-3">{stats.total}</p>
              </div>
              <Users className="w-20 h-20 opacity-80" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-600 to-green-700 text-white rounded-3xl shadow-xl p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-lg font-medium">Checked In</p>
                <p className="text-6xl font-bold mt-3">{stats.checkedIn}</p>
              </div>
              <Clock className="w-20 h-20 opacity-80" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-600 to-purple-700 text-white rounded-3xl shadow-xl p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-lg font-medium">Checked Out</p>
                <p className="text-6xl font-bold mt-3">{stats.checkedOut}</p>
              </div>
              <LogOut className="w-20 h-20 opacity-80" />
            </div>
          </div>
        </div>

        {/* Action Bar */}
        {selectedIds.size > 0 && (
          <div className="mb-6 bg-red-50 border-2 border-red-300 rounded-2xl p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CheckSquare className="w-8 h-8 text-red-600" />
              <span className="text-xl font-bold text-red-800">
                {selectedIds.size} visitor{selectedIds.size !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-bold flex items-center gap-2"
              >
                <Square className="w-5 h-5" />
                Clear Selection
              </button>
              <button
                onClick={handleBulkCheckOut}
                className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold flex items-center gap-3 shadow-lg"
              >
                <LogOut className="w-6 h-6" />
                Bulk Check Out ({selectedIds.size})
              </button>
            </div>
          </div>
        )}

        {/* Search + Export */}
        <div className="flex flex-col sm:flex-row gap-6 items-center justify-between mb-10">
          <div className="flex-1 max-w-4xl">
            <div className="relative">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-7 h-7 text-gray-400" />
              <input
                type="text"
                placeholder="Search visitors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-16 pr-8 py-5 text-xl rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none shadow-lg"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={async () => {
                try {
                  await googleDriveService.ensureAuthorized();
                  await googleDriveService.createBackup();
                  alert('Backup successful! File saved to Google Drive.');
                } catch (err: any) {
                  alert('Backup failed: ' + (err.message || 'Unknown error'));
                }
              }}
              className="flex items-center gap-4 px-10 py-5 rounded-2xl font-bold text-xl shadow-xl bg-blue-600 hover:bg-blue-700 text-white transition-all hover:scale-105"
            >
              <Cloud className="w-8 h-8" />
              Backup to Drive
            </button>
            <button
              onClick={() => exportToExcel(displayedVisitors, `Visitors_${dateRangeText.replace(/ /g, '_')}`)}
              className="flex items-center gap-4 px-10 py-5 rounded-2xl font-bold text-xl shadow-xl bg-green-600 hover:bg-green-700 text-white transition-all hover:scale-105"
            >
              <Download className="w-8 h-8" />
              Export ({displayedVisitors.length})
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-6 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold">Visitor Log</h2>
              <p className="text-blue-100 text-lg mt-1">
                {dateRangeText} • {displayedVisitors.length} total
                {checkInVisitorsInView.length > 0 && ` • ${checkInVisitorsInView.length} checked in`}
              </p>
            </div>
            {checkInVisitorsInView.length > 0 && (
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-3 bg-white/20 hover:bg-white/30 px-6 py-3 rounded-xl backdrop-blur transition"
              >
                {selectAll ? <CheckSquare className="w-6 h-6" /> : <Square className="w-6 h-6" />}
                <span className="font-bold">
                  {selectAll ? 'Deselect All' : 'Select All'} ({checkInVisitorsInView.length})
                </span>
              </button>
            )}
          </div>

          {displayedVisitors.length === 0 ? (
            <div className="text-center py-24 px-8">
              <Users className="w-28 h-28 text-gray-300 mx-auto mb-8" />
              <h3 className="text-2xl font-bold text-gray-700 mb-4">No visitors found</h3>
              <p className="text-gray-500 text-lg">Try adjusting date range or search</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="w-12 px-6 py-5"></th>
                    <th className="text-left px-6 py-5 text-lg font-semibold text-gray-700">Visitor</th>
                    <th className="text-left px-6 py-5 text-lg font-semibold text-gray-700">Phone</th>
                    <th className="text-left px-6 py-5 text-lg font-semibold text-gray-700">Visiting</th>
                    <th className="text-left px-6 py-5 text-lg font-semibold text-gray-700">Room</th>
                    <th className="text-left px-6 py-5 text-lg font-semibold text-gray-700">Check-in</th>
                    <th className="text-left px-6 py-5 text-lg font-semibold text-gray-700">Check-out</th>
                    <th className="text-left px-6 py-5 text-lg font-semibold text-gray-700">Status</th>
                    <th className="text-center px-6 py-5 text-lg font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {displayedVisitors.map((visitor) => {
                    const isCheckedIn = visitor.status === 'checked-in';
                    const isSelected = selectedIds.has(visitor.id);

                    return (
                      <tr key={visitor.id} className={`hover:bg-blue-50 transition-colors ${isSelected ? 'bg-blue-100' : ''}`}>
                        <td className="px-6 py-6">
                          {isCheckedIn && (
                            <button
                              onClick={() => toggleVisitor(visitor.id)}
                              className="flex items-center justify-center"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-7 h-7 text-blue-600" />
                              ) : (
                                <Square className="w-7 h-7 text-gray-400 hover:text-blue-600" />
                              )}
                            </button>
                          )}
                        </td>
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
                        <td className="px-6 py-6 text-gray-700 font-medium text-lg">{visitor.phoneNumber}</td>
                        <td className="px-6 py-6 text-gray-700 text-lg">{visitor.residentName || '—'}</td>
                        <td className="px-6 py-6">
                          <span className="inline-block bg-blue-100 text-blue-800 font-bold text-lg px-6 py-3 rounded-xl">
                            {visitor.roomNumber || '—'}
                          </span>
                        </td>
                        <td className="px-6 py-6 text-gray-600 text-lg">
                          {visitor.checkInTime ? format(visitor.checkInTime, 'h:mm a') : '—'}
                        </td>
                        <td className="px-6 py-6 text-gray-600 text-lg">
                          {visitor.checkOutTime ? format(visitor.checkOutTime, 'h:mm a') : '—'}
                        </td>
                        <td className="px-6 py-6">
                          <span className={`inline-block px-5 py-2 rounded-full font-bold text-lg ${isCheckedIn
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-700'
                            }`}>
                            {isCheckedIn ? 'Checked In' : 'Checked Out'}
                          </span>
                        </td>
                        <td className="px-6 py-6 text-center">
                          {isCheckedIn && (
                            <button
                              onClick={() => handleSingleCheckOut(visitor.id)}
                              className="bg-red-600 hover:bg-red-700 text-white font-bold text-lg px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
                            >
                              Check Out
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="text-center mt-12 text-gray-500">
          <p className="text-lg">
            Real-time active: {activeVisitors.length} currently inside • Last updated: {new Date().toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
};