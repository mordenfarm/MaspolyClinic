
import React, { useState, useEffect } from 'react';
import { Card } from '../../components/Card';
import { db } from '../../lib/firebase';
import { collection, query, onSnapshot, orderBy, updateDoc, doc, deleteDoc, addDoc, serverTimestamp, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { Appointment, SickNoteRequest, StaffMember } from '../../types';
import { whatsappLink } from '../../utils/phone';

interface QueueTabProps {
  user?: StaffMember;
}

const QueueTab: React.FC<QueueTabProps> = ({ user }) => {
  const [activeSubTab, setActiveSubTab] = useState<'appointments' | 'sicknotes'>('appointments');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [sickNotes, setSickNotes] = useState<SickNoteRequest[]>([]);
  const [doctors, setDoctors] = useState<StaffMember[]>([]);
  const [transferDoctorIds, setTransferDoctorIds] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const isDoctor = user?.role === 'doctor';

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const qApt = query(
      collection(db, "appointments"), 
      where("date", "==", today)
    );
    
    const unsubApt = onSnapshot(qApt, (snap) => {
      const data = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Appointment))
        .filter(a => a.status !== 'completed' && a.status !== 'cancelled' && a.status !== 'doctor_unavailable')
        .filter(a => !isDoctor || a.doctorId === user?.id)
        .sort((a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0));
      
      setAppointments(data);
      setIsLoading(false);
    });

    const qSick = query(collection(db, "sick_note_requests"), orderBy("timestamp", "desc"));
    const unsubSick = onSnapshot(qSick, (snap) => {
      setSickNotes(snap.docs.map(d => ({ id: d.id, ...d.data() } as SickNoteRequest)));
    });

    const qDoctors = query(collection(db, "staff"), where("role", "==", "doctor"));
    const unsubDoctors = onSnapshot(qDoctors, (snap) => {
      setDoctors(snap.docs.map(d => ({ id: d.id, ...d.data() } as StaffMember)).filter(d => !d.isMainAdmin));
    });

    return () => { unsubApt(); unsubSick(); unsubDoctors(); };
  }, [isDoctor, user?.id]);

  const handleStatusChange = async (apt: Appointment, status: string) => {
    if (!apt.id) return;
    try {
      await updateDoc(doc(db, "appointments", apt.id), { status });
      if (status === 'confirmed') {
        await addDoc(collection(db, "notifications"), {
          studentId: apt.studentId,
          title: "Admitted to Room",
          message: `Doctor is ready for you. Please proceed into the clinic room immediately.`,
          type: 'info',
          status: 'unread',
          timestamp: serverTimestamp()
        });
      }
    } catch (error) {
      console.error(error);
    }
  };

  const notifyStudent = async (apt: Appointment, title: string, message: string, type: 'info' | 'urgent' = 'info') => {
    await addDoc(collection(db, "notifications"), {
      studentId: apt.studentId,
      title,
      message,
      type,
      status: 'unread',
      timestamp: serverTimestamp()
    });
  };

  const openWhatsAppMessage = (apt: Appointment, message: string) => {
    if (!apt.studentWhatsapp) {
      alert("This student does not have a WhatsApp number saved.");
      return;
    }
    window.open(whatsappLink(apt.studentWhatsapp, message), '_blank');
  };

  const transferAppointment = async (apt: Appointment) => {
    if (!apt.id) return;
    const targetId = transferDoctorIds[apt.id] || doctors.find(d => d.id !== apt.doctorId)?.id;
    const targetDoctor = doctors.find(d => d.id === targetId);
    if (!targetDoctor?.id) {
      alert("Select another doctor first.");
      return;
    }

    const message = `Your clinic booking for ${apt.date} at ${apt.time} has been transferred from ${apt.doctorName || 'your doctor'} to ${targetDoctor.name}. Please report to ${targetDoctor.name}.`;

    try {
      await updateDoc(doc(db, "appointments", apt.id), {
        doctorId: targetDoctor.id,
        doctorName: targetDoctor.name,
        transferReason: 'Admin transfer',
        transferredToDoctorId: targetDoctor.id,
        transferredToDoctorName: targetDoctor.name,
        status: 'pending'
      });
      await notifyStudent(apt, "Booking Transferred", message);
      openWhatsAppMessage(apt, message);
    } catch (error) {
      console.error(error);
      alert("Failed to transfer appointment.");
    }
  };

  const markDoctorUnavailable = async (apt: Appointment) => {
    if (!apt.id) return;
    const message = `${apt.doctorName || 'The doctor'} is not available for your clinic booking on ${apt.date} at ${apt.time}. Please wait for the clinic to reschedule you.`;

    try {
      await updateDoc(doc(db, "appointments", apt.id), {
        status: 'doctor_unavailable',
        unavailableReason: 'Doctor not available'
      });
      await notifyStudent(apt, "Doctor Not Available", message, 'urgent');
      openWhatsAppMessage(apt, message);
    } catch (error) {
      console.error(error);
      alert("Failed to update appointment.");
    }
  };

  const finishSession = async (apt: Appointment) => {
    if (!apt.id) return;
    try {
      // Mark current as complete
      await updateDoc(doc(db, "appointments", apt.id), { status: 'completed' });
      
      // Look for the next pending appointment to suggest admission
      const waitingQueue = appointments.filter(a => a.status === 'pending' && a.id !== apt.id);
      if (waitingQueue.length > 0) {
        const nextStudent = waitingQueue[0];
        if (confirm(`Consultation with ${apt.studentName} finished. Call ${nextStudent.studentName} next?`)) {
          await handleStatusChange(nextStudent, 'confirmed');
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const approveSickNote = async (req: SickNoteRequest) => {
    if (!req.id) return;
    try {
      const certId = `SICK-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      await updateDoc(doc(db, "sick_note_requests", req.id), { status: 'approved' });
      await addDoc(collection(db, "sick_notes"), {
        studentId: req.studentId,
        studentName: req.studentName,
        certificateId: certId,
        reason: req.reason,
        startDate: req.startDate,
        endDate: req.endDate,
        approvedBy: "Dr. Nyoni",
        dateIssued: serverTimestamp()
      });
      await addDoc(collection(db, "notifications"), {
        studentId: req.studentId,
        title: "Sick Note Approved",
        message: `Your medical excuse for ${req.reason} has been approved. You can now download the certificate from your documents vault.`,
        type: 'success',
        status: 'unread',
        timestamp: serverTimestamp()
      });
      alert("Sick note approved and certificate generated.");
    } catch (error) {
      console.error(error);
    }
  };

  const currentlyAdmitted = appointments.find(a => a.status === 'confirmed');
  const waitingQueue = appointments.filter(a => a.status === 'pending');

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
        <div>
          <h3 className="text-3xl font-black uppercase text-mPolyBlue tracking-tighter">Clinical Intake</h3>
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Managing the daily patient flow</p>
          {isDoctor && <p className="text-[10px] font-black text-mPolyGreen uppercase tracking-widest mt-2">Filtered to {user?.name}</p>}
        </div>
        <div className="flex bg-neutral-100 p-1 w-full lg:w-auto">
          <button 
            onClick={() => setActiveSubTab('appointments')} 
            className={`flex-1 lg:flex-none px-8 py-3 text-[10px] font-black uppercase transition-all ${activeSubTab === 'appointments' ? 'bg-mPolyBlue text-white shadow-xl' : 'text-neutral-400 hover:text-neutral-600'}`}
          >
            Live Queue ({waitingQueue.length})
          </button>
          {!isDoctor && (
            <button 
              onClick={() => setActiveSubTab('sicknotes')} 
              className={`flex-1 lg:flex-none px-8 py-3 text-[10px] font-black uppercase transition-all ${activeSubTab === 'sicknotes' ? 'bg-mPolyBlue text-white shadow-xl' : 'text-neutral-400 hover:text-neutral-600'}`}
            >
              Sick Notes ({sickNotes.filter(s => s.status === 'pending').length})
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="h-[400px] flex items-center justify-center">
           <div className="w-12 h-12 border-4 border-mPolyBlue border-t-mPolyYellow animate-spin"></div>
        </div>
      ) : activeSubTab === 'appointments' ? (
        <div className="space-y-10">
           {/* Current Session */}
           {currentlyAdmitted ? (
             <Card className="border-l-[16px] border-mPolyGreen bg-mPolyGreen/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-full bg-mPolyGreen/10 skew-x-12 translate-x-16"></div>
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
                   <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-mPolyGreen text-white flex items-center justify-center text-2xl shadow-xl">
                         <i className="fa-solid fa-stethoscope"></i>
                      </div>
                      <div>
                         <p className="text-[9px] font-black text-mPolyGreen uppercase tracking-widest">In Consultation Room</p>
                         <h4 className="text-2xl font-black text-mPolyBlue uppercase">{currentlyAdmitted.studentName}</h4>
                          <p className="text-xs font-bold text-neutral-400 uppercase mt-1">{currentlyAdmitted.studentId} • {currentlyAdmitted.reason} • {currentlyAdmitted.doctorName || 'Unassigned'}</p>
                      </div>
                   </div>
                   <button 
                     onClick={() => finishSession(currentlyAdmitted)}
                     className="bg-mPolyBlue text-white px-10 py-5 text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-mPolyGreen transition-all w-full md:w-auto flex items-center justify-center gap-3"
                   >
                     Finish Session <i className="fa-solid fa-arrow-right"></i>
                   </button>
                </div>
             </Card>
           ) : (
             <div className="bg-slate-50 p-12 text-center border-4 border-dashed border-slate-100 flex flex-col items-center">
                <i className="fa-solid fa-user-doctor text-4xl text-slate-200 mb-4"></i>
                <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No Active Consultation Session</p>
                {waitingQueue.length > 0 && (
                  <button onClick={() => handleStatusChange(waitingQueue[0], 'confirmed')} className="mt-6 bg-mPolyBlue text-white px-8 py-3 text-[10px] font-black uppercase tracking-widest shadow-xl">Admit {waitingQueue[0].studentName}</button>
                )}
             </div>
           )}

           {/* Waiting List */}
           <div className="space-y-4">
              <h5 className="text-[11px] font-black uppercase text-neutral-400 tracking-widest flex items-center gap-3 px-2">
                 Current Waiting List <span className="h-px bg-neutral-200 flex-1"></span>
              </h5>
              <div className="grid grid-cols-1 gap-4">
                {waitingQueue.map((apt, index) => (
                  <div key={apt.id} className="bg-white border-l-8 border-mPolyBlue/20 shadow-xl p-6 flex flex-col md:flex-row justify-between items-center gap-6 animate-slide-left hover:border-mPolyYellow transition-all">
                    <div className="flex items-center gap-8">
                        <div className="w-12 h-12 bg-slate-50 flex flex-col items-center justify-center text-mPolyBlue border border-slate-100">
                          <span className="text-[7px] font-black opacity-40 uppercase">Queue</span>
                          <span className="text-lg font-black">{index + 1}</span>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-neutral-300 uppercase mb-1">{apt.studentId}</p>
                          <h4 className="text-lg font-bold text-mPolyBlue uppercase">{apt.studentName}</h4>
                          <div className="flex gap-4 mt-1">
                              <span className="text-[9px] font-bold text-neutral-400 uppercase">{apt.reason}</span>
                              <span className="text-[9px] font-bold text-neutral-400 uppercase">{apt.doctorName || 'Unassigned'}</span>
                              <span className="text-[9px] font-black text-mPolyGreen uppercase">{apt.time}</span>
                          </div>
                        </div>
                    </div>
                    <div className="flex flex-col lg:flex-row gap-2 w-full md:w-auto">
                        <button onClick={() => handleStatusChange(apt, 'confirmed')} className="bg-mPolyBlue text-white px-6 py-3 text-[9px] font-black uppercase tracking-widest shadow-lg flex-1 md:flex-none">Admit Patient</button>
                        {!isDoctor && (
                          <div className="flex gap-2">
                            <select
                              value={transferDoctorIds[apt.id || ''] || ''}
                              onChange={(e) => setTransferDoctorIds(prev => ({ ...prev, [apt.id || '']: e.target.value }))}
                              className="bg-slate-50 border-2 border-neutral-100 px-3 py-3 text-[9px] font-black uppercase outline-none focus:border-mPolyBlue"
                            >
                              <option value="">Transfer to...</option>
                              {doctors.filter(d => d.id !== apt.doctorId).map(doctor => (
                                <option key={doctor.id} value={doctor.id}>{doctor.name}</option>
                              ))}
                            </select>
                            <button onClick={() => transferAppointment(apt)} className="bg-mPolyGreen text-white px-4 py-3 text-[9px] font-black uppercase">Transfer</button>
                            <button onClick={() => markDoctorUnavailable(apt)} className="bg-red-600 text-white px-4 py-3 text-[9px] font-black uppercase">Doctor Not Available</button>
                          </div>
                        )}
                        <button onClick={() => confirm("Cancel session?") && deleteDoc(doc(db, "appointments", apt.id!))} className="bg-red-50 text-red-600 px-4 py-3 text-[9px] font-black uppercase flex-1 md:flex-none">
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                  </div>
                ))}
                {waitingQueue.length === 0 && !currentlyAdmitted && (
                   <div className="py-20 text-center opacity-20 flex flex-col items-center">
                     <i className="fa-solid fa-users-slash text-6xl mb-4"></i>
                     <p className="text-2xl font-black uppercase">Intake Registry Clear</p>
                   </div>
                )}
              </div>
           </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
           {sickNotes.map((req) => (
             <div key={req.id} className="bg-white border-l-8 border-mPolyYellow shadow-xl p-8 flex flex-col md:flex-row justify-between items-center gap-6 animate-slide-right">
                <div className="flex items-center gap-6">
                   <div className="w-14 h-14 bg-mPolyBlue text-white flex items-center justify-center"><i className="fa-solid fa-file-signature"></i></div>
                   <div>
                      <p className="text-[9px] font-black text-neutral-400 uppercase">{req.studentId}</p>
                      <h4 className="text-lg font-bold text-mPolyBlue uppercase">{req.studentName}</h4>
                      <p className="text-xs font-bold text-neutral-500 italic mt-1">"{req.reason}"</p>
                      <div className="flex gap-4 mt-2">
                         <span className="text-[9px] font-bold text-mPolyGreen uppercase">{req.startDate} to {req.endDate}</span>
                      </div>
                   </div>
                </div>
                <div className="flex gap-2">
                   {req.status === 'pending' ? (
                     <button onClick={() => approveSickNote(req)} className="bg-mPolyBlue text-white px-8 py-3 text-[10px] font-black uppercase tracking-widest shadow-xl">Approve Note</button>
                   ) : (
                     <span className="bg-mPolyGreen text-white px-8 py-3 text-[10px] font-black uppercase tracking-widest">Verified</span>
                   )}
                </div>
             </div>
           ))}
        </div>
      )}
    </div>
  );
};

export default QueueTab;
