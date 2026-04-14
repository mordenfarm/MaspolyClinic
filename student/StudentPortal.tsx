
import React, { useState, useEffect, useRef } from 'react';
import HomeTab from './tabs/HomeTab';
import AppointmentTab from './tabs/AppointmentTab';
import MentalHealthTab from './tabs/MentalHealthTab';
import NotificationsTab from './tabs/NotificationsTab';
import Sidebar, { NavItem } from '../components/Sidebar';
import Header from '../components/Header';
import Icon from '../components/Icon';
import NotificationDrawer, { Notification } from '../components/NotificationDrawer';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

interface StudentPortalProps {
  onLogout: () => void;
  user: any;
}

const StudentPortal: React.FC<StudentPortalProps> = ({ onLogout, user }) => {
  const [activeTab, setActiveTab] = useState<'home' | 'appointments' | 'mental' | 'notifications'>('home');
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!user?.studentNumber) return;
    const q = query(
      collection(db, "notifications"),
      where("studentId", "==", user.studentNumber),
      where("status", "==", "unread")
    );
    const unsub = onSnapshot(q, (snap) => {
      setUnreadCount(snap.size);
    });
    return () => unsub();
  }, [user]);

  const navItems: NavItem[] = [
    { id: 'home', label: 'Home', icon: 'dashboard' },
    { id: 'appointments', label: 'Book', icon: 'appointments' },
    { id: 'notifications', label: 'Alerts', icon: 'bell', badge: unreadCount > 0 ? unreadCount.toString() : undefined },
    { id: 'mental', label: 'Mental', icon: 'mental' }
  ];

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeTab]);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar 
        activeId={activeTab} 
        items={navItems} 
        onItemClick={(id) => setActiveTab(id as any)} 
        onLogout={onLogout}
        title="M-Poly"
        subtitle="Clinic Unit"
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <Header 
          userName={`${user?.name || ''} ${user?.surname || ''}`}
          userSubtitle={user?.studentNumber || 'STUDENT'}
          roleTag="Student"
          onLogout={onLogout}
          onNotificationClick={() => setActiveTab('notifications')}
        />

        <main 
          ref={mainRef}
          className="flex-1 overflow-y-auto px-5 py-5 lg:py-6 pb-20 lg:pb-8 gradient-mesh no-scrollbar scroll-smooth"
        >
          <div className="w-full">
            {activeTab === 'home' && <HomeTab user={user} />}
            {activeTab === 'appointments' && <AppointmentTab user={user} />}
            {activeTab === 'mental' && <MentalHealthTab />}
            {activeTab === 'notifications' && <NotificationsTab user={user} />}
          </div>
        </main>

        <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-14 bg-mPolyBlue border-t border-white/10 shadow-2xl flex items-center justify-around z-[60]">
           {navItems.map(item => (
             <button 
                key={item.id} 
                onClick={() => setActiveTab(item.id as any)}
                className={`flex flex-col items-center justify-center flex-1 h-full relative ${activeTab === item.id ? 'text-mPolyYellow' : 'text-white/40'}`}
             >
                <Icon name={item.icon} className="w-5 h-5 mb-0.5" />
                <span className="text-[7px] font-black uppercase">{item.label}</span>
                {item.badge && (
                  <span className="absolute top-2 right-4 bg-red-600 text-white text-[8px] font-bold px-1 rounded-full border border-mPolyBlue">
                    {item.badge}
                  </span>
                )}
             </button>
           ))}
        </nav>
      </div>

      <NotificationDrawer 
        isOpen={isNotificationOpen} 
        onClose={() => setIsNotificationOpen(false)} 
      />
    </div>
  );
};

export default StudentPortal;
