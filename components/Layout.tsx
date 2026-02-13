
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

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-100">P</div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">PerHea</h1>
          </div>
          {user && (
            <button onClick={onLogout} className="text-xs font-black text-rose-600 uppercase tracking-widest bg-rose-50 px-4 py-2 rounded-lg hover:bg-rose-100 transition">Logout</button>
          )}
        </div>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-6 py-8 mb-24">
        {children}
      </main>

      {user && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-8 py-4 flex justify-around items-center sm:max-w-md sm:mx-auto sm:mb-6 sm:rounded-[2.5rem] sm:border sm:shadow-2xl">
          {isCoach ? (
            <>
              <button onClick={() => setView('COACH_DASHBOARD')} className={`flex flex-col items-center ${activeView === 'COACH_DASHBOARD' ? 'text-indigo-600' : 'text-slate-300'}`}>
                <div className="w-6 h-6 flex items-center justify-center"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857" /></svg></div>
                <span className="text-[10px] font-black mt-1 uppercase">Squad</span>
              </button>
              <button onClick={() => setView('MANAGE_ATHLETES')} className={`flex flex-col items-center ${activeView === 'MANAGE_ATHLETES' ? 'text-indigo-600' : 'text-slate-300'}`}>
                <div className="w-6 h-6 flex items-center justify-center"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg></div>
                <span className="text-[10px] font-black mt-1 uppercase">Manage</span>
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setView('DASHBOARD')} className={`flex flex-col items-center ${activeView === 'DASHBOARD' ? 'text-indigo-600' : 'text-slate-300'}`}>
                <div className="w-6 h-6 flex items-center justify-center"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3" /></svg></div>
                <span className="text-[10px] font-black mt-1 uppercase">Home</span>
              </button>
              <button onClick={() => setView('FORM')} className={`flex flex-col items-center ${activeView === 'FORM' ? 'text-indigo-600' : 'text-slate-300'}`}>
                <div className="w-6 h-6 flex items-center justify-center"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg></div>
                <span className="text-[10px] font-black mt-1 uppercase">Report</span>
              </button>
            </>
          )}
        </nav>
      )}
    </div>
  );
};

export default Layout;
