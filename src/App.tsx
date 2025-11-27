import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Header } from './components/Layout/Header';
import { Dashboard } from './components/Dashboard/Dashboard';
import { CheckInFlow } from './components/CheckIn/CheckInFlow';
import { CheckOutFlow } from './components/CheckOut/CheckOutFlow';
import { Reports } from './components/Reports/Reports';
import { Login } from './components/Auth/Login';
import { Signup } from './components/Auth/Signup';
import { AdminDashboard } from './components/Admin/AdminDashboard';
import { FrontDeskDashboard } from './components/FrontDesk/FrontDeskDashboard';
import { visitorService } from './services/visitorService';
import { authService } from './services/authService';
import { User, Visitor } from './types';

function AppContent() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [checkInMode, setCheckInMode] = useState<'check-in' | 'check-out' | null>(null);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [activeVisitorCount, setActiveVisitorCount] = useState(0);
  const [returningVisitor, setReturningVisitor] = useState<Visitor | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize auth service and check if user is already logged in
    const initializeAuth = async () => {
      try {
        // Wait a bit for Firebase to initialize and default users to be created
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const user = await authService.getCurrentUser();
        if (user) {
          setCurrentUser(user);
          // Redirect to appropriate dashboard based on role
          const defaultPath = getDefaultPathForUser(user);
          if (location.pathname === '/' || location.pathname === '/login' || location.pathname === '/signup') {
            navigate(defaultPath);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      }
    };
    
    initializeAuth();
  }, [location.pathname, navigate]);

  useEffect(() => {
    const unsubscribe = visitorService.subscribeToActiveVisitors((visitors) => {
      setActiveVisitorCount(visitors.length);
    });

    return () => unsubscribe();
  }, []);

  const getDefaultPathForUser = (user: User): string => {
    switch (user.role) {
      case 'super-admin':
      case 'admin':
        return '/admin';
      case 'hierarchy-person':
        return '/hierarchy';
      case 'front-desk':
        return '/front-desk';
      default:
        return '/login';
    }
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    const defaultPath = getDefaultPathForUser(user);
    navigate(defaultPath);
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      setCurrentUser(null);
      navigate('/');
      setCheckInMode(null);
      setReturningVisitor(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleEmergencyToggle = () => {
    setEmergencyMode(!emergencyMode);
  };

  const handleEmergencyEvacuation = async (visitorIds: string[]) => {
    try {
      await visitorService.emergencyEvacuation(visitorIds);
      alert(`Emergency evacuation completed for ${visitorIds.length} visitors.`);
    } catch (error) {
      console.error('Emergency evacuation failed:', error);
      alert('Emergency evacuation failed. Please try again.');
    }
  };

  const handleCheckInComplete = () => {
    if (currentUser?.role === 'front-desk') {
      navigate('/front-desk');
    } else {
      navigate('/');
    }
    setCheckInMode(null);
    setReturningVisitor(null);
  };

  const handleCheckIn = () => {
    setCheckInMode('check-in');
  };

  const handleCheckOut = () => {
    setCheckInMode('check-out');
  };

  // Protected Route Component
  const ProtectedRoute = ({ children, requiredRole }: { children: React.ReactNode; requiredRole?: string }) => {
    if (!currentUser) {
      return <Navigate to="/login" replace />;
    }
    
    if (requiredRole && currentUser.role !== requiredRole && currentUser.role !== 'super-admin') {
      return <Navigate to="/" replace />;
    }
    
    return <>{children}</>;
  };

  // Login Component
  const LoginPage = () => (
    <Login 
      onLoginSuccess={handleLoginSuccess} 
      onBackToCheckIn={() => navigate('/')}
      onNavigateToSignup={() => navigate('/signup')}
    />
  );

  // Signup Component
  const SignupPage = () => (
    <Signup onBackToLogin={() => navigate('/login')} />
  );

  // Admin Dashboard Component
  const AdminPage = () => (
    <ProtectedRoute requiredRole="admin">
      <AdminDashboard currentUser={currentUser!} onLogout={handleLogout} />
    </ProtectedRoute>
  );

  // Front Desk Dashboard Component
  const FrontDeskPage = () => (
    <ProtectedRoute requiredRole="front-desk">
      <div className="min-h-screen bg-gray-50">
        <Header
          currentView="front-desk"
          onViewChange={() => {}}
          emergencyMode={emergencyMode}
          onEmergencyToggle={handleEmergencyToggle}
          activeVisitorCount={activeVisitorCount}
          currentUser={currentUser!}
          onLogout={handleLogout}
        />
        
        <main className="py-6">
          <FrontDeskDashboard
            onCheckInClick={() => navigate('/')}
            emergencyMode={emergencyMode}
            onEmergencyToggle={handleEmergencyToggle}
          />
        </main>
      </div>
    </ProtectedRoute>
  );

  // Hierarchy Dashboard Component
  const HierarchyPage = () => (
    <ProtectedRoute requiredRole="hierarchy-person">
      <div className="min-h-screen bg-gray-50">
        <Header
          currentView="hierarchy"
          onViewChange={() => {}}
          emergencyMode={emergencyMode}
          onEmergencyToggle={handleEmergencyToggle}
          activeVisitorCount={activeVisitorCount}
          currentUser={currentUser!}
          onLogout={handleLogout}
        />
        
        <main className="py-6">
          <Reports />
        </main>
      </div>
    </ProtectedRoute>
  );

  // Visitor Check-in Page Component
  const VisitorCheckInPage = () => {
    if (checkInMode === 'check-in') {
      return (
        <div className="min-h-screen bg-gray-50">
          <Header
            currentView="checkin"
            onViewChange={() => {}}
            emergencyMode={emergencyMode}
            onEmergencyToggle={handleEmergencyToggle}
            activeVisitorCount={activeVisitorCount}
            currentUser={currentUser}
            onLogout={handleLogout}
          />
          
          <main className="py-6">
            <CheckInFlow
              onComplete={handleCheckInComplete}
              returningVisitor={returningVisitor}
            />
          </main>
        </div>
      );
    }

    if (checkInMode === 'check-out') {
      return (
        <div className="min-h-screen bg-gray-50">
          <Header
            currentView="checkout"
            onViewChange={() => {}}
            emergencyMode={emergencyMode}
            onEmergencyToggle={handleEmergencyToggle}
            activeVisitorCount={activeVisitorCount}
            currentUser={currentUser}
            onLogout={handleLogout}
          />
          
          <main className="py-6">
            <CheckOutFlow onComplete={() => setCheckInMode(null)} />
          </main>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-50">
        <Header
          currentView="visitor-checkin"
          onViewChange={() => {}}
          emergencyMode={emergencyMode}
          onEmergencyToggle={handleEmergencyToggle}
          activeVisitorCount={activeVisitorCount}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
        
        <main className="py-6">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Visitor Management</h2>
                <p className="text-gray-600">Check in or check out of the facility</p>
              </div>
              
              
              


 
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-6 py-12">
      {/* Optional: subtle background pattern */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-700" />
      </div>

      <div className="w-full max-w-2xl">
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/50 overflow-hidden">
          {/* Header */}
          <div className="text-center pt-12 pb-8 px-8">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              Visitor Management
            </h1>
            <p className="text-xl text-gray-600">
              Check in or check out of the facility
            </p>
          </div>

          {/* Staff Login Card - BIG & BEAUTIFUL */}
          <div className="px-12 pb-16">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-12 text-center">
              {/* Icon */}
              <div className="w-28 h-28 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg">
              </div>

              {/* Title */}
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                Staff and Administrators
              </h2>
              <p className="text-gray-600 mb-10 text-lg">
                Secure access to management dashboard
              </p>

              {/* BIG LOGIN BUTTON */}
              <button
                onClick={() => navigate('/login')}
                className="group relative w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 
                         text-white font-semibold text-xl py-6 px-10 rounded-2xl 
                         shadow-xl hover:shadow-2xl transform hover:-translate-y-1 
                         transition-all duration-300 flex items-center justify-center gap-4"
              >
                <span>Staff Login</span>
                <div className="absolute inset-0 rounded-2xl bg-white opacity-0 group-hover:opacity-20 transition-opacity" />
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-8 py-6 text-center">
            <p className="text-sm text-gray-500">
              Authorized personnel only • Secure system access
            </p>
          </div>
        </div>
      </div>
    </div>
  
            </div>
          </div>
        </main>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/" element={<VisitorCheckInPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/front-desk" element={<FrontDeskPage />} />
        <Route path="/hierarchy" element={<HierarchyPage />} />
      </Routes>

      {/* Emergency Mode Overlay */}
      {emergencyMode && (
        <div className="fixed inset-0 bg-red-600 bg-opacity-10 pointer-events-none z-40">
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2">
            <div className="bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg animate-pulse">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-white rounded-full animate-ping"></div>
                <span className="font-semibold">EMERGENCY MODE ACTIVE</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;