
import React, { useState, useEffect, useMemo } from 'react';
import { User, SystemCalibration, WellnessEntry, EducationSnippet } from '../types';
import { storageService } from '../services/storageService';
import { generateEducationSnippets } from '../services/geminiService';
import { 
  Activity, Users, Zap, Shield, 
  AlertCircle, Clock, Watch,
  Search, ArrowLeft, RefreshCw,
  Settings, Save, BookOpen, Sparkles, Trash2, CheckCircle, XCircle
} from 'lucide-react';

interface AdminDashboardProps {
  onBack: () => void;
  onOpenCreatorLab: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack, onOpenCreatorLab }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [calibration, setCalibration] = useState<SystemCalibration | null>(null);
  const [allEntries, setAllEntries] = useState<WellnessEntry[]>([]);
  const [snippets, setSnippets] = useState<EducationSnippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingCalibration, setSavingCalibration] = useState(false);
  const [generatingSnippets, setGeneratingSnippets] = useState(false);
  const [snippetTheme, setSnippetTheme] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PREMIUM' | 'FROZEN'>('ALL');
  const [growthTimeframe, setGrowthTimeframe] = useState<'day' | 'week' | 'month' | 'year'>('week');
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'USERS' | 'CALIBRATION' | 'EDUCATION'>('USERS');
  const [modalState, setModalState] = useState<{ isOpen: boolean; title: string; message: string; type: 'alert' | 'confirm'; onConfirm?: () => void }>({ isOpen: false, title: '', message: '', type: 'alert' });

  const showAlert = (title: string, message: string) => {
    setModalState({ isOpen: true, title, message, type: 'alert' });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setModalState({ isOpen: true, title, message, type: 'confirm', onConfirm });
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [nerveData, systemCalibration, educationSnippets] = await Promise.all([
        storageService.getAdminNerveCenter(),
        storageService.getSystemCalibration(),
        storageService.getEducationSnippets()
      ]);

      setUsers(nerveData.users);
      setMetrics(nerveData.metrics);
      setAllEntries(nerveData.entries);
      setCalibration(systemCalibration);
      setSnippets(educationSnippets);
    } catch (err: any) {
      console.error("Error fetching admin data:", err);
      setError(err.message || "Failed to sync with Nerve Center. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleStatus = async (userId: string, field: 'isPremium' | 'isFrozen' | 'hasWearable', currentVal: boolean) => {
    try {
      setLoading(true);
      await storageService.updateUserStatus(userId, { [field]: !currentVal });
      await fetchData();
    } catch {
      showAlert("Error", "Error updating status. Check RLS policies.");
    } finally {
      setLoading(false);
    }
  };

  const queueAlert = async (userId: string) => {
    // We can't easily replace prompt with our simple modal without adding an input field to the modal state.
    // For now, we'll keep prompt or just use a default message. Let's use a default message to avoid prompt.
    showConfirm("Queue Alert", "Queue a CNS Divergence Warning for this user?", async () => {
      try {
        setLoading(true);
        await storageService.updateUserStatus(userId, { queuedAlert: "CNS Divergence Detected" });
        await fetchData();
        showAlert("Success", "Alert queued for next audit.");
      } catch {
        showAlert("Error", "Error queueing alert. Check RLS policies.");
      } finally {
        setLoading(false);
      }
    });
  };

  const handleUpdateCalibration = async () => {
    if (!calibration) return;
    setSavingCalibration(true);
    try {
      await storageService.updateSystemCalibration(calibration);
      showAlert("Success", "System calibration updated successfully.");
    } catch (err) {
      console.error("Error updating calibration:", err);
      showAlert("Error", "Failed to update calibration.");
    } finally {
      setSavingCalibration(false);
    }
  };

  const handleGenerateSnippets = async () => {
    if (!snippetTheme.trim()) return;
    setGeneratingSnippets(true);
    try {
      const newSnippets = await generateEducationSnippets(snippetTheme);
      if (newSnippets.length > 0) {
        // Default to approved = false so admin can review
        const toSave = newSnippets.map(s => ({ ...s, approved: false }));
        await storageService.saveEducationSnippets(toSave);
        await fetchData();
        setSnippetTheme('');
        showAlert("Success", `Generated ${newSnippets.length} new snippets for review.`);
      } else {
        showAlert("Error", "Failed to generate snippets. Please try again.");
      }
    } catch (err) {
      console.error("Error generating snippets:", err);
      showAlert("Error", "Error generating snippets.");
    } finally {
      setGeneratingSnippets(false);
    }
  };

  const toggleSnippetApproval = async (id: string, currentStatus: boolean) => {
    try {
      await storageService.updateEducationSnippet(id, { approved: !currentStatus });
      setSnippets(snippets.map(s => s.id === id ? { ...s, approved: !currentStatus } : s));
    } catch (err) {
      showAlert("Error", "Failed to update snippet.");
    }
  };

  const deleteSnippet = async (id: string) => {
    showConfirm("Delete Snippet", "Are you sure you want to delete this snippet?", async () => {
      try {
        await storageService.deleteEducationSnippet(id);
        setSnippets(snippets.filter(s => s.id !== id));
      } catch (err) {
        showAlert("Error", "Failed to delete snippet.");
      }
    });
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || (statusFilter === 'PREMIUM' && u.isPremium) || (statusFilter === 'FROZEN' && u.isFrozen);
    return matchesSearch && matchesStatus;
  });

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="max-w-md w-full p-8 bg-slate-900 rounded-[2rem] border border-rose-500/30 text-center space-y-6">
          <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-rose-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-white uppercase italic">Sync Failed</h2>
            <p className="text-sm text-slate-400 font-medium leading-relaxed">{error}</p>
          </div>
          <button 
            onClick={fetchData}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-2xl uppercase tracking-widest transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Retry Connection
          </button>
          <button 
            onClick={onBack}
            className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-black rounded-2xl uppercase tracking-widest transition-all"
          >
            Abort to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (loading || !metrics) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
          <p className="text-slate-500 text-xs font-black uppercase tracking-widest animate-pulse">Syncing Nerve Center...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-20 text-slate-100">
      {/* Header */}
      <div className="bg-slate-900/50 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-4">
              <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
                <ArrowLeft className="w-5 h-5 text-slate-400" />
              </button>
              <div>
                <h1 className="text-xl font-black italic uppercase tracking-tighter text-white">Nerve Center</h1>
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Global System Control</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={onOpenCreatorLab}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black rounded-xl uppercase tracking-widest transition-all shadow-lg shadow-indigo-900/20"
              >
                <Zap className="w-3 h-3 fill-white" />
                Creator Lab
              </button>
              <button 
                onClick={fetchData} 
                className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors"
                title="Refresh Data"
              >
                <RefreshCw className={`w-5 h-5 text-slate-300 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        {/* Tabs */}
        <div className="flex space-x-2 border-b border-slate-800 pb-4">
          <button
            onClick={() => setActiveTab('USERS')}
            className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'USERS' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4 inline-block mr-2" />
            Athletes
          </button>
          <button
            onClick={() => setActiveTab('CALIBRATION')}
            className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'CALIBRATION' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4 inline-block mr-2" />
            Calibration
          </button>
          <button
            onClick={() => setActiveTab('EDUCATION')}
            className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'EDUCATION' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4 inline-block mr-2" />
            Education Engine
          </button>
        </div>

        {activeTab === 'CALIBRATION' && (
          <>
            {/* Global Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard 
            label="Day-7 Return Rate" 
            value={`${(metrics?.day7ReturnRate || 0).toFixed(1)}%`} 
            sub="Retention North Star"
            icon={<Users className="w-5 h-5 text-indigo-400" />}
            color="bg-indigo-500/10"
            tooltip="The % of your athletes who have logged in at least once in the last week. This is your 'Stickiness' score—if this is low, athletes are forgetting the app exists."
          />
          <MetricCard 
            label="Friction Index" 
            value={`${(metrics?.frictionIndex || 0).toFixed(1)}%`} 
            sub="Completion vs Open"
            icon={<Zap className="w-5 h-5 text-amber-400" />}
            color="bg-amber-500/10"
            tooltip="The ratio of completed forms vs. app opens. If this is low, it means athletes are opening the app but closing it because the form feels like too much work."
          />
          <MetricCard 
            label="AI Insight ROI" 
            value={`${metrics?.aiInsightROI}%`} 
            sub="Retention Driver"
            icon={<Activity className="w-5 h-5 text-emerald-400" />}
            color="bg-emerald-500/10"
            tooltip="The % of logs where athletes actually engaged with the AI feedback. High ROI means the AI is actually changing their behavior, not just being ignored."
          />
          <MetricCard 
            label="Submission Consistency" 
            value={`${metrics?.submissionConsistency}%`} 
            sub="Habit Formation"
            icon={<Clock className="w-5 h-5 text-blue-400" />}
            color="bg-blue-500/10"
            tooltip="Measures how 'robotic' the habit is. High consistency means they log at the exact same time every day (e.g., 7:00 AM), which is the strongest sign of a long-term habit."
          />
        </div>

        {/* System Calibration Panel */}
        <div className="bg-slate-900/50 rounded-[2rem] border border-slate-800 p-8 space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-black uppercase italic text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-400" />
                System Calibration
              </h2>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Regime Engine Thresholds & Sensitivity</p>
            </div>
            <button
              onClick={handleUpdateCalibration}
              disabled={savingCalibration}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-[10px] font-black rounded-xl uppercase tracking-widest transition-all shadow-lg shadow-emerald-900/20"
            >
              <Save className="w-3 h-3" />
              {savingCalibration ? 'Saving...' : 'Commit Changes'}
            </button>
          </div>

          {calibration && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <CalibrationSlider
                label="Volatility Sensitivity"
                sub="Standard Deviation Threshold"
                value={calibration.volatilityThreshold}
                min={0.5}
                max={3.0}
                step={0.1}
                onChange={(v) => setCalibration({ ...calibration, volatilityThreshold: v })}
                tooltip="How much 'noise' (std dev) is allowed in a metric before it's flagged as VOLATILE. Lower = more sensitive."
              />
              <CalibrationSlider
                label="Decoupling Sensitivity"
                sub="Covariance Drift Threshold"
                value={calibration.decouplingThreshold}
                min={0.1}
                max={2.0}
                step={0.1}
                onChange={(v) => setCalibration({ ...calibration, decouplingThreshold: v })}
                tooltip="The amount of drift required between two metrics to trigger a trend flag. Lower = more sensitive to decoupling."
              />
              <CalibrationSlider
                label="Identity Weight"
                sub="Long-term vs Short-term Bias"
                value={calibration.identityWeight}
                min={0.1}
                max={0.9}
                step={0.05}
                onChange={(v) => setCalibration({ ...calibration, identityWeight: v })}
                tooltip="Weight given to the 50-day 'Biological Law' vs. the 7-day 'Vibe'. Higher = more weight to long-term baseline."
              />
              <CalibrationSlider
                label="Systemic Stress Floor"
                sub="Restoration Trigger Point"
                value={calibration.systemicStressFloor}
                min={40}
                max={80}
                step={1}
                onChange={(v) => setCalibration({ ...calibration, systemicStressFloor: v })}
                unit="%"
                tooltip="The aggregate wellness percentage that automatically triggers Restoration mode. Higher = more protective."
              />
            </div>
          )}
        </div>
        
        {/* Growth & Vitality Matrix */}
        <div className="bg-slate-900/50 rounded-[2rem] border border-slate-800 p-8 space-y-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-lg font-black uppercase italic text-white">Growth & Vitality Matrix</h2>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Investor Readiness & Ecosystem Health</p>
            </div>
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
              {(['day', 'week', 'month', 'year'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setGrowthTimeframe(t)}
                  className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                    growthTimeframe === t 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' 
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <GrowthMetric 
              label="Total Ecosystem" 
              value={metrics?.totalUsers || 0} 
              sub="Total Registered Users"
              trend={[30, 40, 35, 50, 45, 60, 75]}
              tooltip="Total number of users currently in the system, including athletes, coaches, and admins."
            />
            <GrowthMetric 
              label="Acquisition Velocity" 
              value={metrics?.newUsers?.[growthTimeframe] || 0} 
              sub={`New Users (${growthTimeframe})`}
              trend={[10, 15, 8, 12, 20, 18, 25]}
              color="text-emerald-400"
              tooltip="The rate at which new athletes are joining the platform within the selected timeframe."
            />
            <GrowthMetric 
              label="Lindy Milestone" 
              value={metrics?.users30Days || 0} 
              sub="Users at 30+ Days"
              trend={[5, 8, 12, 15, 18, 22, 28]}
              color="text-indigo-400"
              tooltip="Users who have survived the first 30 days. This is a key indicator of long-term retention and product-market fit."
            />
            <GrowthMetric 
              label="Churn Warning" 
              value={metrics?.inactiveUsers7Days || 0} 
              sub="Inactive (7 Days)"
              trend={[12, 10, 15, 8, 5, 7, 4]}
              color="text-rose-400"
              tooltip="Athletes who have not logged any data in the last 7 days. These users are at high risk of churning."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-slate-800">
            <div className="flex items-center gap-4 p-4 bg-slate-950/50 rounded-2xl border border-slate-800/50 group relative">
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-[9px] font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                Measures daily engagement relative to monthly active users. Higher is stickier.
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                <Activity className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Stickiness Ratio</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-black text-white">{(metrics?.stickinessRatio || 0).toFixed(1)}%</span>
                  <span className="text-[8px] font-bold text-slate-600 uppercase">DAU/MAU</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-slate-950/50 rounded-2xl border border-slate-800/50 group relative">
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-[9px] font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                The average number of new users invited by each existing user.
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Viral Coefficient</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-black text-white">{metrics?.viralCoefficient}</span>
                  <span className="text-[8px] font-bold text-slate-600 uppercase">K-Factor</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-slate-950/50 rounded-2xl border border-slate-800/50 group relative">
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-[9px] font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                Average time it takes for the AI to generate a response after a user logs data.
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Time to Insight</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-black text-white">{metrics?.timeToInsight}s</span>
                  <span className="text-[8px] font-bold text-slate-600 uppercase">AI Latency</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        </>
      )}

      {activeTab === 'USERS' && (
          <>
            {/* Squad Triage */}
            <div className="bg-slate-900 rounded-[2rem] border border-slate-800 shadow-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-lg font-black uppercase italic text-white">Squad Triage</h2>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Risk & Engagement Matrix</p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="text" 
                  placeholder="Search users..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 w-full text-white placeholder:text-slate-600"
                />
              </div>
              <select 
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm font-bold text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/50"
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
                <tr className="bg-slate-950/50">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <div className="group relative inline-block cursor-help">
                      User / Identity
                      <div className="absolute top-full left-0 mt-2 w-48 p-2 bg-slate-800 text-white text-[9px] font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 normal-case tracking-normal shadow-xl border border-slate-700">
                        The athlete's name and primary contact email.
                      </div>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <div className="group relative inline-block cursor-help">
                      Status
                      <div className="absolute top-full left-0 mt-2 w-48 p-2 bg-slate-800 text-white text-[9px] font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 normal-case tracking-normal shadow-xl border border-slate-700">
                        Current subscription tier and system flags (Premium, Frozen, etc.).
                      </div>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">
                    <div className="group relative inline-block cursor-help">
                      Habit Score
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 p-2 bg-slate-800 text-white text-[9px] font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 normal-case tracking-normal shadow-xl border border-slate-700">
                        A composite score (1-10) based on log frequency, timing consistency, and recency.
                      </div>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">
                    <div className="group relative inline-block cursor-help">
                      Divergence
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 p-2 bg-slate-800 text-white text-[9px] font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 normal-case tracking-normal shadow-xl border border-slate-700">
                        How far today's wellness data has drifted from their 28-day normal. Positive = more stressed/fatigued.
                      </div>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <div className="group relative inline-block cursor-help">
                      Last Active
                      <div className="absolute top-full left-0 mt-2 w-48 p-2 bg-slate-800 text-white text-[9px] font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 normal-case tracking-normal shadow-xl border border-slate-700">
                        The exact timestamp of the user's last interaction with the platform.
                      </div>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredUsers.map(user => (
                  <UserRow 
                    key={user.id} 
                    user={user} 
                    entries={allEntries.filter(e => e.userId === user.id)}
                    systemCalibration={calibration || undefined}
                    onToggleStatus={toggleStatus}
                    onQueueAlert={queueAlert}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
          </>
        )}

        {activeTab === 'EDUCATION' && (
          <div className="space-y-8">
            {/* Education Engine Header */}
            <div className="bg-slate-900 rounded-[2rem] border border-slate-800 shadow-2xl overflow-hidden p-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <h2 className="text-2xl font-black uppercase italic text-white flex items-center gap-3">
                    <BookOpen className="w-6 h-6 text-indigo-400" />
                    Education Engine
                  </h2>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-2">
                    AI-Driven Contextual Priming
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <input 
                      type="text" 
                      placeholder="Enter theme (e.g., 'Sleep hygiene')" 
                      value={snippetTheme}
                      onChange={e => setSnippetTheme(e.target.value)}
                      className="w-full pl-4 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 text-white placeholder:text-slate-600"
                    />
                  </div>
                  <button
                    onClick={handleGenerateSnippets}
                    disabled={generatingSnippets || !snippetTheme.trim() || loading}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-sm font-black uppercase tracking-widest rounded-xl transition-all"
                  >
                    {generatingSnippets ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Sparkles className="w-5 h-5" />
                    )}
                    Generate
                  </button>
                </div>
              </div>
            </div>

            {/* Snippets Vault */}
            <div className="bg-slate-900 rounded-[2rem] border border-slate-800 shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-800">
                <h3 className="text-lg font-black uppercase italic text-white">Content Vault</h3>
              </div>
              
              <div className="p-6">
                {snippets.length === 0 ? (
                  <div className="text-center py-12">
                    <BookOpen className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">No education snippets generated yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {snippets.map(snippet => (
                      <div 
                        key={snippet.id} 
                        className={`p-6 rounded-2xl border transition-all ${
                          snippet.approved 
                            ? 'bg-slate-950/50 border-emerald-500/30' 
                            : 'bg-slate-900 border-slate-700 hover:border-indigo-500/50'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex gap-2">
                            <span className="px-2 py-1 bg-slate-800 text-slate-400 text-[8px] font-black uppercase rounded-md border border-slate-700">
                              {snippet.type}
                            </span>
                            {snippet.regime && (
                              <span className="px-2 py-1 bg-indigo-500/10 text-indigo-400 text-[8px] font-black uppercase rounded-md border border-indigo-500/20">
                                {snippet.regime}
                              </span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => toggleSnippetApproval(snippet.id, snippet.approved)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                snippet.approved 
                                  ? 'bg-emerald-500/20 text-emerald-400' 
                                  : 'bg-slate-800 text-slate-500 hover:bg-emerald-500/20 hover:text-emerald-400'
                              }`}
                              title={snippet.approved ? "Revoke Approval" : "Approve Snippet"}
                            >
                              {snippet.approved ? <CheckCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => deleteSnippet(snippet.id)}
                              className="p-1.5 bg-slate-800 text-slate-500 hover:bg-rose-500/20 hover:text-rose-400 rounded-lg transition-colors"
                              title="Delete Snippet"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        
                        <p className="text-sm text-slate-300 leading-relaxed mb-4">
                          "{snippet.content}"
                        </p>
                        
                        <div className="flex justify-between items-center mt-auto pt-4 border-t border-slate-800/50">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            Theme: {snippet.theme}
                          </span>
                          <span className="text-[10px] text-slate-600">
                            {new Date(snippet.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-white mb-2">{modalState.title}</h3>
            <p className="text-slate-400 mb-8">{modalState.message}</p>
            <div className="flex justify-end gap-3">
              {modalState.type === 'confirm' && (
                <button
                  onClick={() => setModalState({ ...modalState, isOpen: false })}
                  className="px-6 py-2.5 rounded-xl font-bold text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={() => {
                  if (modalState.type === 'confirm' && modalState.onConfirm) {
                    modalState.onConfirm();
                  }
                  setModalState({ ...modalState, isOpen: false });
                }}
                className="px-6 py-2.5 rounded-xl font-bold text-sm bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
              >
                {modalState.type === 'confirm' ? 'Confirm' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MetricCard = ({ label, value, sub, icon, color, tooltip }: any) => (
  <div className="group relative bg-slate-900 p-6 rounded-[2rem] border border-slate-800 shadow-lg space-y-4 transition-all hover:border-indigo-500/30">
    {tooltip && (
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-3 bg-slate-800 text-white text-[10px] font-medium rounded-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50 shadow-2xl border border-slate-700 leading-relaxed">
        {tooltip}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-800"></div>
      </div>
    )}
    <div className="flex justify-between items-start">
      <div className={`${color} p-3 rounded-2xl`}>{icon}</div>
      <div className="text-2xl font-black text-white">{value}</div>
    </div>
    <div>
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</p>
      <p className="text-[8px] font-bold text-slate-600 uppercase tracking-tighter">{sub}</p>
    </div>
  </div>
);

const GrowthMetric = ({ label, value, sub, trend, color = 'text-white', tooltip }: any) => {
  const max = Math.max(...trend);
  const min = Math.min(...trend);
  const range = max - min || 1;
  
  return (
    <div className="group relative space-y-4">
      {tooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-3 bg-slate-800 text-white text-[10px] font-medium rounded-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50 shadow-2xl border border-slate-700 leading-relaxed">
          {tooltip}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-800"></div>
        </div>
      )}
      <div className="flex justify-between items-end">
        <div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
          <div className={`text-3xl font-black tracking-tighter ${color}`}>{value}</div>
        </div>
        <div className="w-24 h-10 flex items-end gap-0.5">
          {trend.map((v: number, i: number) => {
            const height = ((v - min) / range) * 100;
            return (
              <div 
                key={i} 
                className="flex-1 bg-slate-800 rounded-t-sm overflow-hidden relative group/bar"
                style={{ height: '100%' }}
              >
                <div 
                  className={`absolute bottom-0 left-0 right-0 transition-all duration-500 ${
                    color.includes('emerald') ? 'bg-emerald-500/40' : 
                    color.includes('indigo') ? 'bg-indigo-500/40' : 
                    color.includes('rose') ? 'bg-rose-500/40' : 'bg-slate-600/40'
                  }`}
                  style={{ height: `${Math.max(10, height)}%` }}
                />
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-[8px] font-bold text-slate-600 uppercase tracking-tighter">{sub}</p>
    </div>
  );
};

const CalibrationSlider = ({ label, sub, value, min, max, step, onChange, unit = '', tooltip }: any) => (
  <div className="group relative space-y-4 p-6 bg-slate-950/50 rounded-2xl border border-slate-800/50 hover:border-indigo-500/30 transition-all">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</p>
        <p className="text-[8px] font-bold text-slate-600 uppercase tracking-tighter">{sub}</p>
      </div>
      <div className="text-xl font-black text-white">{value}{unit}</div>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
    />
    <div className="flex justify-between text-[8px] font-bold text-slate-700 uppercase">
      <span>{min}{unit}</span>
      <span>{max}{unit}</span>
    </div>
    {tooltip && (
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-3 bg-slate-800 text-white text-[10px] font-medium rounded-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50 shadow-2xl border border-slate-700 leading-relaxed">
        {tooltip}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-800"></div>
      </div>
    )}
  </div>
);

const UserRow = ({ user, entries, systemCalibration, onToggleStatus, onQueueAlert }: { user: User; entries: WellnessEntry[]; systemCalibration?: SystemCalibration; onToggleStatus: any; onQueueAlert: any }) => {
  const lastActive = user.lastActiveAt ? new Date(user.lastActiveAt) : null;
  const isStale = lastActive && (new Date().getTime() - lastActive.getTime()) > (48 * 60 * 60 * 1000);

  const habitScore = useMemo(() => storageService.calculateUserHabitScore(entries), [entries]);
  const divergence = useMemo(() => storageService.calculateUserDivergence(entries, user.personalityCalibration, systemCalibration), [entries, user.personalityCalibration, systemCalibration]);

  return (
    <tr className="hover:bg-slate-800/50 transition-colors">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-indigo-400 font-black text-xs border border-slate-700">
            {user.firstName[0]}{user.lastName[0]}
          </div>
          <div>
            <p className="text-sm font-bold text-white">{user.firstName} {user.lastName}</p>
            <p className="text-[10px] text-slate-500 font-medium">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex flex-wrap gap-1">
          {user.isPremium && (
            <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-[8px] font-black uppercase rounded-md border border-emerald-500/20">PREMIUM</span>
          )}
          {user.isFrozen && (
            <span className="px-2 py-1 bg-rose-500/10 text-rose-400 text-[8px] font-black uppercase rounded-md border border-rose-500/20">FROZEN</span>
          )}
          {user.hasWearable && (
            <span className="px-2 py-1 bg-blue-500/10 text-blue-400 text-[8px] font-black uppercase rounded-md border border-blue-500/20">WEARABLE</span>
          )}
          {user.role === 'ADMIN' && (
            <span className="px-2 py-1 bg-indigo-500/10 text-indigo-400 text-[8px] font-black uppercase rounded-md border border-indigo-500/20">ADMIN</span>
          )}
          {!user.isPremium && !user.isFrozen && user.role !== 'ADMIN' && (
            <span className="px-2 py-1 bg-slate-800 text-slate-500 text-[8px] font-black uppercase rounded-md border border-slate-700">FREE</span>
          )}
        </div>
      </td>
      <td className="px-6 py-4 text-center">
        <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-black border ${
          habitScore >= 8 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
          habitScore >= 5 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
          'bg-rose-500/10 text-rose-400 border-rose-500/20'
        }`}>
          {habitScore}
        </div>
      </td>
      <td className="px-6 py-4 text-center">
        <div className="flex flex-col items-center">
          <span className={`text-xs font-black ${
            divergence > 1.5 ? 'text-rose-400' :
            divergence > 0.5 ? 'text-amber-400' :
            divergence < -1.5 ? 'text-indigo-400' :
            'text-emerald-400'
          }`}>
            {divergence > 0 ? `+${divergence}` : divergence}
          </span>
          <span className="text-[8px] text-slate-600 font-bold uppercase">
            {Math.abs(divergence) > 1.5 ? 'High Drift' : 'Stable'}
          </span>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex flex-col">
          <span className={`text-xs font-bold ${isStale ? 'text-rose-400' : 'text-slate-400'}`}>
            {lastActive ? lastActive.toLocaleDateString() : 'Never'}
          </span>
          <span className="text-[8px] text-slate-600 font-bold uppercase">
            {lastActive ? lastActive.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 text-right">
        <div className="flex justify-end gap-2">
          <button 
            onClick={() => onToggleStatus(user.id, 'isPremium', user.isPremium)}
            className={`p-2 rounded-lg transition-colors ${user.isPremium ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500 hover:bg-emerald-500/20 hover:text-emerald-400'}`}
            title={user.isPremium ? "Revoke Premium" : "Grant Premium"}
          >
            <Shield className="w-4 h-4" />
          </button>
          <button 
            onClick={() => onToggleStatus(user.id, 'isFrozen', user.isFrozen)}
            className={`p-2 rounded-lg transition-colors ${user.isFrozen ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-500 hover:bg-rose-500/20 hover:text-rose-400'}`}
            title={user.isFrozen ? "Unfreeze AI" : "Freeze AI"}
          >
            <Zap className="w-4 h-4" />
          </button>
          <button 
            onClick={() => onToggleStatus(user.id, 'hasWearable', user.hasWearable || false)}
            className={`p-2 rounded-lg transition-colors ${user.hasWearable ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-500 hover:bg-blue-500/20 hover:text-blue-400'}`}
            title={user.hasWearable ? "Disable Wearable" : "Enable Wearable"}
          >
            <Watch className="w-4 h-4" />
          </button>
          <button 
            onClick={() => onQueueAlert(user.id)}
            className={`p-2 rounded-lg transition-colors ${user.queuedAlert ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-500 hover:bg-amber-500/20 hover:text-amber-400'}`}
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
