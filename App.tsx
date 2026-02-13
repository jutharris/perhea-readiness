
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import WellnessForm from './components/WellnessForm';
import Dashboard from './components/Dashboard';
import Insights from './components/Insights';
import CoachDashboard from './components/CoachDashboard';
import AthleteDetail from './components/AthleteDetail';
import ManageAthletes from './components/ManageAthletes';
import { storageService } from './services/storageService';
import { User, WellnessEntry, View, UserRole } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<View>('LOGIN');
  const [entries, setEntries] = useState<WellnessEntry[]>([]);
  const [allEntries, setAllEntries] = useState<WellnessEntry[]>([]);
  const [allAthletes, setAllAthletes] = useState<User[]>([]);
  const [coachedAthletes, setCoachedAthletes] = useState<User[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState<User | null>(null);
  const [loginForm, setLoginForm] = useState({ email: '', name: '', role: 'ATHLETE' as UserRole });
  const [loading, setLoading] = useState(false);
  const [initChecked, setInitChecked] = useState(false);

  const refreshData = async (currentUser: User) => {
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
      const currentUser = storageService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        setActiveView(currentUser.role === 'COACH' ? 'COACH_DASHBOARD' : 'DASHBOARD');
        await refreshData(currentUser);
      }
      setInitChecked(true);
    };
    checkSession();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginForm.email || !loginForm.name) return;
    setLoading(true);
    try {
      const loggedUser = await storageService.login(loginForm.email, loginForm.name, loginForm.role);
      setUser(loggedUser);
      setActiveView(loggedUser.role === 'COACH' ? 'COACH_DASHBOARD' : 'DASHBOARD');
      await refreshData(loggedUser);
    } catch (err) {
      alert("Database Connection Failed. Ensure your Supabase URL and Keys are correctly set.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    storageService.logout();
    setUser(null);
    setActiveView('LOGIN');
    setEntries([]);
  };

  if (!initChecked) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
       <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (activeView === 'LOGIN') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="inline-flex w-20 h-20 bg-indigo-600 rounded-[2rem] items-center justify-center text-white text-4xl font-bold shadow-2xl shadow-indigo-200 mb-8 transform -rotate-3 hover:rotate-0 transition-transform">P</div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">PerHea Readiness</h1>
            <p className="text-slate-400 font-semibold mt-2">Elite Performance Logic</p>
          </div>
          <form onSubmit={handleLogin} className="mt-8 space-y-6 bg-white p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100">
            <div className="flex bg-slate-50 p-1.5 rounded-2xl mb-8 border border-slate-100">
              {(['ATHLETE', 'COACH'] as UserRole[]).map(r => (
                <button key={r} type="button" onClick={() => setLoginForm(prev => ({ ...prev, role: r }))} className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${loginForm.role === r ? 'bg-white text-indigo-600 shadow-md scale-[1.02]' : 'text-slate-400 hover:text-slate-600'}`}>
                  {r}
                </button>
              ))}
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                <input type="text" required value={loginForm.name} onChange={(e) => setLoginForm(prev => ({ ...prev, name: e.target.value }))} className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 outline-none focus:ring-4 focus:ring-indigo-50 focus:bg-white transition-all text-sm font-bold" placeholder="e.g. Cristiano Ronaldo" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                <input type="email" required value={loginForm.email} onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))} className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 outline-none focus:ring-4 focus:ring-indigo-50 focus:bg-white transition-all text-sm font-bold" placeholder="athlete@perhea.com" />
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-200 hover:bg-indigo-700 active:scale-[0.98] transition-all flex justify-center items-center gap-3">
              {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'ENTER ARENA'}
            </button>
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
          onViewAthlete={(a) => {
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
