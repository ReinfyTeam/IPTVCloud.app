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
    setLoading(true);
    try {
      const res = await fetch('/api/user/2fa/setup', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setQrCode(data.qrCode);
        setSecret(data.secret);
        setShow2faSetup(true);
      }
    } catch {
      setError('Failed to initialize 2FA.');
    } finally {
      setLoading(false);
    }
  };

  const verifyAndEnable2FA = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/user/2fa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ token: otpToken, secret }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg('2FA enabled successfully.');
        setShow2faSetup(false);
        if (data.user) setAuth(data.user, token!);
      } else {
        setError(data.error || 'Invalid token.');
      }
    } catch {
      setError('Verification failed.');
    } finally {
      setLoading(false);
    }
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
      <div className="mx-auto max-w-2xl space-y-8 sm:space-y-12 animate-fade-in transform-gpu">
        <div className="flex items-center gap-4 sm:gap-6">
          <Link
            href="/account/settings"
            className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all active:scale-90"
          >
            <span className="material-icons text-xl sm:text-2xl">west</span>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white uppercase italic tracking-tighter leading-none">
              Account Credentials<span className="text-cyan-500">.</span>
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-1 font-medium">
              Manage your security and access methods.
            </p>
          </div>
        </div>

        {msg && (
          <div className="p-4 rounded-xl sm:rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs sm:text-sm font-bold animate-fade-in">
            {msg}
          </div>
        )}
        {error && (
          <div className="p-4 rounded-xl sm:rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs sm:text-sm font-bold animate-fade-in">
            {error}
          </div>
        )}

        <div className="grid gap-6 sm:gap-8">
          {/* Email Section */}
          <section className="rounded-[32px] sm:rounded-[40px] border border-white/[0.08] bg-white/[0.03] p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-4 mb-8">
              <div className="h-10 w-10 rounded-xl sm:rounded-2xl bg-cyan-500/10 flex items-center justify-center text-xl text-cyan-400">
                <span className="material-icons">alternate_email</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Email Address
              </h2>
            </div>

            <form onSubmit={handleUpdateEmail} className="space-y-6">
              <div>
                <label className="block text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 px-1">
                  Current Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl sm:rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm text-white outline-none focus:border-cyan-500 transition-all shadow-inner"
                />
              </div>
              <button
                type="submit"
                disabled={loading || email === user.email}
                className="w-full sm:w-auto rounded-xl sm:rounded-2xl bg-white text-slate-950 px-8 py-3.5 text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-cyan-400 transition-all active:scale-95 disabled:opacity-50"
              >
                Update Email
              </button>
            </form>
          </section>

          {/* Password Section */}
          <section className="rounded-[32px] sm:rounded-[40px] border border-white/[0.08] bg-white/[0.03] p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-4 mb-8">
              <div className="h-10 w-10 rounded-xl sm:rounded-2xl bg-violet-500/10 flex items-center justify-center text-xl text-violet-400">
                <span className="material-icons">lock</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Security Password
              </h2>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="sm:col-span-2">
                  <label className="block text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 px-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl sm:rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm text-white outline-none focus:border-cyan-500 transition-all shadow-inner"
                  />
                </div>
                <div>
                  <label className="block text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 px-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 8 chars"
                    className="w-full rounded-xl sm:rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm text-white outline-none focus:border-cyan-500 transition-all shadow-inner"
                  />
                </div>
                <div>
                  <label className="block text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 px-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl sm:rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm text-white outline-none focus:border-cyan-500 transition-all shadow-inner"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || !newPassword}
                className="w-full sm:w-auto rounded-xl sm:rounded-2xl bg-white text-slate-950 px-8 py-3.5 text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-cyan-400 transition-all active:scale-95 disabled:opacity-50"
              >
                Change Password
              </button>
            </form>
          </section>

          {/* 2FA Section */}
          <section className="rounded-[32px] sm:rounded-[40px] border border-white/[0.08] bg-white/[0.03] p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl sm:rounded-2xl bg-emerald-500/10 flex items-center justify-center text-xl text-emerald-400">
                  <span className="material-icons">verified_user</span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Two-Factor Auth (2FA)
                </h2>
              </div>
              <span
                className={`w-fit px-3 py-1 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-widest ${user.twoFactorEnabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}
              >
                {user.twoFactorEnabled ? 'PROTECTED' : 'DISABLED'}
              </span>
            </div>

            {!user.twoFactorEnabled && !show2faSetup && (
              <div className="space-y-6 text-center sm:text-left">
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-medium">
                  Add an extra layer of security to your account using an authenticator app like
                  Google Authenticator or Authy.
                </p>
                <button
                  onClick={setup2FA}
                  className="w-full sm:w-auto rounded-xl sm:rounded-2xl bg-cyan-500 text-slate-950 px-8 py-3.5 text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-cyan-400 transition-all active:scale-95"
                >
                  Enable 2FA Protection
                </button>
              </div>
            )}

            {show2faSetup && (
              <div className="space-y-8 animate-fade-in">
                <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-center bg-slate-950/50 p-6 sm:p-8 rounded-3xl border border-white/5 shadow-inner">
                  {qrCode && (
                    <div className="bg-white p-3 rounded-2xl shadow-2xl shrink-0">
                      <Image
                        src={qrCode}
                        alt="2FA QR Code"
                        width={120}
                        height={128}
                        className="w-24 h-24 sm:w-32 sm:h-32"
                      />
                    </div>
                  )}
                  <div className="space-y-3 text-center sm:text-left">
                    <h3 className="text-white text-sm sm:text-base font-bold">1. Scan QR Code</h3>
                    <p className="text-[10px] sm:text-xs text-slate-500 leading-relaxed font-medium">
                      Open your authenticator app and scan this code. If you can&apos;t scan, enter
                      this manually:
                    </p>
                    <code className="block bg-black/40 p-3 rounded-xl text-cyan-400 text-[10px] sm:text-xs font-mono break-all border border-white/5">
                      {secret}
                    </code>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-white text-sm sm:text-base font-bold text-center sm:text-left">
                    2. Enter Verification Code
                  </h3>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <input
                      type="text"
                      value={otpToken}
                      onChange={(e) => setOtpToken(e.target.value)}
                      placeholder="000000"
                      maxLength={6}
                      className="flex-1 rounded-xl sm:rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-center text-xl font-mono tracking-[0.5em] text-cyan-400 outline-none focus:border-cyan-500 shadow-inner"
                    />
                    <button
                      onClick={verifyAndEnable2FA}
                      disabled={loading || otpToken.length !== 6}
                      className="py-4 sm:py-0 px-10 rounded-xl sm:rounded-2xl bg-cyan-500 text-slate-950 text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-cyan-400 transition-all active:scale-95 disabled:opacity-50"
                    >
                      Verify
                    </button>
                  </div>
                </div>
              </div>
            )}

            {user.twoFactorEnabled && (
              <div className="space-y-6">
                <div className="p-6 rounded-2xl sm:rounded-3xl bg-emerald-500/5 border border-emerald-500/10 flex items-center gap-4">
                  <span className="material-icons text-emerald-400 text-xl sm:text-2xl">
                    security
                  </span>
                  <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
                    Your account is currently secured with two-factor authentication.
                  </p>
                </div>
                <button
                  onClick={disable2FA}
                  className="w-full sm:w-auto rounded-xl sm:rounded-2xl border border-red-500/20 bg-red-500/5 text-red-400 px-8 py-3.5 text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-red-500/10 transition-all active:scale-95"
                >
                  Disable 2FA
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
