
import React, { useState, useEffect } from 'react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import Icon from '../../components/Icon';
import { db } from '../../lib/firebase';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { Appointment, SickNoteRequest, StaffMember } from '../../types';

interface AppointmentTabProps {
  user?: any;
}

const AppointmentTab: React.FC<AppointmentTabProps> = ({ user }) => {
  const [view, setView] = useState<'hub' | 'book' | 'sicknote'>('hub');
  const [step, setStep] = useState(1);
  const [selectedConcern, setSelectedConcern] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [occupiedSlots, setOccupiedSlots] = useState<string[]>([]);
  const [doctors, setDoctors] = useState<StaffMember[]>([]);
  const [myAppointments, setMyAppointments] = useState<Appointment[]>([]);
  const [mySickNoteRequests, setMySickNoteRequests] = useState<SickNoteRequest[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBooked, setIsBooked] = useState(false);

  // Time slots for clinic
  const allSlots = ['08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '11:00 AM', '01:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '04:00 PM', '04:30 PM'];

  useEffect(() => {
    const qDoctors = query(collection(db, "staff"), where("role", "==", "doctor"));
    const unsubDoctors = onSnapshot(qDoctors, (snap) => {
      const data = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as StaffMember))
        .filter(d => !d.isMainAdmin);
      setDoctors(data);
      if (!selectedDoctorId && data.length > 0) setSelectedDoctorId(data[0].id || '');
    });
    return () => unsubDoctors();
  }, [selectedDoctorId]);

  useEffect(() => {
    if (!user?.studentNumber) return;
    
    // Fetch user appointments
    const qApt = query(collection(db, "appointments"), where("studentId", "==", user.studentNumber));
    const unsubApt = onSnapshot(qApt, (snap) => {
      setMyAppointments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Appointment)));
    });

    // Fetch user sick note requests
    const qSick = query(collection(db, "sick_note_requests"), where("studentId", "==", user.studentNumber));
    const unsubSick = onSnapshot(qSick, (snap) => {
      setMySickNoteRequests(snap.docs.map(d => ({ id: d.id, ...d.data() } as SickNoteRequest)));
    });

    return () => { unsubApt(); unsubSick(); };
  }, [user]);

  // Check occupied slots for the selected date
  useEffect(() => {
    if (!selectedDate) return;
    const fetchOccupied = async () => {
      const q = query(collection(db, "appointments"), where("date", "==", selectedDate));
      const snap = await getDocs(q);
      const occupied = snap.docs
        .map(d => d.data())
        .filter((apt: any) => !selectedDoctorId || apt.doctorId === selectedDoctorId)
        .map((apt: any) => apt.time);
      setOccupiedSlots(occupied);
    };
    fetchOccupied();
  }, [selectedDate, selectedDoctorId, step]);

  const handleBooking = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !selectedTime || !selectedDoctorId) return;
    
    setIsSubmitting(true);
    const fd = new FormData(e.currentTarget);
    
    try {
      const selectedDoctor = doctors.find(d => d.id === selectedDoctorId);
      const appointmentData = {
        studentId: user.studentNumber,
        studentName: `${user.name} ${user.surname}`,
        studentWhatsapp: user.whatsapp,
        doctorId: selectedDoctor?.id,
        doctorName: selectedDoctor?.name,
        reason: selectedConcern,
        time: selectedTime,
        date: selectedDate,
        symptoms: fd.get('symptoms'),
        status: 'pending',
        timestamp: serverTimestamp()
      };

      await addDoc(collection(db, "appointments"), appointmentData);
      setIsBooked(true);
    } catch (error) {
      console.error("Booking Error:", error);
      alert("Failed to confirm booking.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSickNoteSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    const fd = new FormData(e.currentTarget);
    try {
      const requestData = {
        studentId: user.studentNumber,
        studentName: `${user.name} ${user.surname}`,
        reason: fd.get('reason'),
        startDate: fd.get('startDate'),
        endDate: fd.get('endDate'),
        status: 'pending',
        timestamp: serverTimestamp()
      };
      await addDoc(collection(db, "sick_note_requests"), requestData);
      alert("Sick note application submitted for review.");
      setView('hub');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isBooked) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fade-in text-center">
        <div className="w-24 h-24 bg-mPolyGreen text-white flex items-center justify-center mb-8 shadow-2xl animate-bounce">
          <i className="fa-solid fa-check text-4xl"></i>
        </div>
        <h2 className="text-3xl lg:text-5xl font-black uppercase tracking-tighter text-neutral-900 mb-4">Confirmed</h2>
        <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest max-w-md mb-10">Your session is reserved with {doctors.find(d => d.id === selectedDoctorId)?.name || 'the doctor'} for {selectedDate} at {selectedTime}.</p>
        <Button variant="primary" onClick={() => { setIsBooked(false); setView('hub'); setStep(1); setSelectedTime(null); }}>Return to Hub</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-8 pb-10">
      {view === 'hub' && (
        <div className="space-y-10 animate-fade-in">
          <header className="flex justify-between items-end">
            <div>
              <p className="text-[10px] font-black text-mPolyGreen uppercase tracking-widest">Clinic Access</p>
              <h1 className="text-4xl font-black text-neutral-900 uppercase tracking-tighter">Medical Hub</h1>
            </div>
            <div className="flex gap-4">
              <Button variant="outline" onClick={() => setView('sicknote')} className="text-xs">Apply Sick Note</Button>
              <Button variant="primary" onClick={() => setView('book')} className="text-xs">Book Appointment</Button>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card title="Current Status" className="lg:col-span-2 border-l-[12px] border-mPolyBlue">
              <div className="space-y-6">
                {myAppointments.length > 0 ? (
                  myAppointments.sort((a,b) => b.date.localeCompare(a.date)).slice(0, 3).map(apt => (
                    <div key={apt.id} className="flex justify-between items-center p-4 bg-slate-50 border border-neutral-100">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 flex items-center justify-center ${apt.status === 'pending' ? 'bg-mPolyYellow text-mPolyBlue' : 'bg-mPolyBlue text-white'}`}>
                          <i className="fa-solid fa-clock"></i>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase text-neutral-400">{apt.date}</p>
                          <h4 className="text-sm font-bold uppercase">{apt.reason}</h4>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-mPolyBlue">{apt.time}</p>
                        <span className={`text-[8px] font-black uppercase tracking-widest ${apt.status === 'confirmed' ? 'text-mPolyGreen' : 'text-neutral-400'}`}>
                          {apt.status}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs font-bold text-neutral-300 uppercase italic">No active bookings found.</p>
                )}
              </div>
            </Card>

            <Card title="Sick Note History">
              <div className="space-y-4">
                {mySickNoteRequests.map(req => (
                  <div key={req.id} className="flex flex-col p-4 border border-neutral-100 bg-neutral-50 gap-1">
                    <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">Applied: {req.timestamp?.toDate?.()?.toLocaleDateString() || 'Recently'}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-bold uppercase truncate max-w-[120px]">{req.reason}</span>
                      <span className={`px-2 py-0.5 text-[8px] font-black uppercase ${req.status === 'approved' ? 'bg-mPolyGreen text-white' : 'bg-neutral-200 text-neutral-500'}`}>
                        {req.status}
                      </span>
                    </div>
                  </div>
                ))}
                {mySickNoteRequests.length === 0 && (
                   <p className="text-[10px] font-bold text-neutral-300 uppercase text-center py-4">No applications.</p>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {view === 'book' && (
        <div className="space-y-8 animate-slide-left">
           <header className="flex items-center justify-between">
              <button onClick={() => setView('hub')} className="text-xs font-bold text-mPolyBlue uppercase flex items-center gap-2">
                 <i className="fa-solid fa-arrow-left"></i> Exit Booking
              </button>
              <span className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Step {step} of 3</span>
           </header>

           {step === 1 && (
             <div className="grid grid-cols-2 md:grid-cols-3 gap-4 animate-slide-right">
                {['General Illness', 'Sexual Health', 'Counseling', 'Vaccination', 'Follow-up', 'Dental'].map(label => (
                  <button key={label} onClick={() => { setSelectedConcern(label); setStep(2); }} className="p-8 bg-white border-2 border-neutral-100 hover:border-mPolyBlue transition-all text-left group">
                    <div className="w-10 h-10 bg-slate-50 flex items-center justify-center mb-4 group-hover:bg-mPolyBlue group-hover:text-white">
                       <i className="fa-solid fa-notes-medical"></i>
                    </div>
                    <span className="text-xs font-black uppercase tracking-tight text-mPolyBlue">{label}</span>
                  </button>
                ))}
             </div>
           )}

           {step === 2 && (
             <Card title={`Schedule for ${selectedConcern}`}>
                <div className="space-y-10">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-neutral-400">Choose Doctor</label>
                      <select
                        required
                        value={selectedDoctorId}
                        onChange={(e) => { setSelectedDoctorId(e.target.value); setSelectedTime(null); }}
                        className="w-full bg-slate-50 border-2 border-neutral-100 p-4 text-xs font-bold outline-none focus:border-mPolyBlue"
                      >
                        {doctors.map(doctor => (
                          <option key={doctor.id} value={doctor.id}>{doctor.name}</option>
                        ))}
                      </select>
                      {doctors.length === 0 && (
                        <p className="text-[10px] font-black uppercase tracking-widest text-red-600">No doctors have been added yet. Ask admin to add a doctor.</p>
                      )}
                   </div>

                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-neutral-400">Select Visit Date</label>
                      <input 
                        type="date" 
                        min={new Date().toISOString().split('T')[0]} 
                        value={selectedDate} 
                        onChange={(e) => { setSelectedDate(e.target.value); setSelectedTime(null); }}
                        className="w-full bg-slate-50 border-2 border-neutral-100 p-4 text-xs font-bold outline-none focus:border-mPolyBlue" 
                      />
                   </div>

                   <div className="space-y-4">
                      <p className="text-[10px] font-black uppercase text-neutral-400">Available Slots</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                         {allSlots.map(time => {
                           const isOccupied = occupiedSlots.includes(time);
                           return (
                             <button
                                key={time}
                                disabled={isOccupied}
                                onClick={() => setSelectedTime(time)}
                                className={`py-4 text-[10px] font-black uppercase border-2 transition-all
                                  ${isOccupied ? 'bg-neutral-50 text-neutral-300 border-neutral-50 cursor-not-allowed line-through' : 
                                    selectedTime === time ? 'bg-mPolyBlue text-white border-mPolyBlue' : 'bg-white text-neutral-600 border-neutral-100 hover:border-mPolyGreen'}`}
                             >
                               {time}
                               {isOccupied && <span className="block text-[7px] text-red-400 mt-1">Booked</span>}
                             </button>
                           );
                         })}
                      </div>
                   </div>

                   <div className="flex gap-4 pt-6 border-t border-neutral-100">
                      <Button variant="outline" fullWidth onClick={() => setStep(1)}>Back</Button>
                      <Button variant="primary" fullWidth disabled={!selectedTime || !selectedDoctorId || doctors.length === 0} onClick={() => setStep(3)}>Continue</Button>
                   </div>
                </div>
             </Card>
           )}

           {step === 3 && (
             <Card title="Final Intake Details">
                <form onSubmit={handleBooking} className="space-y-8">
                   <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase text-neutral-400">Main Symptoms</label>
                      <textarea name="symptoms" required placeholder="Briefly describe your symptoms..." className="w-full bg-slate-50 border-2 border-neutral-100 p-4 text-xs font-bold outline-none focus:border-mPolyBlue h-32"></textarea>
                   </div>
                   <div className="bg-mPolyBlue/5 p-6 border-l-8 border-mPolyBlue space-y-2">
                      <p className="text-[10px] font-black text-mPolyBlue uppercase tracking-widest">Verification Summary</p>
                      <div className="flex justify-between text-xs font-bold uppercase">
                         <span className="text-neutral-400">Reason</span>
                         <span className="text-mPolyBlue">{selectedConcern}</span>
                      </div>
                      <div className="flex justify-between text-xs font-bold uppercase">
                         <span className="text-neutral-400">Schedule</span>
                         <span className="text-mPolyBlue">{selectedDate} @ {selectedTime}</span>
                      </div>
                      <div className="flex justify-between text-xs font-bold uppercase">
                         <span className="text-neutral-400">Doctor</span>
                         <span className="text-mPolyBlue">{doctors.find(d => d.id === selectedDoctorId)?.name}</span>
                      </div>
                   </div>
                   <div className="flex gap-4">
                      <Button variant="outline" fullWidth type="button" onClick={() => setStep(2)}>Back</Button>
                      <Button variant="primary" fullWidth type="submit" disabled={isSubmitting}>
                         {isSubmitting ? 'Syncing...' : 'Confirm Visit'}
                      </Button>
                   </div>
                </form>
             </Card>
           )}
        </div>
      )}

      {view === 'sicknote' && (
        <div className="space-y-8 animate-slide-right max-w-2xl mx-auto">
           <header className="flex items-center">
              <button onClick={() => setView('hub')} className="text-xs font-bold text-mPolyBlue uppercase flex items-center gap-2">
                 <i className="fa-solid fa-arrow-left"></i> Back to Hub
              </button>
           </header>
           <Card title="Apply for Medical Excuse Certificate">
              <form onSubmit={handleSickNoteSubmit} className="space-y-6">
                 <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-neutral-400">Reason for Excuse</label>
                    <input name="reason" required placeholder="e.g. Severe Malaria, Dental Surgery" className="w-full bg-slate-50 border-2 border-neutral-100 p-4 text-xs font-bold outline-none focus:border-mPolyBlue" />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <label className="text-[9px] font-black uppercase text-neutral-400">Start Date</label>
                       <input name="startDate" type="date" required className="w-full bg-slate-50 border-2 border-neutral-100 p-4 text-xs font-bold outline-none focus:border-mPolyBlue" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[9px] font-black uppercase text-neutral-400">End Date</label>
                       <input name="endDate" type="date" required className="w-full bg-slate-50 border-2 border-neutral-100 p-4 text-xs font-bold outline-none focus:border-mPolyBlue" />
                    </div>
                 </div>
                 <div className="p-4 bg-red-50 text-red-600 border border-red-100">
                    <p className="text-[9px] font-black uppercase leading-tight">Institutional Policy: False medical declarations are punishable under student disciplinary codes. Staff will verify these dates against your clinical records.</p>
                 </div>
                 <Button variant="primary" fullWidth disabled={isSubmitting}>
                    {isSubmitting ? 'Transmitting Request...' : 'Submit Application'}
                 </Button>
              </form>
           </Card>
        </div>
      )}
    </div>
  );
};

export default AppointmentTab;
