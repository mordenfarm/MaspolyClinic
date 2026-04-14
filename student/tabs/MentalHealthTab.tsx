
import React, { useState } from 'react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import Icon from '../../components/Icon';

const MentalHealthTab: React.FC = () => {
  const [mood, setMood] = useState<string | null>(null);
  const [showPrivacyNotice, setShowPrivacyNotice] = useState(true);

  const moods = [
    { label: 'Great', icon: 'excellent', color: 'text-green-500', bg: 'bg-green-50' },
    { label: 'Good', icon: 'good', color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Okay', icon: 'okay', color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: 'Low', icon: 'unwell', color: 'text-orange-500', bg: 'bg-orange-50' },
    { label: 'Crisis', icon: 'stressed', color: 'text-red-600', bg: 'bg-red-50' }
  ];

  return (
    <div className="space-y-6 lg:space-y-8 pb-10">
      {/* Header Section - Slide Left */}
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 animate-slide-left">
        <div className="space-y-1">
          <p className="text-[8px] lg:text-[10px] font-black text-mPolyGreen uppercase tracking-[0.3em]">Confidential Support</p>
          <h1 className="text-2xl lg:text-4xl font-heading font-black uppercase tracking-tighter text-neutral-900 leading-none">
            Mental Wellness <span className="text-mPolyGreen">Hub</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 bg-mPolyBlue/5 px-3 py-2 border border-mPolyBlue/10">
          <div className="w-2 h-2 bg-mPolyGreen rounded-full animate-pulse"></div>
          <span className="text-[9px] font-black uppercase text-mPolyBlue tracking-widest">Counselors Online Now</span>
        </div>
      </header>

      {/* Privacy Banner - Slide Right */}
      {showPrivacyNotice && (
        <div className="bg-mPolyBlue p-4 lg:p-6 text-white flex justify-between items-center card-shadow animate-slide-right relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-full bg-white/5 skew-x-12 translate-x-16"></div>
           <div className="flex items-center gap-4 relative z-10">
             <div className="w-10 h-10 lg:w-12 lg:h-12 bg-white/10 flex items-center justify-center shrink-0">
               <i className="fa-solid fa-user-shield text-mPolyYellow lg:text-xl"></i>
             </div>
             <div>
               <p className="text-[10px] lg:text-xs font-bold leading-relaxed uppercase opacity-80">
                 FERPA & HIPAA Compliant. Your mental health data is kept strictly separate from academic records.
               </p>
             </div>
           </div>
           <button onClick={() => setShowPrivacyNotice(false)} className="text-white/40 hover:text-white transition-colors relative z-10">
             <i className="fa-solid fa-xmark"></i>
           </button>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mood Tracker - Slide Left */}
        <div className="lg:col-span-2 space-y-6 animate-slide-left">
          <Card title="Daily Mood Check-in">
            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mb-6">How are you feeling today, Tapiwa?</p>
            <div className="grid grid-cols-5 gap-2 lg:gap-4">
              {moods.map((m) => (
                <button 
                  key={m.label}
                  onClick={() => setMood(m.label)}
                  className={`flex flex-col items-center gap-3 p-4 lg:p-6 transition-all group border-2 ${mood === m.label ? 'bg-white border-mPolyBlue shadow-xl scale-105' : 'bg-neutral-50 border-transparent hover:border-neutral-200'}`}
                >
                  <Icon name={m.icon} className={`w-8 h-8 lg:w-12 lg:h-12 transition-transform group-hover:scale-110 ${m.color}`} />
                  <span className={`text-[8px] lg:text-[10px] font-black uppercase tracking-tighter ${mood === m.label ? 'text-mPolyBlue' : 'text-neutral-400'}`}>
                    {m.label}
                  </span>
                </button>
              ))}
            </div>

            {mood === 'Crisis' && (
              <div className="mt-8 bg-red-600 p-6 text-white card-shadow animate-fade-in relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <i className="fa-solid fa-triangle-exclamation text-7xl"></i>
                </div>
                <div className="relative z-10">
                  <h4 className="text-lg font-black uppercase tracking-tighter mb-2">Immediate Support Available</h4>
                  <p className="text-xs font-bold uppercase opacity-80 mb-6 leading-relaxed max-w-lg">
                    If you are experiencing a mental health crisis, please use our 24/7 priority line. You are not alone.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button variant="secondary" className="bg-white text-red-600 border-none py-4 text-[11px]">
                      CALL ON-CALL COUNSELOR
                    </Button>
                    <Button variant="outline" className="border-white text-white hover:bg-white/10 py-4 text-[11px]">
                      ACTIVATE CRISIS MODE
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Journal Section */}
          <Card title="Digital Mood Journal">
            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mb-4">Reflect on your thoughts (Private)</p>
            <textarea 
              className="w-full bg-neutral-50 border-2 border-neutral-100 p-4 text-xs lg:text-sm font-medium focus:border-mPolyBlue focus:bg-white outline-none transition-all h-32 placeholder:text-neutral-300"
              placeholder="What's on your mind today?"
            ></textarea>
            <div className="mt-4 flex justify-end">
              <Button variant="outline" className="text-[9px] py-2">Save Entry</Button>
            </div>
          </Card>
        </div>

        {/* Sidebar Actions - Slide Right */}
        <div className="lg:col-span-1 space-y-6 animate-slide-right">
          {/* Appointment Card */}
          <div className="bg-mPolyBlue p-6 text-white card-shadow flex flex-col justify-between min-h-[220px]">
             <div>
                <p className="text-[8px] font-black uppercase tracking-widest text-mPolyGreen mb-2">Next Counseling</p>
                <h4 className="text-xl lg:text-2xl font-black uppercase tracking-tighter leading-none mb-1">Thur, Oct 12</h4>
                <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">10:00 AM • Room 4B, Health Unit</p>
             </div>
             <div className="space-y-2 mt-8">
                <Button variant="secondary" fullWidth className="text-[9px] py-3">Reschedule</Button>
                <button className="w-full py-3 text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors">Cancel Session</button>
             </div>
          </div>

          {/* Resources */}
          <Card title="Support Resources">
            <div className="space-y-2">
              {[
                { title: 'Exam Stress', icon: 'fa-book-open', color: 'bg-blue-500' },
                { title: 'Sleep Hygiene', icon: 'fa-moon', color: 'bg-indigo-600' },
                { title: 'Social Anxiety', icon: 'fa-users', color: 'bg-green-600' },
                { title: 'Substance Help', icon: 'fa-pills', color: 'bg-orange-600' }
              ].map((res, i) => (
                <button key={i} className="w-full flex items-center gap-3 p-3 bg-neutral-50 border border-neutral-100 hover:bg-white hover:border-mPolyBlue transition-all group">
                  <div className={`w-8 h-8 ${res.color} text-white flex items-center justify-center shrink-0`}>
                    <i className={`fa-solid ${res.icon} text-xs`}></i>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-tight text-neutral-600 group-hover:text-mPolyBlue">
                    {res.title}
                  </span>
                  <i className="fa-solid fa-chevron-right ml-auto text-[10px] text-neutral-300 group-hover:translate-x-1 transition-transform"></i>
                </button>
              ))}
            </div>
            <Button variant="outline" fullWidth className="mt-6 text-[8px] py-2.5">Browse All Articles</Button>
          </Card>
        </div>
      </div>

      {/* Wellness Streak - Position 6 (Right - Even) */}
      <div className="bg-mPolyYellow p-6 lg:p-8 text-mPolyBlue flex flex-col lg:flex-row items-center justify-between gap-6 card-shadow animate-slide-right">
        <div className="flex items-center gap-6">
          <div className="text-5xl lg:text-7xl font-black font-heading leading-none">05</div>
          <div>
            <h4 className="text-lg lg:text-2xl font-black uppercase tracking-tighter leading-none">Day Streak</h4>
            <p className="text-[10px] lg:text-xs font-bold uppercase tracking-widest opacity-60">Consecutive Wellness Check-ins</p>
          </div>
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map(day => (
            <div key={day} className={`w-8 h-8 lg:w-10 lg:h-10 flex items-center justify-center font-black text-xs ${day <= 5 ? 'bg-mPolyBlue text-white' : 'bg-white/30 text-mPolyBlue/30'}`}>
              {day}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MentalHealthTab;
