import React, { useState, useEffect, useCallback } from 'react';
import { User, Message } from '../types';
import { storageService } from '../services/storageService';

interface CoachCornerProps {
  user: User;
}

const CoachCorner: React.FC<CoachCornerProps> = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [msg, setMsg] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchMessages = useCallback(async () => {
    if (!user.coachId) return;
    try {
      const data = await storageService.getMessages(user.id);
      setMessages(data);
      const unread = data.filter(m => m.receiverId === user.id && !m.read).length;
      setUnreadCount(unread);
    } catch (err) {
      console.error(err);
    }
  }, [user.id, user.coachId]);

  useEffect(() => {
    if (user.coachId) {
      const init = async () => {
        await fetchMessages();
      };
      init();
      const interval = setInterval(fetchMessages, 10000); // Poll every 10s
      return () => clearInterval(interval);
    }
  }, [user.coachId, fetchMessages]);

  const send = async () => {
    if (!msg.trim() || !user.coachId) return;
    try {
      await storageService.sendMessage(user.id, user.coachId, msg);
      setMsg('');
      fetchMessages();
    } catch (err) {
      console.error(err);
    }
  };

  const markAsRead = async () => {
    if (!user.coachId) return;
    await storageService.markMessagesAsRead(user.id, user.coachId);
    setUnreadCount(0);
  };

  const toggle = () => {
    if (!isOpen) markAsRead();
    setIsOpen(!isOpen);
  };

  if (!user.coachId) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[300]">
      {/* Floating Bubble */}
      <button 
        onClick={toggle}
        className="w-14 h-14 bg-indigo-600 rounded-full shadow-2xl flex items-center justify-center text-white hover:scale-110 transition-transform relative group"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full border-2 border-white text-[10px] font-black flex items-center justify-center animate-bounce">
            {unreadCount}
          </span>
        )}
        <div className="absolute right-full mr-4 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Coach's Corner
        </div>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="absolute bottom-20 right-0 w-80 bg-white rounded-[2rem] shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
          <div className="p-5 bg-indigo-600 text-white flex justify-between items-center">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest">Coach's Corner</h3>
              <p className="text-[8px] font-bold opacity-60 uppercase tracking-widest">Direct Guidance</p>
            </div>
            <button onClick={() => setIsOpen(false)} className="opacity-60 hover:opacity-100">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="h-80 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
            {messages.length === 0 ? (
              <p className="text-[10px] text-slate-400 italic text-center py-8">No messages yet. Send a note to your coach.</p>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={`flex ${m.senderId === user.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-2xl text-[11px] font-medium shadow-sm ${
                    m.senderId === user.id 
                      ? 'bg-indigo-600 text-white rounded-tr-none' 
                      : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                  }`}>
                    {m.text}
                    <div className={`text-[7px] mt-1 flex items-center gap-1 opacity-60 ${m.senderId === user.id ? 'justify-end' : 'justify-start'}`}>
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {m.senderId === user.id && m.read && (
                        <span className="font-black uppercase tracking-tighter">Read</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 bg-white border-t border-slate-100">
            <div className="relative">
              <input 
                type="text"
                value={msg}
                onChange={e => setMsg(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send()}
                placeholder="Message coach..."
                className="w-full pl-4 pr-10 py-3 bg-slate-50 rounded-xl outline-none text-xs border border-slate-100 focus:border-indigo-300 transition-colors"
              />
              <button 
                onClick={send}
                disabled={!msg.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-indigo-600 disabled:opacity-30"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoachCorner;
