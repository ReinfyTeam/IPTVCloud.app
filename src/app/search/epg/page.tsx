'use client';

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { getProxiedImageUrl } from '@/lib/image-proxy';
import Sidebar from '@/components/Sidebar';
import { getCountryName } from '@/lib/countries';
import { getLanguageName } from '@/lib/languages';

type Channel = {
  id: string;
  name: string;
  logo: string | null;
  category: string;
  country: string;
  language: string;
  isOffline?: boolean;
};

export default function SearchEpgPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const q = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const language = searchParams.get('language') || '';
  const country = searchParams.get('country') || '';

  const [channels, setChannels] = useState<Channel[]>([]);
  const [visibleChannels, setVisibleChannels] = useState<Channel[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  const [filterOptions, setFilterOptions] = useState({
    countries: [],
    categories: [],
    languages: [],
    resolutions: [],
    timezones: [],
    subdivisions: [],
    cities: [],
    regions: [],
    blocklist: [],
  });

  const fetchOptions = useCallback(async () => {
    try {
      const res = await fetch('/api/channels');
      if (res.ok) {
        const data = await res.json();
        setFilterOptions(data.filters);
      }
    } catch {}
  }, []);

  const fetchChannels = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/epg/search?q=${encodeURIComponent(q)}`;
      if (category) url += `&category=${encodeURIComponent(category)}`;
      if (language) url += `&language=${encodeURIComponent(language)}`;
      if (country) url += `&country=${encodeURIComponent(country)}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setChannels(data);
        setVisibleChannels(data.slice(0, 20));
        setPage(1);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [q, category, language, country]);

  useEffect(() => {
    fetchOptions();
    fetchChannels();
  }, [fetchOptions, fetchChannels]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleChannels.length < channels.length) {
          const nextPage = page + 1;
          const nextItems = channels.slice(0, nextPage * 20);
          setVisibleChannels(nextItems);
          setPage(nextPage);
        }
      },
      { threshold: 0.1 },
    );

    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [channels, visibleChannels, page]);

  const updateFilter = (key: string, value: any) => {
    const params = new URLSearchParams(window.location.search);
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/search/epg?${params.toString()}`);
  };

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar
        search={q}
        setSearch={(v) => updateFilter('q', v)}
        category={category}
        setCategory={(v) => updateFilter('category', v)}
        country={country}
        setCountry={(v) => updateFilter('country', v)}
        language={language}
        setLanguage={(v) => updateFilter('language', v)}
        resolution=""
        setResolution={() => {}}
        timezone=""
        setTimezone={() => {}}
        subdivision=""
        setSubdivision={() => {}}
        city=""
        setCity={() => {}}
        region=""
        setRegion={() => {}}
        status=""
        setStatus={() => {}}
        blocklist=""
        setBlocklist={() => {}}
        favoritesOnly={false}
        setFavoritesOnly={() => {}}
        sortBy="name"
        setSortBy={() => {}}
        filterOptions={filterOptions}
        isMobileOpen={isMobileSidebarOpen}
        setIsMobileOpen={setIsMobileSidebarOpen}
      />

      <div className="flex-1 flex flex-col min-w-0 lg:ml-80">
        <section className="flex-1 pt-24 sm:pt-32 pb-20 px-4 sm:px-10">
          <div className="max-w-[1600px] mx-auto space-y-10 animate-fade-in transform-gpu">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                    Global Guide Index
                  </span>
                </div>
                <h1 className="text-3xl sm:text-5xl font-black text-white uppercase italic tracking-tighter leading-none">
                  {q ? `Search: ${q}` : 'TV Schedule'}
                  <span className="text-cyan-500">.</span>
                </h1>
              </div>
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="lg:hidden h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white"
              >
                <span className="material-icons">filter_list</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              {visibleChannels.map((ch) => (
                <Link
                  key={ch.id}
                  href={`/epg/${ch.id}`}
                  className="group relative p-5 rounded-[32px] border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] transition-all transform-gpu hover:-translate-y-1 shadow-2xl flex flex-col gap-4 overflow-hidden"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-slate-900 border border-white/5 flex items-center justify-center p-2.5 shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                      {ch.logo ? (
                        <Image
                          src={getProxiedImageUrl(ch.logo)}
                          alt=""
                          width={40}
                          height={40}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <span className="text-xl font-black text-slate-700 uppercase italic">
                          {ch.name[0]}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-black text-white truncate uppercase italic tracking-tighter group-hover:text-cyan-400 transition-colors">
                        {ch.name}
                      </div>
                      <div className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-0.5">
                        {ch.category}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">
                        Region
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 truncate max-w-[100px]">
                        {getCountryName(ch.country)}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">
                        Language
                      </span>
                      <span className="text-[9px] font-bold text-slate-400">
                        {getLanguageName(ch.language)}
                      </span>
                    </div>
                  </div>

                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="material-icons text-cyan-500/40 text-lg">event_note</span>
                  </div>
                </Link>
              ))}
            </div>

            {loading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="h-32 rounded-[32px] bg-white/[0.02] border border-white/[0.05] animate-pulse"
                  />
                ))}
              </div>
            )}

            {!loading && channels.length === 0 && (
              <div className="p-20 text-center space-y-4 rounded-[48px] border border-dashed border-white/10 bg-white/[0.01]">
                <span className="material-icons text-4xl text-slate-800">event_busy</span>
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic">
                  No matching channel guides detected
                </p>
              </div>
            )}

            {/* INFINITE SCROLL OBSERVER */}
            <div ref={observerTarget} className="h-10 w-full" />
          </div>
        </section>
      </div>
    </div>
  );
}
