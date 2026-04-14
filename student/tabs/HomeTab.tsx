
import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import Icon from '../../components/Icon';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { ClinicalRecord, SickNote, Appointment } from '../../types';
import OfficialReport from '../components/OfficialReport';
import SickNoteReport from '../components/SickNoteReport';

interface HomeTabProps {
  user?: any;
}

const HomeTab: React.FC<HomeTabProps> = ({ user }) => {
  const [records, setRecords] = useState<ClinicalRecord[]>([]);
  const [sickNotes, setSickNotes] = useState<SickNote[]>([]);
  const [activeQueue, setActiveQueue] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<ClinicalRecord | null>(null);
  const [selectedSickNote, setSelectedSickNote] = useState<SickNote | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const studentId = user?.studentNumber; 
    if (studentId) {
      setIsLoading(true);
      // Clinical Records
      const qRec = query(collection(db, "clinical_records"), where("studentId", "==", studentId));
      const unsubRec = onSnapshot(qRec, (snap) => {
        const results = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        setRecords(results.sort((a,b) => (b.date?.seconds || 0) - (a.date?.seconds || 0)));
      });

      // Sick Notes
      const qSick = query(collection(db, "sick_notes"), where("studentId", "==", studentId));
      const unsubSick = onSnapshot(qSick, (snap) => {
        setSickNotes(snap.docs.map(d => ({ id: d.id, ...d.data() } as SickNote)));
      });

      // Active Queue Tracking
      const today = new Date().toISOString().split('T')[0];
      const qQueue = query(
        collection(db, "appointments"), 
        where("date", "==", today)
      );
      const unsubQueue = onSnapshot(qQueue, (snap) => {
        const sorted = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as Appointment))
          .filter(a => a.status !== 'completed' && a.status !== 'cancelled')
          .sort((a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0));
        setActiveQueue(sorted);
        setIsLoading(false);
      });

      return () => { unsubRec(); unsubSick(); unsubQueue(); };
    }
  }, [user]);

  // Helper to check if booked time has passed
  const isConsultationPassed = (timeStr: string) => {
    try {
      const [time, period] = timeStr.split(' ');
      let [hours, minutes] = time.split(':').map(Number);
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      
      const aptDate = new Date();
      aptDate.setHours(hours, minutes, 0);
      
      // Allow 15 mins grace
      return currentTime.getTime() > (aptDate.getTime() + 15 * 60000);
    } catch (e) {
      return false;
    }
  };

  const userQueueInfo = useMemo(() => {
    const userApt = activeQueue.find(a => a.studentId === user?.studentNumber);
    if (!userApt) return null;

    const pendingQueue = activeQueue.filter(a => a.status === 'pending');
    const index = pendingQueue.findIndex(a => a.studentId === user?.studentNumber);
    const inRoom = activeQueue.find(a => a.status === 'confirmed');

    const hasPassed = userApt.status === 'pending' && isConsultationPassed(userApt.time);

    return {
      position: index !== -1 ? index + 1 : 0,
      totalPending: pendingQueue.length,
      status: userApt.status,
      time: userApt.time,
      estWait: (index !== -1 ? index : 0) * 15,
      isBeingSeen: userApt.status === 'confirmed',
      hasPassed
    };
  }, [activeQueue, user, currentTime]);

  return (
    <div className="space-y-4 lg:space-y-6 pb-20">
      <section className="bg-mPolyBlue p-6 lg:p-10 text-white relative overflow-hidden shadow-2xl animate-slide-left border-t-8 border-mPolyYellow">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 blur-3xl translate-x-1/2 -translate-y-1/2"></div>
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 bg-mPolyYellow text-mPolyBlue px-3 py-1 text-[10px] font-bold uppercase tracking-widest shadow-lg">
             Institutional Access Level 1
          </div>
          <h3 className="text-3xl lg:text-5xl font-heading font-bold tracking-tight uppercase">
            {user?.name} <span className="text-mPolyYellow">{user?.surname}</span>
          </h3>
          <p className="text-white/40 text-xs font-medium uppercase tracking-[0.2em]">Registration: {user?.studentNumber}</p>
        </div>
      </section>

      {userQueueInfo && (
        <div className="animate-fade-in">
           {userQueueInfo.hasPassed ? (
             <Card className="border-l-[12px] border-red-600 bg-red-50">
                <div className="flex items-center gap-6">
                   <div className="w-16 h-16 bg-red-600 text-white flex items-center justify-center text-2xl shadow-xl">
                      <i className="fa-solid fa-clock-rotate-left"></i>
                   </div>
                   <div>
                      <h4 className="text-xl font-black text-red-600 uppercase tracking-tighter">Consultation Time Passed</h4>
                      <p className="text-xs font-bold text-neutral-500 uppercase leading-relaxed max-w-md">
                        Your booked slot for {userQueueInfo.time} has expired. Please visit the clinic reception to reschedule or wait for a gap in the queue.
                      </p>
                   </div>
                </div>
             </Card>
           ) : userQueueInfo.isBeingSeen ? (
             <Card className="border-l-[12px] border-mPolyGreen bg-mPolyGreen/5 relative overflow-hidden">
                <div className="flex items-center gap-6">
                   <div className="w-20 h-20 bg-mPolyGreen text-white flex flex-col items-center justify-center shadow-xl animate-pulse">
                      <i className="fa-solid fa-door-open text-2xl"></i>
                   </div>
                   <div>
                      <h4 className="text-2xl font-black text-mPolyGreen uppercase tracking-tighter">Your Turn!</h4>
                      <p className="text-sm font-bold text-mPolyBlue uppercase">Please proceed to the consultation room now.</p>
                      <p className="text-[10px] font-bold text-neutral-400 mt-1 uppercase tracking-widest">A medical officer is waiting for you.</p>
                   </div>
                </div>
             </Card>
           ) : (
             <Card className="border-l-[12px] border-mPolyBlue bg-mPolyBlue/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 h-full w-32 bg-white/10 skew-x-12 translate-x-16"></div>
                <div className="flex flex-col lg:flex-row justify-between items-center gap-6 relative z-10">
                   <div className="flex items-center gap-6">
                      <div className="w-20 h-20 bg-mPolyBlue text-white flex flex-col items-center justify-center shadow-xl">
                         <span className="text-[10px] font-black uppercase opacity-60">Position</span>
                         <span className="text-3xl font-black">{userQueueInfo.position}</span>
                      </div>
                      <div>
                         <h4 className="text-xl font-black text-mPolyBlue uppercase tracking-tighter">Queue Dashboard</h4>
                         <p className="text-xs font-bold text-neutral-400 uppercase">You are {userQueueInfo.position} of {userQueueInfo.totalPending} in the waiting list.</p>
                         <div className="flex gap-4 mt-2">
                            <span className="bg-mPolyYellow text-mPolyBlue text-[8px] font-black uppercase px-2 py-0.5">
                              Waiting Room
                            </span>
                            <span className="text-[8px] font-black uppercase text-neutral-400">Scheduled: {userQueueInfo.time}</span>
                         </div>
                      </div>
                   </div>
                   <div className="text-center lg:text-right border-l-2 border-neutral-100 pl-6 lg:pl-10">
                      <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Estimated Wait</p>
                      <p className="text-3xl font-black text-mPolyGreen">~{userQueueInfo.estWait} MINS</p>
                   </div>
                </div>
             </Card>
           )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6 animate-slide-left">
           <Card title="Medical Documents Vault" className="border-t-8 border-mPolyGreen">
              <div className="space-y-4">
                 {sickNotes.length > 0 ? sickNotes.map(note => (
                   <button 
                    key={note.id} 
                    onClick={() => setSelectedSickNote(note)}
                    className="w-full flex items-center justify-between p-4 bg-slate-50 border border-neutral-100 group hover:border-mPolyBlue transition-all"
                   >
                     <div className="flex items-center gap-3">
                        <i className="fa-solid fa-file-signature text-mPolyBlue"></i>
                        <div className="text-left">
                           <p className="text-[10px] font-black text-mPolyBlue uppercase">Medical Excuse</p>
                           <p className="text-[8px] font-bold text-neutral-400 uppercase">{note.startDate} - {note.endDate}</p>
                        </div>
                     </div>
                     <i className="fa-solid fa-download text-neutral-200 group-hover:text-mPolyBlue"></i>
                   </button>
                 )) : (
                   <p className="text-[10px] font-bold text-neutral-300 uppercase italic">No certified documents.</p>
                 )}
              </div>
           </Card>

           <Card title="Clinical Summary" className="border-t-8 border-mPolyBlue">
              <div className="space-y-4 text-[10px] font-black uppercase tracking-widest">
                 <div className="flex justify-between border-b border-neutral-50 pb-2">
                    <span className="text-neutral-400">Consultations</span>
                    <span className="text-mPolyBlue">{records.length} Logs</span>
                 </div>
                 <div className="flex justify-between border-b border-neutral-50 pb-2">
                    <span className="text-neutral-400">Certificates</span>
                    <span className="text-mPolyGreen">{sickNotes.length} Issued</span>
                 </div>
              </div>
           </Card>
        </div>
        
        <div className="lg:col-span-2 space-y-6 animate-slide-right">
           <div className="flex justify-between items-center mb-2">
              <h4 className="text-xl font-black text-neutral-900 uppercase tracking-tighter">Clinical Log Feed</h4>
              <span className="bg-neutral-100 px-3 py-1 text-[8px] font-black uppercase text-mPolyBlue">{records.length} Entries</span>
           </div>

           <div className="space-y-4">
              {isLoading ? (
                <div className="py-20 text-center"><p className="text-[10px] font-black text-neutral-300 uppercase animate-pulse">Synchronizing Registry...</p></div>
              ) : records.length > 0 ? (
                records.map((record) => (
                  <div key={record.id} className="bg-white border-l-8 border-mPolyBlue shadow-xl p-6 flex justify-between items-center group transition-all">
                    <div>
                      <p className="text-[9px] font-black text-neutral-400 uppercase">{record.date?.toDate?.()?.toLocaleDateString() || 'N/A'}</p>
                      <h5 className="text-lg font-bold text-mPolyBlue uppercase">{record.diagnosis || 'Routine Evaluation'}</h5>
                    </div>
                    <Button variant="outline" className="text-[8px] py-2 px-4" onClick={() => setSelectedRecord(record)}>
                      <i className="fa-solid fa-download mr-2"></i> Download Record
                    </Button>
                  </div>
                ))
              ) : (
                <div className="py-20 text-center border-4 border-dashed border-neutral-50 opacity-20"><p className="text-2xl font-black uppercase">Archive Empty</p></div>
              )}
           </div>
        </div>
      </div>

      {selectedRecord && user && (
        <OfficialReport record={selectedRecord} student={user} onClose={() => setSelectedRecord(null)} />
      )}
      {selectedSickNote && user && (
        <SickNoteReport note={selectedSickNote} onClose={() => setSelectedSickNote(null)} />
      )}
    </div>
  );
};

export default HomeTab;
