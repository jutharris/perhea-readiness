
import React, { useState, useEffect } from 'react';
import { getCoachDailyBriefing } from '../services/geminiService';
import { storageService } from '../services/storageService';

const CoachDashboard: React.FC<any> = ({ coach, athletes, allEntries, unreadMessageIds, onViewAthlete, onRefresh }) => {
  const [brief, setBrief] = useState('');
  const [markingRead, setMarkingRead] = useState<string | null>(null);

  useEffect(() => {
    if (athletes.length > 0) {
      getCoachDailyBriefing(athletes, allEntries).then(setBrief);
    }
  }, [athletes, coach.id, allEntries]);

  const copyCode = () => {
    const link = `${window.location.origin}?join=${coach.inviteCode}`;
    navigator.clipboard.writeText(link);
    alert("Invite link copied to clipboard!");
  };

  const markRead = async (e: React.MouseEvent, athleteId: string) => {
    e.stopPropagation();
    setMarkingRead(athleteId);
    try {
      await storageService.markAthleteAsRead(coach.id, athleteId);
      if (onRefresh) await onRefresh();
    } catch (err) {
      console.error("Error marking as read:", err);
    } finally {
      setMarkingRead(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-left mb-4">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Welcome, {coach.firstName || 'Coach'}!</h1>
      </div>

      <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-100 flex justify-between items-center">
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1">Your Squad Code</h3>
          <p className="text-3xl font-black">{coach.inviteCode}</p>
        </div>
        <button onClick={copyCode} className="bg-white/20 hover:bg-white/30 px-6 py-3 rounded-xl text-xs font-black backdrop-blur-md transition-all">
          COPY INVITE LINK
        </button>
      </div>

      <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white">
        <h3 className="text-xs font-black text-indigo-400 mb-4 uppercase tracking-widest">AI Performance Briefing</h3>
        <p className="text-sm leading-relaxed text-slate-300">
          {athletes.length === 0 ? "Awaiting your first athlete to join using your squad code." : (brief || 'Analyzing squad metrics...')}
        </p>
      </div>

      {athletes.length > 0 && (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden divide-y divide-slate-50 shadow-sm">
          {athletes.map((a: any) => {
            const athleteEntries = allEntries.filter((e: any) => e.userId === a.id);
            const hasUnreadComment = athleteEntries.some((e: any) => (e.comments && e.comments.trim().length > 0) && e.readByCoach !== true);
            const hasUnreadMessage = unreadMessageIds.includes(a.id);
            const hasUnread = hasUnreadComment || hasUnreadMessage;
            
            return (
              <div key={a.id} onClick={() => onViewAthlete(a)} className="p-6 flex justify-between items-center hover:bg-slate-50 cursor-pointer transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center font-black text-slate-400">
                      {a.firstName[0]}{a.lastName[0]}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-900">{a.firstName} {a.lastName}</p>
                      {hasUnreadMessage && (
                        <span className="bg-indigo-600 text-[8px] text-white px-2 py-0.5 rounded-full font-black animate-pulse">NEW MESSAGE</span>
                      )}
                      {hasUnreadComment && (
                        <span className="bg-emerald-500 text-[8px] text-white px-2 py-0.5 rounded-full font-black animate-pulse">NEW NOTE</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">{a.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {hasUnread && (
                    <button 
                      onClick={(e) => markRead(e, a.id)}
                      disabled={markingRead === a.id}
                      className="text-[10px] font-black text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest"
                    >
                      {markingRead === a.id ? '...' : 'Mark Read'}
                    </button>
                  )}
                  <span className="text-indigo-600 font-black text-xs opacity-0 group-hover:opacity-100 transition-opacity">VIEW PROFILE</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CoachDashboard;
