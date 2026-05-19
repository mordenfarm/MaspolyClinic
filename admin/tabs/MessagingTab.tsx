import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, writeBatch } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const AdminMessagingTab: React.FC = () => {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const adminId = 'admin_main';
  const adminName = 'Dr. Nyoni';

  // 1. Fetch unique chats where the admin is a participant
  useEffect(() => {
    const q = query(
      collection(db, "messages"),
      where("participants", "array-contains", adminId)
    );

    const unsub = onSnapshot(q, (snap) => {
      const allMsgs = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      
      const uniqueChatIds = Array.from(new Set(allMsgs.map(m => m.chatId as string)));
      
      const chatSummaries = uniqueChatIds.map(id => {
        const msgs = allMsgs.filter(m => m.chatId === id);
        const sortedMsgs = msgs.sort((a,b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
        const lastMsg = sortedMsgs[0];
        
        // Find student ID (the participant who isn't the admin)
        const studentMsg = msgs.find(m => m.senderId !== adminId) || lastMsg;
        const unreadCount = msgs.filter(m => m.receiverId === adminId && m.status === 'unread').length;

        return {
          id,
          studentName: studentMsg.senderId === adminId ? studentMsg.receiverId : studentMsg.senderName,
          studentId: studentMsg.senderId === adminId ? studentMsg.receiverId : studentMsg.senderId,
          lastMessage: lastMsg.content,
          timestamp: lastMsg.timestamp,
          unreadCount
        };
      });

      setChats(chatSummaries.sort((a,b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)));
      
      if (chatSummaries.length > 0 && !selectedChatId) {
        // Fix: Explicitly cast to string to avoid 'unknown' type error in case of strict type checking
        setSelectedChatId(chatSummaries[0].id as string);
      }
    });

    return () => unsub();
  }, [selectedChatId]);

  // 2. Fetch messages for the selected chat and mark as read
  useEffect(() => {
    if (!selectedChatId) return;

    const q = query(
      collection(db, "messages"),
      where("chatId", "==", selectedChatId)
    );

    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a: any, b: any) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0));
      setMessages(msgs);

      // Auto-read incoming messages
      const unreadBatch = writeBatch(db);
      let hasUnread = false;
      snap.docs.forEach(d => {
        const data = d.data();
        if (data.receiverId === adminId && data.status === 'unread') {
          unreadBatch.update(doc(db, "messages", d.id), { status: 'read' });
          hasUnread = true;
        }
      });
      if (hasUnread) unreadBatch.commit();
    });

    return () => unsub();
  }, [selectedChatId]);

  // 3. Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || !selectedChatId || isSending) return;

    setIsSending(true);
    setError(null);
    
    const currentChat = chats.find(c => c.id === selectedChatId);
    if (!currentChat) return;

    const msgData = {
      chatId: selectedChatId,
      participants: [adminId, currentChat.studentId],
      senderId: adminId,
      senderName: adminName,
      receiverId: currentChat.studentId,
      content: trimmedInput,
      timestamp: serverTimestamp(),
      isFromStaff: true,
      status: 'unread'
    };

    try {
      await addDoc(collection(db, "messages"), msgData);
      setInput('');
    } catch (err: any) {
      console.error("Admin Dispatch Error:", err);
      setError("Clinical priority transmission failed.");
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

  const selectedChatSummary = useMemo(() => chats.find(c => c.id === selectedChatId), [chats, selectedChatId]);

  return (
    <div className="flex h-[calc(100vh-160px)] bg-white border border-neutral-100 shadow-2xl animate-fade-in overflow-hidden">
      {/* Sidebar - Chat List */}
      <div className="w-full lg:w-80 border-r border-neutral-100 flex flex-col shrink-0 bg-slate-50/30">
        <header className="p-6 border-b border-neutral-100">
           <h3 className="text-xl font-black uppercase text-mPolyBlue tracking-tighter">Student Grid</h3>
           <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-1">Live Enquiries</p>
        </header>
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {chats.length > 0 ? chats.map(chat => (
            <button
              key={chat.id}
              onClick={() => setSelectedChatId(chat.id)}
              className={`w-full p-6 text-left border-b border-neutral-100 transition-all hover:bg-white flex items-center gap-4 group ${selectedChatId === chat.id ? 'bg-white border-l-[6px] border-l-mPolyYellow shadow-md' : 'border-l-[6px] border-l-transparent'}`}
            >
              <div className="relative shrink-0">
                <div className="w-12 h-12 bg-mPolyBlue rounded-full flex items-center justify-center text-white font-black group-hover:bg-mPolyGreen transition-colors">
                  {chat.studentName?.charAt(0) || '?'}
                </div>
                {chat.unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white animate-pulse">
                    {chat.unreadCount}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                 <p className="text-[10px] font-black text-neutral-300 uppercase truncate">{chat.studentId}</p>
                 <h4 className="text-sm font-black text-neutral-900 uppercase truncate">{chat.studentName || 'Student'}</h4>
                 <p className={`text-[11px] truncate mt-1 ${chat.unreadCount > 0 ? 'font-black text-mPolyBlue' : 'font-medium text-neutral-500'}`}>
                   {chat.lastMessage}
                 </p>
              </div>
            </button>
          )) : (
            <div className="p-10 text-center opacity-20">
               <i className="fa-solid fa-comments text-4xl mb-4 text-mPolyBlue"></i>
               <p className="text-xs font-black uppercase tracking-widest">No active sessions</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        {selectedChatId ? (
          <>
            <header className="p-6 border-b border-neutral-100 flex justify-between items-center bg-white z-10">
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-mPolyBlue text-white flex items-center justify-center font-black rounded-full shadow-lg">
                    {selectedChatSummary?.studentName?.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-mPolyBlue uppercase tracking-tighter">{selectedChatSummary?.studentName}</h4>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-mPolyGreen rounded-full animate-pulse"></div>
                      <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Active Consultation</p>
                    </div>
                  </div>
               </div>
               <div className="hidden sm:flex flex-col text-right">
                  <p className="text-[9px] font-black text-neutral-300 uppercase">Verification ID</p>
                  <p className="text-[11px] font-black text-mPolyBlue uppercase">{selectedChatSummary?.studentId}</p>
               </div>
            </header>

            {error && (
              <div className="bg-red-600 text-white p-2 text-center text-[9px] font-black uppercase tracking-widest animate-fade-in shrink-0">
                <i className="fa-solid fa-circle-exclamation mr-2"></i> {error}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar relative">
              <div className="absolute inset-0 pointer-events-none opacity-[0.02]" style={{backgroundImage: 'radial-gradient(#163959 1px, transparent 1px)', backgroundSize: '24px 24px'}}></div>
              
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.senderId === adminId ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                  <div className={`max-w-[85%] lg:max-w-[70%] p-5 shadow-sm relative border-l-4 ${m.senderId === adminId ? 'bg-mPolyBlue border-mPolyYellow text-white shadow-xl' : 'bg-slate-50 border-mPolyBlue text-neutral-900'}`}>
                    <p className="text-xs lg:text-sm leading-relaxed font-semibold whitespace-pre-wrap">{m.content}</p>
                    <div className="flex items-center justify-end gap-2 mt-3 opacity-40">
                      <p className="text-[8px] lg:text-[9px] font-black text-right uppercase tracking-widest">
                        {m.timestamp?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'Synchronizing...'}
                      </p>
                      {m.senderId === adminId && (
                        <i className={`fa-solid fa-check-double text-[8px] ${m.status === 'read' ? 'text-mPolyYellow' : ''}`}></i>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div className="p-4 lg:p-6 border-t border-neutral-100 shrink-0">
               <div className="flex items-center gap-3 p-1.5 bg-neutral-100 border-2 border-neutral-200 focus-within:border-mPolyBlue transition-all shadow-inner">
                  <input 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Enter official medical response..." 
                    className="flex-1 bg-transparent px-3 py-4 outline-none text-xs lg:text-sm font-black uppercase placeholder:text-neutral-400 placeholder:normal-case"
                    disabled={isSending}
                  />
                  <button 
                    onClick={sendMessage}
                    disabled={!input.trim() || isSending}
                    className={`w-12 h-12 flex items-center justify-center transition-all shrink-0 shadow-lg ${input.trim() && !isSending ? 'bg-mPolyBlue text-white hover:bg-mPolyGreen active:scale-95' : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'}`}
                  >
                    {isSending ? (
                      <i className="fa-solid fa-circle-notch fa-spin"></i>
                    ) : (
                      <i className="fa-solid fa-paper-plane"></i>
                    )}
                  </button>
               </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center opacity-30 space-y-6">
             <i className="fa-solid fa-user-doctor text-8xl text-neutral-100"></i>
             <p className="text-xl font-black uppercase tracking-widest text-neutral-900">Select a student enquiry</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminMessagingTab;