'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/auth-store';
import type { AuthUser } from '@/types';

type AdminUser = AuthUser & {
  createdAt: string;
  updatedAt: string;
  favoritesCount: number;
};

type Tab = 'users' | 'channels' | 'system';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [suspendTarget, setSuspendTarget] = useState<AdminUser | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [channelCount, setChannelCount] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [probing, setProbing] = useState(false);
  const [probeSummary, setProbeSummary] = useState<Record<string, number> | null>(null);

  const authHeaders = useCallback((): HeadersInit => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);

  const fetchUsers = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/admin/users', { headers: authHeaders() });
      const data = await res.json();
      if (data.ok) setUsers(data.users);
      else setError(data.error || 'Failed to load users.');
    } catch { setError('Network error.'); }
    finally { setLoading(false); }
  }, [authHeaders]);

  const fetchChannelCount = useCallback(async () => {
    try {
      const res = await fetch('/api/channels?limit=1');
      const data = await res.json();
      setChannelCount(data.total || 0);
    } catch {}
  }, []);

  useEffect(() => { fetchUsers(); fetchChannelCount(); }, [fetchUsers, fetchChannelCount]);

  useEffect(() => {
    if (!actionMsg) return;
    const t = setTimeout(() => setActionMsg(''), 3000);
    return () => clearTimeout(t);
  }, [actionMsg]);

  const handleSuspend = async (target: AdminUser, suspend: boolean) => {
    try {
      const res = await fetch('/api/admin/suspend', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ userId: target.id, suspended: suspend, reason: suspendReason || undefined }),
      });
      const data = await res.json();
      if (data.ok) { setActionMsg(`User ${suspend ? 'suspended' : 'unsuspended'}.`); setSuspendTarget(null); setSuspendReason(''); await fetchUsers(); }
      else setActionMsg(data.error || 'Action failed.');
    } catch { setActionMsg('Network error.'); }
  };

  const handleRefreshChannels = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/admin/refresh-channels', { headers: authHeaders() });
      const data = await res.json();
      setActionMsg(data.ok ? `Channel cache refreshed. ${data.total || ''} channels loaded.` : data.error || 'Refresh failed.');
      await fetchChannelCount();
    } catch { setActionMsg('Network error.'); }
    finally { setRefreshing(false); }
  };

  const handleProbe = async () => {
    setProbing(true);
    try {
      const res = await fetch('/api/admin/probe-channels?limit=50&concurrency=10', { headers: authHeaders() });
      const data = await res.json();
      if (data.ok) { setProbeSummary(data); setActionMsg(`Probe complete. ${data.ok} healthy / ${data.dead} dead.`); }
      else setActionMsg(data.error || 'Probe failed.');
    } catch { setActionMsg('Network error.'); }
    finally { setProbing(false); }
  };

  if (!user || !isAdmin()) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
            <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/></svg>
          </div>
          <h1 className="text-xl font-semibold text-white mb-2">Access Restricted</h1>
          <p className="text-slate-400 mb-4">You need admin privileges to access this page.</p>
          <a href="/login" className="inline-flex rounded-full bg-cyan-500 px-5 py-2.5 text-sm font-medium text-slate-950 hover:bg-cyan-400 transition-colors">
            Sign in as Admin
          </a>
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
          <div className="text-xs font-semibold uppercase tracking-widest text-cyan-400 mb-1">Admin Console</div>
          <h1 className="text-3xl font-bold text-white">System Dashboard</h1>
          <p className="text-slate-400 mt-1">Manage users, channels, and system health.</p>
        </div>

        {actionMsg && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.08] px-4 py-3 text-sm text-emerald-300">
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            {actionMsg}
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Users" value={users.length} accent="text-cyan-400" />
          <StatCard label="Admins" value={admins.length} accent="text-violet-400" />
          <StatCard label="Suspended" value={suspended.length} accent={suspended.length > 0 ? 'text-red-400' : 'text-white'} />
          <StatCard label="Live Channels" value={channelCount?.toLocaleString() ?? '…'} accent="text-emerald-400" />
        </div>

        <div className="flex gap-1 rounded-xl border border-white/[0.07] bg-white/[0.03] p-1 mb-6 w-fit">
          {(['users', 'channels', 'system'] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors ${tab === t ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}>{t}</button>
          ))}
        </div>

        {tab === 'users' && (
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.07] flex items-center justify-between">
              <h2 className="font-semibold text-white">User Accounts ({users.length})</h2>
              <button onClick={fetchUsers} className="rounded-lg border border-white/[0.07] px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors">Refresh</button>
            </div>
            {loading ? (
              <div className="p-8 text-center text-slate-400">Loading users…</div>
            ) : error ? (
              <div className="p-6 text-center text-red-400">{error}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-white/[0.07]">
                    <tr className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                      {['User', 'Role', 'Status', 'Joined', 'Favs', 'Actions'].map((h) => (
                        <th key={h} className={`px-5 py-3 ${h === 'Actions' ? 'text-right' : 'text-left'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center text-xs font-bold text-slate-950 shrink-0">
                              {(u.name || u.email).charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-white truncate max-w-[120px]">{u.name || '—'}</div>
                              <div className="text-xs text-slate-500 truncate max-w-[160px]">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${u.role === 'ADMIN' ? 'bg-violet-400/15 text-violet-300' : 'bg-slate-700/40 text-slate-400'}`}>{u.role}</span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`flex items-center gap-1.5 text-xs ${u.suspendedAt ? 'text-red-400' : 'text-emerald-400'}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${u.suspendedAt ? 'bg-red-400' : 'bg-emerald-400'}`} />
                            {u.suspendedAt ? 'Suspended' : 'Active'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td className="px-5 py-4 text-xs text-slate-400">{u.favoritesCount}</td>
                        <td className="px-5 py-4 text-right">
                          {u.id === user.id ? (
                            <span className="text-xs text-slate-600">You</span>
                          ) : u.role !== 'ADMIN' ? (
                            <div className="flex items-center justify-end gap-2">
                              {u.suspendedAt ? (
                                <button onClick={() => void handleSuspend(u, false)} className="rounded-lg border border-emerald-400/20 bg-emerald-400/[0.07] px-3 py-1.5 text-xs text-emerald-300 hover:bg-emerald-400/15 transition-colors">Unsuspend</button>
                              ) : (
                                <button onClick={() => { setSuspendTarget(u); setSuspendReason(''); }} className="rounded-lg border border-amber-400/20 bg-amber-400/[0.07] px-3 py-1.5 text-xs text-amber-300 hover:bg-amber-400/15 transition-colors">Suspend</button>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-600">Protected</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'channels' && (
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
              <h3 className="font-semibold text-white mb-1">Channel Cache</h3>
              <p className="text-sm text-slate-400 mb-4">Refresh the M3U dataset from iptv-org immediately.</p>
              <div className="flex items-baseline gap-2 mb-4">
                <div className="text-3xl font-bold text-emerald-400">{channelCount?.toLocaleString() ?? '…'}</div>
                <div className="text-sm text-slate-500">channels</div>
              </div>
              <button onClick={() => void handleRefreshChannels()} disabled={refreshing} className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-cyan-400 disabled:opacity-50 transition-colors">
                {refreshing ? 'Refreshing…' : 'Refresh Cache'}
              </button>
            </div>
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
              <h3 className="font-semibold text-white mb-1">Stream Health Probe</h3>
              <p className="text-sm text-slate-400 mb-4">Probe the first 50 channels to detect dead streams.</p>
              {probeSummary && (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[['Healthy', probeSummary.ok, 'text-emerald-400'], ['Slow', probeSummary.slow, 'text-amber-400'], ['Dead', probeSummary.dead, 'text-red-400']].map(([l, v, c]) => (
                    <div key={String(l)} className="rounded-xl bg-slate-900/60 p-2 text-center">
                      <div className={`text-lg font-bold ${c}`}>{v ?? 0}</div>
                      <div className="text-xs text-slate-500">{l}</div>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => void handleProbe()} disabled={probing} className="rounded-xl border border-white/[0.07] bg-white/[0.04] px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/[0.08] disabled:opacity-50 transition-colors">
                {probing ? 'Probing…' : 'Run Probe'}
              </button>
            </div>
          </div>
        )}

        {tab === 'system' && (
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6">
            <h2 className="font-semibold text-white mb-4">System Info</h2>
            <div className="space-y-3">
              {[
                { label: 'Total Users', value: users.length },
                { label: 'Admin Accounts', value: admins.length },
                { label: 'Suspended Accounts', value: suspended.length },
                { label: 'Live Channels', value: channelCount ?? 'Loading…' },
                { label: 'Logged in as', value: user.email },
                { label: 'Role', value: user.role },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between border-b border-white/[0.04] pb-3 last:border-0 last:pb-0">
                  <span className="text-sm text-slate-400">{label}</span>
                  <span className="text-sm font-medium text-white">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {suspendTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl border border-white/[0.1] bg-slate-900 p-6 shadow-2xl">
              <h3 className="font-semibold text-white mb-1">Suspend Account</h3>
              <p className="text-sm text-slate-400 mb-4">Suspending <span className="text-white">{suspendTarget.email}</span></p>
              <label className="block mb-4">
                <span className="text-xs text-slate-400 mb-1.5 block">Reason (optional)</span>
                <input type="text" value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} placeholder="Violation of terms…" className="w-full rounded-xl border border-white/[0.1] bg-slate-800 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none" />
              </label>
              <div className="flex gap-3">
                <button onClick={() => void handleSuspend(suspendTarget, true)} className="flex-1 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-400 transition-colors">Confirm Suspend</button>
                <button onClick={() => setSuspendTarget(null)} className="flex-1 rounded-xl border border-white/[0.07] px-4 py-2.5 text-sm text-slate-400 hover:text-white transition-colors">Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
