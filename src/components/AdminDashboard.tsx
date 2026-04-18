'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/auth-store';
import type { AuthUser } from '@/types';

type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  suspendedAt: Date | null;
  isMuted: boolean;
  isRestricted: boolean;
  createdAt: Date;
};

type Incident = {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: Date;
};

type Tab = 'users' | 'channels' | 'system' | 'incidents' | 'tickets';

type Ticket = {
  id: string;
  userId: string;
  subject: string;
  message: string;
  status: string;
  type: string;
  createdAt: string;
  user: { email: string; name: string | null; role: string };
};

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="rounded-[32px] border border-white/[0.07] bg-white/[0.03] p-6 backdrop-blur-md shadow-xl">
      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">{label}</div>
      <div className={`text-3xl font-bold ${accent || 'text-white'}`}>{value}</div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user, token, isAdmin, isStaff } = useAuthStore();
  const [tab, setTab] = useState<Tab>('users');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [suspendTarget, setSuspendTarget] = useState<AdminUser | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [channelCount, setChannelCount] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [probing, setProbing] = useState(false);

  // Incident form state
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [incidentTitle, setIncidentTitle] = useState('');
  const [incidentDesc, setIncidentDesc] = useState('');
  const [incidentStatus, setIncidentStatus] = useState('INVESTIGATING');

  const authHeaders = useCallback((): HeadersInit => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);

  const fetchUsers = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/admin/users', { headers: authHeaders() });
      const data = await res.json();
      if (Array.isArray(data)) setUsers(data);
    } catch {}
    finally { setLoading(false); }
  }, [authHeaders]);

  const fetchIncidents = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/incidents', { headers: authHeaders() });
      const data = await res.json();
      if (Array.isArray(data)) setIncidents(data);
    } catch {}
  }, [authHeaders]);

  const fetchTickets = useCallback(async () => {
    try {
      const res = await fetch('/api/tickets', { headers: authHeaders() });
      const data = await res.json();
      if (Array.isArray(data)) setTickets(data);
    } catch {}
  }, [authHeaders]);

  const fetchChannelCount = useCallback(async () => {
    try {
      const res = await fetch('/api/channels?limit=1');
      const data = await res.json();
      setChannelCount(data.total || 0);
    } catch {}
  }, []);

  useEffect(() => { 
    if (user && (isAdmin() || isStaff())) { 
      fetchUsers(); fetchChannelCount(); fetchIncidents(); fetchTickets();
    } 
  }, [fetchUsers, fetchChannelCount, fetchIncidents, fetchTickets, user, isAdmin, isStaff]);

  useEffect(() => {
    if (!actionMsg) return;
    const t = setTimeout(() => setActionMsg(''), 3000);
    return () => clearTimeout(t);
  }, [actionMsg]);

  const handleUpdateTicket = async (id: string, status: string) => {
    try {
      const res = await fetch('/api/tickets', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        setActionMsg('Ticket updated.');
        await fetchTickets();
      }
    } catch { setActionMsg('Error updating ticket.'); }
  };

  const handleModeration = async (userId: string, action: string, value: any) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ userId, action, reason: typeof value === 'string' ? value : undefined, value: typeof value === 'boolean' ? value : undefined }),
      });
      if (res.ok) {
        setActionMsg(`${action} successful.`);
        setSuspendTarget(null); setSuspendReason('');
        await fetchUsers();
      }
    } catch { setActionMsg('Action failed.'); }
  };

  const handleCreateIncident = async () => {
    if (!incidentTitle || !incidentDesc) return;
    try {
      const res = await fetch('/api/admin/incidents', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ action: 'CREATE', title: incidentTitle, description: incidentDesc, status: incidentStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMsg('Incident created.');
        setShowIncidentForm(false);
        setIncidentTitle('');
        setIncidentDesc('');
        setIncidentStatus('INVESTIGATING');
        await fetchIncidents();
      } else {
        setActionMsg(data.error || 'Failed to create incident.');
      }
    } catch { setActionMsg('Network error.'); }
  };

  const handleUpdateIncident = async (id: string, status: string) => {
    try {
      const res = await fetch('/api/admin/incidents', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ action: 'UPDATE', id, status }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMsg('Incident updated.');
        await fetchIncidents();
      } else {
        setActionMsg(data.error || 'Failed to update incident.');
      }
    } catch { setActionMsg('Network error.'); }
  };

  const handleDeleteIncident = async (id: string) => {
    try {
      const res = await fetch('/api/admin/incidents', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ action: 'DELETE', id }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMsg('Incident deleted.');
        await fetchIncidents();
      }
    } catch { setActionMsg('Network error.'); }
  };

  const handleRefreshChannels = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/admin/refresh-channels', { headers: authHeaders() });
      const data = await res.json();
      setActionMsg(data.ok ? `Channel cache refreshed.` : data.error || 'Refresh failed.');
      await fetchChannelCount();
    } catch { setActionMsg('Network error.'); }
    finally { setRefreshing(false); }
  };

  const handleProbe = async () => {
    setProbing(true);
    try {
      const res = await fetch('/api/admin/probe-channels', { headers: authHeaders() });
      const data = await res.json();
      setActionMsg(`Probe complete.`);
    } catch { setActionMsg('Network error.'); }
    finally { setProbing(false); }
  };

  if (!user || (!isAdmin() && !isStaff())) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-white mb-2">Access Restricted</h1>
          <p className="text-slate-400 mb-4">You need staff or admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  const suspended = users.filter((u) => u.suspendedAt);
  const admins = users.filter((u) => u.role === 'ADMIN');

  return (
    <div className="min-h-screen px-4 sm:px-6 py-24 max-w-[1460px] mx-auto animate-fade-in transform-gpu">
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-white">Staff Dashboard</h1>
        <p className="text-slate-500 mt-2">Oversee community moderation, tickets, and infrastructure.</p>
      </div>

      {actionMsg && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 rounded-full bg-cyan-500 px-8 py-3 text-xs font-bold text-slate-950 shadow-2xl animate-fade-up z-50">
          {actionMsg}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <StatCard label="Total Users" value={users.length} accent="text-cyan-400" />
        <StatCard label="Staff/Admins" value={admins.length + users.filter(u=>u.role==='STAFF').length} accent="text-violet-400" />
        <StatCard label="Suspended" value={suspended.length} accent="text-red-400" />
        <StatCard label="Live Channels" value={channelCount?.toLocaleString() ?? '…'} accent="text-emerald-400" />
      </div>

      <div className="flex flex-wrap gap-2 mb-8 bg-white/[0.03] border border-white/[0.07] p-1.5 rounded-2xl w-fit">
        {(['users', 'channels', 'incidents', 'tickets'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-xl px-6 py-2.5 text-xs font-bold uppercase tracking-widest transition-all active:scale-95 ${tab === t ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/30' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>{t}</button>
        ))}
      </div>

      {tab === 'users' && (
        <div className="rounded-[40px] border border-white/[0.07] bg-white/[0.02] overflow-hidden backdrop-blur-xl shadow-2xl">
           <table className="w-full text-left text-sm">
              <thead className="bg-white/[0.03] border-b border-white/[0.07]">
                 <tr className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    <th className="px-8 py-5">User Account</th>
                    <th className="px-8 py-5">System Role</th>
                    <th className="px-8 py-5">Current Status</th>
                    <th className="px-8 py-5 text-right">Moderation Actions</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                 {users.map((u) => (
                   <tr key={u.id} className="hover:bg-white/[0.01] transition-colors group">
                      <td className="px-8 py-5">
                         <div className="font-bold text-white text-base">{u.name || 'Anonymous'}</div>
                         <div className="text-xs text-slate-500">{u.email}</div>
                      </td>
                      <td className="px-8 py-5">
                         <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-tighter ${u.role === 'ADMIN' ? 'bg-red-400/10 text-red-400 border border-red-400/20' : u.role === 'STAFF' ? 'bg-violet-400/10 text-violet-400 border border-violet-400/20' : 'bg-slate-800 text-slate-500'}`}>{u.role}</span>
                      </td>
                      <td className="px-8 py-5">
                         <div className="flex flex-col gap-1">
                            {u.suspendedAt ? <span className="text-red-400 font-bold">Suspended</span> : <span className="text-emerald-400 font-bold">Active</span>}
                            {u.isMuted && <span className="text-[10px] text-amber-500 font-bold uppercase tracking-widest">Muted</span>}
                            {u.isRestricted && <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">Restricted</span>}
                         </div>
                      </td>
                      <td className="px-8 py-5 text-right space-x-2">
                         {u.role !== 'ADMIN' && (
                           <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-1">
                             <button onClick={() => void handleModeration(u.id, u.isMuted ? 'UNMUTE' : 'MUTE', true)} className="px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest bg-white/5 hover:bg-amber-500/20 hover:text-amber-400 transition-all">{u.isMuted ? 'UNMUTE' : 'MUTE'}</button>
                             <button onClick={() => void handleModeration(u.id, u.isRestricted ? 'UNRESTRICT' : 'RESTRICT', true)} className="px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest bg-white/5 hover:bg-cyan-500/20 hover:text-cyan-400 transition-all">{u.isRestricted ? 'UNRESTRICT' : 'RESTRICT'}</button>
                             <button onClick={() => u.suspendedAt ? void handleModeration(u.id, 'UNSUSPEND', true) : setSuspendTarget(u)} className="px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest bg-white/5 hover:bg-red-500/20 hover:text-red-400 transition-all">{u.suspendedAt ? 'UNSUSPEND' : 'SUSPEND'}</button>
                           </div>
                         )}
                      </td>
                   </tr>
                 ))}
              </tbody>
           </table>
        </div>
      )}

      {tab === 'tickets' && (
        <div className="space-y-6">
           {tickets.map((tk) => (
             <div key={tk.id} className="p-8 rounded-[40px] border border-white/[0.08] bg-white/[0.02] flex flex-col lg:flex-row gap-8 items-start shadow-2xl backdrop-blur-md">
                <div className="flex-1 min-w-0">
                   <div className="flex items-center gap-3 mb-4">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest ${tk.type === 'APPEAL' ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20' : 'bg-cyan-400/10 text-cyan-400 border border-cyan-400/20'}`}>{tk.type}</span>
                      <span className={`text-[10px] font-bold ${tk.status === 'OPEN' ? 'text-emerald-400' : tk.status === 'IN_PROGRESS' ? 'text-cyan-400' : 'text-slate-500'}`}>{tk.status}</span>
                   </div>
                   <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">{tk.subject}</h3>
                   <div className="text-sm text-slate-300 leading-relaxed bg-slate-950/50 p-6 rounded-3xl border border-white/5 whitespace-pre-wrap shadow-inner">{tk.message}</div>
                   <div className="mt-6 flex items-center gap-4 text-xs text-slate-500">
                      <div className="h-10 w-10 rounded-2xl bg-slate-800 border border-white/10 flex items-center justify-center text-sm font-bold text-slate-400 shadow-lg">{tk.user.email[0].toUpperCase()}</div>
                      <div>
                        <div className="font-bold text-slate-400">{tk.user.email}</div>
                        <div className="mt-0.5">{new Date(tk.createdAt).toLocaleString()}</div>
                      </div>
                   </div>
                </div>
                <div className="flex flex-col gap-3 shrink-0 w-full lg:w-44">
                   <button onClick={() => void handleUpdateTicket(tk.id, 'IN_PROGRESS')} className="w-full py-3 rounded-2xl bg-white/5 border border-white/10 text-xs font-bold text-white hover:bg-white/10 transition-all active:scale-95">TAKE TICKET</button>
                   <button onClick={() => void handleUpdateTicket(tk.id, 'CLOSED')} className="w-full py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition-all active:scale-95">CLOSE CASE</button>
                </div>
             </div>
           ))}
           {tickets.length === 0 && <div className="p-32 text-center text-slate-500 border border-dashed border-white/10 rounded-[40px] bg-white/[0.01]">No active support cases.</div>}
        </div>
      )}

      {tab === 'channels' && (
        <div className="rounded-[40px] border border-white/[0.07] bg-white/[0.02] p-12 space-y-8 backdrop-blur-xl shadow-2xl">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Playlist Maintenance</h2>
            <p className="text-slate-500 text-sm mb-8">Force a refresh of the channel list or probe existing streams for regional availability.</p>
            <div className="flex flex-wrap gap-4">
              <button disabled={refreshing} onClick={() => void handleRefreshChannels()} className="rounded-2xl bg-cyan-500 px-8 py-4 text-sm font-bold text-slate-950 hover:bg-cyan-400 disabled:opacity-50 transition-all shadow-lg shadow-cyan-500/20 active:scale-95">
                {refreshing ? 'Refreshing Cache...' : 'REFRESH M3U PLAYLIST'}
              </button>
              <button disabled={probing} onClick={() => void handleProbe()} className="rounded-2xl border border-white/10 bg-white/5 px-8 py-4 text-sm font-bold text-white hover:bg-white/10 disabled:opacity-50 transition-all active:scale-95">
                {probing ? 'Probing Streams...' : 'PROBE OFFLINE STATUS'}
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'incidents' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">System Incidents</h2>
            <button onClick={() => setShowIncidentForm(true)} className="rounded-2xl bg-cyan-500 px-6 py-2.5 text-xs font-bold text-slate-950 hover:bg-cyan-400 transition-all active:scale-95 shadow-lg shadow-cyan-500/20">REPORT INCIDENT</button>
          </div>

          {showIncidentForm && (
            <div className="rounded-[32px] border border-white/[0.08] bg-white/[0.03] p-8 space-y-4 animate-fade-in">
              <input type="text" placeholder="Incident Title" value={incidentTitle} onChange={(e) => setIncidentTitle(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-white outline-none focus:border-cyan-500 shadow-inner" />
              <textarea placeholder="Provide detailed information about the anomaly..." value={incidentDesc} onChange={(e) => setIncidentDesc(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-white outline-none focus:border-cyan-500 h-32 shadow-inner" />
              <div className="flex flex-col sm:flex-row gap-4">
                <select value={incidentStatus} onChange={(e) => setIncidentStatus(e.target.value)} className="flex-1 rounded-2xl border border-white/10 bg-slate-950 p-4 text-white outline-none focus:border-cyan-500">
                  <option value="INVESTIGATING">Investigating</option>
                  <option value="IDENTIFIED">Identified</option>
                  <option value="MONITORING">Monitoring</option>
                  <option value="RESOLVED">Resolved</option>
                </select>
                <div className="flex gap-2">
                  <button onClick={() => void handleCreateIncident()} className="rounded-2xl bg-emerald-500 px-8 py-4 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-all active:scale-95">PUBLISH</button>
                  <button onClick={() => setShowIncidentForm(false)} className="rounded-2xl bg-white/5 px-8 py-4 text-xs font-bold text-white hover:bg-white/10 transition-all active:scale-95">CANCEL</button>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-4">
            {incidents.map((inc) => (
              <div key={inc.id} className="rounded-3xl border border-white/[0.07] bg-white/[0.02] p-6 backdrop-blur-md">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-white text-lg tracking-tight">{inc.title}</h3>
                  <div className="flex gap-2">
                    <select value={inc.status} onChange={(e) => void handleUpdateIncident(inc.id, e.target.value)} className="rounded-xl bg-slate-950 border border-white/10 text-[10px] font-bold text-white px-3 py-1.5 outline-none cursor-pointer focus:border-cyan-500">
                      <option value="INVESTIGATING">INVESTIGATING</option>
                      <option value="IDENTIFIED">IDENTIFIED</option>
                      <option value="MONITORING">MONITORING</option>
                      <option value="RESOLVED">RESOLVED</option>
                    </select>
                    <button onClick={() => void handleDeleteIncident(inc.id)} className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
                  </div>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">{inc.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {suspendTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-[32px] bg-slate-900 border border-white/10 p-8 shadow-2xl scale-105 transform-gpu">
            <h3 className="text-xl font-bold text-white mb-2">Suspend Account</h3>
            <p className="text-sm text-slate-500 mb-6 font-medium">Please provide a reason for suspending {suspendTarget.email}.</p>
            <input type="text" placeholder="Reason (spamming, inappropriate comments, etc.)" value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} className="w-full rounded-2xl bg-black/40 border border-white/10 p-4 text-sm text-white mb-6 outline-none focus:border-red-500/50 transition-all shadow-inner" />
            <div className="flex gap-3">
              <button onClick={() => void handleModeration(suspendTarget.id, 'SUSPEND', suspendReason)} className="flex-1 rounded-2xl bg-red-500 py-3 text-sm font-bold text-white hover:bg-red-400 transition-all active:scale-95">CONFIRM</button>
              <button onClick={() => setSuspendTarget(null)} className="flex-1 rounded-2xl border border-white/10 py-3 text-sm font-bold text-slate-400 hover:bg-white/5 transition-all active:scale-95">CANCEL</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
