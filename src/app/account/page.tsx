'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/store/auth-store';
import { useHistoryStore } from '@/store/history-store';
import { getProxiedImageUrl } from '@/lib/image-proxy';

export default function AccountPage() {
  const router = useRouter();
  const { user, clearAuth, isLoggedIn } = useAuthStore();
  const { history, clearHistory } = useHistoryStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isLoggedIn()) {
      router.push('/account/signin');
    }
  }, [isLoggedIn, router]);

  const stats = useMemo(() => {
    const totalWatched = history.length;
    // Each entry ~30 mins
    const estHours = Math.round(totalWatched * 0.5 * 10) / 10;

    const categories: Record<string, number> = {};
    const countries: Record<string, number> = {};

    history.forEach((h) => {
      if (h.category) {
        categories[h.category] = (categories[h.category] || 0) + 1;
      }
      if (h.country) {
        countries[h.country] = (countries[h.country] || 0) + 1;
      }
    });

    const mostWatchedCategory =
      Object.entries(categories).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Uncategorized';
    const topCountry =
      Object.entries(countries).sort((a, b) => b[1] - a[1])[0]?.[0] || 'International';

    return {
      hours: estHours,
      mostWatchedCategory,
      topCountry,
      totalSessions: totalWatched,
    };
  }, [history]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    clearAuth();
    router.push('/');
  };

  if (!mounted || !user) return null;

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6 bg-slate-950">
      <div className="mx-auto max-w-[1200px] space-y-12 animate-fade-in transform-gpu">
        {/* Header Profile Card */}
        <div className="rounded-[48px] bg-white/[0.02] border border-white/[0.08] p-10 backdrop-blur-xl relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 h-96 w-96 bg-cyan-500/5 blur-[120px] rounded-full" />

          <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-tr from-cyan-500 to-indigo-600 rounded-[40px] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
              <div className="relative h-32 w-32 rounded-[40px] bg-slate-900 border border-white/10 flex items-center justify-center text-slate-500 shadow-2xl overflow-hidden">
                <span className="material-icons text-6xl">account_circle</span>
              </div>
              {user.isVerified && (
                <div className="absolute -bottom-2 -right-2 h-10 w-10 rounded-2xl bg-cyan-500 border-4 border-slate-950 flex items-center justify-center text-slate-950 shadow-xl">
                  <span className="material-icons text-xl">verified</span>
                </div>
              )}
            </div>

            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-center gap-4 mb-2">
                <h1 className="text-4xl font-black text-white truncate uppercase italic tracking-tighter leading-none">
                  {user.username || user.name || user.email.split('@')[0]}
                </h1>
                <div className="flex justify-center md:justify-start gap-2">
                  <span className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-black tracking-widest uppercase">
                    {user.role}
                  </span>
                  {user.isVerified && (
                    <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-black tracking-widest uppercase flex items-center gap-1">
                      Verified
                    </span>
                  )}
                </div>
              </div>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[11px] opacity-60">
                Member since{' '}
                {new Date(user.createdAt).toLocaleDateString(undefined, {
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/account/settings"
                className="inline-flex items-center justify-center px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95"
              >
                Settings
              </Link>
              <button
                onClick={() => void handleLogout()}
                className="inline-flex items-center justify-center px-8 py-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-[10px] font-black text-red-400 uppercase tracking-widest hover:bg-red-500/20 transition-all active:scale-95"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            label="Watch Time"
            value={`${stats.hours}h`}
            sub="Total playback hours"
            icon="schedule"
            color="text-cyan-400"
          />
          <StatCard
            label="Top Category"
            value={stats.mostWatchedCategory}
            sub="Most frequent genre"
            icon="auto_awesome"
            color="text-violet-400"
          />
          <StatCard
            label="Top Region"
            value={stats.topCountry}
            sub="Preferred territory"
            icon="public"
            color="text-emerald-400"
          />
          <StatCard
            label="Sessions"
            value={stats.totalSessions}
            sub="Historical channel picks"
            icon="analytics"
            color="text-indigo-400"
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <section>
              <div className="flex items-center justify-between mb-8 px-2">
                <h2 className="text-2xl font-black text-white flex items-center gap-4 uppercase italic tracking-tighter leading-none">
                  <span className="material-icons text-cyan-400">history</span>
                  Watch History<span className="text-cyan-500">.</span>
                </h2>
                {history.length > 0 && (
                  <button
                    onClick={clearHistory}
                    className="text-[10px] font-black text-slate-500 hover:text-red-400 uppercase tracking-[0.2em] transition-all"
                  >
                    Clear History
                  </button>
                )}
              </div>

              {history.length === 0 ? (
                <div className="rounded-[40px] border border-dashed border-white/10 p-24 text-center bg-white/[0.01]">
                  <span className="material-icons text-5xl text-slate-800 mb-4">history</span>
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">
                    Your streaming journey begins here.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {history.slice(0, 10).map((h) => (
                    <Link
                      key={`${h.channelId}-${h.watchedAt}`}
                      href={`/channel/${encodeURIComponent(h.channelId)}`}
                      className="group flex items-center gap-5 p-5 rounded-[32px] bg-white/[0.03] border border-white/[0.07] hover:border-cyan-500/40 transition-all hover:bg-cyan-500/[0.03] hover:-translate-y-1 shadow-xl"
                    >
                      <div className="h-16 w-16 rounded-2xl bg-slate-900 border border-white/5 overflow-hidden shrink-0 shadow-2xl p-2 flex items-center justify-center">
                        {h.channelLogo ? (
                          <Image
                            src={getProxiedImageUrl(h.channelLogo)}
                            alt=""
                            width={48}
                            height={48}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <div className="text-2xl font-black text-slate-800 uppercase italic">
                            {h.channelName[0]}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-base font-black text-white group-hover:text-cyan-400 transition-colors truncate uppercase italic tracking-tighter">
                          {h.channelName}
                        </div>
                        <div className="text-[10px] text-slate-500 uppercase font-bold mt-1 tracking-widest flex items-center gap-2">
                          <span className="h-1 w-1 rounded-full bg-slate-700" />
                          {new Date(h.watchedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center text-slate-600 group-hover:bg-cyan-500 group-hover:text-slate-950 transition-all">
                        <span className="material-icons text-xl">play_arrow</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="space-y-6">
            <div className="rounded-[40px] bg-gradient-to-br from-indigo-600/10 to-cyan-500/10 border border-white/[0.08] p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <span className="material-icons text-8xl text-white">shield</span>
              </div>
              <h3 className="font-black text-white text-[11px] uppercase tracking-[0.3em] mb-8 px-1 opacity-50">
                Security & Verification
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-3">
                    <span className="material-icons text-emerald-400 text-lg">check_circle</span>
                    <div className="text-xs font-bold text-white uppercase tracking-widest">
                      Email Verified
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-3">
                    <span
                      className={`material-icons text-lg ${user.twoFactorEnabled ? 'text-emerald-400' : 'text-slate-600'}`}
                    >
                      {user.twoFactorEnabled ? 'verified_user' : 'lock_open'}
                    </span>
                    <div className="text-xs font-bold text-white uppercase tracking-widest">
                      2FA Protection
                    </div>
                  </div>
                  {!user.twoFactorEnabled && (
                    <Link
                      href="/account/settings/credentials"
                      className="text-[9px] font-black text-cyan-400 uppercase tracking-widest hover:underline"
                    >
                      ENABLE
                    </Link>
                  )}
                </div>
              </div>

              <div className="mt-10 pt-8 border-t border-white/5">
                <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                  Account details and security preferences can be managed in your settings.
                </p>
                <Link
                  href="/account/settings"
                  className="mt-6 w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95"
                >
                  Manage Account <span className="material-icons text-sm">east</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  sub?: string;
}) {
  return (
    <div className="rounded-[36px] border border-white/[0.07] bg-white/[0.03] p-8 backdrop-blur-md shadow-xl hover:bg-white/[0.05] transition-all group overflow-hidden relative">
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <span className={`material-icons text-6xl ${color}`}>{icon}</span>
      </div>
      <div className={`material-icons text-3xl mb-6 ${color}`}>{icon}</div>
      <div className="space-y-1 relative z-10">
        <div className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">
          {label}
        </div>
        <div className="text-3xl font-black text-white tracking-tighter italic uppercase truncate">
          {value}
        </div>
        <div className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">{sub}</div>
      </div>
    </div>
  );
}
