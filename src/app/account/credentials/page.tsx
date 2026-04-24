'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import Image from 'next/image';
import Link from 'next/link';

export default function CredentialsSettingsPage() {
  const router = useRouter();
  const { user, token, isLoggedIn, setAuth } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 2FA state
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [show2faSetup, setShow2faSetup] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isLoggedIn()) {
      router.push('/account/signin');
      return;
    }
    setEmail(user?.email || '');
  }, [user, isLoggedIn, router]);

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || email === user?.email) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/user/update-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg('Email updated. Please re-authenticate if required.');
        if (data.user) setAuth(data.user, token!);
      } else {
        setError(data.error || 'Failed to update email.');
      }
    } catch {
      setError('Network error.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/user/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg('Password updated successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError(data.error || 'Failed to update password.');
      }
    } catch {
      setError('Network error.');
    } finally {
      setLoading(false);
    }
  };

  const setup2FA = async () => {
    router.push('/account/credentials/setup_2fa');
  };

  const disable2FA = async () => {
    if (!confirm('Are you sure you want to disable 2FA? This will reduce your account security.'))
      return;
    setLoading(true);
    try {
      const res = await fetch('/api/user/2fa/disable', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setMsg('2FA disabled.');
        if (data.user) setAuth(data.user, token!);
      }
    } catch {
      setError('Failed to disable 2FA.');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted || !user) return null;

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6 bg-slate-950">
      <div className="mx-auto max-w-[1200px] grid lg:grid-cols-3 gap-8 animate-fade-in transform-gpu">
        {/* Left Column: Navigation & Summary */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-card p-8 rounded-[40px] border border-white/5 bg-white/[0.02] backdrop-blur-2xl shadow-2xl overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
              <span className="material-icons text-8xl">security</span>
            </div>
            <div className="relative z-10">
              <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter leading-none mb-4">
                Identity &<br />
                Access<span className="text-cyan-500">.</span>
              </h1>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest leading-relaxed">
                Manage your credentials, authentication methods, and account security parameters.
              </p>
            </div>
          </div>

          <nav className="glass-card p-2 rounded-[32px] border border-white/5 bg-white/[0.02] backdrop-blur-xl shadow-xl flex flex-col gap-1">
            <Link
              href="/account/settings"
              className="flex items-center gap-4 p-4 rounded-2xl text-slate-500 hover:text-white hover:bg-white/5 transition-all group"
            >
              <span className="material-icons group-hover:text-cyan-500 transition-colors">
                person_outline
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest">
                Profile Settings
              </span>
            </Link>
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-lg shadow-cyan-500/5">
              <span className="material-icons">lock_open</span>
              <span className="text-[10px] font-black uppercase tracking-widest">
                Credentials & 2FA
              </span>
            </div>
          </nav>

          {msg && (
            <div className="p-5 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest animate-fade-up">
              {msg}
            </div>
          )}
          {error && (
            <div className="p-5 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest animate-shake">
              {error}
            </div>
          )}
        </div>

        {/* Right Column: Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Email & Password */}
          <section className="glass-card p-10 rounded-[48px] border border-white/5 bg-white/[0.02] backdrop-blur-2xl shadow-2xl space-y-12">
            <div className="space-y-8">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                  <span className="material-icons">alternate_email</span>
                </div>
                <h2 className="text-xl font-bold text-white uppercase tracking-tight italic">
                  Email Address
                </h2>
              </div>

              <form onSubmit={handleUpdateEmail} className="grid sm:grid-cols-2 gap-6 items-end">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">
                    Update Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-4 rounded-2xl bg-slate-950/50 border border-white/5 text-white font-medium text-sm shadow-inner outline-none focus:border-cyan-500 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || email === user?.email}
                  className="h-14 rounded-2xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50"
                >
                  Update Email
                </button>
              </form>
            </div>

            <div className="h-px bg-white/5" />

            <div className="space-y-8">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-2xl bg-violet-500/10 flex items-center justify-center text-violet-400">
                  <span className="material-icons">password</span>
                </div>
                <h2 className="text-xl font-bold text-white uppercase tracking-tight italic">
                  Account Password
                </h2>
              </div>

              <form onSubmit={handleUpdatePassword} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-6 items-end">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full p-4 rounded-2xl bg-slate-950/50 border border-white/5 text-white font-medium text-sm shadow-inner outline-none focus:border-cyan-500 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min. 8 chars"
                      className="w-full p-4 rounded-2xl bg-slate-950/50 border border-white/5 text-white font-medium text-sm shadow-inner outline-none focus:border-cyan-500 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full p-4 rounded-2xl bg-slate-950/50 border border-white/5 text-white font-medium text-sm shadow-inner outline-none focus:border-cyan-500 transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !newPassword}
                    className="h-14 rounded-2xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50"
                  >
                    Change Password
                  </button>
                </div>
              </form>
            </div>
          </section>

          {/* 2FA Status */}
          <section className="glass-card p-10 rounded-[48px] border border-white/5 bg-white/[0.02] backdrop-blur-2xl shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8">
              <div className="flex items-center gap-6">
                <div
                  className={`h-16 w-16 rounded-[28px] flex items-center justify-center text-3xl shadow-2xl ${user?.twoFactorEnabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-emerald-500/10' : 'bg-slate-900 text-slate-600 border border-white/5'}`}
                >
                  <span className="material-icons">
                    {user?.twoFactorEnabled ? 'verified_user' : 'gpp_maybe'}
                  </span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white uppercase tracking-tight italic">
                    Two-Factor Auth (2FA)
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <div
                      className={`h-1.5 w-1.5 rounded-full animate-pulse ${user?.twoFactorEnabled ? 'bg-emerald-500' : 'bg-slate-600'}`}
                    />
                    <span
                      className={`text-[10px] font-black uppercase tracking-[0.2em] ${user?.twoFactorEnabled ? 'text-emerald-400' : 'text-slate-500'}`}
                    >
                      {user?.twoFactorEnabled ? 'PROTECTED' : 'DISABLED'}
                    </span>
                  </div>
                </div>
              </div>

              <Link
                href={
                  user?.twoFactorEnabled
                    ? '/account/credentials/manage_2fa'
                    : '/account/credentials/setup_2fa'
                }
                className={`px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 text-center shadow-lg ${user?.twoFactorEnabled ? 'bg-white/5 border border-white/10 text-white hover:bg-white/10' : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-cyan-500/20'}`}
              >
                {user?.twoFactorEnabled ? 'Manage 2FA' : 'Setup 2FA Now'}
              </Link>
            </div>

            {!user?.twoFactorEnabled && (
              <div className="mt-8 p-6 rounded-3xl bg-amber-400/5 border border-amber-400/10 flex items-start gap-4">
                <span className="material-icons text-amber-400 text-lg mt-0.5">info</span>
                <p className="text-[11px] text-amber-400/70 font-medium leading-relaxed uppercase tracking-wider">
                  Enhance your signal security. 2FA adds an extra layer of protection to your
                  identity by requiring a unique code from your device.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
