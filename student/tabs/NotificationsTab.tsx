
import React, { useState, useEffect } from 'react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, updateDoc, doc, writeBatch } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

interface NotificationsTabProps {
  user?: any;
}

const NotificationsTab: React.FC<NotificationsTabProps> = ({ user }) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [view, setView] = useState<'unread' | 'history'>('unread');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.studentNumber) return;
    // REMOVED orderBy("timestamp") to avoid failed-precondition index error
    const q = query(
      collection(db, "notifications"),
      where("studentId", "==", user.studentNumber)
    );
    const unsub = onSnapshot(q, (snap) => {
      // Sort client-side
      const data = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a: any, b: any) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      
      setNotifications(data);
      setIsLoading(false);
    });
    return () => unsub();
  }, [user]);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, "notifications", id), { status: 'read' });
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => n.status === 'unread');
    if (unread.length === 0) return;
    const batch = writeBatch(db);
    unread.forEach(n => {
      batch.update(doc(db, "notifications", n.id), { status: 'read' });
    });
    await batch.commit();
  };

  const filtered = notifications.filter(n => view === 'unread' ? n.status === 'unread' : n.status === 'read');

  return (
    <div className="space-y-6 lg:space-y-8 animate-fade-in">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <p className="text-[10px] font-black text-mPolyGreen uppercase tracking-widest">Communication Center</p>
          <h1 className="text-4xl font-black text-neutral-900 uppercase tracking-tighter leading-none">Your <span className="text-mPolyBlue">Alerts</span></h1>
        </div>
        <div className="flex bg-neutral-100 p-1 w-full lg:w-auto">
          <button 
            onClick={() => setView('unread')} 
            className={`flex-1 lg:flex-none px-8 py-3 text-[10px] font-black uppercase transition-all ${view === 'unread' ? 'bg-mPolyBlue text-white shadow-xl' : 'text-neutral-400 hover:text-neutral-600'}`}
          >
            New ({notifications.filter(n => n.status === 'unread').length})
          </button>
          <button 
            onClick={() => setView('history')} 
            className={`flex-1 lg:flex-none px-8 py-3 text-[10px] font-black uppercase transition-all ${view === 'history' ? 'bg-mPolyBlue text-white shadow-xl' : 'text-neutral-400 hover:text-neutral-600'}`}
          >
            History
          </button>
        </div>
      </header>

      {view === 'unread' && notifications.filter(n => n.status === 'unread').length > 0 && (
        <div className="flex justify-end">
          <button onClick={markAllAsRead} className="text-[10px] font-black uppercase text-mPolyBlue hover:text-mPolyGreen tracking-widest flex items-center gap-2">
            <i className="fa-solid fa-check-double"></i> Mark all as read
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="py-20 flex justify-center"><div className="w-10 h-10 border-4 border-mPolyBlue border-t-mPolyYellow animate-spin"></div></div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map(note => (
            <div key={note.id} className={`bg-white border-l-8 shadow-xl p-6 lg:p-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 animate-slide-left ${note.type === 'urgent' ? 'border-red-600' : 'border-mPolyBlue'}`}>
              <div className="flex items-center gap-6">
                <div className={`w-12 h-12 flex items-center justify-center shrink-0 ${note.type === 'urgent' ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-mPolyBlue'}`}>
                  <i className={`fa-solid ${note.type === 'urgent' ? 'fa-triangle-exclamation' : 'fa-bell'}`}></i>
                </div>
                <div>
                  <p className="text-[9px] font-black text-neutral-300 uppercase tracking-widest mb-1">{note.timestamp?.toDate?.()?.toLocaleString() || 'Just now'}</p>
                  <h4 className="text-lg font-black text-neutral-900 uppercase leading-none">{note.title}</h4>
                  <p className="text-xs font-semibold text-neutral-500 mt-2 max-w-2xl leading-relaxed">{note.message}</p>
                </div>
              </div>
              {note.status === 'unread' && (
                <button 
                  onClick={() => markAsRead(note.id)}
                  className="px-6 py-2 border-2 border-mPolyBlue text-mPolyBlue text-[10px] font-black uppercase hover:bg-mPolyBlue hover:text-white transition-all w-full lg:w-auto"
                >
                  Dismiss
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="py-32 text-center border-4 border-dashed border-neutral-100 flex flex-col items-center justify-center opacity-30">
          <i className="fa-solid fa-bell-slash text-6xl mb-6"></i>
          <h3 className="text-2xl font-black uppercase">No Alerts Found</h3>
          <p className="text-xs font-bold uppercase tracking-widest mt-2">Everything looks clear in your feed.</p>
        </div>
      )}
    </div>
  );
};

export default NotificationsTab;
