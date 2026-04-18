'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';
import { useHistoryStore } from '@/store/history-store';
import { useFavoritesStore } from '@/store/favorites-store';

export default function ProfilePage() {
  const router = useRouter();
  const { user, token, setAuth, clearAuth, isLoggedIn, isAdmin } = useAuthStore();
  const { history, clearHistory } = useHistoryStore();
  const { ids: favoriteIds } = useFavoritesStore();
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
                <svg className="h-32 w-32 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>

              <div className="relative z-10 flex items-center gap-6">
                <div className="h-24 w-24 rounded-[32px] bg-slate-900 border border-white/10 flex items-center justify-center text-slate-500 shadow-2xl">
                  <svg className="h-12 w-12" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
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
                  <svg
                    className="h-5 w-5 text-cyan-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
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
import Image from 'next/image';

...
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
...
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
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M14.752 11.168l-3.197-2.132A1 1 0 007 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                          />
                        </svg>
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
                  <svg
                    className="h-4 w-4 opacity-50 group-hover:text-cyan-400 group-hover:opacity-100 transition-all"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206"
                    />
                  </svg>
                </button>

                <Link
                  href="/account/settings"
                  className="w-full text-left p-3 rounded-2xl hover:bg-white/5 text-sm text-slate-300 transition-all flex items-center justify-between group active:scale-95"
                >
                  Player & UI Settings
                  <svg
                    className="h-4 w-4 opacity-50 group-hover:text-cyan-400 group-hover:opacity-100 transition-all"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </Link>

                {isAdmin() && (
                  <Link
                    href="/account/admin"
                    className="w-full text-left p-3 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-sm text-violet-300 transition-all flex items-center justify-between group active:scale-95 mt-4"
                  >
                    Admin Dashboard
                    <svg
                      className="h-4 w-4 opacity-50 group-hover:opacity-100 transition-all"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                  </Link>
                )}

                <div className="pt-6 border-t border-white/[0.05] mt-6 space-y-1">
                  <button
                    onClick={handleDeleteAccount}
                    className="w-full text-left p-3 rounded-2xl hover:bg-red-500/10 text-sm text-red-400 transition-all flex items-center justify-between group active:scale-95"
                  >
                    Delete Account
                    <svg
                      className="h-4 w-4 opacity-50 group-hover:opacity-100 transition-all"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => void handleLogout()}
                    className="w-full text-left p-3 rounded-2xl hover:bg-white/5 text-sm text-slate-400 transition-all flex items-center justify-between group active:scale-95"
                  >
                    Sign Out
                    <svg
                      className="h-4 w-4 opacity-50 group-hover:opacity-100 transition-all"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
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
