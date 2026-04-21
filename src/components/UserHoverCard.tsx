'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import VerifiedBadge from './VerifiedBadge';
import { getProxiedImageUrl } from '@/lib/image-proxy';
import { useAuthStore } from '@/store/auth-store';

type UserPreview = {
  id: string;
  username: string | null;
  name: string | null;
  profileIconUrl: string | null;
  bio: string | null;
  isVerified: boolean;
  _count: {
    followers: number;
    following: number;
  };
};

export default function UserHoverCard({
  username,
  children,
}: {
  username: string;
  children: React.ReactNode;
}) {
  const { token } = useAuthStore();
  const [user, setUser] = useState<UserPreview | null>(null);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchUser = async () => {
    if (user || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/user/profile/${username}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        setUser(await res.json());
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setVisible(true);
      fetchUser();
    }, 500); // 500ms delay for hover intent
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setVisible(false);
    }, 300);
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link href={`/profile/${username}`} className="hover:text-cyan-400 transition-colors">
        {children}
      </Link>

      {visible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-72 p-6 rounded-[32px] bg-slate-900/95 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[9999] animate-fade-in-up pointer-events-auto">
          {loading && !user ? (
            <div className="flex justify-center py-4">
              <div className="h-6 w-6 rounded-full border-2 border-white/10 border-t-cyan-500 animate-spin" />
            </div>
          ) : user ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-slate-800 border border-white/10 overflow-hidden shrink-0 relative shadow-inner">
                  {user.profileIconUrl ? (
                    <Image
                      src={getProxiedImageUrl(user.profileIconUrl)}
                      alt=""
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-slate-700">
                      <span className="material-icons text-3xl">person</span>
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="font-black text-white uppercase italic tracking-tighter truncate">
                      {user.username}
                    </span>
                    {user.isVerified && <VerifiedBadge className="text-[14px]" />}
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                    {user.name || 'Community Member'}
                  </div>
                </div>
              </div>

              {user.bio && (
                <p className="text-[11px] text-slate-400 font-medium leading-relaxed italic line-clamp-2">
                  "{user.bio}"
                </p>
              )}

              <div className="flex gap-4 pt-2 border-t border-white/5">
                <div className="flex flex-col">
                  <span className="text-sm font-black text-white italic">
                    {user._count.followers}
                  </span>
                  <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">
                    Followers
                  </span>
                </div>
                <div className="flex flex-col pl-4 border-l border-white/5">
                  <span className="text-sm font-black text-white italic">
                    {user._count.following}
                  </span>
                  <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">
                    Following
                  </span>
                </div>
              </div>

              <Link
                href={`/profile/${user.username}`}
                className="block w-full py-2.5 text-center bg-cyan-500 text-slate-950 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-cyan-400 transition-all active:scale-95 shadow-lg shadow-cyan-900/10"
              >
                View Full Profile
              </Link>
            </div>
          ) : (
            <div className="text-center text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              Profile Unavailable
            </div>
          )}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-[10px] border-transparent border-t-slate-900/95" />
        </div>
      )}
    </div>
  );
}
