
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { storageService } from '../services/storageService';

interface OnboardingProps {
  user: User;
  onComplete: (updatedUser: User) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ user, onComplete }) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('ATHLETE');
  const [firstName, setFirstName] = useState(user.firstName || '');
  const [lastName, setLastName] = useState(user.lastName || '');
  const [loading, setLoading] = useState(false);

  const handleComplete = async () => {
    if (!firstName || !lastName) {
      alert("Please confirm your name to continue.");
      return;
    }
    setLoading(true);
    try {
      const updatedUser = await storageService.completeOnboarding(user.id, firstName, lastName, selectedRole);
      onComplete(updatedUser);
    } catch (err: any) {
      alert("Setup failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-12 animate-in fade-in zoom-in-95 duration-500">
      <div className="text-center space-y-3">
        <h2 className="text-4xl font-black text-slate-900 tracking-tight">Identity Verification</h2>
        <p className="text-slate-500 font-medium">How will you be using the PerHea Performance Arena?</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Athlete Card */}
        <button 
          onClick={() => setSelectedRole('ATHLETE')}
          className={`relative p-8 rounded-[2.5rem] text-left transition-all border-4 ${selectedRole === 'ATHLETE' ? 'bg-indigo-600 border-indigo-200 shadow-2xl shadow-indigo-200 scale-105 z-10' : 'bg-white border-slate-50 opacity-60 hover:opacity-100 hover:scale-102'}`}
        >
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-6 ${selectedRole === 'ATHLETE' ? 'bg-white/20' : 'bg-slate-50'}`}>
            🏃
          </div>
          <h3 className={`text-xl font-black mb-2 ${selectedRole === 'ATHLETE' ? 'text-white' : 'text-slate-900'}`}>I am an Athlete</h3>
          <p className={`text-sm font-medium leading-relaxed ${selectedRole === 'ATHLETE' ? 'text-indigo-100' : 'text-slate-500'}`}>
            Reporting daily wellness, monitoring internal load, and optimizing my recovery cycle.
          </p>
          {selectedRole === 'ATHLETE' && (
            <div className="absolute top-6 right-6 w-6 h-6 bg-white rounded-full flex items-center justify-center text-indigo-600 font-black">✓</div>
          )}
        </button>

        {/* Coach Card */}
        <button 
          onClick={() => setSelectedRole('COACH')}
          className={`relative p-8 rounded-[2.5rem] text-left transition-all border-4 ${selectedRole === 'COACH' ? 'bg-slate-900 border-slate-700 shadow-2xl shadow-slate-200 scale-105 z-10' : 'bg-white border-slate-50 opacity-60 hover:opacity-100 hover:scale-102'}`}
        >
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-6 ${selectedRole === 'COACH' ? 'bg-white/10' : 'bg-slate-50'}`}>
            📋
          </div>
          <h3 className={`text-xl font-black mb-2 ${selectedRole === 'COACH' ? 'text-white' : 'text-slate-900'}`}>I am a Coach</h3>
          <p className={`text-sm font-medium leading-relaxed ${selectedRole === 'COACH' ? 'text-slate-400' : 'text-slate-500'}`}>
            Managing a squad, monitoring readiness trends, and adjusting training protocols.
          </p>
          {selectedRole === 'COACH' && (
            <div className="absolute top-6 right-6 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center text-white font-black">✓</div>
          )}
        </button>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
        <div className="text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Confirm Display Name</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase ml-2">First Name</label>
            <input 
              type="text" 
              value={firstName} 
              onChange={e => setFirstName(e.target.value)}
              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 font-bold text-slate-900" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase ml-2">Last Name</label>
            <input 
              type="text" 
              value={lastName} 
              onChange={e => setLastName(e.target.value)}
              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 font-bold text-slate-900" 
            />
          </div>
        </div>
      </div>

      <button 
        onClick={handleComplete}
        disabled={loading}
        className="w-full py-6 bg-indigo-600 text-white font-black rounded-[2rem] shadow-xl shadow-indigo-100 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
      >
        {loading ? 'INITIALIZING ARENA...' : 'CONFIRM MY IDENTITY'}
      </button>
    </div>
  );
};

export default Onboarding;
