
import React, { useState, useEffect } from 'react';
import Sidebar, { NavItem } from '../components/Sidebar';
import Header from '../components/Header';
import Icon from '../components/Icon';
import NotificationDrawer, { Notification } from '../components/NotificationDrawer';
import { db } from '../lib/firebase';
import { collection, doc, onSnapshot, query, limit, orderBy, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { EmergencyAlert, InventoryItem, PharmacyHistory, StaffMember } from '../types';

// Tab Components
import QueueTab from './tabs/QueueTab';
import StudentsTab from './tabs/StudentsTab';
import PharmacyTab from './tabs/PharmacyTab';
import MedHistoryTab from './tabs/MedHistoryTab';
import ManageUsersTab from './tabs/ManageUsersTab';

const AdminPortal: React.FC<{ onLogout: () => void; user?: StaffMember }> = ({ onLogout, user }) => {
  const [activeTab, setActiveTab] = useState<'queue' | 'patients' | 'inventory' | 'pharmacy_history' | 'manage_users'>('queue');
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [clockTick, setClockTick] = useState(Date.now());
  
  // Shared State for Tabs
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [pharmacyHistory, setPharmacyHistory] = useState<PharmacyHistory[]>([]);
  const [dbNotifications, setDbNotifications] = useState<Notification[]>([]);
  const [emergencies, setEmergencies] = useState<EmergencyAlert[]>([]);
  const isDoctor = user?.role === 'doctor';

  const navItems: NavItem[] = [
    { id: 'queue', label: 'Queue', icon: 'appointments' },
    { id: 'patients', label: 'Students', icon: 'records' },
    { id: 'inventory', label: 'Pharmacy', icon: 'fa-pills' },
    { id: 'pharmacy_history', label: 'History', icon: 'fa-history' },
    ...(!isDoctor ? [{ id: 'manage_users', label: 'Manage Users', icon: 'fa-users-gear' }] : [])
  ];

  const onNotify = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  useEffect(() => {
    // Standard registries
    onSnapshot(collection(db, "inventory"), (snap) => setInventory(snap.docs.map(d => ({ id: d.id, ...d.data() } as any))));
    onSnapshot(query(collection(db, "pharmacy_history"), orderBy("date", "desc"), limit(50)), (snap) => setPharmacyHistory(snap.docs.map(d => ({ id: d.id, ...d.data() } as any))));
    onSnapshot(query(collection(db, "notifications"), orderBy("timestamp", "desc"), limit(10)), (snap) => setDbNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() } as any))));
    onSnapshot(collection(db, "emergencies"), (snap) => {
      const data = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as EmergencyAlert))
        .sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setEmergencies(data);
    });
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setClockTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const activeEmergencies = emergencies.filter(e => e.status === 'active');

  const elapsedLabel = (alert: EmergencyAlert) => {
    const started = alert.timestamp?.toDate?.()?.getTime?.();
    if (!started) return 'Just now';
    const seconds = Math.max(0, Math.floor((clockTick - started) / 1000));
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const markEmergencyAttended = async (alert: EmergencyAlert) => {
    if (!alert.id) return;
    try {
      await updateDoc(doc(db, "emergencies", alert.id), {
        status: 'attended',
        attendedAt: serverTimestamp(),
        attendedBy: user?.name || 'Admin'
      });
      onNotify(`Emergency attended at ${alert.location}`);
    } catch (err) {
      console.error(err);
      alert("Failed to update emergency status.");
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Toast Notification */}
      <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none transition-all duration-700 ease-in-out ${successMsg ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-24 opacity-0 scale-75'}`}>
        <div className="bg-black text-white px-8 py-3.5 rounded-full shadow-2xl flex items-center gap-4 border border-white/10 min-w-[340px]">
           <div className="w-10 h-10 bg-mPolyGreen rounded-full flex items-center justify-center shrink-0 shadow-lg shadow-mPolyGreen/20"><i className="fa-solid fa-bell text-sm"></i></div>
           <div className="flex flex-col">
             <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/50 leading-none mb-1">Clinic Alert</span>
             <span className="text-xs font-bold uppercase truncate">{successMsg}</span>
           </div>
        </div>
      </div>

      <Sidebar activeId={activeTab} items={navItems} onItemClick={(id) => setActiveTab(id as any)} onLogout={onLogout} title="MasPoly Health" subtitle={isDoctor ? 'Doctor Console' : 'Admin Controller'} logoIcon="stethoscope" />

      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <Header userName={user?.name || 'Dr. Nyoni'} userSubtitle={isDoctor ? 'Assigned Doctor' : user?.isMainAdmin ? 'Chief Medical Officer' : 'Clinic Administrator'} roleTag={isDoctor ? 'Doctor' : 'Administrator'} onLogout={onLogout} onNotificationClick={() => setIsNotificationOpen(true)} />

        <main className="flex-1 overflow-y-auto px-5 py-8 pb-24 lg:pb-8 no-scrollbar gradient-mesh">
          <div className="w-full max-w-[1600px] mx-auto">
            {!isDoctor && activeEmergencies.length > 0 && (
              <div className="mb-8 space-y-4">
                {activeEmergencies.map(alert => (
                  <div key={alert.id} className="bg-red-600 text-white border-4 border-red-300 shadow-2xl p-6 animate-pulse flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    <div className="flex items-center gap-5">
                      <div className="w-16 h-16 bg-white text-red-600 flex items-center justify-center text-2xl">
                        <i className="fa-solid fa-triangle-exclamation"></i>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/70">Emergency Active</p>
                        <h3 className="text-2xl lg:text-4xl font-black uppercase tracking-tighter">{alert.location}</h3>
                        <p className="text-xs font-bold uppercase text-white/70">{alert.type} emergency • Timer {elapsedLabel(alert)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => markEmergencyAttended(alert)}
                      className="bg-white text-red-600 px-8 py-4 text-[11px] font-black uppercase tracking-widest shadow-xl w-full lg:w-auto"
                    >
                      Attended
                    </button>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'queue' && <QueueTab user={user} />}
            {activeTab === 'patients' && <StudentsTab onNotify={onNotify} inventory={inventory} />}
            {activeTab === 'inventory' && <PharmacyTab inventory={inventory} onNotify={onNotify} />}
            {activeTab === 'pharmacy_history' && <MedHistoryTab history={pharmacyHistory} />}
            {activeTab === 'manage_users' && !isDoctor && <ManageUsersTab onNotify={onNotify} />}
          </div>
        </main>

        {/* Mobile Navigation */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-mPolyBlue border-t border-white/10 shadow-2xl flex items-center justify-around z-[60]">
           {navItems.map(item => (
             <button 
                key={item.id} 
                onClick={() => setActiveTab(item.id as any)}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-all relative ${activeTab === item.id ? 'text-mPolyYellow scale-110' : 'text-white/40'}`}
             >
                <Icon name={item.icon} className="w-5 h-5 mb-1" />
                <span className="text-[7px] font-black uppercase tracking-widest">{item.label}</span>
                {item.badge && (
                  <span className="absolute top-2 right-4 bg-red-600 text-white text-[8px] font-bold px-1 rounded-full border border-mPolyBlue shadow-lg">
                    {item.badge}
                  </span>
                )}
             </button>
           ))}
        </nav>
      </div>

      <NotificationDrawer isOpen={isNotificationOpen} onClose={() => setIsNotificationOpen(false)} notifications={dbNotifications} />
    </div>
  );
};

export default AdminPortal;
