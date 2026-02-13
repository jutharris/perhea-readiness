
import React from 'react';
import { storageService } from '../services/storageService';

const ManageAthletes: React.FC<any> = ({ allAthletes, coachedAthletes, coachId, onRefresh }) => {
  const toggle = async (a: any) => {
    if (a.coachId === coachId) await storageService.removeAthleteFromCoach(a.id);
    else await storageService.assignAthleteToCoach(a.id, coachId);
    onRefresh();
  };
  return (
    <div className="space-y-8">
      <h2 className="text-4xl font-black text-slate-900">Manage Squad</h2>
      <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden divide-y divide-slate-50">
        {allAthletes.map((a: any) => (
          <div key={a.id} className="p-6 flex items-center justify-between">
            <div><p className="font-bold">{a.name}</p><p className="text-[10px] text-slate-400">{a.email}</p></div>
            <button onClick={() => toggle(a)} className={`px-6 py-2 rounded-xl text-[10px] font-black ${a.coachId === coachId ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}>
              {a.coachId === coachId ? 'REMOVE' : 'ADD'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ManageAthletes;
