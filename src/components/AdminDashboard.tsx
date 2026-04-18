'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuthStore } from '@/store/auth-store';

type AdminUser = {
  id: string;
  email: string;
  username: string | null;
  name: string | null;
  role: string;
  isVerified: boolean;
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
  severity: string;
  tags: string[];
  createdAt: Date;
};

type Tab = 'users' | 'channels' | 'incidents' | 'tickets' | 'posts';

type Ticket = {
  id: string;
  userId: string;
  subject: string;
  message: string;
  status: string;
  type: string;
  isArchived: boolean;
  handledById: string | null;
  handledBy?: { username: string; name: string | null };
  createdAt: string;
  user: { email: string; name: string | null; role: string; username: string | null };
};

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <div className="rounded-[32px] border border-white/[0.07] bg-white/[0.03] p-6 backdrop-blur-md shadow-xl">
      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">
        {label}
      </div>
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
  const [_loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  // Sorting & Filtering
  const [ticketSort, setTicketSort] = useState('newest');
  const [showArchived, setShowArchived] = useState(false);

  const [suspendTarget, setSuspendTarget] = useState<AdminUser | null>(null);
  const [suspendReason, setSuspendReason] = useState('');

  // Incident form state
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [incidentTitle, setIncidentTitle] = useState('');
  const [incidentDesc, setIncidentDesc] = useState('');
  const [incidentStatus, setIncidentStatus] = useState('INVESTIGATING');
  const [incidentSeverity, setIncidentSeverity] = useState('LOW');
  const [incidentTags, setIncidentTags] = useState('');

  const authHeaders = useCallback(
    (): HeadersInit => ({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token],
  );

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', { headers: authHeaders() });
      const data = await res.json();
      if (Array.isArray(data)) setUsers(data);
    } catch {
    } finally {
      setLoading(false);
    }
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
      const res = await fetch(`/api/tickets?sort=${ticketSort}&archived=${showArchived}`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (Array.isArray(data)) setTickets(data);
    } catch {}
  }, [authHeaders, ticketSort, showArchived]);

  useEffect(() => {
    if (user && (isAdmin() || isStaff())) {
      fetchUsers();
      fetchIncidents();
      fetchTickets();
    }
  }, [fetchUsers, fetchIncidents, fetchTickets, user, isAdmin, isStaff]);

  const handleUpdateTicket = async (id: string, data: any) => {
    try {
      const res = await fetch('/api/tickets', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ id, ...data }),
      });
      if (res.ok) {
        setActionMsg('Ticket updated.');
        fetchTickets();
      }
    } catch {
      setActionMsg('Error.');
    }
  };

  const handleModeration = async (userId: string, action: string, value: any) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          userId,
          action,
          reason: typeof value === 'string' ? value : undefined,
          value: typeof value === 'boolean' ? value : undefined,
        }),
      });
      if (res.ok) {
        setActionMsg(`${action} successful.`);
        setSuspendTarget(null);
        setSuspendReason('');
        fetchUsers();
      }
    } catch {
      setActionMsg('Action failed.');
    }
  };

  const handleSetRole = async (userId: string, role: string) => {
    await handleModeration(userId, 'SET_ROLE', role);
  };

  const handleToggleVerified = async (userId: string, isVerified: boolean) => {
    await handleModeration(userId, 'SET_VERIFIED', isVerified);
  };

  const handleCreateIncident = async () => {
    try {
      const res = await fetch('/api/admin/incidents', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          action: 'CREATE',
          title: incidentTitle,
          description: incidentDesc,
          status: incidentStatus,
          severity: incidentSeverity,
          tags: incidentTags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });
      if (res.ok) {
        setActionMsg('Incident published.');
        setShowIncidentForm(false);
        fetchIncidents();
      }
    } catch {
      setActionMsg('Error.');
    }
  };

  if (!user || (!isAdmin() && !isStaff())) return null;

  return (
    <div className="min-h-screen px-4 sm:px-6 py-24 max-w-[1460px] mx-auto animate-fade-in transform-gpu">
      <div className="mb-12 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter leading-none">
            Command Center<span className="text-cyan-500">.</span>
          </h1>
          <p className="text-slate-500 mt-2 font-bold uppercase tracking-widest text-[10px]">
            Community & Platform Oversight
          </p>
        </div>
      </div>

      {actionMsg && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 rounded-full bg-cyan-500 px-8 py-3 text-xs font-black text-slate-950 shadow-2xl animate-fade-up z-50 uppercase tracking-widest">
          {actionMsg}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-10 bg-white/[0.03] border border-white/[0.07] p-1.5 rounded-2xl w-fit">
        {(['users', 'incidents', 'tickets', 'posts'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-xl px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${tab === t ? 'bg-cyan-500 text-slate-950 shadow-lg' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'users' && (
        <div className="rounded-[40px] border border-white/[0.07] bg-white/[0.02] overflow-hidden backdrop-blur-xl shadow-2xl">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/[0.03] border-b border-white/[0.07]">
              <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                <th className="px-8 py-6">Identity</th>
                <th className="px-8 py-6">Privileges</th>
                <th className="px-8 py-6">Verification</th>
                <th className="px-8 py-6 text-right">Moderation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-white/[0.01] transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center text-slate-700">
                        <span className="material-icons">account_circle</span>
                      </div>
                      <div>
                        <div className="font-black text-white text-base uppercase italic tracking-tighter">
                          @{u.username || 'anonymous'}
                        </div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase">
                          {u.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <select
                      value={u.role}
                      onChange={(e) => handleSetRole(u.id, e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-[9px] font-black uppercase text-white outline-none focus:border-cyan-500"
                    >
                      <option value="USER">USER</option>
                      <option value="MODERATOR">MODERATOR</option>
                      <option value="STAFF">STAFF</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </td>
                  <td className="px-8 py-6">
                    <button
                      onClick={() => handleToggleVerified(u.id, !u.isVerified)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[9px] font-black uppercase transition-all ${u.isVerified ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-white/5 border-white/10 text-slate-500'}`}
                    >
                      <span className="material-icons text-xs">verified</span>
                      {u.isVerified ? 'VERIFIED' : 'UNVERIFIED'}
                    </button>
                  </td>
                  <td className="px-8 py-6 text-right space-x-2">
                    {u.role !== 'ADMIN' && (
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() =>
                            handleModeration(u.id, u.isMuted ? 'UNMUTE' : 'MUTE', true)
                          }
                          className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-white/5 text-slate-500 hover:text-amber-400 hover:bg-amber-400/10 transition-all"
                        >
                          {u.isMuted ? 'UNMUTE' : 'MUTE'}
                        </button>
                        <button
                          onClick={() =>
                            u.suspendedAt
                              ? handleModeration(u.id, 'UNSUSPEND', true)
                              : setSuspendTarget(u)
                          }
                          className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-white/5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all"
                        >
                          {u.suspendedAt ? 'UNSUSPEND' : 'SUSPEND'}
                        </button>
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
          <div className="flex items-center justify-between mb-6 px-2">
            <div className="flex gap-4">
              {['newest', 'oldest', 'type', 'name'].map((s) => (
                <button
                  key={s}
                  onClick={() => setTicketSort(s)}
                  className={`text-[10px] font-black uppercase tracking-widest ${ticketSort === s ? 'text-cyan-400' : 'text-slate-500'}`}
                >
                  {s}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`text-[10px] font-black uppercase tracking-widest ${showArchived ? 'text-amber-400' : 'text-slate-500'}`}
            >
              {showArchived ? 'VIEWING ARCHIVE' : 'VIEW ARCHIVE'}
            </button>
          </div>

          {tickets.map((tk) => (
            <div
              key={tk.id}
              className="p-8 rounded-[40px] border border-white/[0.08] bg-white/[0.02] flex flex-col lg:flex-row gap-8 items-start shadow-2xl backdrop-blur-md relative overflow-hidden"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[9px] font-black uppercase text-cyan-400">
                    {tk.type}
                  </span>
                  <select
                    value={tk.status}
                    onChange={(e) => handleUpdateTicket(tk.id, { status: e.target.value })}
                    className="bg-transparent text-[10px] font-black uppercase text-slate-500 outline-none cursor-pointer hover:text-white transition-all"
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="IN_PROGRESS">IN PROGRESS</option>
                    <option value="HANDLED">HANDLED</option>
                    <option value="CLOSED">CLOSED</option>
                    <option value="INVALID">INVALID</option>
                  </select>
                </div>
                <h3 className="text-2xl font-black text-white mb-4 uppercase italic tracking-tighter">
                  {tk.subject}
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed font-medium mb-8 p-6 rounded-3xl bg-slate-950/50 border border-white/5">
                  {tk.message}
                </p>

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-slate-900 border border-white/5 flex items-center justify-center text-[10px] font-black text-slate-600">
                      @{tk.user.username?.[0] || 'A'}
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      BY @{tk.user.username || 'anonymous'}
                    </div>
                  </div>
                  {tk.handledBy && (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/5">
                      <span className="text-[8px] font-black text-slate-600 uppercase">
                        HANDLING:
                      </span>
                      <span className="text-[9px] font-black text-cyan-400 uppercase">
                        @{tk.handledBy.username}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-3 shrink-0 w-full lg:w-48 pt-10 lg:pt-0">
                {!tk.handledById && (
                  <button
                    onClick={() => handleUpdateTicket(tk.id, { handledById: user?.id })}
                    className="w-full py-4 rounded-2xl bg-cyan-500 text-slate-950 font-black text-[10px] uppercase tracking-widest hover:bg-cyan-400 transition-all active:scale-95"
                  >
                    TAKE CASE
                  </button>
                )}
                <button
                  onClick={() => handleUpdateTicket(tk.id, { isArchived: !tk.isArchived })}
                  className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:text-white transition-all active:scale-95"
                >
                  {tk.isArchived ? 'UNARCHIVE' : 'ARCHIVE'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Incident logic here... */}
      {tab === 'incidents' && (
        <div className="space-y-8">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter leading-none">
              Global Incidents.
            </h2>
            <button
              onClick={() => setShowIncidentForm(true)}
              className="px-8 py-3.5 rounded-2xl bg-cyan-500 text-slate-950 font-black text-[10px] uppercase tracking-widest hover:bg-cyan-400 transition-all active:scale-95"
            >
              Log New Incident
            </button>
          </div>

          {showIncidentForm && (
            <div className="p-10 rounded-[48px] bg-white/[0.03] border border-white/[0.08] shadow-2xl animate-fade-in space-y-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={incidentTitle}
                    onChange={(e) => setIncidentTitle(e.target.value)}
                    className="w-full rounded-2xl bg-slate-900 border border-white/10 p-4 text-white outline-none focus:border-cyan-500"
                    placeholder="e.g., API Node Latency"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                    Severity
                  </label>
                  <select
                    value={incidentSeverity}
                    onChange={(e) => setIncidentSeverity(e.target.value)}
                    className="w-full rounded-2xl bg-slate-900 border border-white/10 p-4 text-white outline-none focus:border-cyan-500"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                  Initial Summary
                </label>
                <textarea
                  value={incidentDesc}
                  onChange={(e) => setIncidentDesc(e.target.value)}
                  className="w-full rounded-2xl bg-slate-900 border border-white/10 p-4 text-white outline-none focus:border-cyan-500 h-32"
                  placeholder="Provide details..."
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                  Tags (Comma separated)
                </label>
                <input
                  type="text"
                  value={incidentTags}
                  onChange={(e) => setIncidentTags(e.target.value)}
                  className="w-full rounded-2xl bg-slate-900 border border-white/10 p-4 text-white outline-none focus:border-cyan-500"
                  placeholder="API, Internal, Node-4"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  onClick={handleCreateIncident}
                  className="flex-1 py-4 rounded-2xl bg-cyan-500 text-slate-950 font-black text-[10px] uppercase tracking-widest hover:bg-cyan-400"
                >
                  PUBLISH INCIDENT
                </button>
                <button
                  onClick={() => setShowIncidentForm(false)}
                  className="px-10 py-4 rounded-2xl bg-white/5 text-white font-black text-[10px] uppercase tracking-widest"
                >
                  CANCEL
                </button>
              </div>
            </div>
          )}

          <div className="grid gap-4">
            {incidents.map((inc) => (
              <div
                key={inc.id}
                className="p-8 rounded-[40px] border border-white/[0.08] bg-white/[0.02] backdrop-blur-md"
              >
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">
                        {inc.severity} SEVERITY
                      </span>
                      <span className="text-[10px] font-bold text-slate-600 uppercase">
                        {new Date(inc.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">
                      {inc.title}
                    </h3>
                  </div>
                  <select
                    value={inc.status}
                    onChange={(e) => {
                      fetch(`/api/admin/incidents/${inc.id}/updates`, {
                        method: 'POST',
                        headers: authHeaders(),
                        body: JSON.stringify({
                          message: 'Status updated by staff.',
                          status: e.target.value,
                        }),
                      }).then(() => fetchIncidents());
                    }}
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-black uppercase text-white outline-none"
                  >
                    <option value="INVESTIGATING">INVESTIGATING</option>
                    <option value="IDENTIFIED">IDENTIFIED</option>
                    <option value="MONITORING">MONITORING</option>
                    <option value="RESOLVED">RESOLVED</option>
                  </select>
                </div>
                <div className="flex flex-wrap gap-2">
                  {inc.tags.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded bg-white/5 text-[8px] font-black text-slate-500 uppercase tracking-widest"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
