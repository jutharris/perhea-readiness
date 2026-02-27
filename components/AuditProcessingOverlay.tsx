
import React from 'react';

interface Props {
  step: 'LOADING' | 'COMPARING';
}

const AuditProcessingOverlay: React.FC<Props> = ({ step }) => {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-white/90 backdrop-blur-md animate-in fade-in duration-500">
      <div className="bg-white p-12 rounded-[3rem] shadow-2xl border border-slate-100 flex flex-col items-center gap-8 max-w-sm w-full mx-4 animate-in zoom-in-95 duration-500">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse" />
          </div>
        </div>
        
        <div className="text-center space-y-3">
          <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">
            {step === 'LOADING' ? 'Insights loading...' : 'Comparing today\'s entry to your baseline...'}
          </p>
          <div className="flex justify-center gap-1">
            <div className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${step === 'LOADING' ? 'bg-indigo-600 scale-125' : 'bg-slate-200'}`} />
            <div className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${step === 'COMPARING' ? 'bg-indigo-600 scale-125' : 'bg-slate-200'}`} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditProcessingOverlay;
