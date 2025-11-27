// src/components/Layout/Header.tsx

import React, { useState, useEffect } from 'react';
import { Shield, Users, AlertTriangle, Settings, Clock, LogOut, User, Home } from 'lucide-react';
import { User as UserType } from '../../types';

interface HeaderProps {
  currentView: string;
  onViewChange: (view: string) => void;
  emergencyMode: boolean;
  onEmergencyToggle: () => void;
  activeVisitorCount: number;
  currentUser?: UserType | null;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onViewChange,
  emergencyMode,
  onEmergencyToggle,
  activeVisitorCount,
  currentUser,
  onLogout
}) => {
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const getNavItems = () => {
    if (!currentUser) return [];

    switch (currentUser.role) {
      case 'super-admin':
      case 'admin':
        return [
          { id: 'admin', label: 'Admin Dashboard', icon: Shield },
          { id: 'reports', label: 'Reports', icon: Settings }
        ];
      case 'front-desk':
        return [
          { id: 'front-desk', label: 'Dashboard', icon: Users },
        ];
      case 'hierarchy-person':
        return [
          { id: 'hierarchy', label: 'Reports', icon: Settings }
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <header className="bg-white shadow-lg border-b-4 border-blue-600">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4">

          {/* Left: Logo + Title */}
          <div className="flex items-center space-x-5">
            <div className="flex-shrink-0">
              <div className="w-16 h-16 bg-blue-700 rounded-full flex items-center justify-center shadow-xl">
                <img 
                  src="/logo.jpg" 
                  alt="Nazareth Hospital" 
                  className="w-14 h-14 rounded-full object-contain bg-white p-1"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = '<div class="text-white font-bold text-2xl">NH</div>';
                  }}
                />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Nazareth Hospital
              </h1>
              <p className="text-lg text-blue-600 font-semibold">Visitor Management</p>
              <p className="text-sm text-gray-500">Secure Visitor System</p>
            </div>
          </div>

          {/* Center: Navigation */}
          {navItems.length > 0 && (
            <nav className="hidden lg:flex items-center space-x-2">
              {navItems.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => onViewChange(id)}
                  className={`flex items-center gap-3 px-6 py-3 rounded-xl font-semibold text-lg transition-all transform hover:scale-105 ${
                    currentView === id
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                  }`}
                >
                  <Icon className="w-6 h-6" />
                  {label}
                </button>
              ))}
            </nav>
          )}

          {/* Right: Status Bar */}
          <div className="flex items-center space-x-4">

            {/* Staff Info */}
            {currentUser && (
              <div className="hidden sm:flex items-center gap-3 bg-gradient-to-r from-blue-50 to-blue-100 px-5 py-3 rounded-xl shadow-md">
                <User className="w-6 h-6 text-blue-700" />
                <div>
                  <div className="font-bold text-blue-900">
                    {currentUser.firstName} {currentUser.lastName}
                  </div>
                  <div className="text-xs text-blue-600 uppercase tracking-wider">
                    {currentUser.role.replace(/-/g, ' ')}
                  </div>
                </div>
              </div>
            )}

            {/* Active Visitors */}
            <div className="flex items-center gap-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl shadow-xl font-bold text-xl">
              <Users className="w-8 h-8" />
              <div>
                <div className="text-3xl">{activeVisitorCount}</div>
                <div className="text-sm opacity-90">Active</div>
              </div>
            </div>

            {/* Current Time */}
            <div className="hidden md:flex flex-col text-right">
              <div className="text-sm text-gray-500 font-medium">Current Time</div>
              <div className="text-lg font-bold text-gray-800">{currentTime}</div>
            </div>

            {/* Emergency Button */}
            <button
              onClick={onEmergencyToggle}
              className={`flex items-center gap-3 px-6 py-4 rounded-xl font-bold text-lg shadow-2xl transition-all transform hover:scale-110 ${
                emergencyMode
                  ? 'bg-red-600 text-white animate-pulse ring-4 ring-red-300'
                  : 'bg-red-50 text-red-700 hover:bg-red-100 border-2 border-red-300'
              }`}
            >
              <AlertTriangle className="w-7 h-7" />
              {emergencyMode ? 'EMERGENCY ACTIVE' : 'Emergency Mode'}
            </button>

            {/* Logout */}
            {onLogout && (
              <button
                onClick={onLogout}
                className="p-3 rounded-xl bg-gray-100 hover:bg-gray-200 transition-all hover:scale-110 shadow-md"
                title="Logout"
              >
                <LogOut className="w-6 h-6 text-gray-700" />
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        {navItems.length > 0 && (
          <div className="lg:hidden pb-4 border-t border-gray-200 pt-4">
            <div className="grid grid-cols-2 gap-3">
              {navItems.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => onViewChange(id)}
                  className={`flex flex-col items-center gap-2 px-4 py-4 rounded-xl font-bold transition-all ${
                    currentView === id
                      ? 'bg-blue-600 text-white shadow-xl'
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                  }`}
                >
                  <Icon className="w-8 h-8" />
                  <span className="text-sm">{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};