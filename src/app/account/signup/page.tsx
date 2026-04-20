'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import type { AuthResponse } from '@/types';

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleInitial, setMiddleInitial] = useState('');
  const [suffix, setSuffix] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (username.length < 3 || !/^[a-z0-9_]+$/.test(username.toLowerCase())) {
      setError('Username must be at least 3 characters (letters, numbers, underscores).');
      return;
    }
    if (!firstName || !lastName) {
      setError('First and last name are required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          username: username.toLowerCase(),
          password,
          firstName,
          lastName,
          middleInitial,
          suffix,
        }),
      });
      const data: AuthResponse = await res.json();

      if (!data.ok || !data.user || !data.token) {
        setError(data.error || 'Registration failed. Please try again.');
        return;
      }

      setAuth(data.user, data.token);
      router.push('/home');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 pt-32 pb-20 bg-slate-950">
      <div className="w-full max-w-sm animate-fade-up space-y-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl sm:rounded-[32px] bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shadow-2xl">
            <span className="material-icons text-3xl sm:text-4xl">person_add</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white uppercase italic tracking-tighter leading-none">
            Create account<span className="text-cyan-500">.</span>
          </h1>
          <p className="mt-2 text-slate-500 font-bold uppercase tracking-widest text-[9px] sm:text-[10px]">
            Join the community today
          </p>
        </div>

        <div className="rounded-[32px] border border-white/[0.08] bg-white/[0.03] p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {error && (
            <div className="mb-6 flex items-center gap-2 rounded-xl sm:rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-bold text-red-400 animate-fade-in">
              <span className="material-icons text-base">error_outline</span>
              <span className="truncate">{error}</span>
            </div>
          )}

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 sm:space-y-5">
            <div>
              <label className="block text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 px-1">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Unique ID"
                className="w-full rounded-xl sm:rounded-2xl border border-white/[0.08] bg-slate-900/50 p-4 text-sm text-white placeholder:text-slate-600 outline-none focus:border-cyan-500 transition-all shadow-inner"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 px-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  placeholder="First"
                  className="w-full rounded-xl sm:rounded-2xl border border-white/[0.08] bg-slate-900/50 p-4 text-sm text-white placeholder:text-slate-600 outline-none focus:border-cyan-500 transition-all shadow-inner"
                />
              </div>
              <div>
                <label className="block text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 px-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  placeholder="Last"
                  className="w-full rounded-xl sm:rounded-2xl border border-white/[0.08] bg-slate-900/50 p-4 text-sm text-white placeholder:text-slate-600 outline-none focus:border-cyan-500 transition-all shadow-inner"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 px-1">
                  Initial
                </label>
                <input
                  type="text"
                  value={middleInitial}
                  onChange={(e) => setMiddleInitial(e.target.value.slice(0, 1))}
                  maxLength={1}
                  placeholder="M.I."
                  className="w-full rounded-xl sm:rounded-2xl border border-white/[0.08] bg-slate-900/50 p-4 text-sm text-white placeholder:text-slate-600 outline-none focus:border-cyan-500 transition-all shadow-inner"
                />
              </div>
              <div>
                <label className="block text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 px-1">
                  Suffix
                </label>
                <input
                  type="text"
                  value={suffix}
                  onChange={(e) => setSuffix(e.target.value)}
                  placeholder="Jr/Sr"
                  className="w-full rounded-xl sm:rounded-2xl border border-white/[0.08] bg-slate-900/50 p-4 text-sm text-white placeholder:text-slate-600 outline-none focus:border-cyan-500 transition-all shadow-inner"
                />
              </div>
            </div>

            <div>
              <label className="block text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 px-1">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full rounded-xl sm:rounded-2xl border border-white/[0.08] bg-slate-900/50 p-4 text-sm text-white placeholder:text-slate-600 outline-none focus:border-cyan-500 transition-all shadow-inner"
              />
            </div>
            <div>
              <label className="block text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 px-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Min. 8 chars"
                className="w-full rounded-xl sm:rounded-2xl border border-white/[0.08] bg-slate-900/50 p-4 text-sm text-white placeholder:text-slate-600 outline-none focus:border-cyan-500 transition-all shadow-inner"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl sm:rounded-2xl bg-cyan-500 py-4 text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-950 hover:bg-cyan-400 disabled:opacity-50 transition-all active:scale-95 shadow-lg shadow-cyan-900/20"
            >
              {loading ? 'Creating account…' : 'Start Streaming'}
            </button>
          </form>
        </div>

        <p className="mt-8 text-center text-[9px] sm:text-[10px] font-bold text-slate-600 uppercase tracking-widest">
          Already have an account?{' '}
          <Link href="/account/signin" className="text-cyan-400 hover:text-cyan-300 transition-all">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
