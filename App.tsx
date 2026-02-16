import { useState, useEffect } from 'react';
import Layout from './components/Layout';
import WellnessForm from './components/WellnessForm';
import Dashboard from './components/Dashboard';
import Insights from './components/Insights';
import CoachDashboard from './components/CoachDashboard';
import AthleteDetail from './components/AthleteDetail';
import { storageService } from './services/storageService';
import { isSupabaseConfigured } from './services/supabaseClient';
import { User, WellnessEntry, View, UserRole } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<View>('LOGIN');
  const [entries, setEntries] = useState<WellnessEntry[]>([]);
  const [allEntries, setAllEntries] = useState<WellnessEntry[]>([]);
  const [coachedAthletes, setCoachedAthletes] = useState<User[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState<User | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [showInviteCard, setShowInviteCard] = useState(false);
  
  const [authMode, setAuthMode] = useState<'LANDING' | 'EMAIL_SIGNUP' | 'EMAIL_LOGIN'>('LANDING');
  const [authRole, setAuthRole] = useState<UserRole>('ATHLETE');
  const [authForm, setAuthForm] = useState({ email: '', password: '', firstName: '', lastName: '' });
  const [loading, setLoading] = useState(false);
  const [initChecked, setInitChecked] = useState(false);

  // Persistence of Join Code from URL
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

  const refreshData = async (currentUser: User) => {
    if (!isSupabaseConfigured()) return;
    setLoading(true);
    try {
      if (currentUser.role === 'COACH') {
        const [entriesData, coachedData] = await Promise.all([
          storageService.getAllEntries(),
          storageService.getCoachedAthletes(currentUser.id)
        ]);
        setAllEntries(entriesData);
        setCoachedAthletes(coachedData);
      } else {
        const userData = await storageService.getEntriesForUser(currentUser.id);
        setEntries(userData);
      }
    } catch (err) {
      console.error("Refresh Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      try {
        if (!isSupabaseConfigured()) {
          setInitChecked(true);
          return;
        }
        const currentUser = await storageService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          setActiveView(currentUser.role === 'COACH' ? 'COACH_DASHBOARD' : 'DASHBOARD');
          await refreshData(currentUser);
          
          // Check for pending join handshake
          const pending = localStorage.getItem('pending_join_code');
          if (pending && currentUser.role === 'ATHLETE' && !currentUser.coachId) {
            setShowInviteCard(true);
          }
        }
      } catch (err: any) {
        console.error("Boot Error:", err);
      } finally {
        setInitChecked(true);
      }
    };
    checkSession();
  }, []);

  const handleJoinSquad = async (code: string) => {
    if (!user) return;
    setLoading(true);
    try {
      await storageService.joinSquadByCode(code, user.id);
      localStorage.removeItem('pending_join_code');
      const updatedUser = await storageService.getCurrentUser();
      if (updatedUser) setUser(updatedUser);
      setShowInviteCard(false);
      setInviteCode(null);
      alert("Squad joined successfully.");
    } catch (err: any) {
      alert("Invalid Squad Code.");
      localStorage.removeItem('pending_join_code');
      setShowInviteCard(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialAuth = async (provider: 'google' | 'apple') => {
    try {
      setLoading(true);
      await storageService.signInWithSocial(provider, authRole);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let loggedUser: User;
      if (authMode === 'EMAIL_SIGNUP') {
        loggedUser = await storageService.signUp(authForm.email, authForm.password, authForm.firstName, authForm.lastName, authRole);
        alert("Verification email sent!");
        setAuthMode('EMAIL_LOGIN');
        return;
      } else {
        loggedUser = await storageService.signIn(authForm.email, authForm.password);
      }
      setUser(loggedUser);
      setActiveView(loggedUser.role === 'COACH' ? 'COACH_DASHBOARD' : 'DASHBOARD');
      await refreshData(loggedUser);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await storageService.logout();
    setUser(null);
    setActiveView('LOGIN');
    setEntries([]);
    setAuthMode('LANDING');
  };

  if (!initChecked) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
       <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (activeView === 'LOGIN') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center px-6 pt-24 pb-12 overflow-y-auto">
        <div className="w-full max-w-[400px] text-center space-y-4">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-[1.1]">Performance-Driven<br/>Readiness</h1>
          <p className="text-slate-500 font-medium text-lg leading-relaxed px-2">
            Track your progress and optimize your training. Join the elite community for free.
          </p>
          
          <div className="pt-10 space-y-3">
            <div className="text-xs font-black text-slate-400 uppercase tracking-widest pb-2">I am an:</div>
            <div className="flex bg-slate-50 p-1.5 rounded-2xl mb-8">
              {(['ATHLETE', 'COACH'] as UserRole[]).map(r => (
                <button 
                  key={r} 
                  onClick={() => setAuthRole(r)} 
                  className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${authRole === r ? 'bg-white text-indigo-600 shadow-lg shadow-indigo-100/50' : 'text-slate-400'}`}
                >
                  {r}
                </button>
              ))}
            </div>

            <button onClick={() => handleSocialAuth('google')} className="w-full py-4 px-6 border-2 border-slate-100 rounded-2xl font-black text-slate-700 flex items-center justify-center gap-4 hover:bg-slate-50 transition-colors">
              <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Sign In With Google
            </button>

            <button onClick={() => handleSocialAuth('apple')} className="w-full py-4 px-6 border-2 border-slate-100 rounded-2xl font-black text-slate-700 flex items-center justify-center gap-4 hover:bg-slate-50 transition-colors">
              <svg className="w-5 h-5 fill-slate-900" viewBox="0 0 24 24"><path d="M17.05 20.28c-.96.95-2.04 1.72-3.12 1.72-1.2 0-1.56-.72-3-.72-1.44 0-1.8.72-3 .72-1.08 0-2.28-.84-3.24-1.8-1.92-2.04-3.36-5.88-3.36-9.12 0-3.36 2.16-5.16 4.2-5.16 1.08 0 2.04.72 2.64.72s1.56-.72 2.76-.72c1.08 0 2.4.6 3.24 1.56-1.56.96-1.32 3.12 0 4.2 1.2 1.2 2.76.6 2.76.6-.12 1.2-.72 2.4-1.56 3.48-.36.48-.6.96-.36 1.44zM12.12 4.12c0-1.08.48-2.16 1.2-2.88.72-.72 1.8-1.2 2.76-1.2.12 1.08-.36 2.16-1.08 2.76-.72.84-1.8 1.32-2.88 1.32z"/></svg>
              Sign In With Apple
            </button>

            {authMode === 'LANDING' ? (
              <button onClick={() => setAuthMode('EMAIL_SIGNUP')} className="w-full py-4 px-6 bg-slate-900 text-white rounded-2xl font-black shadow-xl shadow-slate-100 hover:bg-black active:scale-[0.98] transition-all">
                Sign Up With Email
              </button>
            ) : (
              <form onSubmit={handleEmailAuth} className="space-y-4 pt-4 text-left">
                {authMode === 'EMAIL_SIGNUP' && (
                  <div className="grid grid-cols-2 gap-4">
                    <input type="text" placeholder="First Name" required value={authForm.firstName} onChange={e => setAuthForm({...authForm, firstName: e.target.value})} className="px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50" />
                    <input type="text" placeholder="Last Name" required value={authForm.lastName} onChange={e => setAuthForm({...authForm, lastName: e.target.value})} className="px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50" />
                  </div>
                )}
                <input type="email" placeholder="Email Address" required value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50" />
                <input type="password" placeholder="Password" required value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50" />
                <button type="submit" disabled={loading} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100">
                  {loading ? 'PROCESSING...' : (authMode === 'EMAIL_SIGNUP' ? 'Create Account' : 'Log In')}
                </button>
                <button type="button" onClick={() => setAuthMode('LANDING')} className="w-full text-xs font-black text-slate-400 uppercase tracking-widest pt-2">Back</button>
              </form>
            )}

            <div className="pt-12 text-sm text-slate-500 font-medium">
              Already a Member? <button onClick={() => setAuthMode('EMAIL_LOGIN')} className="text-indigo-600 font-bold hover:underline">Log In</button>
            </div>
            
            <p className="text-[10px] text-slate-400 px-8 pt-10 leading-relaxed font-bold uppercase tracking-widest">
              By continuing, you agree to our <span className="text-indigo-600">Terms</span> and <span className="text-indigo-600">Privacy</span>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout activeView={activeView} setView={setActiveView} user={user} onLogout={handleLogout}>
      {activeView === 'DASHBOARD' && user && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {showInviteCard && inviteCode && (
            <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-indigo-200 space-y-4">
              <h3 className="text-xl font-black">Join Your Squad?</h3>
              <p className="text-sm font-medium opacity-90 leading-relaxed">We detected a pending invitation code: <span className="font-black underline">{inviteCode}</span>. Link your account to your coach now?</p>
              <div className="flex gap-4 pt-2">
                <button onClick={() => handleJoinSquad(inviteCode)} className="flex-1 bg-white text-indigo-600 py-4 rounded-2xl font-black text-xs">JOIN NOW</button>
                <button onClick={() => {setShowInviteCard(false); localStorage.removeItem('pending_join_code');}} className="px-6 bg-white/20 py-4 rounded-2xl font-black text-xs">DECLINE</button>
              </div>
            </div>
          )}
          
          <Dashboard entries={entries} user={user} onNewReport={() => setActiveView('FORM')} />
          <Insights entries={entries} />
          
          {!user.coachId && !showInviteCard && (
            <div className="p-10 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 text-center space-y-4">
              <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                <span className="text-slate-400">⚡</span>
              </div>
              <p className="text-sm font-bold text-slate-400">You are currently training solo.<br/>Enter a coach code to share data.</p>
              <button 
                onClick={() => {
                  const code = prompt("Enter Squad Invite Code:");
                  if (code) handleJoinSquad(code);
                }} 
                className="text-[10px] font-black bg-slate-900 text-white px-8 py-4 rounded-xl uppercase tracking-widest"
              >
                Join Squad
              </button>
            </div>
          )}
        </div>
      )}
      
      {activeView === 'FORM' && user && (
        <WellnessForm user={user} onComplete={async () => {
          await refreshData(user);
          setActiveView('DASHBOARD');
        }} />
      )}

      {activeView === 'COACH_DASHBOARD' && user && (
        <CoachDashboard 
          coach={user}
          athletes={coachedAthletes} 
          allEntries={allEntries} 
          onViewAthlete={(a: User) => {
            setSelectedAthlete(a);
            setActiveView('ATHLETE_DETAIL');
          }} 
        />
      )}

      {activeView === 'ATHLETE_DETAIL' && selectedAthlete && user && (
        <AthleteDetail 
          athlete={selectedAthlete} 
          entries={allEntries.filter(e => e.userId === selectedAthlete.id)} 
          coachId={user.id}
          onBack={() => setActiveView('COACH_DASHBOARD')}
        />
      )}
    </Layout>
  );
};

export default App;
