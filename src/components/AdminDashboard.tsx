'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useAuthStore } from '@/store/auth-store';
import Link from 'next/link';

type AdminUser = {
  id: string;
  email: string;
  username: string | null;
  name: string | null;
  role: string;
  isVerified: boolean;
  suspendedAt: string | null;
  isMuted: boolean;
  isRestricted: boolean;
  isShadowBanned: boolean;
  createdAt: string;
  twoFactorEnabled: boolean;
};

type Incident = {
  id: string;
  title: string;
  description: string;
  status: string;
  severity: string;
  type: string;
  tags: string[];
  createdAt: string;
};

type Post = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    username: string | null;
    email: string;
  };
  _count: {
    comments: number;
    likes: number;
  };
};

type Tab = 'users' | 'incidents' | 'tickets' | 'posts' | 'security';

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

export default function AdminDashboard() {
  const { user, token, isAdmin, isStaff } = useAuthStore();
  const [tab, setTab] = useState<Tab>('users');

  const authHeaders = useCallback(
    (): HeadersInit => ({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token],
  );

  const [actionMsg, setActionMsg] = useState('');

  const showActionMessage = (msg: string) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(''), 3000);
  };

  // Security State
  const [securityLevel, setSecurityLevel] = useState('MEDIUM');
  const [enabledChallenges, setEnabledChallenges] = useState<string[]>([
    'IMAGE',
    'TEXT',
    'MATH',
    'CLICK',
  ]);
  const [securityLoading, setSecurityLoading] = useState(false);

  // FETCH SECURITY
  const fetchSecurity = useCallback(async () => {
    setSecurityLoading(true);
    try {
      const res = await fetch('/api/admin/security', { headers: authHeaders() });
      const data = await res.json();
      if (res.ok) {
        setSecurityLevel(data.level);
        setEnabledChallenges(data.challenges);
      }
    } catch {
    } finally {
      setSecurityLoading(false);
    }
  }, [authHeaders]);

  const handleUpdateSecurity = async (level?: string, challenges?: string[]) => {
    try {
      const res = await fetch('/api/admin/security', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ level, challenges }),
      });
      if (res.ok) {
        showActionMessage('Security settings updated.');
        fetchSecurity();
      }
    } catch {
      showActionMessage('Update failed.');
    }
  };

  useEffect(() => {
    if (tab === 'security' && token) fetchSecurity();
  }, [tab, token, fetchSecurity]);

  // Users State
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [usersHasMore, setUsersHasMore] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);

  // Incidents State
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [incidentPage, setIncidentPage] = useState(1);
  const [incidentsHasMore, setIncidentsHasMore] = useState(true);
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [incidentId, setIncidentId] = useState('');
  const [incidentTitle, setIncidentTitle] = useState('');
  const [incidentDesc, setIncidentDesc] = useState('');
  const [incidentStatus, setIncidentStatus] = useState('INVESTIGATING');
  const [incidentSeverity, setIncidentSeverity] = useState('LOW');
  const [incidentType, setIncidentType] = useState('SYSTEM');
  const [incidentTags, setIncidentTags] = useState('');

  // Tickets State
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketPage, setTicketPage] = useState(1);
  const [ticketsHasMore, setTicketsHasMore] = useState(true);
  const [ticketSort, setTicketSort] = useState('newest');
  const [showArchived, setShowArchived] = useState(false);

  // Posts State
  const [posts, setPosts] = useState<Post[]>([]);
  const [postPage, setPostPage] = useState(1);
  const [postsHasMore, setPostsHasMore] = useState(true);
  const [postSearch, setPostSearch] = useState('');

  // ... (update fetchers to use pages)
  const fetchIncidents = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/incidents?page=${incidentPage}&limit=10`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setIncidents(data);
        setIncidentsHasMore(data.length === 10);
      }
    } catch {}
  }, [authHeaders, incidentPage]);

  const fetchTickets = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/tickets?sort=${ticketSort}&archived=${showArchived}&page=${ticketPage}&limit=10`,
        {
          headers: authHeaders(),
        },
      );
      const data = await res.json();
      if (Array.isArray(data)) {
        setTickets(data);
        setTicketsHasMore(data.length === 10);
      }
    } catch {}
  }, [authHeaders, ticketSort, showArchived, ticketPage]);

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/admin/posts?q=${encodeURIComponent(postSearch)}&page=${postPage}&limit=10`,
        {
          headers: authHeaders(),
        },
      );
      const data = await res.json();
      if (Array.isArray(data)) {
        setPosts(data);
        setPostsHasMore(data.length === 10);
      }
    } catch {}
  }, [authHeaders, postSearch, postPage]);

  useEffect(() => {
    if (tab === 'incidents' && token) fetchIncidents();
    if (tab === 'tickets' && token) fetchTickets();
    if (tab === 'posts' && token) fetchPosts();
  }, [tab, token, fetchIncidents, fetchTickets, fetchPosts, ticketSort, showArchived, postSearch]);

  // ACTION HANDLERS
  const handleUpdateTicket = async (id: string, data: any) => {
    try {
      const res = await fetch('/api/tickets', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ id, ...data }),
      });
      if (res.ok) {
        showActionMessage('Ticket updated.');
        fetchTickets();
      }
    } catch {
      showActionMessage('Error updating ticket.');
    }
  };

  const handleModeration = async (userId: string, action: string, value?: any) => {
    let reason = '';
    if (['SUSPEND', 'RESTRICT', 'MUTE'].includes(action)) {
      reason = prompt(`Enter reason for ${action}:`) || '';
      if (!reason) return;
    }

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          userId,
          action,
          value,
          reason,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (action === 'RESET_PASSWORD') {
          showActionMessage(`Password reset to: ${data.newPassword}`);
        } else {
          showActionMessage(`${action} successful.`);
        }

        // Refresh local user state softly
        setUsers(
          users.map((u) => {
            if (u.id !== userId) return u;
            const u2 = { ...u };
            if (action === 'SET_ROLE') u2.role = value;
            if (action === 'SET_VERIFIED') u2.isVerified = value;
            if (action === 'MUTE') u2.isMuted = true;
            if (action === 'UNMUTE') u2.isMuted = false;
            if (action === 'SUSPEND') u2.suspendedAt = new Date().toISOString();
            if (action === 'UNSUSPEND') u2.suspendedAt = null;
            if (action === 'RESTRICT') u2.isRestricted = true;
            if (action === 'UNRESTRICT') u2.isRestricted = false;
            if (action === 'SHADOW_BAN') u2.isShadowBanned = true;
            if (action === 'UNSHADOW_BAN') u2.isShadowBanned = false;
            if (action === 'RESET_2FA') u2.twoFactorEnabled = false;
            return u2;
          }),
        );

        if (action === 'DELETE') {
          setUsers(users.filter((u) => u.id !== userId));
        }
      } else {
        showActionMessage(data.error || 'Action failed.');
      }
    } catch {
      showActionMessage('Action failed.');
    }
  };

  const handleCreateOrUpdateIncident = async () => {
    try {
      const res = await fetch('/api/admin/incidents', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          action: incidentId ? 'UPDATE' : 'CREATE',
          id: incidentId || undefined,
          title: incidentTitle,
          description: incidentDesc,
          status: incidentStatus,
          severity: incidentSeverity,
          type: incidentType,
          tags: incidentTags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });
      if (res.ok) {
        showActionMessage(incidentId ? 'Incident updated.' : 'Incident published.');
        setShowIncidentForm(false);
        fetchIncidents();
      }
    } catch {
      showActionMessage('Error.');
    }
  };

  const handleDeleteIncident = async (id: string) => {
    if (!confirm('Are you sure you want to delete this incident?')) return;
    try {
      const res = await fetch('/api/admin/incidents', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ action: 'DELETE', id }),
      });
      if (res.ok) {
        showActionMessage('Incident deleted.');
        fetchIncidents();
      }
    } catch {
      showActionMessage('Error deleting incident.');
    }
  };

  const openIncidentEdit = (inc: Incident) => {
    setIncidentId(inc.id);
    setIncidentTitle(inc.title);
    setIncidentDesc(inc.description);
    setIncidentStatus(inc.status);
    setIncidentSeverity(inc.severity);
    setIncidentType(inc.type || 'SYSTEM');
    setIncidentTags(inc.tags.join(', '));
    setShowIncidentForm(true);
  };

  const resetIncidentForm = () => {
    setIncidentId('');
    setIncidentTitle('');
    setIncidentDesc('');
    setIncidentStatus('INVESTIGATING');
    setIncidentSeverity('LOW');
    setIncidentType('SYSTEM');
    setIncidentTags('');
    setShowIncidentForm(true);
  };

  const handleDeletePost = async (id: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    try {
      const res = await fetch(`/api/admin/posts?id=${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (res.ok) {
        showActionMessage('Post deleted.');
        fetchPosts();
      }
    } catch {
      showActionMessage('Error deleting post.');
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

      <div className="flex flex-wrap gap-2 mb-8 sm:mb-10 bg-white/[0.03] border border-white/[0.07] p-1.5 rounded-2xl w-full sm:w-fit overflow-x-auto scrollbar-hide">
        {(['users', 'incidents', 'tickets', 'posts', 'security'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 sm:flex-none rounded-xl px-6 sm:px-8 py-2.5 sm:py-3 text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 whitespace-nowrap ${tab === t ? 'bg-cyan-500 text-slate-950 shadow-lg' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* SECURITY TAB */}
      {tab === 'security' && (
        <div className="space-y-8 animate-fade-in max-w-4xl">
          <div className="grid sm:grid-cols-2 gap-8">
            {/* Protection Levels */}
            <div className="p-8 rounded-[40px] border border-white/[0.07] bg-white/[0.02] backdrop-blur-xl shadow-2xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="h-10 w-10 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-xl text-cyan-400">
                  <span className="material-icons">shield</span>
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight uppercase italic">
                  Protection Level
                </h2>
              </div>

              <div className="space-y-3">
                {[
                  { id: 'OFF', label: 'OFF', desc: 'No risk assessment. Standard traffic flow.' },
                  {
                    id: 'LOW',
                    label: 'LOW',
                    desc: 'Challenges for highly suspicious traffic only.',
                  },
                  { id: 'MEDIUM', label: 'MEDIUM', desc: 'Balanced bot protection (Standard).' },
                  { id: 'HIGH', label: 'HIGH', desc: 'Aggressive challenges for any anomaly.' },
                  {
                    id: 'UNDER_ATTACK',
                    label: 'UNDER ATTACK',
                    desc: 'Force verification for all new sessions.',
                  },
                ].map((l) => (
                  <button
                    key={l.id}
                    onClick={() => handleUpdateSecurity(l.id)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all ${securityLevel === l.id ? 'bg-cyan-500/10 border-cyan-500/30 ring-1 ring-cyan-500/30' : 'bg-white/5 border-white/5 hover:border-white/10'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] font-black uppercase tracking-widest ${securityLevel === l.id ? 'text-cyan-400' : 'text-slate-400'}`}
                      >
                        {l.label}
                      </span>
                      {securityLevel === l.id && (
                        <span className="material-icons text-cyan-400 text-sm">check_circle</span>
                      )}
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase mt-1 leading-relaxed">
                      {l.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Verification Methods */}
            <div className="p-8 rounded-[40px] border border-white/[0.07] bg-white/[0.02] backdrop-blur-xl shadow-2xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="h-10 w-10 rounded-2xl bg-violet-500/10 flex items-center justify-center text-xl text-violet-400">
                  <span className="material-icons">fact_check</span>
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight uppercase italic">
                  Active Challenges
                </h2>
              </div>

              <div className="space-y-3">
                {[
                  { id: 'IMAGE', label: 'Image Recognition', icon: 'image' },
                  { id: 'TEXT', label: 'Text CAPTCHA', icon: 'text_fields' },
                  { id: 'MATH', label: 'Logic & Math', icon: 'calculate' },
                  { id: 'CLICK', label: 'Human Interaction', icon: 'touch_app' },
                ].map((c) => {
                  const isEnabled = enabledChallenges.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        const next = isEnabled
                          ? enabledChallenges.filter((x) => x !== c.id)
                          : [...enabledChallenges, c.id];
                        handleUpdateSecurity(undefined, next);
                      }}
                      className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${isEnabled ? 'bg-violet-500/10 border-violet-500/30' : 'bg-white/5 border-white/5 opacity-50 grayscale'}`}
                    >
                      <div className="flex items-center gap-4">
                        <span
                          className={`material-icons text-lg ${isEnabled ? 'text-violet-400' : 'text-slate-600'}`}
                        >
                          {c.icon}
                        </span>
                        <span
                          className={`text-[10px] font-black uppercase tracking-widest ${isEnabled ? 'text-white' : 'text-slate-500'}`}
                        >
                          {c.label}
                        </span>
                      </div>
                      <div
                        className={`h-5 w-10 rounded-full relative transition-colors ${isEnabled ? 'bg-violet-500' : 'bg-slate-700'}`}
                      >
                        <div
                          className={`absolute top-1 h-3 w-3 rounded-full bg-white transition-all ${isEnabled ? 'right-1' : 'left-1'}`}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-8 p-4 rounded-2xl bg-amber-400/5 border border-amber-400/10">
                <p className="text-[9px] font-bold text-amber-400/60 uppercase leading-relaxed text-center">
                  Disabling all challenges will default to human interaction verification.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* USERS TAB */}
      {tab === 'users' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative w-full max-w-md">
              <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                search
              </span>
              <input
                type="text"
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value);
                  setUserPage(1);
                }}
                placeholder="Search community members..."
                className="w-full bg-white/[0.02] border border-white/[0.08] rounded-2xl py-3 pl-11 pr-4 text-white text-xs font-bold outline-none focus:border-cyan-500 transition-colors shadow-inner"
              />
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-2">
              <button
                disabled={userPage === 1}
                onClick={() => setUserPage((p) => p - 1)}
                className="h-10 w-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-500 hover:text-white disabled:opacity-30 transition-all"
              >
                <span className="material-icons">chevron_left</span>
              </button>
              <div className="px-4 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-[10px] font-black text-cyan-400">
                PAGE {userPage}
              </div>
              <button
                disabled={!usersHasMore}
                onClick={() => setUserPage((p) => p + 1)}
                className="h-10 w-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-500 hover:text-white disabled:opacity-30 transition-all"
              >
                <span className="material-icons">chevron_right</span>
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {/* Desktop Table View (Hidden on Mobile) */}
            <div className="hidden lg:block rounded-[40px] border border-white/[0.07] bg-white/[0.02] overflow-hidden backdrop-blur-xl shadow-2xl">
              <div className="overflow-x-auto">
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
                            <div className="h-10 w-10 shrink-0 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center text-slate-700 shadow-xl overflow-hidden">
                              <span className="material-icons">account_circle</span>
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <div className="font-black text-white text-base uppercase italic tracking-tighter truncate">
                                  @{u.username || 'anonymous'}
                                </div>
                                {u.isShadowBanned && (
                                  <span
                                    className="material-icons text-amber-500 text-sm"
                                    title="Shadow Banned"
                                  >
                                    visibility_off
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] font-bold text-slate-500 uppercase truncate">
                                {u.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <select
                            value={u.role}
                            onChange={(e) => handleModeration(u.id, 'SET_ROLE', e.target.value)}
                            disabled={!isAdmin()}
                            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-[9px] font-black uppercase text-white outline-none focus:border-cyan-500 disabled:opacity-50"
                          >
                            <option value="USER">USER</option>
                            <option value="MODERATOR">MODERATOR</option>
                            <option value="STAFF">STAFF</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>
                        </td>
                        <td className="px-8 py-6">
                          <button
                            onClick={() => handleModeration(u.id, 'SET_VERIFIED', !u.isVerified)}
                            disabled={!isAdmin()}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[9px] font-black uppercase transition-all disabled:opacity-50 ${u.isVerified ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-white/5 border-white/10 text-slate-500 hover:bg-white/10'}`}
                          >
                            <span className="material-icons text-[10px]">verified</span>
                            {u.isVerified ? 'VERIFIED' : 'UNVERIFIED'}
                          </button>
                        </td>
                        <td className="px-8 py-6 text-right space-x-2">
                          <UserActions user={u} onAction={handleModeration} isAdmin={isAdmin()} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card View (Hidden on Desktop) */}
            <div className="lg:hidden grid gap-4">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="p-6 rounded-[32px] bg-white/[0.02] border border-white/[0.07] shadow-xl space-y-6"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-slate-900 border border-white/5 flex items-center justify-center text-slate-700 shadow-xl">
                      <span className="material-icons text-2xl">account_circle</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-white text-lg uppercase italic tracking-tighter truncate">
                          @{u.username || 'anonymous'}
                        </span>
                        {u.isVerified && (
                          <span className="material-icons text-cyan-400 text-sm">verified</span>
                        )}
                        {u.isShadowBanned && (
                          <span className="material-icons text-amber-500 text-sm">
                            visibility_off
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase truncate">
                        {u.email}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest ml-1">
                        Role
                      </span>
                      <select
                        value={u.role}
                        onChange={(e) => handleModeration(u.id, 'SET_ROLE', e.target.value)}
                        disabled={!isAdmin()}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[9px] font-black uppercase text-white outline-none"
                      >
                        <option value="USER">USER</option>
                        <option value="MODERATOR">MODERATOR</option>
                        <option value="STAFF">STAFF</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest ml-1">
                        Verified
                      </span>
                      <button
                        onClick={() => handleModeration(u.id, 'SET_VERIFIED', !u.isVerified)}
                        disabled={!isAdmin()}
                        className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border text-[9px] font-black uppercase transition-all ${u.isVerified ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-white/5 border-white/10 text-slate-500'}`}
                      >
                        {u.isVerified ? 'YES' : 'NO'}
                      </button>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/5">
                    <UserActions
                      user={u}
                      onAction={handleModeration}
                      isAdmin={isAdmin()}
                      isMobile
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* END OF RESULTS */}
            {users.length === 0 && !usersLoading && (
              <div className="h-40 flex items-center justify-center border border-dashed border-white/10 rounded-[40px]">
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                  No community members found
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* POSTS TAB */}
      {tab === 'posts' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative w-full max-w-md">
              <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                search
              </span>
              <input
                type="text"
                value={postSearch}
                onChange={(e) => {
                  setPostSearch(e.target.value);
                  setPostPage(1);
                }}
                placeholder="Search post ID, title, or content..."
                className="w-full bg-white/[0.02] border border-white/[0.08] rounded-2xl py-3 pl-12 pr-4 text-white text-sm outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={postPage === 1}
                onClick={() => setPostPage((p) => p - 1)}
                className="h-10 w-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-500 hover:text-white disabled:opacity-30"
              >
                <span className="material-icons">chevron_left</span>
              </button>
              <div className="px-4 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-[10px] font-black text-cyan-400 uppercase">
                PAGE {postPage}
              </div>
              <button
                disabled={!postsHasMore}
                onClick={() => setPostPage((p) => p + 1)}
                className="h-10 w-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-500 hover:text-white disabled:opacity-30"
              >
                <span className="material-icons">chevron_right</span>
              </button>
            </div>
          </div>

          <div className="grid gap-4">
            {posts.map((post) => (
              <div
                key={post.id}
                className="p-8 rounded-[40px] border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] transition-all transform-gpu shadow-xl flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-center"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    <span className="text-cyan-400">@{post.user.username || 'unknown'}</span>
                    <span className="h-1 w-1 rounded-full bg-white/20" />
                    <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                    <span className="h-1 w-1 rounded-full bg-white/20" />
                    <span className="font-mono text-slate-600">ID: {post.id}</span>
                  </div>
                  <Link
                    href={`/posts/${post.id}`}
                    className="text-xl font-bold text-white hover:text-cyan-400 transition-colors uppercase italic tracking-tight line-clamp-1 mb-2"
                  >
                    {post.title}
                  </Link>
                  <p className="text-sm text-slate-400 line-clamp-1 font-medium">{post.content}</p>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="flex items-center gap-4 mr-4 text-[10px] font-bold text-slate-500">
                    <div className="flex items-center gap-1">
                      <span className="material-icons text-[14px]">favorite</span>{' '}
                      {post._count.likes}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="material-icons text-[14px]">chat_bubble</span>{' '}
                      {post._count.comments}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeletePost(post.id)}
                    className="h-12 w-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-slate-900 transition-all"
                  >
                    <span className="material-icons">delete_outline</span>
                  </button>
                </div>
              </div>
            ))}
            {posts.length === 0 && (
              <div className="p-12 text-center text-slate-500 font-bold text-xs uppercase tracking-widest border border-dashed border-white/10 rounded-[40px]">
                No posts found.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TICKETS TAB */}
      {tab === 'tickets' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
            <div className="flex items-center gap-4">
              <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 overflow-x-auto scrollbar-hide">
                {['newest', 'oldest', 'type', 'name'].map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setTicketSort(s);
                      setTicketPage(1);
                    }}
                    className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${ticketSort === s ? 'bg-cyan-500 text-slate-950 shadow-lg' : 'text-slate-500 hover:text-white'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  setShowArchived(!showArchived);
                  setTicketPage(1);
                }}
                className={`px-4 py-2 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${showArchived ? 'bg-amber-400/10 border-amber-400/30 text-amber-400' : 'bg-white/5 border-white/10 text-slate-500'}`}
              >
                {showArchived ? 'SHOWING ARCHIVED' : 'VIEW ARCHIVE'}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={ticketPage === 1}
                onClick={() => setTicketPage((p) => p - 1)}
                className="h-10 w-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-500 hover:text-white disabled:opacity-30"
              >
                <span className="material-icons">chevron_left</span>
              </button>
              <div className="px-4 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-[10px] font-black text-cyan-400 uppercase">
                PAGE {ticketPage}
              </div>
              <button
                disabled={!ticketsHasMore}
                onClick={() => setTicketPage((p) => p + 1)}
                className="h-10 w-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-500 hover:text-white disabled:opacity-30"
              >
                <span className="material-icons">chevron_right</span>
              </button>
            </div>
          </div>
          {/* ... (keep tickets loop) */}

          <div className="grid gap-4">
            {tickets.map((tk) => (
              <div
                key={tk.id}
                className="p-6 sm:p-8 rounded-[32px] sm:rounded-[40px] border border-white/[0.08] bg-white/[0.02] flex flex-col gap-6 sm:gap-8 shadow-2xl backdrop-blur-md relative overflow-hidden"
              >
                <div className="flex-1 min-w-0 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[8px] sm:text-[9px] font-black uppercase text-cyan-400">
                        {tk.type}
                      </span>
                      <div className="h-1 w-1 rounded-full bg-slate-700" />
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                        {new Date(tk.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <select
                      value={tk.status}
                      onChange={(e) => handleUpdateTicket(tk.id, { status: e.target.value })}
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-[9px] font-black uppercase text-slate-400 outline-none cursor-pointer focus:border-cyan-500"
                    >
                      <option value="OPEN">OPEN</option>
                      <option value="IN_PROGRESS">IN PROGRESS</option>
                      <option value="HANDLED">HANDLED</option>
                      <option value="CLOSED">CLOSED</option>
                      <option value="INVALID">INVALID</option>
                    </select>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-black text-white uppercase italic tracking-tighter leading-tight group">
                    {tk.subject}
                  </h3>

                  <div className="p-5 sm:p-6 rounded-[24px] sm:rounded-3xl bg-slate-950/50 border border-white/5 text-sm text-slate-400 leading-relaxed font-medium line-clamp-3">
                    {tk.message}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-slate-900 border border-white/5 flex items-center justify-center text-[10px] font-black text-slate-600">
                          {tk.user.username?.[0] || 'A'}
                        </div>
                        <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                          @{tk.user.username || 'anonymous'}
                        </div>
                      </div>
                      {tk.handledBy && (
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/5">
                          <span className="text-[7px] font-black text-slate-600 uppercase">
                            STAFF:
                          </span>
                          <span className="text-[8px] font-black text-cyan-400 uppercase">
                            @{tk.handledBy.username}
                          </span>
                        </div>
                      )}
                    </div>

                    <Link
                      href={`/support/tickets/${tk.id}`}
                      className="flex-1 sm:flex-none py-2 px-6 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all text-center"
                    >
                      View Signal Thread
                    </Link>
                  </div>
                </div>

                <div className="flex gap-2 border-t border-white/5 pt-4">
                  {!tk.handledById && (
                    <button
                      onClick={() => handleUpdateTicket(tk.id, { handledById: user?.id })}
                      className="flex-1 py-3.5 rounded-xl bg-cyan-500 text-slate-950 font-black text-[9px] uppercase tracking-widest hover:bg-cyan-400 transition-all active:scale-95"
                    >
                      TAKE CASE
                    </button>
                  )}
                  <button
                    onClick={() => handleUpdateTicket(tk.id, { isArchived: !tk.isArchived })}
                    className="flex-1 py-3.5 rounded-xl bg-white/5 border border-white/10 text-slate-500 font-black text-[9px] uppercase tracking-widest hover:text-white transition-all active:scale-95"
                  >
                    {tk.isArchived ? 'UNARCHIVE' : 'ARCHIVE'}
                  </button>
                </div>
              </div>
            ))}
            {tickets.length === 0 && (
              <div className="p-16 text-center text-slate-600 font-bold uppercase tracking-widest text-xs border border-dashed border-white/10 rounded-[40px] bg-white/[0.01]">
                No cases found.
              </div>
            )}
          </div>
        </div>
      )}

      {/* INCIDENTS TAB */}
      {tab === 'incidents' && (
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
            <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter leading-none">
              Global Incidents.
            </h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <button
                  disabled={incidentPage === 1}
                  onClick={() => setIncidentPage((p) => p - 1)}
                  className="h-10 w-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-500 hover:text-white disabled:opacity-30 transition-all"
                >
                  <span className="material-icons">chevron_left</span>
                </button>
                <div className="px-4 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-[10px] font-black text-cyan-400 uppercase">
                  PAGE {incidentPage}
                </div>
                <button
                  disabled={!incidentsHasMore}
                  onClick={() => setIncidentPage((p) => p + 1)}
                  className="h-10 w-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-500 hover:text-white disabled:opacity-30 transition-all"
                >
                  <span className="material-icons">chevron_right</span>
                </button>
              </div>
              <button
                onClick={() => resetIncidentForm()}
                className="px-8 py-3.5 rounded-2xl bg-cyan-500 text-slate-950 font-black text-[10px] uppercase tracking-widest hover:bg-cyan-400 transition-all active:scale-95 shadow-lg shadow-cyan-900/30"
              >
                Log New Incident
              </button>
            </div>
          </div>

          {showIncidentForm && (
            <div className="p-10 rounded-[48px] bg-white/[0.03] border border-white/[0.08] shadow-2xl animate-fade-in space-y-6">
              <div className="grid sm:grid-cols-3 gap-6">
                <div className="sm:col-span-2">
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
                    Type
                  </label>
                  <select
                    value={incidentType}
                    onChange={(e) => setIncidentType(e.target.value)}
                    className="w-full rounded-2xl bg-slate-900 border border-white/10 p-4 text-white outline-none focus:border-cyan-500"
                  >
                    <option value="SYSTEM">SYSTEM</option>
                    <option value="API">API</option>
                    <option value="APP">APP</option>
                  </select>
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
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                    Status
                  </label>
                  <select
                    value={incidentStatus}
                    onChange={(e) => setIncidentStatus(e.target.value)}
                    className="w-full rounded-2xl bg-slate-900 border border-white/10 p-4 text-white outline-none focus:border-cyan-500"
                  >
                    <option value="INVESTIGATING">INVESTIGATING</option>
                    <option value="IDENTIFIED">IDENTIFIED</option>
                    <option value="MONITORING">MONITORING</option>
                    <option value="RESOLVED">RESOLVED</option>
                  </select>
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
              <div className="flex gap-4 pt-4">
                <button
                  onClick={handleCreateOrUpdateIncident}
                  className="flex-1 py-4 rounded-2xl bg-cyan-500 text-slate-950 font-black text-[10px] uppercase tracking-widest hover:bg-cyan-400"
                >
                  {incidentId ? 'UPDATE INCIDENT' : 'PUBLISH INCIDENT'}
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
                className="p-8 rounded-[40px] border border-white/[0.08] bg-white/[0.02] backdrop-blur-md flex flex-col md:flex-row gap-6 justify-between items-start"
              >
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest px-2 py-0.5 rounded-full border border-cyan-500/20 bg-cyan-500/10">
                      {inc.type}
                    </span>
                    <span
                      className={`text-[10px] font-black uppercase tracking-widest ${inc.severity === 'CRITICAL' ? 'text-red-400' : 'text-slate-400'}`}
                    >
                      {inc.severity} SEVERITY
                    </span>
                    <span className="text-[10px] font-bold text-slate-600 uppercase">
                      {new Date(inc.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">
                    {inc.title}
                  </h3>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {inc.tags.map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[8px] font-black text-slate-500 uppercase tracking-widest"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
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
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[10px] font-black uppercase text-white outline-none cursor-pointer flex-1 md:flex-none"
                  >
                    <option value="INVESTIGATING">INVESTIGATING</option>
                    <option value="IDENTIFIED">IDENTIFIED</option>
                    <option value="MONITORING">MONITORING</option>
                    <option value="RESOLVED">RESOLVED</option>
                  </select>
                  <button
                    onClick={() => openIncidentEdit(inc)}
                    className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all shrink-0"
                  >
                    <span className="material-icons text-sm">edit</span>
                  </button>
                  <button
                    onClick={() => handleDeleteIncident(inc.id)}
                    className="h-10 w-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-slate-900 transition-all shrink-0"
                  >
                    <span className="material-icons text-sm">delete_outline</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function UserActions({
  user,
  onAction,
  isAdmin,
  isMobile = false,
}: {
  user: AdminUser;
  onAction: (id: string, action: string, value?: any) => void;
  isAdmin: boolean;
  isMobile?: boolean;
}) {
  return (
    <div className={`flex flex-wrap gap-2 ${isMobile ? 'justify-start' : 'justify-end'}`}>
      <button
        onClick={() => onAction(user.id, user.isMuted ? 'UNMUTE' : 'MUTE')}
        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${user.isMuted ? 'bg-amber-400 text-slate-900 shadow-lg' : 'bg-white/5 text-slate-500 hover:text-amber-400 hover:bg-amber-400/10'}`}
      >
        {user.isMuted ? 'MUTED' : 'MUTE'}
      </button>
      <button
        onClick={() => onAction(user.id, user.isRestricted ? 'UNRESTRICT' : 'RESTRICT')}
        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${user.isRestricted ? 'bg-orange-500 text-white shadow-lg' : 'bg-white/5 text-slate-500 hover:text-orange-400 hover:bg-orange-500/10'}`}
      >
        {user.isRestricted ? 'RESTRICTED' : 'RESTRICT'}
      </button>
      <button
        onClick={() =>
          onAction(user.id, user.suspendedAt ? 'UNSUSPEND' : 'SUSPEND', 'Admin Action')
        }
        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${user.suspendedAt ? 'bg-red-500 text-white shadow-lg' : 'bg-white/5 text-slate-500 hover:text-red-400 hover:bg-red-500/10'}`}
      >
        {user.suspendedAt ? 'SUSPENDED' : 'SUSPEND'}
      </button>

      <div className="relative group/actions inline-block">
        <button className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-white/5 text-slate-500 hover:bg-white/10 flex items-center gap-1">
          MORE <span className="material-icons text-[10px]">expand_more</span>
        </button>
        <div
          className={`absolute ${isMobile ? 'left-0' : 'right-0'} bottom-full sm:top-full mb-2 sm:mb-0 sm:mt-1 w-64 bg-slate-900 border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] opacity-0 group-hover/actions:opacity-100 pointer-events-none group-hover/actions:pointer-events-auto transition-all z-[100] overflow-hidden text-left p-1 backdrop-blur-xl`}
        >
          <div className="px-3 py-2 text-[8px] font-black text-slate-600 uppercase tracking-widest border-b border-white/5 mb-1">
            User Operations
          </div>
          <button
            onClick={() => {
              const un = prompt('New Username:', user.username || '');
              if (un) onAction(user.id, 'CHANGE_USERNAME', un);
            }}
            className="w-full px-4 py-2.5 text-[10px] font-bold text-white hover:bg-white/5 uppercase transition-all rounded-xl flex items-center gap-3"
          >
            <span className="material-icons text-xs text-slate-500">alternate_email</span>
            Change Username
          </button>
          <button
            onClick={() => {
              const em = prompt('New Email:', user.email);
              if (em) onAction(user.id, 'CHANGE_EMAIL', em);
            }}
            className="w-full px-4 py-2.5 text-[10px] font-bold text-white hover:bg-white/5 uppercase transition-all rounded-xl flex items-center gap-3"
          >
            <span className="material-icons text-xs text-slate-500">mail</span>
            Change Email
          </button>
          <div className="h-px bg-white/5 my-1" />

          <button
            onClick={() => onAction(user.id, user.isShadowBanned ? 'UNSHADOW_BAN' : 'SHADOW_BAN')}
            className="w-full px-4 py-2.5 text-[10px] font-bold text-amber-400 hover:bg-amber-400/5 uppercase transition-all rounded-xl flex items-center gap-3"
          >
            <span className="material-icons text-xs">visibility_off</span>
            {user.isShadowBanned ? 'Lift Shadow Ban' : 'Shadow Ban'}
          </button>

          <button
            onClick={() => {
              if (confirm('Force reset password? User will need to set a new one.'))
                onAction(user.id, 'RESET_PASSWORD');
            }}
            className="w-full px-4 py-2.5 text-[10px] font-bold text-white hover:bg-white/5 uppercase transition-all rounded-xl flex items-center gap-3"
          >
            <span className="material-icons text-xs text-slate-500">lock_reset</span>
            Force Password Reset
          </button>

          <button
            onClick={() => {
              if (confirm('Disable 2FA for this user?')) onAction(user.id, 'RESET_2FA');
            }}
            className="w-full px-4 py-2.5 text-[10px] font-bold text-white hover:bg-white/5 uppercase transition-all rounded-xl flex items-center gap-3"
          >
            <span className="material-icons text-xs text-slate-500">security_update_warning</span>
            Remove 2FA
          </button>

          <div className="h-px bg-white/5 my-1" />

          <button
            onClick={() => {
              if (
                confirm(
                  'RESET ALL DATA? This clears history, messages, chats, and favorites. Cannot be undone.',
                )
              )
                onAction(user.id, 'RESET_DATA');
            }}
            className="w-full px-4 py-2.5 text-[10px] font-bold text-red-400 hover:bg-red-400/5 uppercase transition-all rounded-xl flex items-center gap-3"
          >
            <span className="material-icons text-xs">history</span>
            Reset User Data
          </button>

          <button
            onClick={() => {
              if (confirm('Reset all followers and following?'))
                onAction(user.id, 'RESET_FOLLOWERS');
            }}
            className="w-full px-4 py-2.5 text-[10px] font-bold text-red-400 hover:bg-red-400/5 uppercase transition-all rounded-xl flex items-center gap-3"
          >
            <span className="material-icons text-xs">people_alt</span>
            Reset Followers
          </button>

          <div className="h-px bg-white/5 my-1" />

          <Link
            href={`/profile/${user.username || user.id}`}
            className="w-full px-4 py-2.5 text-[10px] font-bold text-cyan-400 hover:bg-cyan-400/5 uppercase transition-all rounded-xl flex items-center gap-3"
          >
            <span className="material-icons text-xs">visibility</span>
            View Profile
          </Link>

          {isAdmin && (
            <button
              onClick={() => {
                if (confirm('DELETE ACCOUNT PERMANENTLY? This cannot be undone.'))
                  onAction(user.id, 'DELETE');
              }}
              className="w-full px-4 py-2.5 text-[10px] font-bold text-red-500 hover:bg-red-500/10 uppercase transition-all rounded-xl flex items-center gap-3"
            >
              <span className="material-icons text-xs">delete_forever</span>
              Delete Account
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
