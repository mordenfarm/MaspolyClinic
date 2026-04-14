
import React, { useState, useEffect } from 'react';
import { Button } from './components/Button';
import { Card } from './components/Card';
import { db } from './lib/firebase';
import { addDoc, collection, doc, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

interface EmergencyViewProps {
  onBack: () => void;
}

const EmergencyView: React.FC<EmergencyViewProps> = ({ onBack }) => {
  const [crisisType, setCrisisType] = useState<'physical' | 'mental' | null>(null);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [isAlertActive, setIsAlertActive] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [hospitalNumber, setHospitalNumber] = useState('+26339123456');
  const [isSending, setIsSending] = useState(false);

  const locations = [
    'Commerce Block',
    'Mechanic Block',
    'Electricals Block',
    'Automotive Block',
    'Hostel HB1',
    'HB2',
    'HB3',
    'HB4',
    'HB5',
    'HB6',
    'HB7',
    'Guest House',
    'Dining Hall',
    'Car Park',
    'Gate',
    'Admin Block',
    'Library',
    'Tuck Shop'
  ];

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "emergency"), (snap) => {
      const data = snap.data();
      if (data?.hospitalNumber) setHospitalNumber(data.hospitalNumber);
    });
    return () => unsub();
  }, []);

  // Simulated "Staff Response" Timer
  useEffect(() => {
    let interval: any;
    if (isAlertActive && countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isAlertActive, countdown]);

  const handleActivateAlert = async (type: 'physical' | 'mental') => {
    if (!selectedLocation) {
      alert("Select where you are on campus first.");
      return;
    }

    setIsSending(true);
    setCrisisType(type);
    try {
      await addDoc(collection(db, "emergencies"), {
        type,
        location: selectedLocation,
        status: 'active',
        timestamp: serverTimestamp()
      });
      setIsAlertActive(true);
    } catch (err) {
      console.error(err);
      alert("Failed to send emergency alert. Please call the hospital immediately.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className={`flex-1 min-h-screen transition-colors duration-500 overflow-y-auto ${isAlertActive ? 'bg-red-600' : 'bg-slate-50'}`}>
      
      {/* Top Warning Banner */}
      {!isAlertActive && (
        <div className="bg-red-600 p-4 lg:p-6 text-white text-center animate-pulse">
          <p className="text-xs lg:text-sm font-black uppercase tracking-[0.3em]">
            ⚠️ High-Priority Emergency Interface
          </p>
        </div>
      )}

      <div className="max-w-4xl mx-auto p-4 lg:p-12 space-y-8">
        
        {/* Navigation / Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 flex items-center justify-center border-2 ${isAlertActive ? 'bg-white text-red-600 border-white' : 'bg-red-600 text-white border-red-600'}`}>
              <i className="fa-solid fa-triangle-exclamation text-xl"></i>
            </div>
            <div>
              <h2 className={`text-xl lg:text-3xl font-black uppercase tracking-tighter leading-none ${isAlertActive ? 'text-white' : 'text-red-600'}`}>
                Crisis <span className={isAlertActive ? 'text-white' : 'text-neutral-900'}>Response</span>
              </h2>
            <p className={`text-[8px] font-black uppercase tracking-widest mt-1 ${isAlertActive ? 'text-white/60' : 'text-neutral-400'}`}>
                {selectedLocation || 'Masvingo Poly Clinical Unit'}
              </p>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={onBack}
            className={`${isAlertActive ? 'border-white text-white hover:bg-white/10' : 'border-neutral-200 text-neutral-400'} py-2 px-6`}
          >
            {isAlertActive ? 'Back to Login' : 'Cancel'}
          </Button>
        </div>

        {!isAlertActive ? (
          /* INITIAL TRIAGE VIEW */
          <div className="space-y-8 animate-fade-in">
            <div className="text-center space-y-4 py-8">
              <h3 className="text-3xl lg:text-5xl font-black uppercase tracking-tighter text-neutral-900 leading-none">
                Where is the <span className="text-red-600">Emergency</span>?
              </h3>
              <p className="text-xs lg:text-sm font-bold text-neutral-400 uppercase tracking-widest max-w-lg mx-auto leading-relaxed">
                Select your campus location, then choose the crisis type to alert clinic staff immediately.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {locations.map(location => (
                <button
                  key={location}
                  type="button"
                  onClick={() => setSelectedLocation(location)}
                  className={`p-4 border-2 text-[10px] font-black uppercase transition-all min-h-16 ${selectedLocation === location ? 'bg-red-600 border-red-600 text-white shadow-xl' : 'bg-white border-neutral-100 text-neutral-500 hover:border-red-600'}`}
                >
                  {location}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Physical Crisis */}
              <button 
                disabled={isSending}
                onClick={() => handleActivateAlert('physical')}
                className="bg-white p-8 lg:p-12 border-2 border-neutral-100 hover:border-red-600 hover:shadow-2xl transition-all group flex flex-col items-center text-center space-y-6"
              >
                <div className="w-20 h-20 bg-red-100 text-red-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                   <i className="fa-solid fa-truck-medical text-3xl"></i>
                </div>
                <div>
                   <h4 className="text-2xl font-black uppercase tracking-tighter text-neutral-900 mb-2">Severe Physical Injury</h4>
                   <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest leading-relaxed">
                     Trauma, Heavy Bleeding, Difficulty Breathing, or Unconsciousness.
                   </p>
                </div>
                <div className="w-full h-1.5 bg-neutral-100 group-hover:bg-red-600/20 mt-4 overflow-hidden">
                   <div className="w-0 group-hover:w-full h-full bg-red-600 transition-all duration-700"></div>
                </div>
                <span className="text-[10px] font-black text-red-600 uppercase tracking-widest opacity-0 group-hover:opacity-100">Activate Immediate Dispatch</span>
              </button>

              {/* Mental Crisis */}
              <button 
                disabled={isSending}
                onClick={() => handleActivateAlert('mental')}
                className="bg-white p-8 lg:p-12 border-2 border-neutral-100 hover:border-mPolyBlue hover:shadow-2xl transition-all group flex flex-col items-center text-center space-y-6"
              >
                <div className="w-20 h-20 bg-blue-100 text-mPolyBlue flex items-center justify-center group-hover:scale-110 transition-transform">
                   <i className="fa-solid fa-brain text-3xl"></i>
                </div>
                <div>
                   <h4 className="text-2xl font-black uppercase tracking-tighter text-neutral-900 mb-2">Mental Health Crisis</h4>
                   <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest leading-relaxed">
                     Panic Attacks, Severe Distress, Suicidal Ideation, or Hallucinations.
                   </p>
                </div>
                <div className="w-full h-1.5 bg-neutral-100 group-hover:bg-mPolyBlue/20 mt-4 overflow-hidden">
                   <div className="w-0 group-hover:w-full h-full bg-mPolyBlue transition-all duration-700"></div>
                </div>
                <span className="text-[10px] font-black text-mPolyBlue uppercase tracking-widest opacity-0 group-hover:opacity-100">Contact Counseling Team</span>
              </button>
            </div>

            {/* Direct Dial Grid */}
            <div className="pt-12 border-t border-neutral-200">
               <p className="text-center text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-8">Quick Dial Links</p>
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <a href={`tel:${hospitalNumber}`} className="flex items-center gap-4 p-4 bg-white border border-neutral-100 shadow-sm hover:border-red-600 transition-colors">
                     <div className="w-10 h-10 bg-red-600 text-white flex items-center justify-center"><i className="fa-solid fa-phone"></i></div>
                     <div><p className="text-[8px] font-black text-neutral-400 uppercase">Call Hospital</p><p className="text-xs font-black">{hospitalNumber}</p></div>
                  </a>
                  <a href="tel:+26339111222" className="flex items-center gap-4 p-4 bg-white border border-neutral-100 shadow-sm hover:border-neutral-900 transition-colors">
                     <div className="w-10 h-10 bg-neutral-900 text-white flex items-center justify-center"><i className="fa-solid fa-shield-halved"></i></div>
                     <div><p className="text-[8px] font-black text-neutral-400 uppercase">Campus Security</p><p className="text-xs font-black">039 111 222</p></div>
                  </a>
                  <a href="tel:+26339654321" className="flex items-center gap-4 p-4 bg-white border border-neutral-100 shadow-sm hover:border-mPolyBlue transition-colors">
                     <div className="w-10 h-10 bg-mPolyBlue text-white flex items-center justify-center"><i className="fa-solid fa-comments"></i></div>
                     <div><p className="text-[8px] font-black text-neutral-400 uppercase">Counseling Hub</p><p className="text-xs font-black">039 654 321</p></div>
                  </a>
               </div>
            </div>
          </div>
        ) : (
          /* ACTIVE ALERT VIEW */
          <div className="space-y-8 animate-fade-in pb-20">
            
            {/* Dispatch Status */}
            <Card className="bg-white/10 border-white/20 text-white p-8 lg:p-12 border-l-[16px] border-l-mPolyYellow">
               <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
                  <div className="space-y-2">
                     <p className="text-[10px] font-black uppercase tracking-[0.4em] text-mPolyYellow">Alert Transmitted</p>
                     <h3 className="text-4xl lg:text-6xl font-black uppercase tracking-tighter">Help is <span className="text-mPolyYellow">Coming</span></h3>
                     <p className="text-sm font-bold opacity-80 uppercase leading-relaxed max-w-md">
                       Clinic staff have received your campus location: {selectedLocation}.
                     </p>
                  </div>
                  <div className="w-full lg:w-48 h-48 bg-white/5 border-2 border-white/10 flex flex-col items-center justify-center text-center p-6 relative">
                     <div className="absolute inset-0 bg-mPolyYellow/10 animate-ping"></div>
                     <span className="text-[8px] font-black uppercase mb-2 opacity-60">Est. Response</span>
                     <span className="text-5xl font-black text-mPolyYellow">{countdown > 0 ? `0${countdown}` : 'NOW'}</span>
                     <span className="text-[8px] font-black uppercase mt-2 opacity-60">Minutes</span>
                  </div>
               </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               {/* Situation Specific Instructions */}
               <Card className="bg-white border-none p-8 space-y-6">
                  <h4 className="text-xl font-black uppercase tracking-tighter text-red-600 border-b border-neutral-100 pb-4">
                     {crisisType === 'physical' ? 'Immediate First Aid' : 'Crisis Stabilization'}
                  </h4>
                  <ul className="space-y-4">
                     {crisisType === 'physical' ? (
                       <>
                         <li className="flex gap-4 items-start"><span className="w-6 h-6 bg-red-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">1</span><p className="text-[11px] font-bold uppercase text-neutral-700">Apply direct pressure to any bleeding wounds with clean cloth.</p></li>
                         <li className="flex gap-4 items-start"><span className="w-6 h-6 bg-red-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">2</span><p className="text-[11px] font-bold uppercase text-neutral-700">If choking, stand behind and perform abdominal thrusts.</p></li>
                         <li className="flex gap-4 items-start"><span className="w-6 h-6 bg-red-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">3</span><p className="text-[11px] font-bold uppercase text-neutral-700">Keep the victim warm and lying down if in shock.</p></li>
                       </>
                     ) : (
                       <>
                         <li className="flex gap-4 items-start"><span className="w-6 h-6 bg-mPolyBlue text-white flex items-center justify-center text-[10px] font-black shrink-0">1</span><p className="text-[11px] font-bold uppercase text-neutral-700">Try the 4-7-8 Breathing Technique: In for 4, Hold for 7, Out for 8.</p></li>
                         <li className="flex gap-4 items-start"><span className="w-6 h-6 bg-mPolyBlue text-white flex items-center justify-center text-[10px] font-black shrink-0">2</span><p className="text-[11px] font-bold uppercase text-neutral-700">Focus on 5 things you can see, 4 you can touch, 3 you can hear.</p></li>
                         <li className="flex gap-4 items-start"><span className="w-6 h-6 bg-mPolyBlue text-white flex items-center justify-center text-[10px] font-black shrink-0">3</span><p className="text-[11px] font-bold uppercase text-neutral-700">Stay where you are. A counselor is being diverted to your location.</p></li>
                       </>
                     )}
                  </ul>
               </Card>

               {/* Emergency Contacts */}
               <Card title="Emergency Dispatch Info" className="bg-neutral-900 border-none text-white">
                  <div className="space-y-6">
                     <div className="p-4 bg-white/5 border border-white/10">
                        <p className="text-[8px] font-black text-white/40 uppercase mb-1">Your ID Transmission</p>
                        <p className="text-sm font-black text-mPolyYellow">{selectedLocation}</p>
                     </div>
                     <div className="p-4 bg-white/5 border border-white/10">
                        <p className="text-[8px] font-black text-white/40 uppercase mb-1">Clinic Duty Officer</p>
                        <p className="text-sm font-black">SISTER SHUMBA (EXT. 441)</p>
                     </div>
                     <div className="pt-4 space-y-3">
                        <a href={`tel:${hospitalNumber}`} className="px-8 py-4 font-bold transition-all duration-300 text-[11px] flex items-center justify-center gap-2 w-full bg-white text-red-600 border-none shadow-lg shadow-red-600/20">
                           <i className="fa-solid fa-phone-volume mr-2"></i> CALL CLINIC NOW
                        </a>
                        <Button variant="outline" fullWidth className="py-4 text-[11px] border-white/20 text-white hover:bg-white/10">
                           <i className="fa-solid fa-location-dot mr-2"></i> UPDATE MY LOCATION
                        </Button>
                     </div>
                  </div>
               </Card>
            </div>

            {/* Reassurance Footer */}
            <div className="text-center p-8 border-2 border-white/10 bg-white/5 animate-pulse">
               <p className="text-lg lg:text-2xl font-black uppercase text-white tracking-tighter">Remain Calm. Do Not Close This Page.</p>
               <p className="text-[10px] font-bold text-white/60 uppercase mt-2 tracking-widest">Help is currently 1.2km away from your position.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmergencyView;
