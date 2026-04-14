
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

interface MessagingTabProps {
  user?: any;
}

const MessagingTab: React.FC<MessagingTabProps> = ({ user }) => {
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [staffList, setStaffList] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch Staff with 'admin' role specifically
  useEffect(() => {
    const q = query(collection(db, "staff"), where("role", "==", "admin"));
    
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setStaffList(list);
      // Automatically select the primary admin if nothing selected
      if (list.length > 0 && !selectedStaffId) {
        setSelectedStaffId(list[0].id);
      }
    }, (err) => {
      console.error("Staff Registry Sync Error:", err);
      setError("Clinical staff registry is currently unavailable.");
    });
    return () => unsub();
  }, [selectedStaffId]);

  // 2. Fetch Messages for selected conversation using participants array
  useEffect(() => {
    if (!user?.studentNumber || !selectedStaffId) return;

    const chatId = [user.studentNumber, selectedStaffId].sort().join('_');
    
    const q = query(
      collection(db, "messages"),
      where("chatId", "==", chatId)
    );

    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a: any, b: any) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0));
      setMessages(msgs);
      setError(null);
    }, (err) => {
      console.error("Message Sync Error:", err);
      setError("Secure communication channel disrupted. Retrying...");
    });

    return () => unsub();
  }, [user, selectedStaffId]);

  // 3. Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || !user?.studentNumber || !selectedStaffId || isSending) return;

    setIsSending(true);
    setError(null);
    
    const chatId = [user.studentNumber, selectedStaffId].sort().join('_');
    const msgData = {
      chatId,
      participants: [user.studentNumber, selectedStaffId],
      senderId: user.studentNumber,
      senderName: `${user.name} ${user.surname}`,
      receiverId: selectedStaffId,
      content: trimmedInput,
      timestamp: serverTimestamp(),
      isFromStaff: false,
      status: 'unread'
    };

    try {
      await addDoc(collection(db, "messages"), msgData);
      setInput('');
    } catch (err: any) {
      console.error("Transmission Error:", err);
      if (err.code === 'permission-denied') {
        setError("Security Violation: You do not have permission to send messages.");
      } else if (err.code === 'unavailable') {
        setError("Network Error: Cloud services are currently unreachable.");
      } else {
        setError(`System Error: ${err.message || 'Failed to dispatch message.'}`);
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const selectedStaff = useMemo(() => staffList.find(s => s.id === selectedStaffId), [staffList, selectedStaffId]);

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] lg:h-[calc(100vh-120px)] animate-fade-in bg-white">
      {/* Staff Selection Header */}
      <section className="bg-slate-50 border-b border-neutral-100 pb-4 shrink-0 px-4 pt-4">
        <p className="text-[9px] font-black uppercase text-neutral-400 tracking-[0.2em] mb-3">Target Clinical Officer</p>
        <div className="flex gap-6 overflow-x-auto no-scrollbar py-2">
          {staffList.length > 0 ? staffList.map(staff => (
            <button
              key={staff.id}
              onClick={() => setSelectedStaffId(staff.id)}
              className={`flex flex-col items-center min-w-[80px] group transition-all`}
            >
              <div className={`relative w-14 h-14 lg:w-16 lg:h-16 rounded-full p-1 border-2 mb-2 transition-all ${selectedStaffId === staff.id ? 'border-mPolyYellow shadow-lg scale-105' : 'border-transparent group-hover:border-neutral-200'}`}>
                <img 
                  src={`https://ui-avatars.com/api/?name=${staff.name}&background=163959&color=fff&bold=true`} 
                  className="w-full h-full rounded-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all" 
                  alt={staff.name} 
                />
                <div className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 border-2 border-white rounded-full flex items-center justify-center ${selectedStaffId === staff.id ? 'bg-mPolyGreen' : 'bg-neutral-200'}`}>
                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                </div>
              </div>
              <span className={`text-[10px] font-black uppercase tracking-tight transition-colors ${selectedStaffId === staff.id ? 'text-mPolyBlue' : 'text-neutral-400'}`}>
                {staff.name}
              </span>
            </button>
          )) : (
            <div className="flex items-center gap-3 opacity-30 p-4">
              <i className="fa-solid fa-spinner fa-spin text-mPolyBlue"></i>
              <p className="text-[10px] font-bold text-neutral-400 uppercase">Synchronizing Admin Registry...</p>
            </div>
          )}
        </div>
      </section>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-600 text-white p-3 text-center animate-fade-in shrink-0">
          <p className="text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3">
            <i className="fa-solid fa-triangle-exclamation"></i> {error}
          </p>
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-white space-y-6 p-6 no-scrollbar relative">
        <div className="absolute inset-0 pointer-events-none opacity-[0.02]" style={{backgroundImage: 'radial-gradient(#163959 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
        
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-neutral-300 space-y-3 opacity-40">
            <i className="fa-solid fa-paper-plane text-5xl mb-2 text-mPolyBlue"></i>
            <h4 className="text-xl font-black uppercase tracking-tighter text-neutral-900">Official Channel</h4>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-center max-w-xs leading-relaxed">
              Start a verified clinical conversation with {selectedStaff?.name || 'Administrator'}.
            </p>
          </div>
        ) : (
          messages.map((m) => (
            <div 
              key={m.id} 
              className={`flex ${m.senderId === selectedStaffId ? 'justify-start' : 'justify-end'} animate-fade-in`}
            >
              <div className={`max-w-[85%] lg:max-w-[70%] p-5 shadow-sm relative group border-l-4 ${m.senderId === selectedStaffId ? 'bg-slate-50 border-mPolyBlue text-neutral-900' : 'bg-mPolyBlue border-mPolyYellow text-white shadow-xl'}`}>
                {m.senderId === selectedStaffId && (
                  <p className="text-[9px] font-black uppercase mb-2 text-mPolyBlue tracking-widest">{selectedStaff?.name}</p>
                )}
                <p className="text-xs lg:text-sm leading-relaxed font-semibold whitespace-pre-wrap">{m.content}</p>
                <div className="flex items-center justify-end gap-2 mt-3 opacity-40">
                  <p className="text-[8px] lg:text-[9px] font-black uppercase tracking-widest">
                    {m.timestamp?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'Pending...'}
                  </p>
                  {m.senderId === user.studentNumber && (
                    <i className={`fa-solid fa-check-double text-[8px] ${m.status === 'read' ? 'text-mPolyYellow' : ''}`}></i>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-white p-4 lg:p-6 border-t border-neutral-100 shrink-0">
        <div className="flex items-center gap-3 p-1.5 bg-neutral-100 border-2 border-neutral-200 focus-within:border-mPolyBlue transition-all shadow-inner">
          <input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={`Message ${selectedStaff?.name || 'Authorized Admin'}...`} 
            className="flex-1 bg-transparent px-3 py-4 outline-none text-xs lg:text-sm font-black uppercase placeholder:text-neutral-400 placeholder:normal-case"
            disabled={isSending}
          />
          <button 
            onClick={sendMessage}
            disabled={!input.trim() || isSending || !selectedStaffId}
            className={`w-12 h-12 flex items-center justify-center transition-all shrink-0 shadow-lg ${input.trim() && !isSending && selectedStaffId ? 'bg-mPolyBlue text-white hover:bg-mPolyGreen active:scale-95' : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'}`}
          >
            {isSending ? (
              <i className="fa-solid fa-circle-notch fa-spin"></i>
            ) : (
              <i className="fa-solid fa-paper-plane"></i>
            )}
          </button>
        </div>
        <p className="text-[8px] font-black text-neutral-300 uppercase tracking-widest mt-3 text-center">Institutional Data Governance Protocol Active</p>
      </div>
    </div>
  );
};

export default MessagingTab;
