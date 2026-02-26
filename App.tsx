import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Layout from './components/Layout';
import WellnessForm from './components/WellnessForm';
import Dashboard from './components/Dashboard';
import Insights from './components/Insights';
import CoachDashboard from './components/CoachDashboard';
import AthleteDetail from './components/AthleteDetail';
import Onboarding from './components/Onboarding';
import SubmaxTestUpload from './components/SubmaxTestUpload';
import Trends from './components/Trends';
import SubmaxLab from './components/SubmaxLab';
import { storageService } from './services/storageService';
import { isSupabaseConfigured, supabase } from './services/supabaseClient';
import { User, WellnessEntry, View, UserRole, SubmaxTest } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<View>('LOGIN');
  const [entries, setEntries] = useState<WellnessEntry[]>([]);
  const [allEntries, setAllEntries] = useState<WellnessEntry[]>([]);
  const [submaxTests, setSubmaxTests] = useState<SubmaxTest[]>([]);
  const [coachedAthletes, setCoachedAthletes] = useState<User[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState<User | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [showInviteCard, setShowInviteCard] = useState(false);
  
  const [authMode, setAuthMode] = useState<'LANDING' | 'EMAIL_SIGNUP' | 'EMAIL_LOGIN'>('LANDING');
  const [authForm, setAuthForm] = useState({ email: '', password: '', firstName: '', lastName: '' });
  
  const [isBooting, setIsBooting] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showGoldStar, setShowGoldStar] = useState(false);

  const getAthleteDay = (date: Date) => {
    const d = new Date(date);
    if (d.getHours() < 2) {
      d.setDate(d.getDate() - 1);
    }
    return d.toISOString().split('T')[0];
  };

  const hasSubmittedToday = useMemo(() => {
    if (user?.role !== 'ATHLETE') return true;
    const today = getAthleteDay(new Date());
    // Normalize entry date to athlete day for comparison
    return entries.some(e => {
      const entryDate = new Date(e.isoDate);
      return getAthleteDay(entryDate) === today;
    });
  }, [entries, user]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('join');
    if (code) {
      localStorage.setItem('pending_join_code', code);
      setInviteCode(code);
    } else {
      setInviteCode(localStorage.getItem('pending_join_code'));
    }
  }, []);

  const refreshData = useCallback(async (currentUser: User) => {
    if (!isSupabaseConfigured()) return;
    setIsRefreshing(true);
    try {
      if (currentUser.role === 'COACH') {
        const [entriesData, coachedData] = await Promise.all([
          storageService.getAllEntries(),
          storageService.getCoachedAthletes(currentUser.id)
        ]);
        setAllEntries(entriesData);
        setCoachedAthletes(coachedData);
      } else if (currentUser.role === 'ATHLETE') {
        const [userData, testData] = await Promise.all([
          storageService.getEntriesForUser(currentUser.id),
          storageService.getSubmaxTestsForUser(currentUser.id)
        ]);
        setEntries(userData);
        setSubmaxTests(testData);
      }
    } catch (err) {
      console.error("Data Refresh Error:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const handleAuthChange = useCallback(async (session: any) => {
    if (!session?.user) {
      setUser(null);
      setActiveView('LOGIN');
      setIsBooting(false);
      return;
    }

    try {
      const profile = await storageService.getProfile(session.user.id);
      
      if (profile) {
        setUser(profile);
        setActiveView(profile.role === 'COACH' ? 'COACH_DASHBOARD' : 'DASHBOARD');
        refreshData(profile);
        
        const pending = localStorage.getItem('pending_join_code');
        if (pending && profile.role === 'ATHLETE' && !profile.coachId) {
          setShowInviteCard(true);
        }
      } else {
        const metadata = session.user.user_metadata || {};
        let firstName = metadata.given_name || metadata.first_name || '';
        let lastName = metadata.family_name || metadata.last_name || '';
        
        if (!firstName && (metadata.full_name || metadata.name)) {
          const parts = (metadata.full_name || metadata.name).trim().split(/\s+/);
          firstName = parts[0];
          lastName = parts.slice(1).join(' ');
        }

        const partialUser: User = {
          id: session.user.id,
          email: session.user.email || '',
          firstName,
          lastName,
          role: 'PENDING'
        };
        setUser(partialUser);
        setActiveView('ONBOARDING');
      }
    } catch (err) {
      console.error("Auth Processing Error:", err);
    } finally {
      setIsBooting(false);
    }
  }, [refreshData]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setIsBooting(false);
      return;
    }

    const { data: { subscription } } = supabase!.auth.onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        handleAuthChange(session);
      } else if (event === 'SIGNED_OUT') {
        handleAuthChange(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [handleAuthChange]);

  const handleJoinSquad = async (code: string) => {
    if (!user) return;
    setActionLoading(true);
    try {
      await storageService.joinSquadByCode(code, user.id);
      localStorage.removeItem('pending_join_code');
      const updatedUser = await storageService.getProfile(user.id);
      if (updatedUser) setUser(updatedUser);
      setShowInviteCard(false);
      setInviteCode(null);
    } catch (err: any) {
      alert("Invalid Squad Code.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSocialAuth = async (provider: 'google' | 'apple') => {
    try {
      setActionLoading(true);
      await storageService.signInWithSocial(provider);
    } catch (err: any) {
      alert(err.message);
      setActionLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      if (authMode === 'EMAIL_SIGNUP') {
        await storageService.signUp(authForm.email, authForm.password, authForm.firstName, authForm.lastName);
        alert("Success! Check your inbox to verify your email.");
        setAuthMode('EMAIL_LOGIN');
      } else {
        await storageService.signIn(authForm.email, authForm.password);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = async () => {
    setActionLoading(true);
    await storageService.logout();
    setActionLoading(false);
  };

  if (isBooting) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
       <div className="flex flex-col items-center gap-6">
         <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
         <p className="text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">Syncing Protocols...</p>
       </div>
    </div>
  );

  if (activeView === 'LOGIN') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center px-6 pt-24 pb-12 overflow-y-auto">
        <div className="w-full max-w-[400px] text-center space-y-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl mx-auto flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-indigo-100 mb-6">P</div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-[1.1]">Elite Performance Monitor</h1>
          <p className="text-slate-500 font-medium text-lg leading-relaxed px-2">The intelligent readiness protocol for athletes and coaches.</p>
          
          <div className="pt-10 space-y-3">
            <button disabled={actionLoading} onClick={() => handleSocialAuth('google')} className="w-full py-5 px-6 border-2 border-slate-100 rounded-2xl font-black text-slate-700 flex items-center justify-center gap-4 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50">
              <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              {actionLoading ? 'CONNECTING...' : 'Continue With Google'}
            </button>
            <div className="flex items-center gap-4 py-4"><div className="flex-1 h-px bg-slate-100"></div><span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">or email</span><div className="flex-1 h-px bg-slate-100"></div></div>
            {authMode === 'LANDING' ? (
              <button onClick={() => setAuthMode('EMAIL_LOGIN')} className="w-full py-5 px-6 bg-slate-900 text-white rounded-2xl font-black shadow-xl shadow-slate-100 hover:bg-black active:scale-[0.98] transition-all">Login with Password</button>
            ) : (
              <form onSubmit={handleEmailAuth} className="space-y-4 pt-2 text-left animate-in slide-in-from-top-2 duration-300">
                {authMode === 'EMAIL_SIGNUP' && (
                  <div className="grid grid-cols-2 gap-4">
                    <input type="text" placeholder="First Name" required value={authForm.firstName} onChange={e => setAuthForm({...authForm, firstName: e.target.value})} className="px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50" />
                    <input type="text" placeholder="Last Name" required value={authForm.lastName} onChange={e => setAuthForm({...authForm, lastName: e.target.value})} className="px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50" />
                  </div>
                )}
                <input type="email" placeholder="Email Address" required value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50" />
                <input type="password" placeholder="Password" required value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50" />
                <button type="submit" disabled={actionLoading} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100">{actionLoading ? 'PROCESSING...' : (authMode === 'EMAIL_SIGNUP' ? 'Create Account' : 'Log In')}</button>
                <button type="button" onClick={() => setAuthMode('LANDING')} className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest pt-2">Cancel</button>
              </form>
            )}
            <div className="pt-8 text-sm text-slate-500 font-medium">
              {authMode === 'EMAIL_SIGNUP' ? "Already a Member?" : "New to the platform?"} {' '}
              <button onClick={() => setAuthMode(authMode === 'EMAIL_SIGNUP' ? 'EMAIL_LOGIN' : 'EMAIL_SIGNUP')} className="text-indigo-600 font-bold hover:underline">{authMode === 'EMAIL_SIGNUP' ? 'Log In' : 'Join Now'}</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout 
      activeView={activeView} 
      setView={setActiveView} 
      user={user} 
      onLogout={handleLogout}
      hideNav={user?.role === 'ATHLETE' && !hasSubmittedToday}
    >
      {activeView === 'ONBOARDING' && user && (
        <Onboarding user={user} onComplete={(updatedUser) => {
          setUser(updatedUser);
          setActiveView(updatedUser.role === 'COACH' ? 'COACH_DASHBOARD' : 'DASHBOARD');
          refreshData(updatedUser);
        }} />
      )}
      {activeView === 'DASHBOARD' && user && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {showGoldStar && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/80 backdrop-blur-sm">
              <style>{`
                @keyframes star-pulse {
                  0%, 100% { transform: scale(1); opacity: 1; }
                  50% { transform: scale(1.5); opacity: 0.8; }
                }
                .animate-star {
                  animation: star-pulse 0.6s ease-in-out 3;
                }
              `}</style>
              <div className="text-8xl animate-star">⭐</div>
            </div>
          )}
          
          {user.role === 'ATHLETE' && !hasSubmittedToday ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 py-12">
              <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center text-4xl shadow-inner">📋</div>
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Protocol Required</h2>
                <p className="text-slate-500 font-medium px-8">Your dashboard is locked until the morning audit is complete.</p>
              </div>
              <button 
                onClick={() => setActiveView('FORM')}
                className="w-full max-w-md py-8 bg-indigo-600 text-white font-black rounded-[2.5rem] shadow-2xl shadow-indigo-200 hover:scale-[1.02] active:scale-[0.98] transition-all text-xl uppercase tracking-widest"
              >
                Daily Wellness Audit
              </button>
            </div>
          ) : (
            <>
              {isRefreshing && (
                <div className="flex items-center gap-3 px-4 py-2 bg-indigo-50 rounded-full w-fit mx-auto border border-indigo-100">
                  <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Updating Stats...</span>
                </div>
              )}
              {showInviteCard && inviteCode && (
                <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-indigo-200 space-y-4">
                  <h3 className="text-xl font-black">Join Squad?</h3>
                  <p className="text-sm font-medium opacity-90 leading-relaxed">Invitation detected: <span className="font-black underline">{inviteCode}</span>. Link your metrics?</p>
                  <div className="flex gap-4 pt-2">
                    <button onClick={() => handleJoinSquad(inviteCode)} className="flex-1 bg-white text-indigo-600 py-4 rounded-2xl font-black text-xs">JOIN</button>
                    <button onClick={() => {setShowInviteCard(false); localStorage.removeItem('pending_join_code');}} className="px-6 bg-white/20 py-4 rounded-2xl font-black text-xs">LATER</button>
                  </div>
                </div>
              )}
              <Dashboard 
                entries={entries} 
                user={user} 
                onNewReport={() => setActiveView('FORM')} 
                onSubmaxTest={() => setActiveView('SUBMAX_TEST')}
                hideAction={true}
              />
              {!user.coachId && !showInviteCard && (
                <div className="p-10 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 text-center space-y-4">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto"><span className="text-slate-400">⚡</span></div>
                  <p className="text-sm font-bold text-slate-400">Solo Performance.<br/>Enter a coach code to share data.</p>
                  <button onClick={() => {const code = prompt("Enter Squad Invite Code:"); if (code) handleJoinSquad(code);}} className="text-[10px] font-black bg-slate-900 text-white px-8 py-4 rounded-xl uppercase tracking-widest">Join Squad</button>
                </div>
              )}
            </>
          )}
        </div>
      )}
      {activeView === 'TRENDS' && user && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Trends entries={entries} user={user} />
        </div>
      )}
      {activeView === 'SUBMAX_LAB' && user && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <SubmaxLab user={user} tests={submaxTests} onNewTest={() => setActiveView('SUBMAX_TEST')} />
        </div>
      )}
      {activeView === 'FORM' && user && (
        <WellnessForm 
          user={user} 
          onComplete={async () => { 
            setShowGoldStar(true);
            setTimeout(async () => {
              setShowGoldStar(false);
              await refreshData(user); 
              setActiveView('DASHBOARD'); 
            }, 2000);
          }} 
        />
      )}
      {activeView === 'SUBMAX_TEST' && user && <SubmaxTestUpload user={user} onComplete={async () => { await refreshData(user); setActiveView('DASHBOARD'); }} onCancel={() => setActiveView('DASHBOARD')} />}
      {activeView === 'COACH_DASHBOARD' && user && <CoachDashboard coach={user} athletes={coachedAthletes} allEntries={allEntries} onViewAthlete={(a: User) => { setSelectedAthlete(a); setActiveView('ATHLETE_DETAIL'); }} />}
      {activeView === 'ATHLETE_DETAIL' && selectedAthlete && user && <AthleteDetail athlete={selectedAthlete} entries={allEntries.filter(e => e.userId === selectedAthlete.id)} coachId={user.id} onBack={() => setActiveView('COACH_DASHBOARD')} />}
    </Layout>
  );
};

export default App;
