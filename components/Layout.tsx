
import React from 'react';
import { View, User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeView: View;
  setView: (view: View) => void;
  user: User | null;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeView, setView, user, onLogout }) => {
  const isCoach = user?.role === 'COACH';
  const isPending = user?.role === 'PENDING';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black text-lg">P</div>
            <h1 className="text-lg font-black text-slate-900">PerHea</h1>
          </div>
          {user && (
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-3 py-1 rounded-full uppercase tracking-widest">{user.role}</span>
              <button onClick={onLogout} className="text-[10px] font-bold text-rose-500 hover:text-rose-600">Logout</button>
            </div>
          )}
        </div>
      </header>
      <main className="flex-1 w-full max-w-4xl mx-auto px-6 py-8 pb-32">
        {children}
      </main>
      {user && !isPending && (
        <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-lg px-8 py-4 flex space-x-12 rounded-[2rem] shadow-2xl border border-white/10">
          {isCoach ? (
            <>
              <button onClick={() => setView('COACH_DASHBOARD')} className={`text-xs font-black transition-colors ${activeView === 'COACH_DASHBOARD' ? 'text-indigo-400' : 'text-slate-400'}`}>SQUAD</button>
            </>
          ) : (
            <>
              <button onClick={() => setView('DASHBOARD')} className={`text-xs font-black transition-colors ${activeView === 'DASHBOARD' ? 'text-indigo-400' : 'text-slate-400'}`}>READY</button>
              <button onClick={() => setView('FORM')} className={`text-xs font-black transition-colors ${activeView === 'FORM' ? 'text-indigo-400' : 'text-slate-400'}`}>REPORT</button>
            </>
          )}
        </nav>
      )}
    </div>
  );
};

export default Layout;
