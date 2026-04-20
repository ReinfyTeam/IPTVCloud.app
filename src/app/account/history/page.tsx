'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/store/auth-store';
import { getProxiedImageUrl } from '@/lib/image-proxy';
import { encodeBase64Url } from '@/lib/base64';

type HistoryItem = {
  id: string;
  channelId: string;
  channelName: string;
  channelLogo: string | null;
  category: string | null;
  country: string | null;
  watchedAt: string;
};

export default function HistoryPage() {
  const { token } = useAuthStore();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    if (token) {
      fetch('/api/user/history', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setHistory(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [token]);

  const filteredHistory = useMemo(() => {
    let items = history.filter(
      (h) =>
        !filter ||
        h.channelName.toLowerCase().includes(filter.toLowerCase()) ||
        h.category?.toLowerCase().includes(filter.toLowerCase()) ||
        h.country?.toLowerCase().includes(filter.toLowerCase()),
    );

    if (sortBy === 'newest') {
      items.sort((a, b) => new Date(b.watchedAt).getTime() - new Date(a.watchedAt).getTime());
    } else if (sortBy === 'oldest') {
      items.sort((a, b) => new Date(a.watchedAt).getTime() - new Date(b.watchedAt).getTime());
    } else if (sortBy === 'name') {
      items.sort((a, b) => a.channelName.localeCompare(b.channelName));
    }

    return items;
  }, [history, filter, sortBy]);

  if (loading) return null;

  return (
    <div className="min-h-screen pt-32 pb-20 px-4 sm:px-6 bg-slate-950">
      <div className="mx-auto max-w-[1200px] space-y-8 sm:space-y-12 animate-fade-in transform-gpu">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-6 sm:p-10 rounded-[32px] sm:rounded-[48px] bg-white/[0.02] border border-white/5 relative overflow-hidden shadow-2xl backdrop-blur-xl">
          <div className="absolute top-0 right-0 h-64 w-64 bg-cyan-500/5 blur-[80px] rounded-full" />
          <div className="space-y-2 relative z-10">
            <h1 className="text-3xl sm:text-4xl font-black text-white uppercase italic tracking-tighter leading-none">
              Watch History.
            </h1>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[8px] sm:text-[10px]">
              Review and jump back into your favorite streams
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 relative z-10 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                search
              </span>
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search history..."
                className="w-full sm:w-64 rounded-xl sm:rounded-2xl bg-slate-900/50 border border-white/10 py-2.5 pl-11 pr-4 text-xs font-bold text-white outline-none focus:border-cyan-500 transition-all"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-xl sm:rounded-2xl bg-slate-900/50 border border-white/10 py-2.5 px-6 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-cyan-500 transition-all appearance-none cursor-pointer text-center sm:text-left"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name">Channel Name</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredHistory.length === 0 ? (
            <div className="col-span-full rounded-[32px] sm:rounded-[40px] border border-white/5 bg-white/[0.02] p-16 sm:p-20 text-center text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-widest">
              {filter
                ? 'No matches found in history.'
                : 'Your history is empty. Start watching now!'}
            </div>
          ) : (
            filteredHistory.map((h) => (
              <Link
                key={h.id}
                href={`/channel/${encodeBase64Url(h.channelId)}`}
                className="group p-4 rounded-[32px] bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-cyan-500/30 transition-all"
              >
                <div className="relative aspect-video rounded-[24px] bg-slate-900 border border-white/5 overflow-hidden mb-4 shadow-inner">
                  {h.channelLogo ? (
                    <Image
                      src={getProxiedImageUrl(h.channelLogo)}
                      alt={h.channelName}
                      fill
                      className="object-contain p-4 group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-slate-700">
                      <span className="material-icons text-4xl">tv</span>
                    </div>
                  )}
                </div>
                <div className="px-2">
                  <h3 className="font-bold text-white uppercase italic tracking-tighter group-hover:text-cyan-400 transition-colors truncate">
                    {h.channelName}
                  </h3>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                      {h.category || 'General'}
                    </span>
                    <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">
                      {new Date(h.watchedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
