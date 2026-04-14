
import React, { useState, useEffect } from 'react';
import LandingPage from './LandingPage';
import StudentPortal from './student/StudentPortal';
import AdminPortal from './admin/AdminPortal';
import EmergencyView from './EmergencyView';
import { Modal } from './components/Modal';
import { UserRole } from './types';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'landing' | 'student' | 'admin' | 'emergency'>('landing');
  const [userData, setUserData] = useState<any>(null);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleLogin = (role: UserRole, data?: any) => {
    setUserData(data || null);
    if (role === 'student') setCurrentView('student');
    else if (role === 'admin' || role === 'doctor') setCurrentView('admin');
  };

  const handleLogout = () => {
    setUserData(null);
    setCurrentView('landing');
    setIsLogoutModalOpen(false);
  };

  const goToEmergency = () => setCurrentView('emergency');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="loading">
          <svg width="64px" height="48px">
              <polyline points="0.157 23.954, 14 23.954, 21.843 48, 43 0, 50 24, 64 24" id="back"></polyline>
            <polyline points="0.157 23.954, 14 23.954, 21.843 48, 43 0, 50 24, 64 24" id="front"></polyline>
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {currentView === 'landing' && (
        <LandingPage 
          onLogin={handleLogin}
          onEmergency={goToEmergency}
        />
      )}
      
      {currentView === 'student' && (
        <StudentPortal onLogout={() => setIsLogoutModalOpen(true)} user={userData} />
      )}

      {currentView === 'admin' && (
        <AdminPortal onLogout={() => setIsLogoutModalOpen(true)} user={userData} />
      )}

      {currentView === 'emergency' && (
        <EmergencyView onBack={() => setCurrentView('landing')} />
      )}

      <Modal 
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogout}
        title="End Session?"
        message="You are about to securely log out of the Masvingo Poly Clinical Portal. Your session data will be cleared."
        confirmText="Logout Now"
        variant="danger"
      />
    </div>
  );
};

export default App;
