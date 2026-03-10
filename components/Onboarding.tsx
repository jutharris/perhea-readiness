
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { storageService } from '../services/storageService';
import Logo from './Logo';

interface OnboardingProps {
  user: User;
  onComplete: (updatedUser: User) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ user, onComplete }) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('ATHLETE');
  const [firstName, setFirstName] = useState(user.firstName || '');
  const [lastName, setLastName] = useState(user.lastName || '');
  const [birthDate, setBirthDate] = useState('');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  const [hasWearable, setHasWearable] = useState(true);
  const [loading, setLoading] = useState(false);

  // Sync if props update during mount
  useEffect(() => {
    if (user.firstName && !firstName) setFirstName(user.firstName);
    if (user.lastName && !lastName) setLastName(user.lastName);
  }, [user, firstName, lastName]);

  const handleComplete = async () => {
    if (!firstName || !lastName) {
      alert("Please confirm your name to continue.");
      return;
    }
    if (!birthDate) {
      alert("Please enter your birth date to calibrate your protocols.");
      return;
    }
    setLoading(true);
    try {
      const updatedUser = await storageService.initializeProfile(user.id, user.email, firstName, lastName, selectedRole, birthDate, hasWearable, timezone);
      onComplete(updatedUser);
    } catch (err: any) {
      console.error("Initialization Failed:", err);
      alert("Setup failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-10 animate-in fade-in zoom-in-95 duration-700">
      <div className="flex justify-center mb-4">
        <Logo size="lg" />
      </div>
      <div className="text-center space-y-3">
        <h2 className="text-4xl font-black text-slate-900 tracking-tight">Identity Verification</h2>
        <p className="text-slate-500 font-medium">Define your role within the PerHea Performance Arena.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Athlete Selection */}
        <button 
          onClick={() => setSelectedRole('ATHLETE')}
          className={`group relative p-8 rounded-[2rem] text-left transition-all border-2 ${selectedRole === 'ATHLETE' ? 'bg-indigo-600 border-indigo-400 shadow-2xl shadow-indigo-100 scale-[1.02] z-10' : 'bg-white border-slate-100 opacity-60 hover:opacity-100 hover:border-slate-200'}`}
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 transition-colors ${selectedRole === 'ATHLETE' ? 'bg-white/20' : 'bg-slate-50'}`}>
            <svg className={`w-6 h-6 ${selectedRole === 'ATHLETE' ? 'text-white' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className={`text-lg font-black mb-2 tracking-tight ${selectedRole === 'ATHLETE' ? 'text-white' : 'text-slate-900'}`}>PERFORMANCE ATHLETE</h3>
          <p className={`text-xs font-medium leading-relaxed ${selectedRole === 'ATHLETE' ? 'text-indigo-100' : 'text-slate-400'}`}>Report internal load metrics, track daily readiness, and optimize recovery protocols.</p>
          {selectedRole === 'ATHLETE' && <div className="absolute top-6 right-6 w-5 h-5 bg-white rounded-full flex items-center justify-center text-indigo-600 text-[10px] font-black">OK</div>}
        </button>

        {/* Coach Selection */}
        <button 
          onClick={() => setSelectedRole('COACH')}
          className={`group relative p-8 rounded-[2rem] text-left transition-all border-2 ${selectedRole === 'COACH' ? 'bg-slate-900 border-slate-700 shadow-2xl shadow-slate-200 scale-[1.02] z-10' : 'bg-white border-slate-100 opacity-60 hover:opacity-100 hover:border-slate-200'}`}
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 transition-colors ${selectedRole === 'COACH' ? 'bg-white/10' : 'bg-slate-50'}`}>
            <svg className={`w-6 h-6 ${selectedRole === 'COACH' ? 'text-indigo-400' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <h3 className={`text-lg font-black mb-2 tracking-tight ${selectedRole === 'COACH' ? 'text-white' : 'text-slate-900'}`}>SQUAD COMMAND</h3>
          <p className={`text-xs font-medium leading-relaxed ${selectedRole === 'COACH' ? 'text-slate-400' : 'text-slate-400'}`}>Manage athlete squads, monitor intervention flags, and issue remote performance protocols.</p>
          {selectedRole === 'COACH' && <div className="absolute top-6 right-6 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center text-white text-[10px] font-black">OK</div>}
        </button>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8">
        <div className="flex items-center gap-4">
            <div className="w-1 h-8 bg-indigo-600 rounded-full"></div>
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verify Profile Information</h4>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-300 uppercase ml-2 tracking-tighter">Legal First Name</label>
            <input 
              type="text" 
              value={firstName} 
              placeholder="First Name"
              onChange={e => setFirstName(e.target.value)} 
              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 font-bold text-slate-900 placeholder:text-slate-200 transition-all" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-300 uppercase ml-2 tracking-tighter">Legal Last Name</label>
            <input 
              type="text" 
              value={lastName} 
              placeholder="Last Name"
              onChange={e => setLastName(e.target.value)} 
              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 font-bold text-slate-900 placeholder:text-slate-200 transition-all" 
            />
          </div>
        </div>

        <div className="space-y-2 pt-4 animate-in fade-in slide-in-from-top-2 duration-500">
          <label className="text-[10px] font-black text-slate-300 uppercase ml-2 tracking-tighter">Date of Birth</label>
          <input 
            type="date" 
            value={birthDate}
            onChange={e => setBirthDate(e.target.value)}
            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 font-bold text-slate-900 transition-all" 
          />
          <p className="text-[10px] text-slate-400 italic ml-2">Used to calibrate heart rate zones and submax protocols.</p>
        </div>

        <div className="space-y-2 pt-4">
          <label className="text-[10px] font-black text-slate-300 uppercase ml-2 tracking-tighter">Timezone</label>
          <select 
            value={timezone}
            onChange={e => setTimezone(e.target.value)}
            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 font-bold text-slate-900 transition-all appearance-none"
          >
            {Intl.supportedValuesOf('timeZone').map(tz => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
          <p className="text-[10px] text-slate-400 italic ml-2">Ensures your daily reset happens while you sleep.</p>
        </div>

        {selectedRole === 'ATHLETE' && (
          <div className="flex items-center gap-4 p-6 bg-slate-50 rounded-2xl border border-slate-100 transition-all hover:border-indigo-100">
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-900">Wearable Device Integration</p>
              <p className="text-[10px] text-slate-400 font-medium">Do you use a Garmin, Apple Watch, Oura, or similar device?</p>
            </div>
            <button 
              type="button"
              onClick={() => setHasWearable(!hasWearable)}
              className={`w-12 h-6 rounded-full transition-all relative ${hasWearable ? 'bg-indigo-600' : 'bg-slate-200'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${hasWearable ? 'left-7' : 'left-1'}`}></div>
            </button>
          </div>
        )}
      </div>

      <button 
        onClick={handleComplete} 
        disabled={loading} 
        className="group relative w-full py-6 bg-slate-900 text-white font-black rounded-[2rem] shadow-2xl shadow-slate-200 hover:bg-black active:scale-[0.99] transition-all disabled:opacity-50 overflow-hidden"
      >
        <span className="relative z-10 tracking-widest uppercase">
          {loading ? 'CALIBRATING SYSTEM...' : 'CONFIRM MY IDENTITY'}
        </span>
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-indigo-500 opacity-0 group-hover:opacity-10 transition-opacity"></div>
      </button>
    </div>
  );
};

export default Onboarding;
