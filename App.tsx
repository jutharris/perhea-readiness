import { useState, useEffect } from 'react';
import Layout from './components/Layout';
import WellnessForm from './components/WellnessForm';
import Dashboard from './components/Dashboard';
import Insights from './components/Insights';
import CoachDashboard from './components/CoachDashboard';
import AthleteDetail from './components/AthleteDetail';
import ManageAthletes from './components/ManageAthletes';
import { storageService } from './services/storageService';
import { isSupabaseConfigured } from './services/supabaseClient';
import { User, WellnessEntry, View, UserRole } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<View>('LOGIN');
  const [entries, setEntries] = useState<WellnessEntry[]>([]);
  const [allEntries, setAllEntries] = useState<WellnessEntry[]>([]);
  const [allAthletes, setAllAthletes] = useState<User[]>([]);
  const [coachedAthletes, setCoachedAthletes] = useState<User[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState<User | null>(null);
  
  // Auth State
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authForm, setAuthForm] = useState({ 
    email: '', 
    password: '', 
    firstName: '', 
    lastName: '', 
    role: 'ATHLETE' as UserRole 
  });
  
  const [loading, setLoading] = useState(false);
  const [initChecked, setInitChecked] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  const refreshData = async (currentUser: User) => {
    if (!isSupabaseConfigured()) return;
    setLoading(true);
    try {
      if (currentUser.role === 'COACH') {
        const [entriesData, athletesData, coachedData] = await Promise.all([
          storageService.getAllEntries(),
          storageService.getAllUsers(),
          storageService.getCoachedAthletes(currentUser.id)
        ]);
        setAllEntries(entriesData);
        setAllAthletes(athletesData.filter(u => u.role === 'ATHLETE'));
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
          setConfigError(`Missing Database Configuration. Check your Vercel/Local environment variables for SUPABASE_URL and SUPABASE_ANON_KEY.`);
          setInitChecked(true);
          return;
        }

        const currentUser = await storageService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          setActiveView(currentUser.role === 'COACH' ? 'COACH_DASHBOARD' : 'DASHBOARD');
          await refreshData(currentUser);
        }
      } catch (err: any) {
        console.error("Boot Error:", err);
      } finally {
        setInitChecked(true);
      }
    };
    checkSession();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let loggedUser: User;
      if (isSignUp) {
        loggedUser = await storageService.signUp(
          authForm.email, 
          authForm.password, 
          authForm.firstName, 
          authForm.lastName, 
          authForm.role
        );
        alert("Account created! Please check your email for verification. Once verified, log in here.");
        setIsSignUp(false);
        setLoading(false);
        return;
      } else {
        loggedUser = await storageService.signIn(authForm.email, authForm.password);
      }
      
      setUser(loggedUser);
      setActiveView(loggedUser.role === 'COACH' ? 'COACH_DASHBOARD' : 'DASHBOARD');
      await refreshData(loggedUser);
    } catch (err: any) {
      alert(err.message || "Authentication Failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await storageService.logout();
    setUser(null);
    setActiveView('LOGIN');
    setEntries([]);
  };

  if (!initChecked) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
       <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (configError) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-6 text-center">
        <div className="max-w-md bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-100 space-y-6">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center text-3xl mx-auto">⚙️</div>
          <h1 className="text-2xl font-black text-slate-900">Database Connection</h1>
          <p className="text-slate-500 text-sm leading-relaxed">
            The app could not connect to your Supabase instance. If you have already added the keys to Vercel, you may need to redeploy the site for them to take effect.
          </p>
          <div className="text-left bg-slate-50 p-4 rounded-xl text-[10px] font-mono text-slate-400 break-all border border-slate-200">
            {configError}
          </div>
          <button onClick={() => window.location.reload()} className="w-full py-4 bg-indigo-600 text-white font-black rounded-xl shadow-lg active:scale-[0.98] transition-transform">Retry Connection</button>
        </div>
      </div>
    );
  }

  if (activeView === 'LOGIN') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-12">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="inline-flex w-20 h-20 bg-indigo-600 rounded-[2rem] items-center justify-center text-white text-4xl font-bold shadow-2xl shadow-indigo-200 mb-8 transform -rotate-3">P</div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">PerHea</h1>
            <p className="text-slate-400 font-semibold mt-2">Are you ready?</p>
          </div>
          
          <form onSubmit={handleAuth} className="mt-8 space-y-5 bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
            {isSignUp && (
              <>
                <div className="flex bg-slate-50 p-1.5 rounded-2xl mb-4 border border-slate-100">
                  {(['ATHLETE', 'COACH'] as UserRole[]).map(r => (
                    <button key={r} type="button" onClick={() => setAuthForm(prev => ({ ...prev, role: r }))} className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${authForm.role === r ? 'bg-white text-indigo-600 shadow-sm scale-[1.02]' : 'text-slate-400 hover:text-slate-600'}`}>
                      {r}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">First Name</label>
                    <input type="text" required value={authForm.firstName} onChange={(e) => setAuthForm(prev => ({ ...prev, firstName: e.target.value }))} className="w-full px-4 py-4 rounded-2xl border border-slate-100 bg-slate-50 outline-none focus:ring-4 focus:ring-indigo-50 focus:bg-white transition-all text-sm font-bold" placeholder="First" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Last Name</label>
                    <input type="text" required value={authForm.lastName} onChange={(e) => setAuthForm(prev => ({ ...prev, lastName: e.target.value }))} className="w-full px-4 py-4 rounded-2xl border border-slate-100 bg-slate-50 outline-none focus:ring-4 focus:ring-indigo-50 focus:bg-white transition-all text-sm font-bold" placeholder="Last" />
                  </div>
                </div>
              </>
            )}
            
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
              <input type="email" required value={authForm.email} onChange={(e) => setAuthForm(prev => ({ ...prev, email: e.target.value }))} className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 outline-none focus:ring-4 focus:ring-indigo-50 focus:bg-white transition-all text-sm font-bold" placeholder="athlete@perhea.com" />
            </div>
            
            <div className="space-y-1 relative">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  required 
                  value={authForm.password} 
                  onChange={(e) => setAuthForm(prev => ({ ...prev, password: e.target.value }))} 
                  className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 outline-none focus:ring-4 focus:ring-indigo-50 focus:bg-white transition-all text-sm font-bold pr-14" 
                  placeholder="••••••••" 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-indigo-600 transition-colors"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  )}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full py-5 mt-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-200 hover:bg-indigo-700 active:scale-[0.98] transition-all flex justify-center items-center gap-3">
              {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (isSignUp ? 'CREATE ACCOUNT' : 'LOG IN')}
            </button>
            
            <div className="text-center pt-2">
              <button type="button" onClick={() => { setIsSignUp(!isSignUp); setShowPassword(false); }} className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors">
                {isSignUp ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <Layout activeView={activeView} setView={setActiveView} user={user} onLogout={handleLogout}>
      {activeView === 'DASHBOARD' && user && (
        <div className="space-y-10">
          <Dashboard entries={entries} user={user} onNewReport={() => setActiveView('FORM')} />
          <Insights entries={entries} />
        </div>
      )}
      
      {activeView === 'FORM' && user && (
        <WellnessForm user={user} onComplete={async () => {
          await refreshData(user);
          setActiveView('DASHBOARD');
        }} />
      )}

      {activeView === 'INSIGHTS' && (
        <Insights entries={entries} />
      )}

      {activeView === 'COACH_DASHBOARD' && user && (
        <CoachDashboard 
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

      {activeView === 'MANAGE_ATHLETES' && user && (
        <ManageAthletes 
          allAthletes={allAthletes} 
          coachedAthletes={coachedAthletes}
          coachId={user.id}
          onRefresh={() => refreshData(user)}
        />
      )}
    </Layout>
  );
};

export default App;
