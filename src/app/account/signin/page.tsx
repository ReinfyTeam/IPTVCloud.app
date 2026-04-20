'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import type { AuthResponse } from '@/types';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 2FA state
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [twoFactorUserId, setTwoFactorUserId] = useState('');
  const [otpToken, setOtpToken] = useState('');

  // Force Password Reset state
  const [forceResetRequired, setForceResetRequired] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data: any = await res.json();

      if (!data.ok) {
        setError(data.error || 'Login failed. Please try again.');
        setLoading(false);
        return;
      }

      if (data.forcePasswordReset) {
        setForceResetRequired(true);
        setTwoFactorUserId(data.userId);
        setLoading(false);
        return;
      }

      if (data.twoFactorRequired) {
        setTwoFactorRequired(true);
        setTwoFactorUserId(data.userId);
        setLoading(false);
        return;
      }

      setAuth(data.user, data.token);
      router.push('/home');
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }

  async function handle2FAVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: twoFactorUserId, token: otpToken }),
      });
      const data = await res.json();

      if (!data.ok) {
        setError(data.error || 'Invalid verification code.');
        setLoading(false);
        return;
      }

      setAuth(data.user, data.token);
      router.push('/home');
    } catch {
      setError('Network error.');
      setLoading(false);
    }
  }

  async function handleForceReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/force-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: twoFactorUserId, oldPassword: password, newPassword }),
      });
      const data = await res.json();

      if (!data.ok) {
        setError(data.error || 'Failed to update password.');
        setLoading(false);
        return;
      }

      if (data.twoFactorRequired) {
        setForceResetRequired(false);
        setTwoFactorRequired(true);
        setLoading(false);
        return;
      }

      setAuth(data.user, data.token);
      router.push('/home');
    } catch {
      setError('Network error.');
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 pt-32 pb-20 bg-slate-950">
      <div className="w-full max-w-sm animate-fade-up space-y-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl sm:rounded-[32px] bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shadow-2xl">
            <span className="material-icons text-3xl sm:text-4xl">
              {forceResetRequired ? 'lock_reset' : twoFactorRequired ? 'verified_user' : 'login'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white uppercase italic tracking-tighter leading-none">
            {forceResetRequired
              ? 'Security Update'
              : twoFactorRequired
                ? 'Verify 2FA'
                : 'Welcome back'}
            <span className="text-cyan-500">.</span>
          </h1>
          <p className="mt-2 text-slate-500 font-bold uppercase tracking-widest text-[9px] sm:text-[10px]">
            {forceResetRequired
              ? 'An admin has requested a password change'
              : twoFactorRequired
                ? 'Enter your authenticator code'
                : 'Access your technical player'}
          </p>
        </div>

        <div className="rounded-[32px] border border-white/[0.08] bg-white/[0.03] p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {error && (
            <div className="mb-6 flex items-center gap-2 rounded-xl sm:rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-bold text-red-400 animate-fade-in">
              <span className="material-icons text-base">error_outline</span>
              <span className="truncate">{error}</span>
            </div>
          )}

          {!twoFactorRequired && !forceResetRequired && (
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 sm:space-y-5">
              <div>
                <label className="block text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 px-1">
                  Email or Username
                </label>
                <input
                  type="text"
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
                  placeholder="••••••••"
                  className="w-full rounded-xl sm:rounded-2xl border border-white/[0.08] bg-slate-900/50 p-4 text-sm text-white placeholder:text-slate-600 outline-none focus:border-cyan-500 transition-all shadow-inner"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl sm:rounded-2xl bg-cyan-500 py-4 text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-950 hover:bg-cyan-400 disabled:opacity-50 transition-all active:scale-95 shadow-lg shadow-cyan-900/20"
              >
                {loading ? 'Authenticating…' : 'Sign In'}
              </button>
            </form>
          )}

          {forceResetRequired && (
            <form onSubmit={(e) => void handleForceReset(e)} className="space-y-5 sm:space-y-6">
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 text-[9px] sm:text-[10px] font-bold text-orange-400 uppercase tracking-widest leading-relaxed">
                Your password was reset by an administrator. Please set a new password.
              </div>
              <div>
                <label className="block text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 px-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="New secure password"
                  className="w-full rounded-xl sm:rounded-2xl border border-white/[0.08] bg-slate-900/50 p-4 text-sm text-white placeholder:text-slate-600 outline-none focus:border-cyan-500 transition-all shadow-inner"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={loading || newPassword.length < 8}
                className="w-full rounded-xl sm:rounded-2xl bg-cyan-500 py-4 text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-950 hover:bg-cyan-400 disabled:opacity-50 transition-all active:scale-95 shadow-lg shadow-cyan-900/20"
              >
                {loading ? 'Updating...' : 'Set New Password'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setForceResetRequired(false);
                  setPassword('');
                }}
                className="w-full text-[9px] sm:text-[10px] font-bold text-slate-600 uppercase tracking-widest hover:text-white transition-all mt-2"
              >
                Cancel
              </button>
            </form>
          )}

          {twoFactorRequired && (
            <form onSubmit={(e) => void handle2FAVerify(e)} className="space-y-5 sm:space-y-6">
              <div>
                <label className="block text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 text-center">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={otpToken}
                  onChange={(e) => setOtpToken(e.target.value)}
                  required
                  maxLength={6}
                  placeholder="000000"
                  className="w-full rounded-xl sm:rounded-2xl border border-white/[0.08] bg-slate-950/50 p-4 text-center text-2xl font-mono tracking-[0.5em] text-cyan-400 outline-none focus:border-cyan-500 shadow-inner"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={loading || otpToken.length !== 6}
                className="w-full rounded-xl sm:rounded-2xl bg-cyan-500 py-4 text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-950 hover:bg-cyan-400 disabled:opacity-50 transition-all active:scale-95 shadow-lg shadow-cyan-900/20"
              >
                {loading ? 'Verifying…' : 'Confirm'}
              </button>
              <button
                type="button"
                onClick={() => setTwoFactorRequired(false)}
                className="w-full text-[9px] sm:text-[10px] font-bold text-slate-600 uppercase tracking-widest hover:text-white transition-all"
              >
                Back to Login
              </button>
            </form>
          )}
        </div>

        {!twoFactorRequired && !forceResetRequired && (
          <p className="mt-8 text-center text-[9px] sm:text-[10px] font-bold text-slate-600 uppercase tracking-widest">
            Don&apos;t have an account?{' '}
            <Link
              href="/account/signup"
              className="text-cyan-400 hover:text-cyan-300 transition-all"
            >
              Create account
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
