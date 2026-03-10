
import React, { useState, useEffect, useMemo } from 'react';
import { getCoachDailyBriefing } from '../services/geminiService';
import { storageService } from '../services/storageService';
import { User, WellnessEntry } from '../types';
import { Zap, Users, CheckCircle2, Search } from 'lucide-react';

const CoachDashboard: React.FC<any> = ({ coach, athletes, allEntries, unreadMessageIds, onViewAthlete, onRefresh }) => {
  const [brief, setBrief] = useState<{ squadSummary: string; athleteHeadlines: Record<string, string> } | null>(null);
  const [markingRead, setMarkingRead] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'TRIAGE' | 'SQUAD'>('TRIAGE');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (athletes.length > 0) {
      getCoachDailyBriefing(athletes, allEntries).then(res => {
        try {
          const parsed = JSON.parse(res);
          setBrief(parsed);
        } catch (e) {
          console.error("Failed to parse briefing", e);
          setBrief({ squadSummary: "Briefing unavailable.", athleteHeadlines: {} });
        }
      });
    }
  }, [athletes, coach.id, allEntries]);

  const triageList = useMemo(() => {
    return athletes.filter((a: User) => {
      const athleteEntries = allEntries.filter((e: WellnessEntry) => e.userId === a.id);
      const latestEntry = athleteEntries[0];
      
      const hasUnreadComment = athleteEntries.some((e: WellnessEntry) => (e.comments && e.comments.trim().length > 0) && e.readByCoach !== true);
      const hasUnreadMessage = unreadMessageIds.includes(a.id);
      const isDivergent = latestEntry && (latestEntry.divergenceIntensity || 0) > 1.5;
      
      const lastActive = a.lastActiveAt ? new Date(a.lastActiveAt) : null;
      const isStale = lastActive && (new Date().getTime() - lastActive.getTime()) > (48 * 60 * 60 * 1000);

      return hasUnreadComment || hasUnreadMessage || isDivergent || isStale;
    });
  }, [athletes, allEntries, unreadMessageIds]);

  const filteredSquad = useMemo(() => {
    return athletes.filter((a: User) => 
      `${a.firstName} ${a.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [athletes, searchQuery]);

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

  const currentList = activeTab === 'TRIAGE' ? triageList : filteredSquad;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Nerve Center</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Squad Intelligence & Triage</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-2xl">
          <button 
            onClick={() => setActiveTab('TRIAGE')}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'TRIAGE' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Triage {triageList.length > 0 && <span className="ml-1 bg-rose-500 text-white px-1.5 py-0.5 rounded-full text-[8px]">{triageList.length}</span>}
          </button>
          <button 
            onClick={() => setActiveTab('SQUAD')}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'SQUAD' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Squad
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* AI Briefing Card */}
          <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <Zap className="w-24 h-24 text-indigo-400" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest">AI Performance Briefing</h3>
              </div>
              <p className="text-sm leading-relaxed text-slate-300 font-medium">
                {athletes.length === 0 ? "Awaiting your first athlete to join using your squad code." : (brief?.squadSummary || 'Analyzing squad metrics...')}
              </p>
            </div>
          </div>

          {/* Search & Filter (Only for Squad tab) */}
          {activeTab === 'SQUAD' && (
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                placeholder="Search squad..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:border-indigo-300 transition-colors shadow-sm"
              />
            </div>
          )}

          {/* Athlete List */}
          <div className="space-y-4">
            {currentList.length === 0 ? (
              <div className="bg-white p-12 rounded-[2.5rem] border-2 border-dashed border-slate-100 text-center space-y-4">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                  {activeTab === 'TRIAGE' ? <CheckCircle2 className="w-8 h-8 text-emerald-400" /> : <Users className="w-8 h-8 text-slate-300" />}
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                    {activeTab === 'TRIAGE' ? "Clear Skies" : "No Athletes Found"}
                  </h4>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-tight mt-1">
                    {activeTab === 'TRIAGE' ? "No athletes currently require immediate intervention." : "Try adjusting your search query."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden divide-y divide-slate-50 shadow-sm">
                {currentList.map((a: User) => {
                  const athleteEntries = allEntries.filter((e: WellnessEntry) => e.userId === a.id);
                  const latestEntry = athleteEntries[0];
                  const hasUnreadComment = athleteEntries.some((e: WellnessEntry) => (e.comments && e.comments.trim().length > 0) && e.readByCoach !== true);
                  const hasUnreadMessage = unreadMessageIds.includes(a.id);
                  const hasUnread = hasUnreadComment || hasUnreadMessage;
                  
                  const lastActive = a.lastActiveAt ? new Date(a.lastActiveAt) : null;
                  const isStale = lastActive && (new Date().getTime() - lastActive.getTime()) > (48 * 60 * 60 * 1000);
                  const isDivergent = latestEntry && (latestEntry.divergenceIntensity || 0) > 1.5;
                  const headline = brief?.athleteHeadlines?.[a.id];

                  return (
                    <div key={a.id} onClick={() => onViewAthlete(a)} className="p-6 flex justify-between items-center hover:bg-slate-50 cursor-pointer transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center font-black text-slate-400 border border-slate-200">
                            {a.firstName[0]}{a.lastName[0]}
                          </div>
                          {hasUnread && <div className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 border-2 border-white rounded-full"></div>}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-900">{a.firstName} {a.lastName}</p>
                            <div className="flex gap-1">
                              {hasUnreadMessage && <span className="bg-indigo-600 text-[7px] text-white px-1.5 py-0.5 rounded-md font-black uppercase tracking-tighter">MSG</span>}
                              {hasUnreadComment && <span className="bg-emerald-500 text-[7px] text-white px-1.5 py-0.5 rounded-md font-black uppercase tracking-tighter">NOTE</span>}
                              {isDivergent && <span className="bg-rose-500 text-[7px] text-white px-1.5 py-0.5 rounded-md font-black uppercase tracking-tighter">DRIFT</span>}
                              {isStale && <span className="bg-amber-500 text-[7px] text-white px-1.5 py-0.5 rounded-md font-black uppercase tracking-tighter">STALE</span>}
                            </div>
                          </div>
                          {headline ? (
                            <p className="text-xs font-bold text-rose-500 mt-0.5">{headline}</p>
                          ) : (
                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-0.5">
                              {lastActive ? `Active ${lastActive.toLocaleDateString()}` : 'Never Active'}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {hasUnread && (
                          <button 
                            onClick={(e) => markRead(e, a.id)}
                            disabled={markingRead === a.id}
                            className="text-[10px] font-black text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest px-4 py-2 bg-slate-50 rounded-xl border border-slate-100"
                          >
                            {markingRead === a.id ? '...' : 'Mark Read'}
                          </button>
                        )}
                        <span className="text-indigo-600 font-black text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">View Profile</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Squad Code Card */}
          <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-100">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1">Squad Invite Code</h3>
            <p className="text-4xl font-black mb-6">{coach.inviteCode}</p>
            <button onClick={copyCode} className="w-full bg-white/20 hover:bg-white/30 py-4 rounded-2xl text-[10px] font-black backdrop-blur-md transition-all uppercase tracking-widest">
              Copy Invite Link
            </button>
          </div>

          {/* Squad Stats */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Squad Health</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-tight">Total Athletes</span>
                <span className="text-lg font-black text-slate-900">{athletes.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-tight">Active (24h)</span>
                <span className="text-lg font-black text-emerald-500">
                  {athletes.filter((a: User) => a.lastActiveAt && (new Date().getTime() - new Date(a.lastActiveAt).getTime()) < 24 * 60 * 60 * 1000).length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-tight">Needs Attention</span>
                <span className="text-lg font-black text-rose-500">{triageList.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoachDashboard;
