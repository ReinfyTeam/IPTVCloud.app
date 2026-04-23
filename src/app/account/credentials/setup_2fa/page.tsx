'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function SetupTOTPPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!token) {
      router.push('/account/signin');
      return;
    }

    const generateSecret = async () => {
      try {
        const res = await fetch('/api/auth/2fa/setup', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          setSecret(data.secret);
          setQrCode(data.qrCode);
        } else {
          setError('Failed to generate 2FA secret.');
        }
      } catch (err) {
        setError('An error occurred while setting up 2FA.');
      }
    };

    generateSecret();
  }, [token, router]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerify = async () => {
    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ token: tokenInput }),
      });

      if (res.ok) {
        setSuccess('2FA has been enabled successfully!');
        setError('');
        setTimeout(() => router.push('/account/settings'), 2000);
      } else {
        const data = await res.json();
        setError(data.error || 'Invalid token. Please try again.');
      }
    } catch (err) {
      setError('An error occurred while verifying the token.');
    }
  };

  return (
    <div className="min-h-screen pt-32 pb-20 px-4 sm:px-6 bg-background">
      <div className="mx-auto max-w-lg space-y-8 animate-fade-in">
        <div className="text-center">
          <h1 className="text-4xl font-black text-foreground tracking-tighter uppercase italic">
            Setup Two-Factor Authentication
          </h1>
          <p className="mt-4 text-foreground-muted">
            Scan the QR code with your authenticator app (e.g., Google Authenticator, Authy).
          </p>
        </div>

        <div className="glass-card p-8 rounded-[48px]">
          {error && <p className="text-red-500 text-center mb-4">{error}</p>}
          {success && <p className="text-green-500 text-center mb-4">{success}</p>}

          {qrCode ? (
            <div className="space-y-8 flex flex-col items-center">
              <div className="p-4 bg-white rounded-3xl shadow-2xl border-8 border-white">
                <Image
                  src={qrCode}
                  alt="QR Code"
                  width={180}
                  height={180}
                  className="rounded-xl"
                  unoptimized
                />
              </div>

              <div className="w-full space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-foreground-muted text-center px-1">
                  Or enter this secret key manually
                </p>
                <div className="relative group">
                  <input
                    type="text"
                    readOnly
                    value={secret}
                    className="w-full rounded-2xl border border-border bg-background-elevated/50 p-4 text-center font-mono text-sm text-foreground outline-none focus:border-cyan-500 transition-all shadow-inner pr-14"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="absolute right-2 top-2 h-10 w-10 flex items-center justify-center rounded-xl bg-accent/10 text-accent hover:bg-accent hover:text-slate-950 transition-all active:scale-95"
                    title="Copy to clipboard"
                  >
                    <span className="material-icons text-lg">
                      {copied ? 'done' : 'content_copy'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center py-12 space-y-4">
              <div className="h-12 w-12 rounded-full border-2 border-border border-t-accent animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-widest text-foreground-muted">
                Generating Secure Key...
              </p>
            </div>
          )}

          <div className="mt-12 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-center text-foreground-muted">
              Verification Step
            </h3>
            <input
              type="text"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="000 000"
              maxLength={6}
              className="w-full text-center rounded-2xl border border-border bg-background-elevated/50 p-4 text-2xl font-black text-foreground outline-none focus:border-cyan-500 transition-all tracking-[0.5em]"
            />
            <button
              onClick={handleVerify}
              disabled={!tokenInput || tokenInput.length < 6}
              className="w-full rounded-2xl bg-cyan-500 px-5 py-4 text-sm font-black text-slate-950 hover:bg-cyan-400 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 shadow-lg shadow-cyan-500/20"
            >
              Verify & Enable 2FA
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
