
import React, { useState, useEffect } from 'react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { ClinicalRecord } from '../../types';
import OfficialReport from '../components/OfficialReport';

interface HealthRecordsTabProps {
  user?: any;
}

const HealthRecordsTab: React.FC<HealthRecordsTabProps> = ({ user }) => {
  const [records, setRecords] = useState<ClinicalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<ClinicalRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    if (!user) {
      setIsLoading(true);
      setRecords([]);
      return;
    }
    const studentId = user.studentNumber;
    if (!studentId) {
      if (user.uid || user.id) {
        console.warn("Clinical Registry: Missing studentNumber attribute.");
        setError("Student number not found in profile.");
      }
      setIsLoading(false);
      setRecords([]);
      return;
    }

    setIsLoading(true);
    try {
      const q = query(
        collection(db, "clinical_records"), 
        where("studentId", "==", studentId)
      );
      
      const unsub = onSnapshot(q, (snap) => {
        const results = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        const sorted = results.sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0));
        setRecords(sorted);
        setIsLoading(false);
        setError(null);
      }, (error) => {
        console.error("Clinical Sync Failed:", error);
        setError(`Sync error: ${error.message}`);
        setIsLoading(false);
      });

      return () => unsub();
    } catch (err: any) {
      setError(`Setup error: ${err.message}`);
      setIsLoading(false);
    }
  }, [user]);

  return (
    <div className="space-y-6 lg:space-y-10 pb-16">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 animate-slide-left print:hidden">
        <div className="space-y-2">
          <p className="text-[10px] lg:text-[11px] font-bold text-mPolyGreen uppercase tracking-[0.3em]">Institutional Repository</p>
          <h1 className="text-4xl lg:text-6xl font-heading font-bold tracking-tighter text-neutral-900 leading-none">
            Health <span className="text-mPolyBlue">Dossier</span>
          </h1>
        </div>
        <div className="bg-mPolyBlue text-white px-8 py-4 border-l-[12px] border-mPolyYellow flex items-center gap-6 shadow-2xl">
           <i className="fa-solid fa-user-shield text-mPolyYellow text-2xl"></i>
           <div className="flex flex-col">
              <span className="text-[8px] font-bold uppercase tracking-[0.2em] opacity-60">Verified ID</span>
              <span className="text-sm font-bold uppercase tracking-widest">{user?.studentNumber || 'AUTHENTICATING...'}</span>
           </div>
        </div>
      </header>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-6 animate-fade-in">
          <div className="flex items-center gap-4">
            <i className="fa-solid fa-exclamation-triangle text-red-500 text-xl"></i>
            <div>
              <h4 className="text-sm font-bold text-red-800 uppercase">Registry Error</h4>
              <p className="text-xs text-red-600 mt-1 uppercase tracking-tight">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10 print:hidden">
        <div className="lg:col-span-3 space-y-10 animate-slide-left">
           {isLoading ? (
             <div className="py-40 text-center flex flex-col items-center justify-center space-y-6">
                <div className="w-16 h-16 border-4 border-mPolyBlue border-t-mPolyYellow animate-spin"></div>
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Decrypting Clinical Data...</p>
             </div>
           ) : records.length > 0 ? (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
               {records.map(record => (
                 <div key={record.id} className="bg-white border-b-8 border-mPolyBlue shadow-xl overflow-hidden group hover:-translate-y-1 transition-all animate-fade-in relative">
                    <div className="p-10 space-y-10">
                       <div className="flex justify-between items-start">
                          <div className="bg-slate-50 p-5 border border-slate-100 text-center min-w-[90px] shadow-inner">
                             <p className="text-3xl font-bold text-mPolyBlue leading-none">
                                {record.date?.toDate?.() ? record.date.toDate().toLocaleDateString('en-GB', { day: '2-digit' }) : '--'}
                             </p>
                             <p className="text-[10px] font-bold uppercase text-neutral-400 tracking-widest mt-2">
                                {record.date?.toDate?.() ? record.date.toDate().toLocaleDateString('en-GB', { month: 'short' }) : '---'}
                             </p>
                          </div>
                          <span className={`px-6 py-2 text-[10px] font-bold uppercase tracking-widest shadow-lg ${record.disposition === 'Discharged Home' ? 'bg-mPolyGreen text-white' : 'bg-red-600 text-white'}`}>
                             {record.disposition}
                          </span>
                       </div>
                       
                       <div className="space-y-2">
                          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Clinical Outcome</p>
                          <h4 className="text-2xl font-bold text-neutral-900 leading-tight uppercase tracking-tighter">{record.diagnosis || 'Routine Evaluation'}</h4>
                       </div>

                       <div className="grid grid-cols-2 gap-6">
                          <div className="bg-slate-50 p-6 border border-slate-100 shadow-inner">
                             <p className="text-[10px] font-bold text-neutral-300 uppercase mb-2">Temp</p>
                             <p className="text-xl font-bold text-mPolyBlue">{record.vitals?.temp}°C</p>
                          </div>
                          <div className="bg-slate-50 p-6 border border-slate-100 shadow-inner">
                             <p className="text-[10px] font-bold text-neutral-300 uppercase mb-2">Pulse</p>
                             <p className="text-xl font-bold text-mPolyBlue">{record.vitals?.hr} bpm</p>
                          </div>
                       </div>

                       <div className="pt-8 border-t border-slate-50 flex gap-6">
                          <Button variant="primary" fullWidth className="py-6 text-xs font-bold shadow-xl" onClick={() => setSelectedRecord(record)}>
                             <i className="fa-solid fa-download mr-2"></i> Download Health Report
                          </Button>
                       </div>
                    </div>
                 </div>
               ))}
             </div>
           ) : (
             <div className="bg-white p-32 text-center border-4 border-dashed border-neutral-100 animate-fade-in flex flex-col items-center justify-center">
                <i className="fa-solid fa-folder-open text-7xl text-neutral-100 mb-10"></i>
                <h4 className="text-2xl font-bold text-neutral-200 tracking-tight uppercase">Registry Empty</h4>
                <p className="text-sm font-medium text-neutral-300 mt-4 max-w-sm leading-relaxed uppercase tracking-widest">
                   No history found for {user?.name}
                </p>
             </div>
           )}
        </div>

        <div className="lg:col-span-1 space-y-10 animate-slide-right">
           <div className="bg-mPolyBlue p-10 text-white relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-3xl"></div>
              <div className="relative z-10 space-y-10">
                 <div className="w-16 h-16 bg-white/10 flex items-center justify-center border border-white/20">
                    <i className="fa-solid fa-dna text-mPolyYellow text-3xl"></i>
                 </div>
                 <div>
                    <h3 className="text-3xl font-bold tracking-tight leading-tight uppercase">Secure Archive</h3>
                    <p className="text-xs font-medium opacity-60 leading-relaxed mt-4 uppercase">Institutional health record synchronization.</p>
                 </div>
              </div>
           </div>
           
           <Card title="Official Directives" className="border-l-[12px] border-mPolyGreen">
              <div className="space-y-4">
                 <button className="w-full text-left p-4 bg-slate-50 border border-slate-100 hover:border-mPolyBlue transition-all group flex justify-between items-center">
                    <span className="text-xs font-bold text-neutral-500 group-hover:text-mPolyBlue uppercase tracking-widest">Download Sick Note</span>
                    <i className="fa-solid fa-download text-neutral-200 group-hover:text-mPolyBlue transition-colors"></i>
                 </button>
                 <button className="w-full text-left p-4 bg-slate-50 border border-slate-100 hover:border-mPolyBlue transition-all group flex justify-between items-center">
                    <span className="text-xs font-bold text-neutral-500 group-hover:text-mPolyBlue uppercase tracking-widest">Download Clearance</span>
                    <i className="fa-solid fa-download text-neutral-200 group-hover:text-mPolyBlue transition-colors"></i>
                 </button>
              </div>
           </Card>
        </div>
      </div>

      {selectedRecord && user && (
        <OfficialReport 
          record={selectedRecord} 
          student={user} 
          onClose={() => setSelectedRecord(null)} 
        />
      )}
    </div>
  );
};

export default HealthRecordsTab;
