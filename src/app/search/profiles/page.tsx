'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import VerifiedBadge from '@/components/VerifiedBadge';
import { useAuthStore } from '@/store/auth-store';

type Profile = {
  id: string;
  username: string;
  name: string | null;
  role: string;
  isVerified: boolean;
};

export default function SearchProfilesPage() {
  const { token } = useAuthStore();
  const searchParams = useSearchParams();
  const q = searchParams.get('q') || '';
  const role = searchParams.get('role') || '';
  const verified = searchParams.get('verified') === 'true';
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/search/profiles?q=${encodeURIComponent(q)}`;
      if (role) url += `&role=${role}`;
      if (verified) url += `&verified=true`;

      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        setProfiles(await res.json());
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [q, role, verified, token]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  return (
    <div className="min-h-screen pt-32 pb-20 px-4 sm:px-6 bg-slate-950">
      <div className="mx-auto max-w-4xl space-y-8 sm:space-y-12 animate-fade-in transform-gpu">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
          <div className="space-y-4">
            <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
              Community Discovery
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-white uppercase italic tracking-tighter leading-none">
              Member Search<span className="text-cyan-500">.</span>
            </h1>
          </div>

          <div className="flex flex-wrap gap-3">
            <select
              value={role}
              onChange={(e) => {
                const params = new URLSearchParams(searchParams.toString());
                if (e.target.value) params.set('role', e.target.value);
                else params.delete('role');
                window.history.replaceState(null, '', `?${params.toString()}`);
              }}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400 focus:border-cyan-500 outline-none"
            >
              <option value="">All Roles</option>
              <option value="USER">User</option>
              <option value="MODERATOR">Moderator</option>
              <option value="STAFF">Staff</option>
              <option value="ADMIN">Admin</option>
            </select>

            <button
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                if (!verified) params.set('verified', 'true');
                else params.delete('verified');
                window.history.replaceState(null, '', `?${params.toString()}`);
              }}
              className={`px-4 py-2 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${verified ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-white/5 border-white/10 text-slate-500 hover:text-white'}`}
            >
              {verified ? 'VERIFIED ONLY' : 'ALL STATUS'}
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:gap-4">
          {profiles.map((p) => (
            <Link
              key={p.id}
              href={`/profile/${p.username}`}
              className="p-4 sm:p-6 rounded-[24px] sm:rounded-[32px] border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] transition-all flex items-center gap-4 sm:gap-6 shadow-xl active:scale-[0.98]"
            >
              <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl bg-slate-900 border border-white/5 flex items-center justify-center text-slate-700 shadow-2xl shrink-0">
                <span className="material-icons text-2xl sm:text-3xl">account_circle</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-base sm:text-lg font-black text-white uppercase italic tracking-tighter leading-none truncate">
                    @{p.username}
                  </span>
                  {p.isVerified && <VerifiedBadge className="text-xs sm:text-sm shrink-0" />}
                </div>
                <div className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                  {p.role} ACCOUNT
                </div>
              </div>
              <span className="material-icons text-slate-600 text-lg sm:text-xl shrink-0">
                east
              </span>
            </Link>
          ))}
          {profiles.length === 0 && !loading && (
            <div className="p-16 sm:p-32 text-center text-slate-600 font-bold uppercase tracking-widest text-[10px] sm:text-xs border border-dashed border-white/10 rounded-[32px] sm:rounded-[40px] bg-white/[0.01]">
              No members found matching your search.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
