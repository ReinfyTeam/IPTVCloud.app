'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import Link from 'next/link';

export default function Manage2FAPage() {
  const router = useRouter();
  const { user, token, isLoggedIn, setAuth } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setMounted(true);
    if (!isLoggedIn()) {
      router.push('/account/signin');
      return;
    }
    if (!user?.twoFactorEnabled) {
      router.push('/account/credentials');
    }
  }, [user, isLoggedIn, router]);

  const handleDisable2FA = async () => {
    if (
      !confirm(
        'Are you sure you want to disable 2FA? This will reduce your account security significantly.',
      )
    )
      return;

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/user/2fa/disable', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('2FA has been disabled.');
        // Refresh user state
        const meRes = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const meData = await meRes.json();
        if (meRes.ok && meData.user) {
          setAuth(meData.user, token!);
        }
        setTimeout(() => router.push('/account/credentials'), 2000);
      } else {
        setError(data.error || 'Failed to disable 2FA.');
      }
    } catch {
      setError('Network error.');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted || !user) return null;

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6 bg-slate-950">
      <div className="mx-auto max-w-lg space-y-12 animate-fade-in">
        <div className="flex items-center gap-6">
          <Link
            href="/account/credentials"
            className="h-12 w-12 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-all active:scale-90 backdrop-blur-xl"
          >
            <span className="material-icons">west</span>
          </Link>
          <div>
            <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter leading-none">
              Manage 2FA<span className="text-cyan-500">.</span>
            </h1>
            <p className="text-slate-500 text-sm mt-1 font-medium">
              Manage your two-factor authentication settings.
            </p>
          </div>
        </div>

        <div className="glass-card p-8 rounded-[40px] border border-white/5 bg-white/[0.02] backdrop-blur-2xl shadow-2xl space-y-8">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="h-20 w-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
              <span className="material-icons text-4xl">verified_user</span>
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-white uppercase tracking-tight italic">
                Status: Protected
              </h2>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
                Two-factor authentication is active
              </p>
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold text-center animate-shake">
              {error}
            </div>
          )}

          {success && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-bold text-center">
              {success}
            </div>
          )}

          <div className="space-y-4">
            <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/5 space-y-3">
              <h3 className="text-xs font-black text-white uppercase tracking-widest">
                About 2FA Removal
              </h3>
              <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                If you remove 2FA, you will only need your password to log in. We recommend keeping
                it enabled to protect your account data.
              </p>
            </div>

            <button
              onClick={handleDisable2FA}
              disabled={loading}
              className="w-full rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 py-4 text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all active:scale-95 disabled:opacity-50"
            >
              Remove 2FA Protection
            </button>

            <Link
              href="/account/credentials/setup_2fa"
              className="w-full flex items-center justify-center rounded-2xl bg-white/[0.03] border border-white/5 text-slate-300 py-4 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95"
            >
              Reset / Change 2FA Device
            </Link>
          </div>
        </div>

        <div className="text-center">
          <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.3em]">
            IPTVCloud Secure Authentication
          </p>
        </div>
      </div>
    </div>
  );
}
