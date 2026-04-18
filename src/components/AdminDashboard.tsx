'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/auth-store';
import type { AuthUser } from '@/types';

type AdminUser = {
  id: string;
  email: string;
  role: string;
  suspendedAt: Date | null;
  createdAt: Date;
};

type Incident = {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: Date;
};

type Tab = 'users' | 'channels' | 'system' | 'incidents';

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
      <div className="text-xs text-slate-500 font-medium mb-1">{label}</div>
      <div className={`text-2xl font-bold ${accent || 'text-white'}`}>{value}</div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user, token, isAdmin } = useAuthStore();
  const [tab, setTab] = useState<Tab>('users');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
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

  const fetchChannelCount = useCallback(async () => {
    try {
      const res = await fetch('/api/channels?limit=1');
      const data = await res.json();
      setChannelCount(data.total || 0);
    } catch {}
  }, []);

  useEffect(() => { 
    if (user && isAdmin()) { 
      fetchUsers(); fetchChannelCount(); fetchIncidents(); 
    } 
  }, [fetchUsers, fetchChannelCount, fetchIncidents, user, isAdmin]);

  useEffect(() => {
    if (!actionMsg) return;
    const t = setTimeout(() => setActionMsg(''), 3000);
    return () => clearTimeout(t);
  }, [actionMsg]);

  const handleAction = async (target: AdminUser, action: 'SUSPEND' | 'UNSUSPEND', reason?: string) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ userId: target.id, action, reason }),
      });
      const data = await res.json();
      if (data.success) { 
        setActionMsg(`User ${action === 'SUSPEND' ? 'suspended' : 'unsuspended'}.`); 
        setSuspendTarget(null); setSuspendReason(''); await fetchUsers(); 
      }
      else setActionMsg(data.error || 'Action failed.');
    } catch { setActionMsg('Network error.'); }
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

  if (!user || !isAdmin()) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-white mb-2">Access Restricted</h1>
          <p className="text-slate-400 mb-4">You need admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  const suspended = users.filter((u) => u.suspendedAt);
  const admins = users.filter((u) => u.role === 'ADMIN');

  return (
    <div className="min-h-screen px-4 sm:px-6 py-8">
      <div className="mx-auto max-w-[1460px]">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">System Dashboard</h1>
        </div>

        {actionMsg && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.08] px-4 py-3 text-sm text-emerald-300">
            {actionMsg}
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Users" value={users.length} accent="text-cyan-400" />
          <StatCard label="Admins" value={admins.length} accent="text-violet-400" />
          <StatCard label="Suspended" value={suspended.length} accent="text-red-400" />
          <StatCard label="Live Channels" value={channelCount?.toLocaleString() ?? '…'} accent="text-emerald-400" />
        </div>

        <div className="flex gap-1 rounded-xl border border-white/[0.07] bg-white/[0.03] p-1 mb-6 w-fit">
          {(['users', 'channels', 'system', 'incidents'] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors ${tab === t ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}>{t.replace('_', ' ')}</button>
          ))}
        </div>

        {tab === 'users' && (
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-white/[0.07]">
                  <tr className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3 text-left">Email</th>
                    <th className="px-5 py-3 text-left">Role</th>
                    <th className="px-5 py-3 text-left">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="px-5 py-4 text-white">{u.email}</td>
                      <td className="px-5 py-4 text-slate-400">{u.role}</td>
                      <td className="px-5 py-4">{u.suspendedAt ? <span className="text-red-400">Suspended</span> : <span className="text-emerald-400">Active</span>}</td>
                      <td className="px-5 py-4 text-right">
                        {u.role !== 'ADMIN' && (
                          <button onClick={() => u.suspendedAt ? handleAction(u, 'UNSUSPEND') : setSuspendTarget(u)} className="text-cyan-400 hover:underline">{u.suspendedAt ? 'Unsuspend' : 'Suspend'}</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'channels' && (
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6 space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">Channel Management</h2>
              <p className="text-slate-400 text-sm mb-4">Manage the M3U channel cache and probe streams for availability.</p>
              <div className="flex gap-3">
                <button disabled={refreshing} onClick={() => void handleRefreshChannels()} className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50 transition-colors">
                  {refreshing ? 'Refreshing...' : 'Refresh M3U Cache'}
                </button>
                <button disabled={probing} onClick={() => void handleProbe()} className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-50 transition-colors">
                  {probing ? 'Probing...' : 'Probe Offline Channels'}
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === 'incidents' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Incident Management</h2>
              <button onClick={() => setShowIncidentForm(true)} className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 transition-colors">
                Report Incident
              </button>
            </div>

            {showIncidentForm && (
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6 space-y-4">
                <input type="text" placeholder="Incident Title" value={incidentTitle} onChange={(e) => setIncidentTitle(e.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-2 text-white outline-none focus:border-cyan-500" />
                <textarea placeholder="Description" value={incidentDesc} onChange={(e) => setIncidentDesc(e.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-2 text-white outline-none focus:border-cyan-500 h-24" />
                <select value={incidentStatus} onChange={(e) => setIncidentStatus(e.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-2 text-white outline-none focus:border-cyan-500">
                  <option value="INVESTIGATING">Investigating</option>
                  <option value="IDENTIFIED">Identified</option>
                  <option value="MONITORING">Monitoring</option>
                  <option value="RESOLVED">Resolved</option>
                </select>
                <div className="flex gap-2">
                  <button onClick={() => void handleCreateIncident()} className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950">Publish</button>
                  <button onClick={() => setShowIncidentForm(false)} className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-medium text-white">Cancel</button>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {incidents.map((inc) => (
                <div key={inc.id} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-white text-lg">{inc.title}</h3>
                    <div className="flex gap-2">
                      <select value={inc.status} onChange={(e) => void handleUpdateIncident(inc.id, e.target.value)} className="rounded-lg bg-slate-800 text-xs text-white px-2 py-1 outline-none cursor-pointer">
                        <option value="INVESTIGATING">Investigating</option>
                        <option value="IDENTIFIED">Identified</option>
                        <option value="MONITORING">Monitoring</option>
                        <option value="RESOLVED">Resolved</option>
                      </select>
                      <button onClick={() => void handleDeleteIncident(inc.id)} className="text-xs text-red-400 hover:underline">Delete</button>
                    </div>
                  </div>
                  <p className="text-slate-400 text-sm">{inc.description}</p>
                </div>
              ))}
              {incidents.length === 0 && <p className="text-slate-500 text-center py-8">No incidents found.</p>}
            </div>
          </div>
        )}
      </div>

      {suspendTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 p-6">
            <h3 className="font-semibold text-white mb-4">Suspend {suspendTarget.email}?</h3>
            <input type="text" placeholder="Reason" value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} className="w-full rounded-xl bg-slate-800 p-3 text-white mb-4" />
            <div className="flex gap-3">
              <button onClick={() => handleAction(suspendTarget, 'SUSPEND', suspendReason)} className="flex-1 rounded-xl bg-red-500 py-2.5 text-white">Confirm</button>
              <button onClick={() => setSuspendTarget(null)} className="flex-1 rounded-xl border border-white/[0.1] py-2.5 text-white">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
