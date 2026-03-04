
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { storageService } from '../services/storageService';
import { 
  Activity, Users, Zap, Shield, 
  AlertCircle, Clock, 
  Search, ArrowLeft, RefreshCw
} from 'lucide-react';

interface AdminDashboardProps {
  onBack: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PREMIUM' | 'FROZEN'>('ALL');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [allUsers, globalMetrics] = await Promise.all([
        storageService.getAllUsers(),
        storageService.getGlobalMetrics()
      ]);
      setUsers(allUsers);
      setMetrics(globalMetrics);
    } catch (err) {
      console.error("Error fetching admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleStatus = async (userId: string, field: 'isPremium' | 'isFrozen', currentVal: boolean) => {
    try {
      setLoading(true);
      await storageService.updateUserStatus(userId, { [field]: !currentVal });
      await fetchData();
    } catch (err) {
      alert("Error updating status. Check RLS policies.");
    } finally {
      setLoading(false);
    }
  };

  const queueAlert = async (userId: string) => {
    const msg = prompt("Enter CNS Warning message (or leave blank for default):");
    if (msg === null) return;
    try {
      setLoading(true);
      await storageService.updateUserStatus(userId, { queuedAlert: msg || "CNS Divergence Detected" });
      await fetchData();
      alert("Alert queued for next audit.");
    } catch (err) {
      alert("Error queueing alert. Check RLS policies.");
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || (statusFilter === 'PREMIUM' && u.isPremium) || (statusFilter === 'FROZEN' && u.isFrozen);
    return matchesSearch && matchesStatus;
  });

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-4">
              <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div>
                <h1 className="text-xl font-black italic uppercase tracking-tighter text-slate-900">Nerve Center</h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global System Control</p>
              </div>
            </div>
            <button 
              onClick={fetchData} 
              className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className={`w-5 h-5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        {/* Global Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard 
            label="Day-7 Return Rate" 
            value={`${metrics?.day7ReturnRate.toFixed(1)}%`} 
            sub="Retention North Star"
            icon={<Users className="w-5 h-5 text-indigo-600" />}
            color="bg-indigo-50"
          />
          <MetricCard 
            label="Friction Index" 
            value={`${metrics?.frictionIndex.toFixed(1)}%`} 
            sub="Completion vs Open"
            icon={<Zap className="w-5 h-5 text-amber-600" />}
            color="bg-amber-50"
          />
          <MetricCard 
            label="AI Insight ROI" 
            value={`${metrics?.aiInsightROI}%`} 
            sub="Retention Driver"
            icon={<Activity className="w-5 h-5 text-emerald-600" />}
            color="bg-emerald-50"
          />
          <MetricCard 
            label="Submission Consistency" 
            value={`${metrics?.submissionConsistency}%`} 
            sub="Habit Formation"
            icon={<Clock className="w-5 h-5 text-blue-600" />}
            color="bg-blue-50"
          />
        </div>

        {/* Squad Triage */}
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-lg font-black uppercase italic text-slate-900">Squad Triage</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Risk & Engagement Matrix</p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search users..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 w-full"
                />
              </div>
              <select 
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-sm font-bold text-slate-600 outline-none"
              >
                <option value="ALL">ALL</option>
                <option value="PREMIUM">PREMIUM</option>
                <option value="FROZEN">FROZEN</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">User / Identity</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Habit Score</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Divergence</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Active</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map(user => (
                  <UserRow 
                    key={user.id} 
                    user={user} 
                    onToggleStatus={toggleStatus}
                    onQueueAlert={queueAlert}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ label, value, sub, icon, color }: any) => (
  <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
    <div className="flex justify-between items-start">
      <div className={`${color} p-3 rounded-2xl`}>{icon}</div>
      <div className="text-2xl font-black text-slate-900">{value}</div>
    </div>
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="text-[8px] font-bold text-slate-300 uppercase tracking-tighter">{sub}</p>
    </div>
  </div>
);

const UserRow = ({ user, onToggleStatus, onQueueAlert }: { user: User; onToggleStatus: any; onQueueAlert: any }) => {
  const lastActive = user.lastActiveAt ? new Date(user.lastActiveAt) : null;
  const isStale = lastActive && (new Date().getTime() - lastActive.getTime()) > (48 * 60 * 60 * 1000);

  return (
    <tr className="hover:bg-slate-50/50 transition-colors">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-black text-xs">
            {user.firstName[0]}{user.lastName[0]}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">{user.firstName} {user.lastName}</p>
            <p className="text-[10px] text-slate-400 font-medium">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex flex-wrap gap-1">
          {user.isPremium && (
            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[8px] font-black uppercase rounded-md">PREMIUM</span>
          )}
          {user.isFrozen && (
            <span className="px-2 py-1 bg-rose-100 text-rose-700 text-[8px] font-black uppercase rounded-md">FROZEN</span>
          )}
          {user.role === 'ADMIN' && (
            <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-[8px] font-black uppercase rounded-md">ADMIN</span>
          )}
          {!user.isPremium && !user.isFrozen && user.role !== 'ADMIN' && (
            <span className="px-2 py-1 bg-slate-100 text-slate-500 text-[8px] font-black uppercase rounded-md">FREE</span>
          )}
        </div>
      </td>
      <td className="px-6 py-4 text-center">
        <div className="inline-flex items-center justify-center w-8 h-8 bg-slate-100 rounded-lg text-xs font-black text-slate-600">
          8.5
        </div>
      </td>
      <td className="px-6 py-4 text-center">
        <div className="flex flex-col items-center">
          <span className="text-xs font-black text-rose-500">+2.4</span>
          <span className="text-[8px] text-slate-300 font-bold uppercase">Intensity</span>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex flex-col">
          <span className={`text-xs font-bold ${isStale ? 'text-rose-500' : 'text-slate-600'}`}>
            {lastActive ? lastActive.toLocaleDateString() : 'Never'}
          </span>
          <span className="text-[8px] text-slate-300 font-bold uppercase">
            {lastActive ? lastActive.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 text-right">
        <div className="flex justify-end gap-2">
          <button 
            onClick={() => onToggleStatus(user.id, 'isPremium', user.isPremium)}
            className={`p-2 rounded-lg transition-colors ${user.isPremium ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600'}`}
            title={user.isPremium ? "Revoke Premium" : "Grant Premium"}
          >
            <Shield className="w-4 h-4" />
          </button>
          <button 
            onClick={() => onToggleStatus(user.id, 'isFrozen', user.isFrozen)}
            className={`p-2 rounded-lg transition-colors ${user.isFrozen ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-600'}`}
            title={user.isFrozen ? "Unfreeze AI" : "Freeze AI"}
          >
            <Zap className="w-4 h-4" />
          </button>
          <button 
            onClick={() => onQueueAlert(user.id)}
            className={`p-2 rounded-lg transition-colors ${user.queuedAlert ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-400 hover:bg-amber-50 hover:text-amber-600'}`}
            title="Queue CNS Warning"
          >
            <AlertCircle className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
};

export default AdminDashboard;
