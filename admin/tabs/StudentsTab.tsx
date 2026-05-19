
import React, { useState, useEffect } from 'react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Patient, Vitals, PrescribedMedication, InventoryItem, StaffMember, ReferralLetter } from '../../types';
import { db } from '../../lib/firebase';
import { 
  collection, addDoc, onSnapshot, query, serverTimestamp, updateDoc, doc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import StudentProfileView from './StudentProfileView';
import ReferralReport from '../../student/components/ReferralReport';
import { normalizeZimbabwePhone } from '../../utils/phone';
import { getDiagnosisSuggestions } from '../../utils/diagnosisSupport';

interface StudentsTabProps {
  onNotify: (msg: string) => void;
  inventory: InventoryItem[];
  staffUser?: StaffMember;
}

const StudentsTab: React.FC<StudentsTabProps> = ({ onNotify, inventory, staffUser }) => {
  const [view, setView] = useState<'list' | 'profile' | 'attend' | 'enroll'>('list');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [referrals, setReferrals] = useState<ReferralLetter[]>([]);
  const [selectedReferral, setSelectedReferral] = useState<ReferralLetter | null>(null);
  const [search, setSearch] = useState('');
  const [activeStudent, setActiveStudent] = useState<Patient | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [selectedArea, setSelectedArea] = useState('head');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [vitals, setVitals] = useState<Vitals>({ temp: 36.6, hr: 72, bpSys: 120, bpDia: 80, weight: 70, height: 1.75 });
  const [painLevel, setPainLevel] = useState(0);
  const [medSearch, setMedSearch] = useState('');
  const [prescribedMeds, setPrescribedMeds] = useState<PrescribedMedication[]>([]);
  const [disposition, setDisposition] = useState('Discharged Home');
  const [diagnosisText, setDiagnosisText] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [isReferralOpen, setIsReferralOpen] = useState(false);
  const [referralSpecialist, setReferralSpecialist] = useState('Specialist Physician');

  const symptomData: Record<string, string[]> = {
    head: ["Headache", "Dizziness", "Blurred Vision", "Ear Pain", "Sore Throat", "Neck Stiffness"],
    chest: ["Chest Pain", "Shortness of Breath", "Coughing", "Palpitations", "Wheezing"],
    abdomen: ["Nausea", "Vomiting", "Stomach Cramps", "Bloating", "Diarrhea"],
    left_arm: ["Arm Pain", "Numbness", "Weakness", "Laceration"],
    right_arm: ["Arm Pain", "Numbness", "Weakness", "Laceration"],
    left_hand: ["Fracture", "Burn", "Nerve Pain", "Stiffness"],
    right_hand: ["Fracture", "Burn", "Nerve Pain", "Stiffness"],
    left_leg: ["Leg Pain", "Swelling", "Numbness"],
    right_leg: ["Leg Pain", "Swelling", "Numbness"]
  };

  useEffect(() => {
    onSnapshot(collection(db, "students"), (snap) => setPatients(snap.docs.map(d => ({ id: d.id, ...d.data() } as Patient))));
    onSnapshot(collection(db, "referrals"), (snap) => setReferrals(snap.docs.map(d => ({ id: d.id, ...d.data() } as ReferralLetter)).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))));
  }, []);

  const handleEnroll = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const fd = new FormData(e.currentTarget);
    try {
      await addDoc(collection(db, "students"), {
        name: fd.get('name'), 
        surname: fd.get('surname'), 
        dob: fd.get('dob'), 
        gender: fd.get('gender'), 
        studentNumber: fd.get('sn'),
        course: fd.get('course'), 
        level: fd.get('level'), 
        phone: fd.get('phone'), 
        whatsapp: normalizeZimbabwePhone(fd.get('whatsapp')),
        address: fd.get('address'),
        nextOfKinName: fd.get('nok_name'), 
        nextOfKinPhone: fd.get('nok_phone'),
        password: "maspoly", 
        registrationDate: new Date().toISOString().split('T')[0]
      });
      setView('list');
      onNotify("Student successfully registered");
    } catch (err: any) { 
      alert(err.message); 
    } finally { 
      setIsSaving(false); 
    }
  };

  const handleFinalizeEncounter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudent) return;
    setIsSaving(true);
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    try {
      // FIX: Saving by studentNumber instead of id
      const rec = {
        studentId: activeStudent.studentNumber, 
        date: serverTimestamp(), 
        symptoms: selectedSymptoms,
        affectedArea: selectedArea, 
        vitals, 
        painLevel, 
        diagnosis: diagnosisText || fd.get('diagnosis'),
        treatment: fd.get('treatment'), 
        medications: prescribedMeds, 
        notes: clinicalNotes,
        staffName: staffUser?.name || "Dr. Nyoni", 
        disposition
      };
      await addDoc(collection(db, "clinical_records"), rec);
      for (const m of prescribedMeds) {
        const item = inventory.find(i => i.name === m.name);
        if (item) {
          await updateDoc(doc(db, "inventory", item.id), { stock: item.stock - m.units });
          await addDoc(collection(db, "pharmacy_history"), {
            studentName: `${activeStudent.name} ${activeStudent.surname}`,
            studentId: activeStudent.studentNumber, 
            medicineName: m.name, 
            units: m.units,
            date: serverTimestamp(), 
            doctorName: "Dr. Nyoni"
          });
        }
      }
      onNotify("Medical encounter saved");
      setView('list');
      resetEncounter();
    } catch (err: any) { alert(err.message); } finally { setIsSaving(false); }
  };

  const resetEncounter = () => {
    setSelectedSymptoms([]); setPrescribedMeds([]); setPainLevel(0);
    setDiagnosisText(''); setClinicalNotes(''); setReferralSpecialist('Specialist Physician');
    setVitals({ temp: 36.6, hr: 72, bpSys: 120, bpDia: 80, weight: 70, height: 1.75 });
  };

  const diagnosisSuggestions = getDiagnosisSuggestions({
    selectedSymptoms,
    freeText: clinicalNotes,
    selectedArea,
    vitals,
    painLevel
  });

  const handleCreateReferral = async () => {
    if (!activeStudent) return;
    if (!diagnosisText.trim()) {
      alert("Enter or select a diagnosis before generating a referral.");
      return;
    }
    try {
      await addDoc(collection(db, "referrals"), {
        studentId: activeStudent.studentNumber,
        studentName: `${activeStudent.name} ${activeStudent.surname}`,
        doctorName: staffUser?.name || "Dr. Nyoni",
        diagnosis: diagnosisText,
        reason: "Case requires specialist review beyond clinic level.",
        clinicalSummary: clinicalNotes || `Symptoms: ${selectedSymptoms.join(', ') || 'Not specified'}. Affected area: ${selectedArea}. Pain level: ${painLevel}/10.`,
        recommendedSpecialist: referralSpecialist,
        status: 'issued',
        createdAt: serverTimestamp()
      });
      await addDoc(collection(db, "notifications"), {
        studentId: activeStudent.studentNumber,
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

  const filteredPatients = patients.filter(p => `${p.name} ${p.surname} ${p.studentNumber}`.toLowerCase().includes(search.toLowerCase()));
  const filteredMeds = inventory.filter(i => (i.name || '').toLowerCase().includes(medSearch.toLowerCase()) && i.stock > 0 && medSearch.length > 0);

  return (
    <div className="space-y-8 animate-fade-in">
      {view === 'list' && (
        <>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
               <h3 className="text-3xl font-bold text-mPolyBlue">Clinical Roster</h3>
               <p className="text-xs font-medium text-neutral-400">Institutional health registry of all enrolled students.</p>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
               <input type="text" placeholder="Search by name or ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-white border-2 border-neutral-100 px-6 py-4 text-sm font-semibold outline-none focus:border-mPolyBlue flex-1 md:w-80 shadow-sm" />
               <Button variant="primary" onClick={() => setView('enroll')} className="bg-mPolyBlue shadow-2xl px-10">Enroll Student</Button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {filteredPatients.map(p => (
              <div key={p.id} className="bg-white border-b-8 border-mPolyBlue shadow-xl overflow-hidden group hover:-translate-y-2 transition-all">
                <div className="h-12 bg-slate-50 group-hover:bg-mPolyBlue transition-colors"></div>
                <div className="p-8 pt-12 relative">
                  <img src={`https://ui-avatars.com/api/?name=${p.name}+${p.surname}&background=163959&color=fff&bold=true`} className="w-20 h-20 absolute -top-10 left-8 border-4 border-white shadow-2xl" alt="Avatar" />
                  <h4 className="font-bold text-lg text-neutral-900 leading-tight mt-2">{p.name} {p.surname}</h4>
                  <p className="text-sm font-medium text-neutral-400 mt-2">{p.studentNumber}</p>
                  <div className="mt-10 flex gap-3">
                    <Button variant="primary" className="text-xs py-3 flex-1 font-bold" onClick={() => { setActiveStudent(p); setView('attend'); }}>Attend</Button>
                    <Button variant="outline" className="text-xs py-3 flex-1 font-bold" onClick={() => { setActiveStudent(p); setView('profile'); }}>View Bio</Button>
                  </div>
                </div>
              </div>
            ))}
            {filteredPatients.length === 0 && <div className="col-span-full py-40 text-center opacity-10 font-bold text-5xl tracking-tight">No records found</div>}
          </div>
          {referrals.length > 0 && (
            <Card title="Referral Letters" className="border-t-8 border-mPolyYellow">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {referrals.slice(0, 9).map(ref => (
                  <button key={ref.id} onClick={() => setSelectedReferral(ref)} className="text-left bg-slate-50 border border-neutral-100 p-5 hover:border-mPolyBlue transition-all">
                    <p className="text-[9px] font-black uppercase tracking-widest text-neutral-400">{ref.studentId}</p>
                    <h4 className="text-sm font-black uppercase text-mPolyBlue mt-1">{ref.studentName}</h4>
                    <p className="text-[10px] font-bold uppercase text-neutral-500 mt-2">{ref.recommendedSpecialist}</p>
                  </button>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {view === 'profile' && activeStudent && (
        <StudentProfileView student={activeStudent} onBack={() => setView('list')} />
      )}

      {view === 'enroll' && (
        <div className="space-y-12 animate-slide-right max-w-[1200px] mx-auto pb-20">
           <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b-8 border-mPolyBlue pb-10">
              <div className="space-y-4">
                 <button onClick={() => setView('list')} className="text-sm font-bold text-mPolyBlue hover:text-mPolyGreen flex items-center gap-2 transition-colors">
                    <i className="fa-solid fa-arrow-left"></i> Back to clinical roster
                 </button>
                 <h3 className="text-4xl lg:text-6xl font-bold text-mPolyBlue leading-none">Enrollment <span className="text-mPolyYellow">Registry</span></h3>
                 <p className="text-sm font-medium text-neutral-400">Clinical profile authentication protocol for new students.</p>
              </div>
              <div className="hidden lg:block bg-mPolyBlue text-white p-6 border-l-8 border-mPolyYellow shadow-2xl">
                 <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Auth Strategy</p>
                 <p className="text-sm font-semibold">Sync-on-Login Enabled</p>
              </div>
           </header>

           <form onSubmit={handleEnroll} className="space-y-16">
              <div className="space-y-8">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-mPolyBlue text-white flex items-center justify-center font-bold">01</div>
                    <h4 className="text-xl font-bold text-neutral-900">Personal Information</h4>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    <div className="space-y-3">
                       <label className="text-xs font-bold text-mPolyBlue">Given Name</label>
                       <input name="name" required placeholder="First name" className="w-full bg-white border-4 border-neutral-100 p-6 text-base font-semibold outline-none focus:border-mPolyBlue transition-all shadow-sm" />
                    </div>
                    <div className="space-y-3">
                       <label className="text-xs font-bold text-mPolyBlue">Surname</label>
                       <input name="surname" required placeholder="Family name" className="w-full bg-white border-4 border-neutral-100 p-6 text-base font-semibold outline-none focus:border-mPolyBlue transition-all shadow-sm" />
                    </div>
                    <div className="space-y-3">
                       <label className="text-xs font-bold text-mPolyBlue">Student Number</label>
                       <input name="sn" required placeholder="STUD-2026-XXXX" className="w-full bg-white border-4 border-neutral-100 p-6 text-base font-semibold outline-none focus:border-mPolyBlue transition-all shadow-sm" />
                    </div>
                    <div className="space-y-3">
                       <label className="text-xs font-bold text-mPolyBlue">Date of Birth</label>
                       <input name="dob" type="date" required className="w-full bg-white border-4 border-neutral-100 p-6 text-base font-semibold outline-none focus:border-mPolyBlue transition-all shadow-sm" />
                    </div>
                    <div className="space-y-3">
                       <label className="text-xs font-bold text-mPolyBlue">Gender</label>
                       <select name="gender" required className="w-full bg-white border-4 border-neutral-100 p-6 text-base font-semibold outline-none focus:border-mPolyBlue transition-all shadow-sm">
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                       </select>
                    </div>
                    <div className="space-y-3">
                       <label className="text-xs font-bold text-mPolyBlue">Primary Contact</label>
                       <input name="phone" required placeholder="Phone number" className="w-full bg-white border-4 border-neutral-100 p-6 text-base font-semibold outline-none focus:border-mPolyBlue transition-all shadow-sm" />
                    </div>
                    <div className="space-y-3">
                       <label className="text-xs font-bold text-mPolyBlue">WhatsApp Number</label>
                       <input name="whatsapp" required placeholder="7748478749" className="w-full bg-white border-4 border-neutral-100 p-6 text-base font-semibold outline-none focus:border-mPolyBlue transition-all shadow-sm" />
                       <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Saved automatically with +263</p>
                    </div>
                 </div>
              </div>

              <div className="space-y-8">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-mPolyBlue text-white flex items-center justify-center font-bold">02</div>
                    <h4 className="text-xl font-bold text-neutral-900">Academic Placement</h4>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-3">
                       <label className="text-xs font-bold text-mPolyBlue">Institutional Faculty</label>
                       <select name="course" required className="w-full bg-white border-4 border-neutral-100 p-6 text-base font-semibold outline-none focus:border-mPolyBlue transition-all shadow-sm">
                          <option value="Information Tech">Information Technology</option>
                          <option value="Engineering">School of Engineering</option>
                          <option value="Business Studies">Business & Commerce</option>
                          <option value="Applied Science">Applied Sciences</option>
                          <option value="General Studies">General Studies</option>
                       </select>
                    </div>
                    <div className="space-y-3">
                       <label className="text-xs font-bold text-mPolyBlue">Departmental Level</label>
                       <select name="level" className="w-full bg-white border-4 border-neutral-100 p-6 text-base font-semibold outline-none focus:border-mPolyBlue transition-all shadow-sm">
                          <option value="NC">National Certificate (NC)</option>
                          <option value="ND">National Diploma (ND)</option>
                       </select>
                    </div>
                    <div className="col-span-full space-y-3">
                       <label className="text-xs font-bold text-mPolyBlue">Residential Address</label>
                       <input name="address" required placeholder="Hostel block or off-campus address" className="w-full bg-white border-4 border-neutral-100 p-6 text-base font-semibold outline-none focus:border-mPolyBlue transition-all shadow-sm" />
                    </div>
                 </div>
              </div>

              <div className="space-y-8">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-red-600 text-white flex items-center justify-center font-bold">03</div>
                    <h4 className="text-xl font-bold text-red-600">Emergency Contact</h4>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-10 bg-red-50/50 p-10 border-l-[16px] border-red-600">
                    <div className="space-y-3">
                       <label className="text-xs font-bold text-red-600">Next of Kin Name</label>
                       <input name="nok_name" required className="w-full bg-white border-4 border-red-100 p-6 text-base font-semibold outline-none focus:border-red-600 transition-all shadow-sm" />
                    </div>
                    <div className="space-y-3">
                       <label className="text-xs font-bold text-red-600">Emergency Phone</label>
                       <input name="nok_phone" required className="w-full bg-white border-4 border-red-100 p-6 text-base font-semibold outline-none focus:border-red-600 transition-all shadow-sm" />
                    </div>
                 </div>
              </div>

              <div className="pt-12 border-t-8 border-neutral-100 flex flex-col md:flex-row gap-8">
                 <Button variant="primary" type="submit" fullWidth disabled={isSaving} className="py-10 text-lg font-bold bg-mPolyBlue shadow-2xl flex-1">
                    {isSaving ? 'Processing registration...' : 'Initialize clinical profile'}
                 </Button>
                 <Button variant="outline" type="button" onClick={() => setView('list')} className="py-10 flex-1 border-4 font-bold text-lg">
                    Cancel and return
                 </Button>
              </div>
           </form>
        </div>
      )}

      {view === 'attend' && activeStudent && (
        <div className="flex flex-col lg:flex-row gap-10 h-auto lg:h-[calc(100vh-180px)]">
           <div className="lg:w-2/5 bg-white p-10 flex flex-col items-center shadow-2xl overflow-y-auto no-scrollbar border-t-[12px] border-mPolyBlue">
              <h2 className="text-xs font-bold uppercase text-mPolyBlue mb-10 tracking-[0.2em]">Clinical Triage Map</h2>
              <svg viewBox="0 0 280 600" className="h-[420px] w-auto mb-10">
                <ellipse cx="140" cy="50" rx="38" ry="42" className={`body-part skin ${selectedArea === 'head' ? 'active' : ''}`} onClick={() => setSelectedArea('head')} />
                <path d="M90,115 Q140,108 190,115 L195,200 Q140,205 85,200 Z" className={`body-part skin ${selectedArea === 'chest' ? 'active' : ''}`} onClick={() => setSelectedArea('chest')} />
                <path d="M85,205 L195,205 Q190,285 140,290 Q90,285 85,205 Z" className={`body-part skin ${selectedArea === 'abdomen' ? 'active' : ''}`} onClick={() => setSelectedArea('abdomen')} />
                <path d="M75,115 L30,220 L45,230 L85,140 Z" className={`body-part skin ${selectedArea === 'left_arm' ? 'active' : ''}`} onClick={() => setSelectedArea('left_arm')} />
                <path d="M205,115 L250,220 L235,230 L195,140 Z" className={`body-part skin ${selectedArea === 'right_arm' ? 'active' : ''}`} onClick={() => setSelectedArea('right_arm')} />
                <circle cx="25" cy="240" r="15" className={`body-part skin ${selectedArea === 'left_hand' ? 'active' : ''}`} onClick={() => setSelectedArea('left_hand')} />
                <circle cx="255" cy="240" r="15" className={`body-part skin ${selectedArea === 'right_hand' ? 'active' : ''}`} onClick={() => setSelectedArea('right_hand')} />
                <path d="M105,320 L95,480 Q95,490 100,495 L115,495 Q120,490 120,480 L115,320 Z" className={`body-part skin ${selectedArea === 'left_leg' ? 'active' : ''}`} onClick={() => setSelectedArea('left_leg')} />
                <path d="M175,320 L185,480 Q185,490 180,495 L165,495 Q160,490 160,480 L165,320 Z" className={`body-part skin ${selectedArea === 'right_leg' ? 'active' : ''}`} onClick={() => setSelectedArea('right_leg')} />
              </svg>
              <div className="w-full space-y-8">
                 <div className="bg-mPolyBlue text-mPolyYellow px-8 py-3 font-bold text-sm text-center shadow-2xl">Area: {selectedArea.replace('_',' ')}</div>
                 <div className="space-y-4">
                   <p className="text-xs font-bold text-neutral-400">Indicators</p>
                   <div className="flex flex-wrap gap-3">
                     {symptomData[selectedArea]?.map(s => (
                       <button key={s} type="button" onClick={() => setSelectedSymptoms(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])} className={`px-6 py-3 text-xs font-bold border-2 transition-all ${selectedSymptoms.includes(s) ? 'bg-mPolyBlue text-white border-mPolyBlue shadow-xl' : 'bg-neutral-50 border-neutral-100 text-neutral-400'}`}>{s}</button>
                     ))}
                   </div>
                 </div>
              </div>
           </div>

           <div className="lg:w-3/5 bg-white p-12 shadow-2xl border-t-[12px] border-mPolyGreen overflow-y-auto no-scrollbar">
              <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-4 border-neutral-50 pb-8 mb-10 gap-6">
                 <div>
                    <h3 className="text-2xl font-bold text-mPolyBlue">Admission Desk</h3>
                    <p className="text-sm font-medium text-neutral-400 mt-2">Patient: {activeStudent.name} {activeStudent.surname}</p>
                 </div>
                 <div className="flex gap-2">
                   {['Home', 'Hosp', 'Stay'].map(opt => (
                     <button key={opt} type="button" onClick={() => setDisposition(opt === 'Home' ? 'Discharged Home' : opt === 'Hosp' ? 'Hospital Transfer' : 'Clinical Observation')} className={`px-6 py-2.5 text-xs font-bold transition-all ${disposition.includes(opt) ? 'bg-mPolyBlue text-white shadow-lg' : 'bg-slate-100 text-neutral-400'}`}>{opt}</button>
                   ))}
                 </div>
              </header>

              <form onSubmit={handleFinalizeEncounter} className="space-y-12">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-6">
                       <div className="flex justify-between items-end">
                          <label className="text-sm font-bold text-mPolyBlue">Temperature</label>
                          <span className={`text-xl font-bold ${vitals.temp > 37.5 ? 'text-red-600' : 'text-mPolyBlue'}`}>{vitals.temp}°C</span>
                       </div>
                       <input type="range" min="34" max="42" step="0.1" value={vitals.temp} onChange={(e) => setVitals({...vitals, temp: Number(e.target.value)})} className="w-full accent-mPolyBlue h-3 bg-slate-100 appearance-none shadow-inner" />
                    </div>
                    <div className="space-y-6">
                       <div className="flex justify-between items-end">
                          <label className="text-sm font-bold text-mPolyBlue">Heart Rate</label>
                          <span className="text-xl font-bold text-mPolyBlue">{vitals.hr} bpm</span>
                       </div>
                       <input type="range" min="40" max="180" value={vitals.hr} onChange={(e) => setVitals({...vitals, hr: Number(e.target.value)})} className="w-full accent-red-600 h-3 bg-slate-100 appearance-none shadow-inner" />
                    </div>
                    <div className="space-y-6 col-span-full bg-slate-50 p-8 border-2 border-slate-100 grid grid-cols-2 gap-10">
                       <div className="space-y-3">
                          <label className="text-xs font-bold text-neutral-400">Systolic BP</label>
                          <input type="number" value={vitals.bpSys} onChange={(e) => setVitals({...vitals, bpSys: Number(e.target.value)})} className="w-full bg-white border-2 border-neutral-100 p-5 text-base font-bold outline-none focus:border-mPolyBlue" />
                       </div>
                       <div className="space-y-3">
                          <label className="text-xs font-bold text-neutral-400">Diastolic BP</label>
                          <input type="number" value={vitals.bpDia} onChange={(e) => setVitals({...vitals, bpDia: Number(e.target.value)})} className="w-full bg-white border-2 border-neutral-100 p-5 text-base font-bold outline-none focus:border-mPolyBlue" />
                       </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-3">
                       <label className="text-sm font-bold text-mPolyBlue">Official Diagnosis</label>
                       <input name="diagnosis" required value={diagnosisText} onChange={(e) => setDiagnosisText(e.target.value)} placeholder="Outcome or observation" className="w-full bg-slate-50 border-2 border-neutral-100 p-6 text-sm font-semibold outline-none focus:border-mPolyBlue shadow-sm" />
                    </div>
                    <div className="space-y-3">
                       <label className="text-sm font-bold text-mPolyBlue">Treatment Directive</label>
                       <input name="treatment" required placeholder="Therapeutic plan" className="w-full bg-slate-50 border-2 border-neutral-100 p-6 text-sm font-semibold outline-none focus:border-mPolyBlue shadow-sm" />
                    </div>
                 </div>

                 <div className="bg-slate-50 border-2 border-neutral-100 p-6 space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-bold text-mPolyBlue">Diagnosis Suggestions</p>
                        <p className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Decision support only. Confirm clinically.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {diagnosisSuggestions.map(s => (
                        <button key={s.name} type="button" onClick={() => setDiagnosisText(s.name)} className="bg-white border-2 border-neutral-100 hover:border-mPolyBlue p-4 text-left">
                          <p className="text-[10px] font-black uppercase text-mPolyBlue leading-tight">{s.name}</p>
                          <p className="text-xl font-black text-mPolyGreen mt-2">{s.confidence}%</p>
                        </button>
                      ))}
                    </div>
                 </div>

                 <div className="space-y-3">
                    <label className="text-sm font-bold text-mPolyBlue">Clinical Notes</label>
                    <textarea name="notes" value={clinicalNotes} onChange={(e) => setClinicalNotes(e.target.value)} placeholder="Document relevant findings, history, examination notes, and why referral may be needed." className="w-full bg-slate-50 border-2 border-neutral-100 p-6 text-sm font-semibold outline-none focus:border-mPolyBlue shadow-sm h-28"></textarea>
                 </div>

                 <div className="space-y-6">
                    <div className="flex justify-between items-center border-b border-neutral-100 pb-2">
                       <p className="text-sm font-bold text-mPolyBlue">Dispensary Authorization</p>
                    </div>
                    <div className="relative">
                        <input type="text" placeholder="Search pharmacy supplies..." value={medSearch} onChange={(e) => setMedSearch(e.target.value)} className="w-full bg-white border-2 border-neutral-100 p-6 text-sm font-semibold outline-none focus:border-mPolyBlue shadow-2xl" />
                        {filteredMeds.length > 0 && (
                          <div className="absolute bottom-full mb-3 left-0 right-0 bg-white border-4 border-mPolyBlue shadow-[0_30px_60px_rgba(0,0,0,0.3)] z-[100] max-h-64 overflow-y-auto no-scrollbar">
                            {filteredMeds.map(m => (
                              <button key={m.id} type="button" onClick={() => { if(!prescribedMeds.find(p=>p.name===m.name)) setPrescribedMeds([...prescribedMeds, {name: m.name, units: 1}]); setMedSearch(''); }} className="w-full p-6 text-left hover:bg-slate-50 border-b-2 text-xs font-bold flex justify-between group transition-colors">
                                <span className="group-hover:text-mPolyBlue">{m.name}</span><span className="text-mPolyGreen">{m.stock} Units</span>
                              </button>
                            ))}
                          </div>
                        )}
                    </div>
                    <div className="space-y-3">
                        {prescribedMeds.map((pm, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-mPolyBlue p-5 text-white shadow-2xl animate-fade-in border-l-[12px] border-mPolyYellow">
                            <span className="text-sm font-bold">{pm.name}</span>
                            <div className="flex items-center gap-10">
                              <div className="flex items-center gap-4">
                                 <span className="text-[10px] font-bold opacity-40 uppercase">Dispense:</span>
                                 <input type="number" min="1" value={pm.units} onChange={(e) => { const nm = [...prescribedMeds]; nm[idx].units = Number(e.target.value); setPrescribedMeds(nm); }} className="w-24 bg-white/10 text-center font-bold p-3 text-sm outline-none border border-white/20" />
                              </div>
                              <button type="button" onClick={() => setPrescribedMeds(prescribedMeds.filter((_,i)=>i!==idx))} className="text-red-400 hover:text-white transition-all text-xl"><i className="fa-solid fa-trash-can"></i></button>
                            </div>
                          </div>
                        ))}
                    </div>
                 </div>

                 <div className="pt-12 border-t-4 border-neutral-50 flex gap-8">
                    <Button variant="primary" fullWidth disabled={isSaving} className="py-10 shadow-2xl flex-1 text-lg font-bold">
                       {isSaving ? 'Saving data...' : 'Commit encounter data'}
                    </Button>
                    <Button variant="outline" type="button" onClick={() => setView('list')} className="py-10 flex-1 border-4 font-bold text-lg">
                       Cancel admission
                    </Button>
                    <Button variant="outline" type="button" onClick={() => setIsReferralOpen(true)} className="py-10 flex-1 border-4 font-bold text-lg">
                       Refer Student
                    </Button>
                 </div>
              </form>
           </div>

           {isReferralOpen && (
            <div className="fixed inset-0 bg-mPolyBlue/90 z-[700] flex items-center justify-center p-4">
              <div className="bg-white max-w-lg w-full p-10 shadow-2xl border-t-8 border-mPolyYellow">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-mPolyGreen">Referral Letter</p>
                    <h3 className="text-2xl font-black uppercase text-mPolyBlue">{activeStudent.name} {activeStudent.surname}</h3>
                  </div>
                  <button onClick={() => setIsReferralOpen(false)} className="text-neutral-300 hover:text-red-600"><i className="fa-solid fa-xmark text-2xl"></i></button>
                </div>
                <div className="space-y-5">
                  <div>
                    <label className="text-[10px] font-black uppercase text-neutral-400">Recommended Doctor/Specialist</label>
                    <input value={referralSpecialist} onChange={(e) => setReferralSpecialist(e.target.value)} className="w-full bg-slate-50 border-2 border-neutral-100 p-4 text-xs font-bold outline-none focus:border-mPolyBlue" />
                  </div>
                  <div className="bg-slate-50 p-5 border-l-8 border-mPolyBlue">
                    <p className="text-[9px] font-black uppercase text-neutral-400">Diagnosis</p>
                    <p className="text-sm font-black text-mPolyBlue uppercase">{diagnosisText || 'Not entered'}</p>
                  </div>
                  <Button variant="primary" fullWidth onClick={handleCreateReferral} className="py-5">Generate Referral Letter</Button>
                </div>
              </div>
            </div>
           )}
        </div>
      )}
      {selectedReferral && (
        <ReferralReport referral={selectedReferral} onClose={() => setSelectedReferral(null)} />
      )}
    </div>
  );
};

export default StudentsTab;
