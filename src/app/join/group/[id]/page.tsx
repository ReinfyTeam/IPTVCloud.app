'use client';

import React, { use, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function JoinGroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: code } = use(params);
  const router = useRouter();
  const { user, token } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [groupInfo, setGroupInfo] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    async function checkLink() {
      try {
        const res = await fetch(`/api/user/groupchats/join/${code}`);
        const data = await res.json();
        if (res.ok) {
          setGroupInfo(data);
        } else {
          setError(data.error || 'Invalid or expired invite link');
        }
      } catch {
        setError('Failed to load invite');
      } finally {
        setLoading(false);
      }
    }
    checkLink();
  }, [code]);

  const handleJoin = async () => {
    if (!token) {
      router.push(`/account/signin?callback=/join/group/${code}`);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/user/groupchats/join/${code}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/account/messages/group/${data.groupId}`);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to join group');
        setLoading(false);
      }
    } catch {
      setError('Connection error');
      setLoading(false);
    }
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full p-8 rounded-[40px] bg-white/[0.02] border border-white/[0.08] text-center space-y-8 animate-fade-in">
        {error ? (
          <>
            <div className="h-20 w-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
              <span className="material-icons text-red-500 text-4xl">link_off</span>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-black text-white uppercase italic tracking-tight">
                Invite Expired
              </h1>
              <p className="text-slate-500 text-sm font-medium">{error}</p>
            </div>
            <Link
              href="/home"
              className="block text-[10px] font-black text-cyan-500 uppercase tracking-widest hover:underline"
            >
              Return Home
            </Link>
          </>
        ) : (
          <>
            <div className="h-24 w-24 rounded-[32px] bg-slate-900 border border-white/10 flex items-center justify-center mx-auto text-cyan-500 shadow-2xl">
              <span className="material-icons text-5xl">groups</span>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-black text-white uppercase italic tracking-tight">
                Group Invitation
              </h1>
              <p className="text-slate-400 text-sm font-medium">
                You've been invited to join{' '}
                <span className="text-white font-black">"{groupInfo?.name}"</span>
              </p>
            </div>
            <button
              onClick={handleJoin}
              className="w-full py-4 rounded-2xl bg-cyan-500 text-slate-950 font-black text-[10px] uppercase tracking-widest hover:bg-cyan-400 transition-all active:scale-95 shadow-lg shadow-cyan-900/30"
            >
              {token ? 'Join Group' : 'Sign in to Join'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
