
import React, { useState, useEffect } from 'react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { db } from '../../lib/firebase';
import { collection, query, onSnapshot, orderBy, updateDoc, doc, deleteDoc, addDoc, serverTimestamp, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { Appointment, InventoryItem, Patient, PrescribedMedication, SickNoteRequest, StaffMember, Vitals } from '../../types';
import { whatsappLink } from '../../utils/phone';
import { getDiagnosisSuggestions, DiagnosisSuggestion } from '../../utils/diagnosisSupport';

interface QueueTabProps {
  user?: StaffMember;
  inventory: InventoryItem[];
  onNotify: (msg: string) => void;
}

const QueueTab: React.FC<QueueTabProps> = ({ user, inventory, onNotify }) => {
  const [activeSubTab, setActiveSubTab] = useState<'appointments' | 'sicknotes'>('appointments');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [sickNotes, setSickNotes] = useState<SickNoteRequest[]>([]);
  const [doctors, setDoctors] = useState<StaffMember[]>([]);
  const [transferDoctorIds, setTransferDoctorIds] = useState<Record<string, string>>({});
  const [assignmentApt, setAssignmentApt] = useState<Appointment | null>(null);
  const [assignmentDoctorId, setAssignmentDoctorId] = useState('');
  const [missingWhatsappTransfer, setMissingWhatsappTransfer] = useState<{ apt: Appointment; targetDoctor: StaffMember; message: string } | null>(null);
  const [activeEncounter, setActiveEncounter] = useState<Appointment | null>(null);
  const [nextQueueModalOpen, setNextQueueModalOpen] = useState(false);
  const [callNextApt, setCallNextApt] = useState<Appointment | null>(null);
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

  useEffect(() => {
    if (!isDoctor || activeEncounter) return;
    const current = appointments.find(a => a.status === 'confirmed' && a.doctorId === user?.id);
    if (current) setActiveEncounter(current);
  }, [appointments, activeEncounter, isDoctor, user?.id]);

  const handleStatusChange = async (apt: Appointment, status: Appointment['status']) => {
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
        if (isDoctor) setActiveEncounter({ ...apt, status: 'confirmed' });
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

    if (!apt.studentWhatsapp) {
      setMissingWhatsappTransfer({ apt, targetDoctor, message });
      return;
    }

    await performTransfer(apt, targetDoctor, message, true);
  };

  const performTransfer = async (apt: Appointment, targetDoctor: StaffMember, message: string, sendWhatsapp: boolean) => {
    if (!apt.id || !targetDoctor.id) return;

    try {
      await updateDoc(doc(db, "appointments", apt.id), {
        doctorId: targetDoctor.id,
        doctorName: targetDoctor.name,
        transferReason: 'Admin transfer',
        transferredToDoctorId: targetDoctor.id,
        transferredToDoctorName: targetDoctor.name,
        status: 'approved'
      });
      await notifyStudent(apt, "Booking Transferred", message);
      await addDoc(collection(db, "notifications"), {
        staffId: targetDoctor.id,
        title: "Student Transferred To You",
        message: `${apt.studentName} has been transferred to your queue for ${apt.time}.`,
        type: 'info',
        status: 'unread',
        timestamp: serverTimestamp()
      });
      if (sendWhatsapp) openWhatsAppMessage(apt, message);
      setMissingWhatsappTransfer(null);
    } catch (error) {
      console.error(error);
      alert("Failed to transfer appointment.");
    }
  };

  const openAssignment = (apt: Appointment) => {
    setAssignmentApt(apt);
    setAssignmentDoctorId(doctors[0]?.id || '');
  };

  const approveWithDoctor = async () => {
    if (!assignmentApt?.id) return;
    const doctor = doctors.find(d => d.id === assignmentDoctorId);
    if (!doctor?.id) {
      alert("Select a doctor first.");
      return;
    }
    const message = `Your clinic booking for ${assignmentApt.date} at ${assignmentApt.time} has been approved. You have been assigned to ${doctor.name}.`;
    try {
      await updateDoc(doc(db, "appointments", assignmentApt.id), {
        status: 'approved',
        doctorId: doctor.id,
        doctorName: doctor.name
      });
      await notifyStudent(assignmentApt, "Booking Approved", message, 'info');
      await addDoc(collection(db, "notifications"), {
        staffId: doctor.id,
        title: "New Student Assigned",
        message: `${assignmentApt.studentName} is assigned to you for ${assignmentApt.time}.`,
        type: 'info',
        status: 'unread',
        timestamp: serverTimestamp()
      });
      openWhatsAppMessage(assignmentApt, message);
      setAssignmentApt(null);
    } catch (error) {
      console.error(error);
      alert("Failed to approve booking.");
    }
  };

  const rejectNoDoctor = async () => {
    if (!assignmentApt?.id) return;
    const message = `No doctor is currently available for your clinic booking on ${assignmentApt.date} at ${assignmentApt.time}. Admin will contact you when a slot opens.`;
    try {
      await updateDoc(doc(db, "appointments", assignmentApt.id), {
        status: 'doctor_unavailable',
        unavailableReason: 'No doctors available'
      });
      await notifyStudent(assignmentApt, "No Doctor Available", message, 'urgent');
      openWhatsAppMessage(assignmentApt, message);
      setAssignmentApt(null);
    } catch (error) {
      console.error(error);
      alert("Failed to update booking.");
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
      await updateDoc(doc(db, "appointments", apt.id), { status: 'completed' });
      setActiveEncounter(null);
      const assignedQueue = appointments.filter(a => a.status === 'approved' && a.id !== apt.id && (!isDoctor || a.doctorId === user?.id));
      if (assignedQueue.length > 0) setNextQueueModalOpen(true);
    } catch (error) {
      console.error(error);
    }
  };

  const callNextStudent = async (apt: Appointment) => {
    await notifyStudent(
      apt,
      "Doctor Calling You",
      `${user?.name || 'The doctor'} is ready to see you next. Please come to the consultation room.`,
      'info'
    );
    setCallNextApt(apt);
    setNextQueueModalOpen(false);
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

  const currentlyAdmitted = appointments.filter(a => a.status === 'confirmed');
  const waitingQueue = appointments.filter(a => a.status === 'pending' || a.status === 'approved');
  const doctorNextQueue = appointments.filter(a => a.status === 'approved' && (!isDoctor || a.doctorId === user?.id));

  if (activeEncounter && isDoctor) {
    return (
      <DoctorEncounter
        appointment={activeEncounter}
        inventory={inventory}
        doctorName={user?.name || 'Doctor'}
        onNotify={onNotify}
        onFinish={() => finishSession(activeEncounter)}
      />
    );
  }

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
           {currentlyAdmitted.length > 0 ? (
             <div className="space-y-4">
              {currentlyAdmitted.map(session => (
             <Card key={session.id} className="border-l-[16px] border-mPolyGreen bg-mPolyGreen/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-full bg-mPolyGreen/10 skew-x-12 translate-x-16"></div>
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
                   <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-mPolyGreen text-white flex items-center justify-center text-2xl shadow-xl">
                         <i className="fa-solid fa-stethoscope"></i>
                      </div>
                      <div>
                         <p className="text-[9px] font-black text-mPolyGreen uppercase tracking-widest">In Consultation Room</p>
                         <h4 className="text-2xl font-black text-mPolyBlue uppercase">{session.studentName}</h4>
                          <p className="text-xs font-bold text-neutral-400 uppercase mt-1">{session.studentId} • {session.reason} • {session.doctorName || 'Unassigned'}</p>
                      </div>
                   </div>
                   <div className="flex flex-col lg:flex-row gap-2 w-full md:w-auto">
                    {!isDoctor && (
                      <select
                        value={transferDoctorIds[session.id || ''] || ''}
                        onChange={(e) => setTransferDoctorIds(prev => ({ ...prev, [session.id || '']: e.target.value }))}
                        className="bg-white border-2 border-neutral-100 px-3 py-3 text-[9px] font-black uppercase outline-none focus:border-mPolyBlue"
                      >
                        <option value="">Transfer session...</option>
                        {doctors.filter(d => d.id !== session.doctorId).map(doctor => (
                          <option key={doctor.id} value={doctor.id}>{doctor.name}</option>
                        ))}
                      </select>
                    )}
                    {!isDoctor && <button onClick={() => transferAppointment(session)} className="bg-mPolyGreen text-white px-4 py-3 text-[9px] font-black uppercase">Transfer</button>}
                    {isDoctor && (
                      <button 
                        onClick={() => finishSession(session)}
                        className="bg-mPolyBlue text-white px-10 py-5 text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-mPolyGreen transition-all w-full md:w-auto flex items-center justify-center gap-3"
                      >
                        Finish Session <i className="fa-solid fa-arrow-right"></i>
                      </button>
                    )}
                   </div>
                </div>
             </Card>
              ))}
             </div>
           ) : (
             <div className="bg-slate-50 p-12 text-center border-4 border-dashed border-slate-100 flex flex-col items-center">
                <i className="fa-solid fa-user-doctor text-4xl text-slate-200 mb-4"></i>
                <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No Active Consultation Session</p>
                {waitingQueue.length > 0 && !isDoctor && waitingQueue[0].status === 'pending' && (
                  <button onClick={() => openAssignment(waitingQueue[0])} className="mt-6 bg-mPolyBlue text-white px-8 py-3 text-[10px] font-black uppercase tracking-widest shadow-xl">Accept {waitingQueue[0].studentName}</button>
                )}
                {waitingQueue.length > 0 && isDoctor && waitingQueue[0].status === 'approved' && waitingQueue[0].doctorId === user?.id && (
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
                        {!isDoctor && apt.status === 'pending' ? (
                          <button onClick={() => openAssignment(apt)} className="bg-mPolyBlue text-white px-6 py-3 text-[9px] font-black uppercase tracking-widest shadow-lg flex-1 md:flex-none">Accept Booking</button>
                        ) : isDoctor ? (
                          <button disabled={apt.doctorId !== user?.id || apt.status !== 'approved'} onClick={() => handleStatusChange(apt, 'confirmed')} className="bg-mPolyBlue disabled:bg-neutral-200 disabled:text-neutral-400 text-white px-6 py-3 text-[9px] font-black uppercase tracking-widest shadow-lg flex-1 md:flex-none">Admit Patient</button>
                        ) : (
                          <span className="bg-slate-100 text-neutral-400 px-6 py-3 text-[9px] font-black uppercase tracking-widest flex items-center justify-center">Waiting For Doctor</span>
                        )}
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
                {waitingQueue.length === 0 && currentlyAdmitted.length === 0 && (
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

      {assignmentApt && (
        <div className="fixed inset-0 bg-mPolyBlue/90 z-[600] flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full p-10 shadow-2xl border-t-8 border-mPolyYellow animate-slide-right">
            <div className="flex justify-between items-start gap-6 mb-8">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-mPolyGreen">Approve Booking</p>
                <h3 className="text-2xl font-black uppercase text-mPolyBlue">{assignmentApt.studentName}</h3>
                <p className="text-xs font-bold text-neutral-400 uppercase mt-1">{assignmentApt.date} @ {assignmentApt.time} • {assignmentApt.reason}</p>
              </div>
              <button onClick={() => setAssignmentApt(null)} className="text-neutral-300 hover:text-red-600"><i className="fa-solid fa-xmark text-2xl"></i></button>
            </div>
            <div className="space-y-5">
              <label className="text-[10px] font-black uppercase text-neutral-400">Assign Doctor</label>
              <select
                value={assignmentDoctorId}
                onChange={(e) => setAssignmentDoctorId(e.target.value)}
                className="w-full bg-slate-50 border-2 border-neutral-100 p-4 text-xs font-bold outline-none focus:border-mPolyBlue"
              >
                {doctors.map(doctor => <option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}
              </select>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
                <button onClick={approveWithDoctor} disabled={!assignmentDoctorId || doctors.length === 0} className="bg-mPolyBlue disabled:bg-neutral-200 text-white px-6 py-4 text-[10px] font-black uppercase tracking-widest">Approve and Alert</button>
                <button onClick={rejectNoDoctor} className="bg-red-600 text-white px-6 py-4 text-[10px] font-black uppercase tracking-widest">No Doctors Available</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {missingWhatsappTransfer && (
        <div className="fixed inset-0 bg-mPolyBlue/90 z-[650] flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full p-10 shadow-2xl border-t-8 border-mPolyYellow animate-slide-right">
            <div className="flex items-start gap-5 mb-8">
              <div className="w-14 h-14 bg-mPolyYellow text-mPolyBlue flex items-center justify-center text-2xl shrink-0">
                <i className="fa-solid fa-circle-info"></i>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-mPolyGreen">WhatsApp Number Missing</p>
                <h3 className="text-2xl font-black uppercase text-mPolyBlue mt-1">{missingWhatsappTransfer.apt.studentName}</h3>
                <p className="text-xs font-bold text-neutral-500 uppercase leading-relaxed mt-3">
                  This student does not have a WhatsApp number saved. The transfer will still update their portal and in-app alerts.
                </p>
              </div>
            </div>
            <div className="bg-slate-50 border-l-8 border-mPolyBlue p-5 mb-8">
              <p className="text-[9px] font-black uppercase text-neutral-400">Transfer Target</p>
              <p className="text-sm font-black uppercase text-mPolyBlue">{missingWhatsappTransfer.targetDoctor.name}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button onClick={() => setMissingWhatsappTransfer(null)} className="border-2 border-neutral-200 text-neutral-500 px-6 py-4 text-[10px] font-black uppercase tracking-widest">Cancel</button>
              <button
                onClick={() => performTransfer(missingWhatsappTransfer.apt, missingWhatsappTransfer.targetDoctor, missingWhatsappTransfer.message, false)}
                className="bg-mPolyBlue text-white px-6 py-4 text-[10px] font-black uppercase tracking-widest"
              >
                Continue Transfer
              </button>
            </div>
          </div>
        </div>
      )}

      {nextQueueModalOpen && (
        <div className="fixed inset-0 bg-mPolyBlue/90 z-[660] flex items-center justify-center p-4">
          <div className="bg-white max-w-2xl w-full p-10 shadow-2xl border-t-8 border-mPolyGreen animate-slide-right">
            <div className="flex justify-between items-start mb-8">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-mPolyGreen">Next Patient Queue</p>
                <h3 className="text-2xl font-black uppercase text-mPolyBlue">Call Next Student</h3>
                <p className="text-xs font-bold text-neutral-400 uppercase mt-1">Choose who should come to the consultation room next.</p>
              </div>
              <button onClick={() => setNextQueueModalOpen(false)} className="text-neutral-300 hover:text-red-600"><i className="fa-solid fa-xmark text-2xl"></i></button>
            </div>
            <div className="space-y-3 max-h-[420px] overflow-y-auto">
              {doctorNextQueue.map(apt => (
                <div key={apt.id} className="bg-slate-50 border border-neutral-100 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <p className="text-[9px] font-black uppercase text-neutral-400">{apt.studentId} • {apt.time}</p>
                    <h4 className="text-lg font-black uppercase text-mPolyBlue">{apt.studentName}</h4>
                    <p className="text-[10px] font-bold uppercase text-neutral-500">{apt.reason} • {apt.symptoms || 'No symptoms entered'}</p>
                  </div>
                  <button onClick={() => callNextStudent(apt)} className="bg-mPolyBlue text-white px-6 py-3 text-[10px] font-black uppercase tracking-widest">Call Next</button>
                </div>
              ))}
              {doctorNextQueue.length === 0 && <p className="text-center text-[10px] font-black uppercase text-neutral-300 py-12">No assigned students waiting.</p>}
            </div>
          </div>
        </div>
      )}

      {callNextApt && (
        <div className="fixed inset-0 bg-mPolyBlue/90 z-[670] flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full p-10 shadow-2xl border-t-8 border-mPolyYellow animate-slide-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-mPolyGreen">Student Called</p>
            <h3 className="text-3xl font-black uppercase text-mPolyBlue mt-2">{callNextApt.studentName}</h3>
            <p className="text-xs font-bold uppercase text-neutral-500 mt-3 leading-relaxed">The student has been alerted. Admit them when they enter the room.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8">
              <button onClick={() => setCallNextApt(null)} className="border-2 border-neutral-200 text-neutral-500 px-6 py-4 text-[10px] font-black uppercase tracking-widest">Close</button>
              <button
                onClick={() => { handleStatusChange(callNextApt, 'confirmed'); setCallNextApt(null); }}
                className="bg-mPolyBlue text-white px-6 py-4 text-[10px] font-black uppercase tracking-widest"
              >
                Admit Patient
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface DoctorEncounterProps {
  appointment: Appointment;
  inventory: InventoryItem[];
  doctorName: string;
  onNotify: (msg: string) => void;
  onFinish: () => Promise<void> | void;
}

const bodyAreas: Record<string, { label: string; parts: string[]; symptoms: string[] }> = {
  head: { label: 'Head and Neck', parts: ['Forehead', 'Eyes', 'Ears', 'Nose', 'Mouth', 'Throat', 'Neck'], symptoms: ['Headache', 'Dizziness', 'Blurred Vision', 'Ear Pain', 'Sore Throat', 'Neck Stiffness'] },
  chest: { label: 'Chest', parts: ['Left Chest', 'Right Chest', 'Central Chest', 'Upper Back', 'Ribs'], symptoms: ['Chest Pain', 'Shortness of Breath', 'Coughing', 'Palpitations', 'Wheezing'] },
  abdomen: { label: 'Abdomen', parts: ['Upper Abdomen', 'Lower Abdomen', 'Right Side', 'Left Side', 'Pelvis'], symptoms: ['Nausea', 'Vomiting', 'Stomach Cramps', 'Bloating', 'Diarrhea'] },
  arms: { label: 'Arms and Hands', parts: ['Left Shoulder', 'Right Shoulder', 'Left Arm', 'Right Arm', 'Left Hand', 'Right Hand'], symptoms: ['Arm Pain', 'Numbness', 'Weakness', 'Laceration', 'Burn', 'Stiffness'] },
  legs: { label: 'Legs and Feet', parts: ['Left Thigh', 'Right Thigh', 'Left Knee', 'Right Knee', 'Left Foot', 'Right Foot'], symptoms: ['Leg Pain', 'Swelling', 'Numbness', 'Fracture', 'Stiffness'] },
  skin: { label: 'Skin', parts: ['Face Skin', 'Torso Skin', 'Arm Skin', 'Leg Skin', 'Generalized Rash'], symptoms: ['Rash', 'Itching', 'Redness', 'Swelling', 'Blister'] }
};

const DoctorEncounter: React.FC<DoctorEncounterProps> = ({ appointment, inventory, doctorName, onNotify, onFinish }) => {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [selectedArea, setSelectedArea] = useState('head');
  const [selectedPart, setSelectedPart] = useState('Forehead');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(appointment.symptoms ? [appointment.symptoms] : []);
  const [vitals, setVitals] = useState<Vitals>({ temp: 36.6, hr: 72, bpSys: 120, bpDia: 80, weight: 70, height: 1.75 });
  const [painLevel, setPainLevel] = useState(0);
  const [clinicalNotes, setClinicalNotes] = useState(appointment.symptoms || '');
  const [diagnosis, setDiagnosis] = useState('');
  const [treatment, setTreatment] = useState('');
  const [medSearch, setMedSearch] = useState('');
  const [prescribedMeds, setPrescribedMeds] = useState<PrescribedMedication[]>([]);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isReferralOpen, setIsReferralOpen] = useState(false);
  const [referralSpecialist, setReferralSpecialist] = useState('Specialist Physician');

  useEffect(() => {
    const loadPatient = async () => {
      const snap = await getDocs(query(collection(db, "students"), where("studentNumber", "==", appointment.studentId)));
      const found = snap.docs[0];
      if (found) setPatient({ id: found.id, ...found.data() } as Patient);
    };
    loadPatient();
  }, [appointment.studentId]);

  useEffect(() => {
    setSelectedPart(bodyAreas[selectedArea].parts[0]);
  }, [selectedArea]);

  const suggestions = getDiagnosisSuggestions({
    selectedSymptoms,
    freeText: clinicalNotes,
    selectedArea,
    vitals,
    painLevel
  }).filter((item: DiagnosisSuggestion) => !dismissedSuggestions.includes(item.name));

  const filteredMeds = inventory.filter(i => (i.name || '').toLowerCase().includes(medSearch.toLowerCase()) && i.stock > 0 && medSearch.length > 0);

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms(prev => prev.includes(symptom) ? prev.filter(item => item !== symptom) : [...prev, symptom]);
  };

  const createReferral = async () => {
    if (!diagnosis.trim()) {
      alert("Enter or select a diagnosis before creating a referral.");
      return;
    }
    try {
      await addDoc(collection(db, "referrals"), {
        studentId: appointment.studentId,
        studentName: appointment.studentName,
        doctorName,
        diagnosis,
        reason: "Case requires specialist review beyond clinic level.",
        clinicalSummary: clinicalNotes || `Affected area: ${bodyAreas[selectedArea].label}, ${selectedPart}. Symptoms: ${selectedSymptoms.join(', ') || 'Not specified'}.`,
        recommendedSpecialist: referralSpecialist,
        status: 'issued',
        createdAt: serverTimestamp()
      });
      await addDoc(collection(db, "notifications"), {
        studentId: appointment.studentId,
        title: "Referral Letter Issued",
        message: `A referral letter to ${referralSpecialist} has been added to your dashboard.`,
        type: 'info',
        status: 'unread',
        timestamp: serverTimestamp()
      });
      setIsReferralOpen(false);
      onNotify("Referral letter generated");
    } catch (err: any) {
      alert(err.message);
    }
  };

  const finishEncounter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!diagnosis.trim() || !treatment.trim()) return;
    setIsSaving(true);
    try {
      await addDoc(collection(db, "clinical_records"), {
        studentId: appointment.studentId,
        date: serverTimestamp(),
        symptoms: selectedSymptoms,
        affectedArea: `${selectedArea}:${selectedPart}`,
        vitals,
        painLevel,
        diagnosis,
        treatment,
        medications: prescribedMeds,
        notes: clinicalNotes,
        staffName: doctorName,
        disposition: 'Discharged Home'
      });

      for (const med of prescribedMeds) {
        const item = inventory.find(i => i.name === med.name);
        if (item) {
          await updateDoc(doc(db, "inventory", item.id), { stock: Math.max(0, item.stock - med.units) });
          await addDoc(collection(db, "pharmacy_history"), {
            studentName: appointment.studentName,
            studentId: appointment.studentId,
            medicineName: med.name,
            units: med.units,
            date: serverTimestamp(),
            doctorName
          });
        }
      }

      await onFinish();
      onNotify("Encounter saved and student finished");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="bg-mPolyBlue text-white p-8 border-t-8 border-mPolyYellow shadow-2xl flex flex-col lg:flex-row justify-between gap-6">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-mPolyYellow">Active Consultation</p>
          <h2 className="text-3xl font-black uppercase tracking-tighter mt-2">{appointment.studentName}</h2>
          <p className="text-xs font-bold uppercase text-white/50 mt-1">{appointment.studentId} • {appointment.reason} • {appointment.time}</p>
        </div>
        <div className="bg-white/10 p-4 min-w-[240px]">
          <p className="text-[9px] font-black uppercase text-white/50">Patient Profile</p>
          <p className="text-sm font-bold uppercase">{patient ? `${patient.course} • ${patient.level}` : 'Loading student profile...'}</p>
        </div>
      </header>

      <form onSubmit={finishEncounter} className="grid grid-cols-1 xl:grid-cols-5 gap-8">
        <div className="xl:col-span-2 space-y-6">
          <Card title="Body Area">
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(bodyAreas).map(([key, area]) => (
                <button key={key} type="button" onClick={() => setSelectedArea(key)} className={`p-5 text-left border-2 ${selectedArea === key ? 'bg-mPolyBlue text-white border-mPolyBlue' : 'bg-slate-50 border-neutral-100 text-neutral-600'}`}>
                  <p className="text-[10px] font-black uppercase">{area.label}</p>
                </button>
              ))}
            </div>
          </Card>

          <Card title="Specific Part">
            <div className="flex flex-wrap gap-3">
              {bodyAreas[selectedArea].parts.map(part => (
                <button key={part} type="button" onClick={() => setSelectedPart(part)} className={`px-5 py-3 text-[10px] font-black uppercase border-2 ${selectedPart === part ? 'bg-mPolyGreen text-white border-mPolyGreen' : 'bg-white border-neutral-100 text-neutral-500'}`}>{part}</button>
              ))}
            </div>
          </Card>

          <Card title="Symptoms">
            <div className="flex flex-wrap gap-3">
              {bodyAreas[selectedArea].symptoms.map(symptom => (
                <button key={symptom} type="button" onClick={() => toggleSymptom(symptom)} className={`px-5 py-3 text-[10px] font-black uppercase border-2 ${selectedSymptoms.includes(symptom) ? 'bg-mPolyBlue text-white border-mPolyBlue' : 'bg-slate-50 border-neutral-100 text-neutral-500'}`}>{symptom}</button>
              ))}
            </div>
          </Card>
        </div>

        <div className="xl:col-span-3 space-y-6">
          <Card title="Vitals">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <label className="space-y-2 text-xs font-bold text-mPolyBlue">Temperature <span className="float-right">{vitals.temp}C</span><input type="range" min="34" max="42" step="0.1" value={vitals.temp} onChange={(e) => setVitals({ ...vitals, temp: Number(e.target.value) })} className="w-full accent-mPolyBlue" /></label>
              <label className="space-y-2 text-xs font-bold text-mPolyBlue">Heart Rate <span className="float-right">{vitals.hr} bpm</span><input type="range" min="40" max="180" value={vitals.hr} onChange={(e) => setVitals({ ...vitals, hr: Number(e.target.value) })} className="w-full accent-red-600" /></label>
              <label className="space-y-2 text-xs font-bold text-neutral-500">Systolic BP<input type="number" value={vitals.bpSys} onChange={(e) => setVitals({ ...vitals, bpSys: Number(e.target.value) })} className="w-full bg-slate-50 border-2 border-neutral-100 p-4 font-bold outline-none focus:border-mPolyBlue" /></label>
              <label className="space-y-2 text-xs font-bold text-neutral-500">Diastolic BP<input type="number" value={vitals.bpDia} onChange={(e) => setVitals({ ...vitals, bpDia: Number(e.target.value) })} className="w-full bg-slate-50 border-2 border-neutral-100 p-4 font-bold outline-none focus:border-mPolyBlue" /></label>
              <label className="space-y-2 text-xs font-bold text-mPolyBlue md:col-span-2">Pain Level <span className="float-right">{painLevel}/10</span><input type="range" min="0" max="10" value={painLevel} onChange={(e) => setPainLevel(Number(e.target.value))} className="w-full accent-mPolyGreen" /></label>
            </div>
          </Card>

          <Card title="Diagnosis">
            <div className="space-y-5">
              <textarea value={clinicalNotes} onChange={(e) => setClinicalNotes(e.target.value)} placeholder="Clinical findings, history, examination notes..." className="w-full bg-slate-50 border-2 border-neutral-100 p-5 text-sm font-semibold outline-none focus:border-mPolyBlue h-28"></textarea>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {suggestions.map(suggestion => (
                  <button key={suggestion.name} type="button" onClick={() => setDiagnosis(suggestion.name)} className="relative bg-white border-2 border-neutral-100 hover:border-mPolyBlue p-4 text-left">
                    <span onClick={(e) => { e.stopPropagation(); setDismissedSuggestions(prev => [...prev, suggestion.name]); }} className="absolute top-2 right-2 text-neutral-300 hover:text-red-600"><i className="fa-solid fa-xmark"></i></span>
                    <p className="text-[10px] font-black uppercase text-mPolyBlue pr-5">{suggestion.name}</p>
                    <p className="text-xl font-black text-mPolyGreen mt-2">{suggestion.confidence}%</p>
                  </button>
                ))}
              </div>
              <input required value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="Enter final diagnosis" className="w-full bg-slate-50 border-2 border-neutral-100 p-5 text-sm font-bold outline-none focus:border-mPolyBlue" />
              <input required value={treatment} onChange={(e) => setTreatment(e.target.value)} placeholder="Treatment directive" className="w-full bg-slate-50 border-2 border-neutral-100 p-5 text-sm font-bold outline-none focus:border-mPolyBlue" />
            </div>
          </Card>

          <Card title="Medication">
            <div className="space-y-4">
              <div className="relative">
                <input value={medSearch} onChange={(e) => setMedSearch(e.target.value)} placeholder="Search pharmacy medicine..." className="w-full bg-white border-2 border-neutral-100 p-5 text-sm font-bold outline-none focus:border-mPolyBlue" />
                {filteredMeds.length > 0 && (
                  <div className="absolute top-full mt-2 left-0 right-0 bg-white border-4 border-mPolyBlue shadow-2xl z-20 max-h-60 overflow-y-auto">
                    {filteredMeds.map(med => (
                      <button key={med.id} type="button" onClick={() => { if (!prescribedMeds.find(item => item.name === med.name)) setPrescribedMeds([...prescribedMeds, { name: med.name, units: 1 }]); setMedSearch(''); }} className="w-full p-4 text-left hover:bg-slate-50 border-b text-xs font-bold flex justify-between">
                        <span>{med.name}</span><span className="text-mPolyGreen">{med.stock} Units</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {prescribedMeds.map((med, index) => (
                <div key={med.name} className="bg-mPolyBlue text-white p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-8 border-mPolyYellow">
                  <span className="text-sm font-black uppercase">{med.name}</span>
                  <div className="flex items-center gap-3">
                    <label className="text-[9px] font-black uppercase text-white/50">Quantity</label>
                    <input type="number" min="1" value={med.units} onChange={(e) => { const next = [...prescribedMeds]; next[index].units = Number(e.target.value); setPrescribedMeds(next); }} className="w-24 bg-white/10 border border-white/20 p-3 text-center font-bold outline-none" />
                    <button type="button" onClick={() => setPrescribedMeds(prescribedMeds.filter((_, i) => i !== index))} className="text-red-300 hover:text-white"><i className="fa-solid fa-trash-can"></i></button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="flex flex-col md:flex-row gap-4">
            <Button type="button" variant="outline" onClick={() => setIsReferralOpen(true)} className="py-5 flex-1">Refer Student</Button>
            <Button type="submit" disabled={isSaving} className="py-5 flex-1 bg-mPolyBlue">{isSaving ? 'Saving...' : 'Finished With Student'}</Button>
          </div>
        </div>
      </form>

      {isReferralOpen && (
        <div className="fixed inset-0 bg-mPolyBlue/90 z-[700] flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full p-10 shadow-2xl border-t-8 border-mPolyYellow">
            <div className="flex justify-between items-start mb-8">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-mPolyGreen">Referral Letter</p>
                <h3 className="text-2xl font-black uppercase text-mPolyBlue">{appointment.studentName}</h3>
              </div>
              <button onClick={() => setIsReferralOpen(false)} className="text-neutral-300 hover:text-red-600"><i className="fa-solid fa-xmark text-2xl"></i></button>
            </div>
            <div className="space-y-5">
              <label className="text-[10px] font-black uppercase text-neutral-400">Recommended Specialist</label>
              <input value={referralSpecialist} onChange={(e) => setReferralSpecialist(e.target.value)} className="w-full bg-slate-50 border-2 border-neutral-100 p-4 text-xs font-bold outline-none focus:border-mPolyBlue" />
              <div className="bg-slate-50 p-5 border-l-8 border-mPolyBlue">
                <p className="text-[9px] font-black uppercase text-neutral-400">Diagnosis</p>
                <p className="text-sm font-black text-mPolyBlue uppercase">{diagnosis || 'Not entered'}</p>
              </div>
              <Button type="button" variant="primary" fullWidth onClick={createReferral} className="py-5">Generate Referral Letter</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QueueTab;
