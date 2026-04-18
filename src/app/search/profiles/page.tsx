'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

type Profile = {
  id: string;
  username: string;
  name: string | null;
  role: string;
  isVerified: boolean;
};

export default function SearchProfilesPage() {
  const searchParams = useSearchParams();
  const q = searchParams.get('q') || '';
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/search/profiles?q=${encodeURIComponent(q)}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setProfiles(data);
      })
      .finally(() => setLoading(false));
  }, [q]);

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6 bg-slate-950">
      <div className="mx-auto max-w-4xl space-y-12">
        <div className="space-y-4">
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 px-1">
            Community Discovery
          </div>
          <h1 className="text-5xl font-black text-white uppercase italic tracking-tighter leading-none">
            Member Search<span className="text-cyan-500">.</span>
          </h1>
          {q && (
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
              Showing results for &quot;{q}&quot;
            </p>
          )}
        </div>

        <div className="grid gap-4">
          {profiles.map((p) => (
            <Link
              key={p.id}
              href={`/profile/${p.username}`}
              className="p-6 rounded-[32px] border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] transition-all flex items-center gap-6 shadow-xl active:scale-[0.98]"
            >
              <div className="h-14 w-14 rounded-2xl bg-slate-900 border border-white/5 flex items-center justify-center text-slate-700 shadow-2xl shrink-0">
                <span className="material-icons text-3xl">account_circle</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black text-white uppercase italic tracking-tighter leading-none">
                    @{p.username}
                  </span>
                  {p.isVerified && (
                    <span className="material-icons text-cyan-500 text-sm">verified</span>
                  )}
                </div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                  {p.role} ACCOUNT
                </div>
              </div>
              <span className="material-icons text-slate-600">east</span>
            </Link>
          ))}
          {profiles.length === 0 && !loading && (
            <div className="p-32 text-center text-slate-600 font-bold uppercase tracking-widest text-xs border border-dashed border-white/10 rounded-[40px]">
              No members found matching your search.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
