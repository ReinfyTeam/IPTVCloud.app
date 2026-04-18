'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Channel } from '@/types';
import { useFavoritesStore } from '@/store/favorites-store';
import { usePlayerStore } from '@/store/player-store';
import { useHistoryStore } from '@/store/history-store';
import ChannelCard from './ChannelCard';
import Sidebar from './Sidebar';

import { getCountryName } from '@/lib/countries';
import { getLanguageName } from '@/lib/languages';

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

type Props = {
  channels: Channel[];
  initialSearch?: string;
  initialCountry?: string;
  initialCategory?: string;
  initialLanguage?: string;
  initialResolution?: string;
};

export default function ChannelBrowser({
  channels,
  initialSearch = '',
  initialCountry = '',
  initialCategory = '',
  initialLanguage = '',
  initialResolution = '',
}: Props) {
  const router = useRouter();
  const { viewMode, setViewMode } = usePlayerStore();
  const { ids: favoriteIds, toggleFavorite, isFavorite } = useFavoritesStore();
  const { addEntry: addHistory } = useHistoryStore();

  // Resolve initial country if it's a code
  const resolvedCountry = useMemo(() => {
    if (!initialCountry) return '';
    if (initialCountry.length <= 3) return getCountryName(initialCountry).toUpperCase();
    return initialCountry.toUpperCase();
  }, [initialCountry]);

  // Resolve initial language if it's a code
  const resolvedLanguage = useMemo(() => {
    if (!initialLanguage) return '';
    if (initialLanguage.length <= 3) return getLanguageName(initialLanguage);
    return initialLanguage;
  }, [initialLanguage]);

  const [search, setSearch] = useState(initialSearch);
  const [country, setCountry] = useState(resolvedCountry);
  const [category, setCategory] = useState(initialCategory);
  const [language, setLanguage] = useState(resolvedLanguage);
  const [resolution, setResolution] = useState(initialResolution);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  const debouncedSearch = useDebounce(search, 280);
  const ITEMS_PER_PAGE = 48;

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, country, category, language, resolution, favoritesOnly]);

  const filterOptions = useMemo(
    () => ({
      countries: [
        ...new Set(channels.map((c) => c.country || 'International').filter(Boolean)),
      ].sort(),
      categories: [
        ...new Set(channels.map((c) => c.category || 'uncategorized').filter(Boolean)),
      ].sort(),
      languages: [...new Set(channels.map((c) => c.language || 'Unknown').filter(Boolean))].sort(),
      resolutions: [
        ...new Set(channels.map((c) => c.resolution).filter((r): r is string => Boolean(r))),
      ].sort(),
    }),
    [channels],
  );

  const filteredChannels = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    const cry = country.toLowerCase();
    const cat = category.toLowerCase();
    const lng = language.toLowerCase();
    const res = resolution.toLowerCase();

    return channels.filter((c) => {
      if (
        q &&
        !['name', 'country', 'category', 'language'].some((k) =>
          (c[k as keyof Channel] as string)?.toLowerCase().includes(q),
        )
      )
        return false;
      if (country && c.country?.toLowerCase() !== cry) return false;
      if (category && c.category?.toLowerCase() !== cat) return false;
      if (language && c.language?.toLowerCase() !== lng) return false;
      if (resolution && c.resolution?.toLowerCase() !== res) return false;
      if (favoritesOnly && !favoriteIds.includes(c.id)) return false;
      return true;
    });
  }, [
    channels,
    debouncedSearch,
    country,
    category,
    language,
    resolution,
    favoritesOnly,
    favoriteIds,
  ]);

  const pagedChannels = useMemo(
    () => filteredChannels.slice(0, page * ITEMS_PER_PAGE),
    [filteredChannels, page],
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && pagedChannels.length < filteredChannels.length) {
          setPage((prev) => prev + 1);
        }
      },
      { threshold: 0.1, rootMargin: '400px' },
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [pagedChannels.length, filteredChannels.length]);

  useEffect(() => {
    const q = debouncedSearch.toLowerCase().trim();
    if (q.length > 2) {
      const match = channels.find((c) => c.name.toLowerCase().trim() === q);
      if (match) router.push(`/channel/${encodeURIComponent(match.id)}`);
    }
  }, [debouncedSearch, channels, router]);

  const selectChannel = useCallback(
    (ch: Channel) => {
      addHistory(ch);
      router.push(`/channel/${encodeURIComponent(ch.id)}`);
    },
    [addHistory, router],
  );

  const clearFilters = () => {
    setSearch('');
    setCountry('');
    setCategory('');
    setLanguage('');
    setResolution('');
    setFavoritesOnly(false);
  };
  const hasFilters = Boolean(
    search || country || category || language || resolution || favoritesOnly,
  );

  return (
    <div className="flex pt-16">
      <Sidebar
        search={search}
        setSearch={setSearch}
        country={country}
        setCountry={setCountry}
        category={category}
        setCategory={setCategory}
        language={language}
        setLanguage={setLanguage}
        resolution={resolution}
        setResolution={setResolution}
        favoritesOnly={favoritesOnly}
        setFavoritesOnly={setFavoritesOnly}
        filterOptions={filterOptions}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      <div className="flex-1 lg:pl-72 transition-all duration-500 pb-20 transform-gpu">
        <section id="channels" className="px-6 py-10">
          <div className="mx-auto max-w-[1460px]">
            <div className="mb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">
                  Search Library
                </div>
                <h2 className="text-3xl font-black text-white flex items-center gap-4 italic uppercase">
                  {hasFilters
                    ? `${filteredChannels.length.toLocaleString()} results`
                    : `All Channels`}
                  {hasFilters && (
                    <span className="rounded-full bg-cyan-500/10 border border-cyan-500/20 px-4 py-1 text-[10px] font-black text-cyan-400 animate-fade-in tracking-widest">
                      FILTERED
                    </span>
                  )}
                </h2>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex rounded-2xl border border-white/[0.08] bg-slate-900/80 backdrop-blur-md p-1.5 text-[10px] font-black uppercase tracking-widest">
                  {(['grid', 'list'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setViewMode(m)}
                      className={`rounded-xl px-5 py-2.5 transition-all duration-300 active:scale-95 ${viewMode === m ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/30' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setIsMobileOpen(true)}
                  className="lg:hidden rounded-2xl border border-white/[0.08] bg-slate-900/80 backdrop-blur-md px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-300 hover:text-white transition-all shadow-lg active:scale-95"
                >
                  Filters
                </button>
              </div>
            </div>

            {filteredChannels.length === 0 ? (
              <div className="rounded-[56px] border border-dashed border-white/[0.08] p-32 text-center bg-slate-900/20 backdrop-blur-md animate-fade-in shadow-inner">
                <span className="material-icons text-8xl mb-8 opacity-10 text-slate-500">
                  settings_input_antenna
                </span>
                <div className="text-2xl font-black text-white mb-3 text-transparent bg-clip-text bg-gradient-to-r from-slate-200 to-slate-500 italic uppercase">
                  No channels found
                </div>
                <div className="text-slate-500 max-w-sm mx-auto mb-10 font-medium">
                  Try broadening your search or resetting all active filters to explore more
                  content.
                </div>
                <button
                  onClick={clearFilters}
                  className="rounded-full bg-white/5 border border-white/10 px-12 py-4 text-xs font-black text-white hover:bg-white/10 transition-all active:scale-95 shadow-2xl tracking-[0.2em] uppercase"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <>
                <div
                  className={
                    viewMode === 'grid'
                      ? 'grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'
                      : 'space-y-4'
                  }
                >
                  {pagedChannels.map((ch) => (
                    <ChannelCard
                      key={ch.id}
                      channel={ch}
                      favorite={isFavorite(ch.id)}
                      mode={viewMode}
                      onSelect={selectChannel}
                      onToggleFavorite={toggleFavorite}
                    />
                  ))}
                </div>
                <div ref={observerTarget} className="h-40 flex items-center justify-center mt-10">
                  {pagedChannels.length < filteredChannels.length && (
                    <div className="flex flex-col items-center gap-3 animate-pulse">
                      <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.8)]" />
                      <div className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em]">
                        Syncing more data
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
