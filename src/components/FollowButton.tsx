'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';

type Props = {
  targetUserId: string;
  initialIsFollowing: boolean;
};

export default function FollowButton({ targetUserId, initialIsFollowing }: Props) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [loading, setLoading] = useState(false);
  const { user, token } = useAuthStore();
  const router = useRouter();

  const handleFollow = async () => {
    if (!user) {
      router.push('/account/signin');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/user/follow', {
        method: isFollowing ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUserId }),
      });

      if (res.ok) {
        setIsFollowing(!isFollowing);
        router.refresh();
      }
    } catch (error) {
      console.error('Failed to follow/unfollow:', error);
    } finally {
      setLoading(false);
    }
  };

  if (user?.id === targetUserId) return null;

  return (
    <button
      onClick={handleFollow}
      disabled={loading}
      className={`px-8 py-3 rounded-full font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-95 shadow-lg ${
        isFollowing
          ? 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10'
          : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-cyan-500/20'
      } disabled:opacity-50`}
    >
      {loading ? 'Processing...' : isFollowing ? 'Following' : 'Follow'}
    </button>
  );
}
