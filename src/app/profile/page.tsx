'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/store/auth-store';
import { useHistoryStore } from '@/store/history-store';

export default function ProfilePage() {
  const router = useRouter();
  const { user, token, setAuth, clearAuth, isLoggedIn, isAdmin } = useAuthStore();
  const { history, clearHistory } = useHistoryStore();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isLoggedIn()) {
      router.push('/account/signin');
      return;
    }
    setName(user?.name || '');
  }, [user, isLoggedIn, router]);

  const authHeaders = useCallback(
    () => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    }),
    [token],
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/user/me', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (data.ok && data.user && token) {
        setAuth(data.user, token);
        setMsg('Profile updated successfully.');
      } else {
        setMsg(data.error || 'Update failed.');
      }
    } catch {
      setMsg('Network error.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateEmail = async () => {
    const newEmail = prompt('Enter new email address:');
    if (!newEmail) return;
    try {
      const res = await fetch('/api/user/update-email', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ email: newEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        alert('Email updated successfully. Please sign in again.');
        handleLogout();
      } else {
        alert(data.error || 'Failed to update email.');
      }
    } catch {
      alert('Network error.');
    }
  };

  const handleDeleteAccount = async () => {
    if (
      !confirm(
        'Are you sure you want to permanently delete your account? This action cannot be undone.',
      )
    )
      return;
    try {
      const res = await fetch('/api/user/delete', { method: 'DELETE', headers: authHeaders() });
      if (res.ok) {
        clearAuth();
        router.push('/');
      } else {
        alert('Failed to delete account.');
      }
    } catch {
      alert('Network error.');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    clearAuth();
    router.push('/');
  };

  if (!mounted || !user) return null;

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6">
      <div className="mx-auto max-w-[1000px] space-y-8 animate-fade-in transform-gpu">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          <div className="flex-1 w-full space-y-8">
            <div className="rounded-[40px] bg-white/[0.03] border border-white/[0.08] p-8 backdrop-blur-xl relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <span className="material-icons text-9xl text-white">account_circle</span>
              </div>

              <div className="relative z-10 flex items-center gap-6">
                <div className="h-24 w-24 rounded-[32px] bg-slate-900 border border-white/10 flex items-center justify-center text-slate-500 shadow-2xl">
                  <span className="material-icons text-5xl">account_circle</span>
                </div>
                <div className="min-w-0">
                  <h1 className="text-3xl font-bold text-white truncate">
                    {user.name || user.email.split('@')[0]}
                  </h1>
                  <p className="text-slate-400 font-medium truncate">{user.email}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-bold tracking-widest uppercase">
                      {user.role} Account
                    </span>
                    {user.isRestricted && (
                      <span className="px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-bold tracking-widest uppercase">
                        Restricted
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-3">
                  <span className="material-icons text-cyan-400">history</span>
                  Recently Watched
                </h2>
                {history.length > 0 && (
                  <button
                    onClick={clearHistory}
                    className="text-[10px] font-bold text-slate-500 hover:text-red-400 uppercase tracking-widest transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {history.length === 0 ? (
                <div className="rounded-[32px] border border-dashed border-white/10 p-16 text-center text-slate-500 bg-white/[0.01]">
                  Your watch history will appear here.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {history.slice(0, 10).map((h) => (
                    <Link
                      key={`${h.channelId}-${h.watchedAt}`}
                      href={`/channel/${encodeURIComponent(h.channelId)}`}
                      className="group flex items-center gap-4 p-4 rounded-3xl bg-white/[0.03] border border-white/[0.07] hover:border-cyan-500/50 transition-all hover:bg-cyan-500/5 hover:-translate-y-1"
                    >
                      <div className="h-12 w-12 rounded-2xl bg-slate-900 border border-white/5 overflow-hidden shrink-0 shadow-lg">
                        {h.channelLogo ? (
                          <Image
                            src={h.channelLogo}
                            alt=""
                            width={48}
                            height={48}
                            className="h-full w-full object-contain p-1"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center font-bold text-slate-700 bg-slate-800">
                            {h.channelName[0]}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors truncate">
                          {h.channelName}
                        </div>
                        <div className="text-[10px] text-slate-500 uppercase font-medium mt-0.5">
                          {new Date(h.watchedAt).toLocaleDateString()} at{' '}
                          {new Date(h.watchedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                      <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center text-slate-600 group-hover:bg-cyan-500 group-hover:text-slate-950 transition-all">
                        <span className="material-icons text-sm">play_arrow</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="w-full lg:w-80 space-y-6">
            <div className="rounded-[32px] bg-white/[0.03] border border-white/[0.08] p-6 backdrop-blur-xl shadow-xl">
              <h3 className="font-bold text-white text-[11px] uppercase tracking-widest text-slate-500 mb-6 px-2">
                Account Settings
              </h3>

              <div className="space-y-1">
                <form onSubmit={handleSave} className="mb-6 space-y-4 px-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500/50 transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full rounded-2xl bg-white/5 border border-white/10 py-3 text-xs font-bold text-white hover:bg-white/10 transition-all active:scale-95"
                  >
                    {saving ? 'Updating...' : 'Save Display Name'}
                  </button>
                  {msg && (
                    <div className="text-[10px] text-emerald-400 font-bold text-center animate-fade-in">
                      {msg}
                    </div>
                  )}
                </form>

                <div className="h-px bg-white/[0.05] my-6" />

                <button
                  onClick={handleUpdateEmail}
                  className="w-full text-left p-3 rounded-2xl hover:bg-white/5 text-sm text-slate-300 transition-all flex items-center justify-between group active:scale-95"
                >
                  Change Email
                  <span className="material-icons text-base opacity-50 group-hover:text-cyan-400 group-hover:opacity-100 transition-all">
                    alternate_email
                  </span>
                </button>

                <Link
                  href="/account/settings"
                  className="w-full text-left p-3 rounded-2xl hover:bg-white/5 text-sm text-slate-300 transition-all flex items-center justify-between group active:scale-95"
                >
                  Player & UI Settings
                  <span className="material-icons text-base opacity-50 group-hover:text-cyan-400 group-hover:opacity-100 transition-all">
                    settings
                  </span>
                </Link>

                {isAdmin() && (
                  <Link
                    href="/account/admin"
                    className="w-full text-left p-3 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-sm text-violet-300 transition-all flex items-center justify-between group active:scale-95 mt-4"
                  >
                    Admin Dashboard
                    <span className="material-icons text-base opacity-50 group-hover:opacity-100 transition-all">
                      admin_panel_settings
                    </span>
                  </Link>
                )}

                <div className="pt-6 border-t border-white/[0.05] mt-6 space-y-1">
                  <button
                    onClick={handleDeleteAccount}
                    className="w-full text-left p-3 rounded-2xl hover:bg-red-500/10 text-sm text-red-400 transition-all flex items-center justify-between group active:scale-95"
                  >
                    Delete Account
                    <span className="material-icons text-base opacity-50 group-hover:opacity-100 transition-all">
                      delete_forever
                    </span>
                  </button>
                  <button
                    onClick={() => void handleLogout()}
                    className="w-full text-left p-3 rounded-2xl hover:bg-white/5 text-sm text-slate-400 transition-all flex items-center justify-between group active:scale-95"
                  >
                    Sign Out
                    <span className="material-icons text-base opacity-50 group-hover:opacity-100 transition-all">
                      logout
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
