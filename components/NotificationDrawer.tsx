
import React from 'react';
import Icon from './Icon';

// Exported Notification interface for use in parent components
export interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'urgent' | 'info' | 'success';
}

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications?: Notification[];
}

const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ isOpen, onClose, notifications }) => {
  const defaultNotifications: Notification[] = [
    { id: '1', title: 'Emergency Alert', message: 'Medical emergency reported in Engineering Block.', time: '2m ago', type: 'urgent' },
    { id: '2', title: 'Stock Alert', message: 'Paracetamol 500mg is below 50 units.', time: '1h ago', type: 'urgent' },
    { id: '3', title: 'System Sync', message: 'Student ID database synced successfully.', time: '4h ago', type: 'success' },
    { id: '4', title: 'Clinic Update', message: 'Monthly report for September is ready for review.', time: 'Yesterday', type: 'info' }
  ];

  const list = notifications || defaultNotifications;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-mPolyBlue/40 backdrop-blur-sm z-[100] animate-fade-in"
          onClick={onClose}
        />
      )}
      
      {/* Drawer */}
      <div 
        className={`fixed top-0 left-0 bottom-0 w-[300px] lg:w-[400px] bg-white z-[101] shadow-2xl transition-transform duration-500 ease-out border-r border-neutral-100 flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-neutral-100 bg-mPolyBlue text-white shrink-0">
          <div className="flex items-center gap-3">
            <Icon name="bell" className="w-4 h-4 text-mPolyYellow" />
            <h3 className="text-sm font-black uppercase tracking-[0.2em]">Live Notifications</h3>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar bg-slate-50/50">
          {list.length > 0 ? (
            list.map((note) => (
              <div 
                key={note.id}
                className={`p-5 bg-white border border-neutral-100 shadow-sm relative overflow-hidden group hover:border-mPolyBlue transition-all`}
              >
                {note.type === 'urgent' && <div className="absolute top-0 left-0 bottom-0 w-1 bg-red-600"></div>}
                {note.type === 'info' && <div className="absolute top-0 left-0 bottom-0 w-1 bg-mPolyBlue"></div>}
                {note.type === 'success' && <div className="absolute top-0 left-0 bottom-0 w-1 bg-mPolyGreen"></div>}
                
                <div className="flex justify-between items-start mb-2">
                  <h4 className={`text-[10px] font-black uppercase tracking-tight ${note.type === 'urgent' ? 'text-red-600' : 'text-neutral-900'}`}>
                    {note.title}
                  </h4>
                  <span className="text-[8px] font-bold text-neutral-300 uppercase">{note.time}</span>
                </div>
                <p className="text-[11px] font-medium text-neutral-500 leading-relaxed uppercase">
                  {note.message}
                </p>
                <div className="mt-4 pt-3 border-t border-neutral-50 flex justify-end">
                   <button className="text-[8px] font-black uppercase text-mPolyBlue hover:text-mPolyGreen tracking-widest">
                     Mark as read
                   </button>
                </div>
              </div>
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-30 p-8 space-y-4">
               <Icon name="bell" className="w-16 h-16" />
               <p className="text-[10px] font-black uppercase tracking-widest">No new notifications</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-neutral-100 bg-white shrink-0">
          <button className="w-full py-4 border-2 border-neutral-100 text-[10px] font-black uppercase tracking-widest hover:border-mPolyBlue hover:text-mPolyBlue transition-all">
            Clear All Notifications
          </button>
        </div>
      </div>
    </>
  );
};

export default NotificationDrawer;
