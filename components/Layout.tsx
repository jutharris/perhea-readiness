
import React from 'react';
import { View, User } from '../types';
import Logo from './Logo';

interface LayoutProps {
  children: React.ReactNode;
  activeView: View;
  setView: (view: View) => void;
  user: User | null;
  onLogout: () => void;
  hideNav?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, activeView, setView, user, onLogout, hideNav }) => {
  const isCoach = user?.role === 'COACH';
  const isPending = user?.role === 'PENDING';
  const isAdminView = activeView === 'ADMIN_DASHBOARD' || activeView === 'CREATOR_LAB';

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-500 ${isAdminView ? 'bg-slate-950' : 'bg-slate-50'}`}>
      <header className={`${isAdminView ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-100'} backdrop-blur-md border-b sticky top-0 z-50 transition-colors duration-500`}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <Logo size="sm" inverted={isAdminView} />
          {user && (
            <div className="flex items-center gap-4">
              <span className={`text-[10px] font-black ${isAdminView ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-400 bg-slate-50'} px-3 py-1 rounded-full uppercase tracking-widest transition-colors`}>{user.role}</span>
              <button onClick={onLogout} className="text-[10px] font-bold text-rose-500 hover:text-rose-600">Logout</button>
            </div>
          )}
        </div>
      </header>
      <main className="flex-1 w-full max-w-4xl mx-auto px-6 py-8 pb-32">
        {children}
      </main>
      {user && !isPending && !hideNav && (
        <nav className={`fixed bottom-8 left-1/2 -translate-x-1/2 ${isAdminView ? 'bg-slate-800/90' : 'bg-slate-900/90'} backdrop-blur-lg px-8 py-4 flex items-center space-x-12 rounded-[2rem] shadow-2xl border ${isAdminView ? 'border-indigo-500/30' : 'border-white/10'} z-50 transition-all duration-500`}>
          {user.role === 'ADMIN' ? (
            <>
              <button onClick={() => setView('ADMIN_DASHBOARD')} className={`text-xs font-black transition-colors ${activeView === 'ADMIN_DASHBOARD' ? 'text-indigo-400' : 'text-slate-400'}`}>SYSTEM</button>
              <button onClick={() => setView('COACH_DASHBOARD')} className={`text-xs font-black transition-colors ${activeView === 'COACH_DASHBOARD' ? 'text-indigo-400' : 'text-slate-400'}`}>SQUAD</button>
            </>
          ) : isCoach ? (
            <>
              <button onClick={() => setView('COACH_DASHBOARD')} className={`text-xs font-black transition-colors ${activeView === 'COACH_DASHBOARD' ? 'text-indigo-400' : 'text-slate-400'}`}>SQUAD</button>
            </>
          ) : (
            <>
              <button onClick={() => setView('DASHBOARD')} className={`text-xs font-black transition-colors ${activeView === 'DASHBOARD' ? 'text-indigo-400' : 'text-slate-400'}`}>READY</button>
              <button onClick={() => setView('TRENDS')} className={`text-xs font-black transition-colors ${activeView === 'TRENDS' ? 'text-indigo-400' : 'text-slate-400'}`}>TRENDS</button>
              <button onClick={() => setView('SUBMAX_LAB')} className={`text-xs font-black transition-colors ${activeView === 'SUBMAX_LAB' ? 'text-indigo-400' : 'text-slate-400'}`}>LAB</button>
            </>
          )}
        </nav>
      )}
    </div>
  );
};

export default Layout;
