'use client';

import React, { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (!isLoggedIn()) { router.push('/login'); return; }
    setName(user?.name || '');
  }, [user, isLoggedIn, router]);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(''), 3000);
    return () => clearTimeout(t);
  }, [msg]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/user/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    clearAuth();
    router.push('/');
  }

  if (!user) return null;

  return (
    <div className="min-h-screen px-4 sm:px-6 py-24 max-w-2xl mx-auto">
      <div className="mb-8 animate-fade-up">
        <div className="text-xs font-semibold uppercase tracking-widest text-cyan-400 mb-1">Your Account</div>
        <h1 className="text-3xl font-bold text-white">Profile</h1>
      </div>

      <div className="space-y-5 animate-fade-up-delayed">
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-cyan-600 text-xl font-bold text-slate-950 shadow-lg shadow-cyan-500/25">
              {(user.name || user.email).charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-semibold text-white text-lg">{user.name || 'Anonymous'}</div>
              <div className="text-slate-400 text-sm">{user.email}</div>
              <div className="mt-1">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${user.role === 'ADMIN' ? 'bg-violet-400/15 text-violet-300' : 'bg-slate-700/40 text-slate-400'}`}>
                  {user.role}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="rounded-xl border border-white/[0.07] bg-slate-900/50 p-3 text-center">
              <div className="text-xl font-bold text-amber-400">{favoriteIds.length}</div>
              <div className="text-xs text-slate-500 mt-0.5">Favorites</div>
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-slate-900/50 p-3 text-center">
              <div className="text-xl font-bold text-cyan-400">{history.length}</div>
              <div className="text-xs text-slate-500 mt-0.5">Watch history</div>
            </div>
          </div>

          {msg && (
            <div className="mb-4 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.08] px-3 py-2 text-sm text-emerald-300">
              {msg}
            </div>
          )}

          <form onSubmit={(e) => void handleSave(e)} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Display name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your display name"
                className="w-full rounded-xl border border-white/[0.07] bg-slate-900/80 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Email address</label>
              <input type="email" value={user.email} disabled className="w-full rounded-xl border border-white/[0.04] bg-slate-900/40 px-3.5 py-2.5 text-sm text-slate-500 cursor-not-allowed" />
            </div>
            <button type="submit" disabled={saving} className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-60 transition-colors">
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        </div>

        {history.length > 0 && (
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white">Watch History</h2>
              <button onClick={clearHistory} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Clear all</button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {history.slice(0, 20).map((entry) => (
                <div key={`${entry.channelId}-${entry.watchedAt}`} className="flex items-center gap-3 rounded-xl p-2 hover:bg-white/[0.04] transition-colors">
                  {entry.channelLogo ? (
                    <img src={entry.channelLogo} alt={entry.channelName} className="h-8 w-8 rounded-lg object-contain bg-slate-900" />
                  ) : (
                    <div className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center text-xs text-slate-500">
                      {entry.channelName.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-white truncate">{entry.channelName}</div>
                    <div className="text-xs text-slate-500">{new Date(entry.watchedAt).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
          <h2 className="font-semibold text-white mb-4">Account Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Link href="/account/settings" className="rounded-xl border border-white/[0.07] px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors">
              Settings
            </Link>
            {isAdmin() && (
              <Link href="/account/admin" className="rounded-xl border border-violet-400/20 bg-violet-400/[0.07] px-4 py-2.5 text-sm text-violet-300 hover:bg-violet-400/15 transition-colors">
                Admin Dashboard
              </Link>
            )}
            <button onClick={() => void handleLogout()} className="rounded-xl border border-red-400/20 bg-red-400/[0.05] px-4 py-2.5 text-sm text-red-400 hover:bg-red-400/10 transition-colors">
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
