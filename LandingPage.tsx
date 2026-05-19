
import React, { useState, useEffect, useRef } from 'react';
import { Button } from './components/Button';
import { db, auth } from './lib/firebase';
import { 
  collection, query, where, getDocs, doc, setDoc, getDoc, limit 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { StaffMember } from './types';

interface LandingPageProps {
  onLogin: (role: 'student' | 'doctor' | 'admin', userData?: any) => void;
  onEmergency: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onEmergency }) => {
  const [loginMode, setLoginMode] = useState<'student' | 'doctor' | 'admin'>('student');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [staffSuggestions, setStaffSuggestions] = useState<StaffMember[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeout = useRef<any>(null);

  // Auto-seed main Admin to Auth on mount if not exists
  useEffect(() => {
    const seedAdmin = async () => {
      const email = "admin@maspoly.ac.zw";
      const pass = "maspoly";
      try {
        // First ensure record in Firestore
        const adminRef = doc(db, "staff", "admin_main");
        const adminSnap = await getDoc(adminRef);
        if (!adminSnap.exists()) {
          await setDoc(adminRef, { email, password: pass, name: "Dr. Nyoni", role: "admin", isMainAdmin: true });
        }
        // Try creating Auth account (silently fails if exists)
        await createUserWithEmailAndPassword(auth, email, pass).catch(() => {});
      } catch (e) {
        console.warn("Auth Seeding bypassed.");
      }
    };
    seedAdmin();
  }, []);

  const handleStudentSearch = (val: string) => {
    setIdentifier(val);
    setSelectedStudent(null);
    setSelectedStaff(null);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (val.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      try {
        const studentRef = collection(db, "students");
        const q = query(studentRef, limit(20));
        const snap = await getDocs(q);
        const filtered = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter((s: any) => 
            s.name.toLowerCase().includes(val.toLowerCase()) || 
            s.studentNumber.toLowerCase().includes(val.toLowerCase()) ||
            s.surname.toLowerCase().includes(val.toLowerCase())
          );
        setSuggestions(filtered);
        setShowSuggestions(filtered.length > 0);
      } catch (err) {
        console.error(err);
      }
    }, 300);
  };

  const handleSelectStudent = (student: any) => {
    setSelectedStudent(student);
    setIdentifier(`${student.name} ${student.surname}`);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleStaffSearch = (val: string) => {
    setIdentifier(val);
    setSelectedStaff(null);
    setSelectedStudent(null);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (val.length < 2) {
      setStaffSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      try {
        const staffRef = collection(db, "staff");
        const q = query(staffRef, where("role", "==", loginMode), limit(40));
        const snap = await getDocs(q);
        const filtered = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as StaffMember))
          .filter((s) => !s.isMainAdmin && s.name.toLowerCase().includes(val.toLowerCase()));
        setStaffSuggestions(filtered);
        setShowSuggestions(filtered.length > 0);
      } catch (err) {
        console.error(err);
      }
    }, 300);
  };

  const handleSelectStaff = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setIdentifier(staff.name);
    setStaffSuggestions([]);
    setShowSuggestions(false);
  };

  const handleLoginProcess = async (email: string, pass: string, role: 'student' | 'admin', firestoreData: any) => {
    try {
      // 1. Try signing in
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      onLogin(role, { ...firestoreData, uid: userCredential.user.uid });
    } catch (err: any) {
      // 2. If user not found in Auth but password matched Firestore, SEED to Auth now
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
          onLogin(role, { ...firestoreData, uid: userCredential.user.uid });
        } catch (createErr: any) {
          setError("Auth Synchronization Failed: " + createErr.message);
        }
      } else {
        setError("Security Verification Failed: " + err.message);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (loginMode === 'student') {
        if (!selectedStudent) {
          setError("Select your record from the clinical registry list.");
          setIsSubmitting(false);
          return;
        }
        if (selectedStudent.password !== password) {
          setError("Clinical verification password incorrect.");
          setIsSubmitting(false);
          return;
        }
        setSuccessMsg(`Accessing Dashboard: ${selectedStudent.name}`);
        const email = `${selectedStudent.studentNumber.replace(/[^a-zA-Z0-9]/g, '')}@maspoly.ac.zw`.toLowerCase();
        await handleLoginProcess(email, password, 'student', selectedStudent);
      } else if (loginMode === 'doctor') {
        if (!selectedStaff) {
          setError("Select your doctor profile before entering your password.");
          setIsSubmitting(false);
          return;
        }
        if (selectedStaff.password !== password) {
          setError("Doctor password incorrect.");
          setIsSubmitting(false);
          return;
        }
        setSuccessMsg(`Accessing Doctor Queue: ${selectedStaff.name}`);
        onLogin('doctor', selectedStaff);
      } else {
        if (selectedStaff) {
          if (selectedStaff.pin !== password) {
            setError("Admin PIN incorrect.");
            setIsSubmitting(false);
            return;
          }
          setSuccessMsg(`Administrator Authenticated: ${selectedStaff.name}`);
          onLogin('admin', selectedStaff);
          return;
        }

        const adminRef = doc(db, "staff", "admin_main");
        const snap = await getDoc(adminRef);
        const adminData = snap.data();
        if (snap.exists() && adminData.password === password) {
          setSuccessMsg("Administrator Authenticated");
          await handleLoginProcess("admin@maspoly.ac.zw", password, 'admin', { id: snap.id, ...adminData });
        } else {
          setError("Select an admin profile and enter its PIN, or enter the main admin password.");
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 landing-bg overflow-hidden min-h-screen">
      <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[500] pointer-events-none transition-all duration-700 ease-in-out ${successMsg ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-20 opacity-0 scale-75'}`}>
        <div className="bg-black text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-4 border border-white/10 min-w-[320px]">
           <div className="w-10 h-10 bg-mPolyGreen rounded-full flex items-center justify-center shrink-0">
             <i className="fa-solid fa-shield-check text-sm"></i>
           </div>
           <div className="flex flex-col">
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 leading-none mb-1">Authenticated</span>
             <span className="text-xs font-bold uppercase truncate max-w-[200px]">{successMsg}</span>
           </div>
        </div>
      </div>

      <div className="max-w-xl w-full text-center space-y-8 relative z-10 animate-fade-in">
        <div className="space-y-6">
          <div className="w-24 h-24 lg:w-32 lg:h-32 bg-white rounded-full mx-auto flex items-center justify-center shadow-2xl border-4 border-mPolyBlue mb-6 overflow-hidden">
             <img src="https://i.ibb.co/B5GMcb9z/Gemini-Generated-Image-mmtbiymmtbiymmtb-removebg-preview.png" alt="Logo" className="w-16 lg:w-20" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl lg:text-5xl font-black uppercase tracking-tighter font-heading text-white leading-none">Masvingo Poly</h1>
            <h2 className="text-mPolyYellow text-2xl lg:text-5xl font-black uppercase tracking-tighter font-heading leading-none">Clinical Portal</h2>
          </div>
        </div>

        <div className="bg-mPolyBlue/95 backdrop-blur-2xl border border-white/10 p-8 lg:p-12 shadow-2xl relative">
          <div className="flex justify-center gap-8 border-b border-white/10 pb-8 mb-8">
             {(['student', 'doctor', 'admin'] as const).map(mode => (
               <button 
                 key={mode}
                 type="button"
                 onClick={() => { setLoginMode(mode); setIdentifier(''); setPassword(''); setError(''); setSelectedStudent(null); setSelectedStaff(null); setSuggestions([]); setStaffSuggestions([]); setShowSuggestions(false); }} 
                 className={`text-[10px] font-black uppercase tracking-[0.3em] pb-3 border-b-4 transition-all ${loginMode === mode ? 'text-mPolyYellow border-mPolyYellow' : 'text-white/30 border-transparent'}`}
               >
                 {mode}
               </button>
             ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-8 text-left">
             {loginMode === 'student' && (
               <div className="space-y-2 relative">
                  <label className="text-[9px] font-black text-mPolyYellow uppercase tracking-[0.2em]">Identification</label>
                  <div className="relative">
                    <input required type="text" autoComplete="off" value={identifier} onChange={(e) => handleStudentSearch(e.target.value)} placeholder="ENTER NAME OR ID..." className="w-full bg-white/5 border-2 border-white/10 p-5 text-white text-xs outline-none focus:border-mPolyYellow transition-all font-bold placeholder:text-white/10" />
                    {showSuggestions && (
                      <div className="absolute top-full left-0 right-0 bg-white shadow-2xl z-[50] mt-2 border-t-8 border-mPolyYellow max-h-56 overflow-y-auto no-scrollbar">
                         {suggestions.map((s) => (
                           <button key={s.id} type="button" onClick={() => handleSelectStudent(s)} className="w-full p-5 text-left hover:bg-neutral-50 border-b border-neutral-100 flex items-center justify-between group">
                              <div>
                                <p className="text-[11px] font-black text-neutral-900 uppercase group-hover:text-mPolyBlue transition-colors">{s.name} {s.surname}</p>
                                <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest">{s.studentNumber}</p>
                              </div>
                              <i className="fa-solid fa-arrow-right text-[10px] text-neutral-200 group-hover:text-mPolyBlue transition-all"></i>
                           </button>
                         ))}
                      </div>
                    )}
                  </div>
               </div>
             )}

             {loginMode !== 'student' && (
               <div className="space-y-2 relative">
                  <label className="text-[9px] font-black text-mPolyYellow uppercase tracking-[0.2em]">
                    {loginMode === 'doctor' ? 'Doctor Name' : 'Admin Name'}
                  </label>
                  <div className="relative">
                    <input 
                      type="text" 
                      autoComplete="off" 
                      value={identifier} 
                      onChange={(e) => handleStaffSearch(e.target.value)} 
                      placeholder={loginMode === 'admin' ? 'SEARCH ADMIN NAME OR LEAVE BLANK FOR MAIN ADMIN...' : 'SEARCH DOCTOR NAME...'} 
                      className="w-full bg-white/5 border-2 border-white/10 p-5 text-white text-xs outline-none focus:border-mPolyYellow transition-all font-bold placeholder:text-white/10" 
                    />
                    {showSuggestions && staffSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 bg-white shadow-2xl z-[50] mt-2 border-t-8 border-mPolyYellow max-h-56 overflow-y-auto no-scrollbar">
                         {staffSuggestions.map((s) => (
                           <button key={s.id} type="button" onClick={() => handleSelectStaff(s)} className="w-full p-5 text-left hover:bg-neutral-50 border-b border-neutral-100 flex items-center justify-between group">
                              <div>
                                <p className="text-[11px] font-black text-neutral-900 uppercase group-hover:text-mPolyBlue transition-colors">{s.name}</p>
                                <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest">{s.role}</p>
                              </div>
                              <i className="fa-solid fa-arrow-right text-[10px] text-neutral-200 group-hover:text-mPolyBlue transition-all"></i>
                           </button>
                         ))}
                      </div>
                    )}
                  </div>
                  {loginMode === 'admin' && (
                    <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Main admin can enter the master password without selecting a name.</p>
                  )}
               </div>
             )}

             <div className="space-y-2">
                <label className="text-[9px] font-black text-mPolyYellow uppercase tracking-[0.2em]">
                  {loginMode === 'student' ? 'Verification Password' : loginMode === 'doctor' ? 'Doctor Password' : 'Admin PIN or Main Password'}
                </label>
                <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-white/5 border-2 border-white/10 p-5 text-white text-xs outline-none focus:border-mPolyYellow transition-all font-bold" />
             </div>

             {error && <p className="bg-red-500/10 border-l-4 border-red-500 p-4 text-red-400 text-[9px] font-black uppercase tracking-widest animate-pulse">{error}</p>}
             
             <Button type="submit" variant="secondary" fullWidth disabled={isSubmitting} className="py-6 font-black text-xs tracking-[0.3em]">
               {isSubmitting ? 'VERIFYING SECURITY...' : 'ACCESS PORTAL'}
             </Button>
          </form>
          
          <div className="relative py-4 flex items-center gap-6">
             <div className="flex-1 h-px bg-white/10"></div>
             <span className="text-[8px] font-black uppercase text-white/20 tracking-widest">Protocol Bypass</span>
             <div className="flex-1 h-px bg-white/10"></div>
          </div>

          <Button variant="danger" fullWidth onClick={onEmergency} className="py-5 text-[11px] font-black border-none shadow-2xl tracking-[0.2em]">
            🚨 EMERGENCY CRISIS SYSTEM
          </Button>
        </div>

        <p className="text-[10px] text-white/30 font-black uppercase tracking-[0.4em]">ISO 9001:2015 • CLINICAL UNIT • &copy; 2026</p>
      </div>
    </div>
  );
};

export default LandingPage;
