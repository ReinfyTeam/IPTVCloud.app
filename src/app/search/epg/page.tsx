'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { getProxiedImageUrl } from '@/lib/image-proxy';

type Channel = {
  id: string;
  name: string;
  logo: string | null;
  category: string;
  country: string;
  language: string;
};

export default function SearchEpgPage() {
  const searchParams = useSearchParams();
  const q = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const language = searchParams.get('language') || '';
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChannels = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/epg/search?q=${encodeURIComponent(q)}`;
      if (category) url += `&category=${encodeURIComponent(category)}`;
      if (language) url += `&language=${encodeURIComponent(language)}`;

      const res = await fetch(url);
      if (res.ok) {
        setChannels(await res.json());
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [q, category, language]);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  return (
    <div className="min-h-screen pt-32 pb-20 px-4 sm:px-6 bg-slate-950">
      <div className="mx-auto max-w-4xl space-y-8 sm:space-y-12 animate-fade-in transform-gpu">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
          <div className="space-y-4">
            <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
              Schedule Discovery
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-white uppercase italic tracking-tighter leading-none">
              Find Guides<span className="text-cyan-500">.</span>
            </h1>
          </div>

          <div className="flex flex-wrap gap-3">
            <select
              value={category}
              onChange={(e) => {
                const params = new URLSearchParams(searchParams.toString());
                if (e.target.value) params.set('category', e.target.value);
                else params.delete('category');
                window.history.replaceState(null, '', `?${params.toString()}`);
              }}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400 focus:border-cyan-500 outline-none"
            >
              <option value="">All Categories</option>
              <option value="News">News</option>
              <option value="Sports">Sports</option>
              <option value="Movies">Movies</option>
              <option value="Entertainment">Entertainment</option>
              <option value="Music">Music</option>
              <option value="Kids">Kids</option>
            </select>
          </div>
        </div>

        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
          {channels.map((ch) => (
            <Link
              key={ch.id}
              href={`/epg/${ch.id}`}
              className="p-4 sm:p-5 rounded-[24px] sm:rounded-[32px] border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] transition-all flex items-center gap-4 shadow-xl active:scale-[0.98]"
            >
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-slate-900 border border-white/5 flex items-center justify-center p-2 shrink-0">
                {ch.logo ? (
                  <Image
                    src={getProxiedImageUrl(ch.logo)}
                    alt=""
                    width={32}
                    height={32}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <span className="text-lg font-black text-slate-700 uppercase italic">
                    {ch.name[0]}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-black text-white truncate uppercase italic tracking-tighter">
                  {ch.name}
                </div>
                <div className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-0.5">
                  {ch.category}
                </div>
              </div>
              <span className="material-icons text-slate-700 text-sm sm:text-base">event_note</span>
            </Link>
          ))}
          {channels.length === 0 && !loading && (
            <div className="p-16 sm:p-32 text-center text-slate-600 font-bold uppercase tracking-widest text-[10px] sm:text-xs border border-dashed border-white/10 rounded-[32px] sm:rounded-[40px] col-span-full bg-white/[0.01]">
              No matching channel guides found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
