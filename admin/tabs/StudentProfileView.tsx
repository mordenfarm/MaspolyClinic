
import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../../components/Card';
import { Patient, ClinicalRecord } from '../../types';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

interface StudentProfileViewProps {
  student: Patient;
  onBack: () => void;
}

const StudentProfileView: React.FC<StudentProfileViewProps> = ({ student, onBack }) => {
  const [history, setHistory] = useState<ClinicalRecord[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'bio' | 'clinical'>('bio');
  const [tempUnit, setTempUnit] = useState<'C' | 'F'>('C');

  useEffect(() => {
    // FIX: Using studentNumber to retrieve history for consistent tagging
    const q = query(collection(db, "clinical_records"), where("studentId", "==", student.studentNumber));
    return onSnapshot(q, (snap) => {
      const res = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      setHistory(res.sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0)));
    });
  }, [student]);

  const convertTemp = (c: number) => tempUnit === 'C' ? `${c}°C` : `${((c * 9/5) + 32).toFixed(1)}°F`;

  const healthSummary = useMemo(() => {
    if (history.length === 0) return null;
    const avgTemp = history.reduce((acc, curr) => acc + (curr.vitals?.temp || 0), 0) / history.length;
    const diagnoses = history.map(h => h.diagnosis).filter(Boolean);
    const mostFreq = diagnoses.sort((a,b) =>
        diagnoses.filter(v => v===a).length - diagnoses.filter(v => v===b).length
    ).pop();

    return { avgTemp: avgTemp.toFixed(1), mostFreq };
  }, [history]);

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header Profile Card */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white p-8 shadow-xl border-l-[12px] border-mPolyBlue gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rotate-45 translate-x-32 -translate-y-32"></div>
        <div className="flex items-center gap-8 relative z-10">
          <button onClick={onBack} className="w-12 h-12 bg-slate-50 flex items-center justify-center text-mPolyBlue hover:bg-mPolyBlue hover:text-white transition-all shadow-sm">
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <div className="flex items-center gap-6">
            <img 
              src={`https://ui-avatars.com/api/?name=${student.name}+${student.surname}&background=163959&color=fff&bold=true`} 
              className="w-20 h-20 shadow-2xl border-4 border-white" 
              alt="Profile" 
            />
            <div>
              <h3 className="text-4xl font-bold text-mPolyBlue tracking-tighter leading-none">{student.name} {student.surname}</h3>
              <p className="text-xs font-bold text-neutral-400 mt-2 tracking-wide">{student.studentNumber} • Level {student.level}</p>
            </div>
          </div>
        </div>
        <div className="flex bg-neutral-100 p-1 w-full lg:w-auto relative z-10">
          <button 
            onClick={() => setActiveSubTab('bio')} 
            className={`flex-1 lg:flex-none px-8 py-3 text-xs font-bold transition-all ${activeSubTab === 'bio' ? 'bg-white text-mPolyBlue shadow-sm' : 'text-neutral-400 hover:text-neutral-600'}`}
          >
            Bio Record
          </button>
          <button 
            onClick={() => setActiveSubTab('clinical')} 
            className={`flex-1 lg:flex-none px-8 py-3 text-xs font-bold transition-all ${activeSubTab === 'clinical' ? 'bg-white text-mPolyBlue shadow-sm' : 'text-neutral-400 hover:text-neutral-600'}`}
          >
            Clinical Dossier
          </button>
        </div>
      </div>

      {activeSubTab === 'bio' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card title="Demographic & Institutional Data">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-neutral-300">Enrollment Date</p>
                  <p className="text-sm font-semibold text-neutral-800">{student.registrationDate || '2026-01-10'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-neutral-300">Faculty Focus</p>
                  <p className="text-sm font-bold text-mPolyBlue">{student.course}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-neutral-300">Phone Anchor</p>
                  <p className="text-sm font-semibold text-neutral-800">{student.phone}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-neutral-300">Bio Gender</p>
                  <p className="text-sm font-semibold text-neutral-800">{student.gender}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-neutral-300">Date of Birth</p>
                  <p className="text-sm font-semibold text-neutral-800">{student.dob}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-neutral-300">Institutional Level</p>
                  <p className="text-sm font-bold text-mPolyGreen">{student.level}</p>
                </div>
                <div className="col-span-full space-y-1">
                  <p className="text-xs font-bold text-neutral-300">Verified Residential Address</p>
                  <p className="text-sm font-semibold text-neutral-800 border-b border-neutral-50 pb-2">{student.address || 'Masvingo Poly Hostel Block C, Room 22'}</p>
                </div>
              </div>
            </Card>

            <Card title="Emergency Chain of Command" className="border-l-8 border-mPolyYellow">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-mPolyYellow/10 flex items-center justify-center text-mPolyBlue shadow-sm border border-mPolyYellow/20">
                    <i className="fa-solid fa-user-shield"></i>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-neutral-300">Next of Kin Name</p>
                    <p className="text-sm font-bold text-neutral-800">{student.nextOfKinName || 'Primary contact'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-mPolyYellow/10 flex items-center justify-center text-mPolyBlue shadow-sm border border-mPolyYellow/20">
                    <i className="fa-solid fa-phone-flip"></i>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-neutral-300">Next of Kin Contact</p>
                    <p className="text-sm font-bold text-neutral-800">{student.nextOfKinPhone || 'No contact logged'}</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-8">
            <Card className="bg-mPolyBlue text-white p-12 text-center border-none flex flex-col items-center group">
              <div className="w-20 h-20 bg-white/10 flex items-center justify-center mb-6 transition-transform group-hover:scale-110">
                <i className="fa-solid fa-file-medical text-3xl text-mPolyYellow"></i>
              </div>
              <h4 className="text-6xl font-bold mb-2 leading-none tracking-tighter">{history.length}</h4>
              <p className="text-xs font-bold uppercase opacity-40">Clinical Encounters</p>
              <div className="mt-8 w-full h-1 bg-white/10"><div className="bg-mPolyYellow h-full" style={{width: `${Math.min(history.length * 10, 100)}%`}}></div></div>
            </Card>

            <Card title="Health Analytics" className="border-t-8 border-mPolyGreen">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-neutral-400">Last temperature</span>
                  <span className={`text-sm font-bold ${(history[0]?.vitals?.temp || 0) > 37.5 ? 'text-red-600' : 'text-mPolyBlue'}`}>{history[0]?.vitals?.temp ? `${history[0].vitals.temp}°C` : 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-neutral-400">Last blood pressure</span>
                  <span className="text-sm font-bold text-mPolyBlue">{history[0]?.vitals?.bpSys ? `${history[0].vitals.bpSys}/${history[0].vitals.bpDia}` : 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-neutral-400">Heart rate average</span>
                  <span className="text-sm font-bold text-mPolyBlue">{history[0]?.vitals?.hr ? `${history[0].vitals.hr} bpm` : 'N/A'}</span>
                </div>
                <div className="h-px bg-neutral-50 w-full"></div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-neutral-400">Risk category</span>
                  <span className="bg-mPolyGreen/10 text-mPolyGreen px-2 py-1 text-xs font-bold">Low Risk</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto space-y-10 pb-20">
          <header className="flex flex-col md:flex-row justify-between items-center gap-4 bg-mPolyBlue text-white p-6 shadow-2xl">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-mPolyYellow text-mPolyBlue flex items-center justify-center font-bold text-xl">Σ</div>
                <div>
                   <h4 className="text-xs font-bold uppercase opacity-60">Aggregate Health Trends</h4>
                   <p className="text-sm font-bold">Typical diagnosis: <span className="text-mPolyYellow">{healthSummary?.mostFreq || 'N/A'}</span></p>
                </div>
             </div>
             <div className="flex gap-4">
                <div className="text-right">
                   <p className="text-xs font-bold opacity-60">Base temperature average</p>
                   <p className="text-xl font-bold">{healthSummary?.avgTemp || '--'}°C</p>
                </div>
                <button onClick={() => setTempUnit(tempUnit === 'C' ? 'F' : 'C')} className="bg-white/10 hover:bg-white/20 px-4 py-2 text-xs font-bold transition-all border border-white/10">
                  Switch to °{tempUnit}
                </button>
             </div>
          </header>

          <div className="space-y-12 relative before:absolute before:left-[23px] before:top-4 before:bottom-0 before:w-1 before:bg-slate-100">
          {history.length > 0 ? history.map((rec, idx) => (
            <div key={rec.id} className="relative pl-20 animate-fade-in group">
              <div className="absolute left-0 top-0 w-12 h-12 bg-white border-4 border-mPolyBlue shadow-xl flex flex-col items-center justify-center z-10 transition-transform group-hover:scale-110">
                 <p className="text-sm font-bold text-mPolyBlue leading-none">{rec.date?.toDate?.() ? rec.date.toDate().toLocaleDateString('en-GB', { day: '2-digit' }) : idx + 1}</p>
                 <p className="text-[10px] font-bold text-mPolyBlue/40 uppercase leading-none">{rec.date?.toDate?.() ? rec.date.toDate().toLocaleDateString('en-GB', { month: 'short' }) : 'Log'}</p>
              </div>

              <div className="bg-white shadow-2xl border border-slate-100 overflow-hidden relative">
                <div className={`absolute top-0 right-0 w-2 h-full ${idx === 0 ? 'bg-mPolyGreen' : 'bg-mPolyBlue'}`}></div>
                <div className="p-8 lg:p-10 space-y-8">
                   <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-50 pb-6">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                           <span className="px-2 py-0.5 bg-mPolyBlue text-white text-[10px] font-bold">EVENT ID: {rec.id?.substring(0,8).toUpperCase()}</span>
                           <span className={`px-2 py-0.5 text-[10px] font-bold ${(rec.vitals?.temp || 0) > 37.5 ? 'bg-red-600 text-white' : 'bg-slate-100 text-neutral-400'}`}>
                             {(rec.vitals?.temp || 0) > 37.5 ? 'CRITICAL TEMP' : 'STABLE VITALS'}
                           </span>
                        </div>
                        <h4 className="text-2xl font-bold text-mPolyBlue leading-none mt-2">{rec.diagnosis}</h4>
                      </div>
                      <div className="text-right">
                         <p className="text-xs font-bold text-neutral-300">Clinical authority</p>
                         <p className="text-sm font-bold text-mPolyBlue">{rec.staffName}</p>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div className="bg-slate-50 p-6 border border-slate-100">
                         <p className="text-xs font-bold text-neutral-300 mb-2">Internal temperature</p>
                         <p className={`text-2xl font-bold ${(rec.vitals?.temp || 0) > 37.5 ? 'text-red-600' : 'text-mPolyBlue'}`}>{convertTemp(rec.vitals?.temp)}</p>
                      </div>
                      <div className="bg-slate-50 p-6 border border-slate-100">
                         <p className="text-xs font-bold text-neutral-300 mb-2">Vascular pulse</p>
                         <p className="text-2xl font-bold text-mPolyBlue">{rec.vitals?.hr} <span className="text-xs opacity-40">bpm</span></p>
                      </div>
                      <div className="bg-slate-50 p-6 border border-slate-100 col-span-2">
                         <p className="text-xs font-bold text-neutral-300 mb-2">Blood pressure metrics</p>
                         <div className="flex items-end gap-2">
                            <p className="text-2xl font-bold text-mPolyBlue">{rec.vitals?.bpSys}/{rec.vitals?.bpDia}</p>
                            <span className="text-[10px] font-bold text-neutral-400 uppercase mb-1">mmHg</span>
                         </div>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-3">
                         <div className="flex items-center gap-3"><div className="w-1.5 h-1.5 bg-mPolyBlue rounded-full"></div><p className="text-xs font-bold text-neutral-400 tracking-widest uppercase">Medical Directive</p></div>
                         <p className="text-sm font-semibold text-neutral-700 leading-relaxed border-l-4 border-neutral-100 pl-4 py-1">{rec.treatment || 'Recovery plan applied.'}</p>
                      </div>
                      <div className="space-y-3">
                         <div className="flex items-center gap-3"><div className="w-1.5 h-1.5 bg-mPolyGreen rounded-full"></div><p className="text-xs font-bold text-neutral-400 tracking-widest uppercase">Supply Dispensary</p></div>
                         <div className="flex flex-wrap gap-2 pl-4">
                           {rec.medications?.map((m, i) => (
                             <div key={i} className="flex items-center bg-mPolyBlue px-3 py-1.5 text-white gap-3 shadow-md group-hover:bg-mPolyGreen transition-colors">
                                <span className="text-xs font-bold">{m.name}</span>
                                <span className="w-px h-2 bg-white/20"></span>
                                <span className="text-[10px] font-bold opacity-60">QTY: {m.units}</span>
                             </div>
                           ))}
                           {(!rec.medications || rec.medications.length === 0) && <span className="text-xs font-bold text-neutral-300 italic">Zero supplies dispatched.</span>}
                         </div>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          )) : (
            <div className="bg-white p-32 text-center border-4 border-dashed border-neutral-100 flex flex-col items-center">
              <i className="fa-solid fa-folder-open text-7xl text-neutral-100 mb-6"></i>
              <h4 className="text-2xl font-bold text-neutral-200 tracking-tighter uppercase">Clinical Log Empty</h4>
              <p className="text-xs font-bold text-neutral-300 uppercase tracking-widest mt-2">The student repository has no health events logged.</p>
            </div>
          )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentProfileView;
