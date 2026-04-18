'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Channel } from '@/types';
import { useFavoritesStore } from '@/store/favorites-store';
import { usePlayerStore } from '@/store/player-store';
import { useHistoryStore } from '@/store/history-store';
import ChannelCard from './ChannelCard';
import Sidebar from './Sidebar';

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const CATEGORY_ICONS: Record<string, string> = {
  music: 'music_note',
  movies: 'movie',
  news: 'newspaper',
  sports: 'sports_soccer',
  kids: 'child_care',
  entertainment: 'theater_comedy',
  documentary: 'visibility',
  education: 'school',
  lifestyle: 'style',
  religious: 'church',
  animation: 'animation',
  general: 'widgets',
  uncategorized: 'folder_open',
};

type Props = {
  channels: Channel[];
  initialSearch?: string;
  initialCountry?: string;
  initialCategory?: string;
  initialResolution?: string;
};

export default function ChannelBrowser({
  channels,
  initialSearch = '',
  initialCountry = '',
  initialCategory = '',
  initialResolution = '',
}: Props) {
  const router = useRouter();
  const { viewMode, setViewMode } = usePlayerStore();
  const { ids: favoriteIds, toggleFavorite, isFavorite } = useFavoritesStore();
  const { addHistory } = useHistoryStore();

  const [search, setSearch] = useState(initialSearch);
  const [country, setCountry] = useState(initialCountry);
  const [category, setCategory] = useState(initialCategory);
  const [resolution, setResolution] = useState(initialResolution);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sortBy, setSortBy] = useState('recommended');
  const [page, setPage] = useState(1);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  const debouncedSearch = useDebounce(search, 280);
  const ITEMS_PER_PAGE = 48;

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, country, category, resolution, favoritesOnly, sortBy]);

  const filterOptions = useMemo(
    () => ({
      countries: [
        ...new Set(
          channels
            .map((c) => (c.country && c.country !== 'UNKNOWN' ? c.country : 'International'))
            .filter(Boolean),
        ),
      ].sort(),
      categories: [
        ...new Set(
          channels
            .map((c) => (c.category && c.category !== 'Undefined' ? c.category : 'Uncategorized'))
            .filter(Boolean),
        ),
      ].sort(),
      languages: [],
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
    const res = resolution.toLowerCase();

    let filtered = channels.filter((c) => {
      if (
        q &&
        !['name', 'country', 'category', 'language'].some((k) =>
          (c[k as keyof Channel] as string)?.toLowerCase().includes(q),
        )
      )
        return false;
      if (country && (c.country?.toLowerCase() || 'international') !== cry) return false;
      if (category && (c.category?.toLowerCase() || 'uncategorized') !== cat) return false;
      if (resolution && c.resolution?.toLowerCase() !== res) return false;
      if (favoritesOnly && !favoriteIds.includes(c.id)) return false;
      return true;
    });

    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'viewers':
          return (b.viewersCount || 0) - (a.viewersCount || 0);
        case 'favorites':
          const aFav = favoriteIds.includes(a.id) ? 1 : 0;
          const bFav = favoriteIds.includes(b.id) ? 1 : 0;
          return bFav - aFav;
        case 'featured':
          return (b.logo ? 1 : 0) - (a.logo ? 1 : 0);
        case 'recommended':
        default:
          return 0;
      }
    });

    return filtered;
  }, [
    channels,
    debouncedSearch,
    country,
    category,
    resolution,
    favoritesOnly,
    favoriteIds,
    sortBy,
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
    setResolution('');
    setFavoritesOnly(false);
    setSortBy('recommended');
  };
  const hasFilters = Boolean(search || country || category || resolution || favoritesOnly);

  return (
    <div className="flex pt-16">
      <Sidebar
        search={search}
        setSearch={setSearch}
        country={country}
        setCountry={setCountry}
        category={category}
        setCategory={setCategory}
        language=""
        setLanguage={() => {}}
        resolution={resolution}
        setResolution={setResolution}
        favoritesOnly={favoritesOnly}
        setFavoritesOnly={setFavoritesOnly}
        filterOptions={filterOptions}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        sortBy={sortBy}
        setSortBy={setSortBy}
      />

      <div className="flex-1 lg:pl-72 transition-all duration-500 pb-20 transform-gpu bg-slate-950 min-h-screen">
        <section id="channels" className="px-6 py-10">
          <div className="mx-auto max-w-[1460px]">
            <div className="flex items-center gap-2 overflow-x-auto pb-10 scrollbar-hide -mx-2 px-2">
              <button
                onClick={() => setCategory('')}
                className={`shrink-0 flex items-center gap-3 px-8 py-4 rounded-3xl text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95 transform-gpu ${!category ? 'bg-cyan-500 border-cyan-500 text-slate-950 shadow-[0_0_30px_rgba(6,182,212,0.4)]' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'}`}
              >
                <span className="material-icons text-lg">apps</span>
                All
              </button>
              {filterOptions.categories.slice(0, 15).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`shrink-0 flex items-center gap-3 px-8 py-4 rounded-3xl text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95 transform-gpu ${category === cat ? 'bg-cyan-500 border-cyan-500 text-slate-950 shadow-[0_0_30px_rgba(6,182,212,0.4)]' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'}`}
                >
                  <span className="material-icons text-lg">
                    {CATEGORY_ICONS[cat.toLowerCase()] || 'folder'}
                  </span>
                  {cat}
                </button>
              ))}
            </div>

            <div className="mb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-1">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">
                  Technical Discovery
                </div>
                <h2 className="text-4xl font-black text-white flex items-center gap-4 italic uppercase tracking-tighter leading-none">
                  {hasFilters ? `${filteredChannels.length.toLocaleString()} matches` : `Library.`}
                  {hasFilters && (
                    <span className="rounded-full bg-cyan-500/10 border border-cyan-500/20 px-4 py-1.5 text-[9px] font-black text-cyan-400 animate-fade-in tracking-[0.2em]">
                      ACTIVE FILTERS
                    </span>
                  )}
                </h2>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex rounded-3xl border border-white/[0.08] bg-slate-900/80 backdrop-blur-md p-2 shadow-2xl">
                  {(['grid', 'list'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setViewMode(m)}
                      className={`rounded-2xl px-6 py-3 transition-all duration-500 active:scale-95 flex items-center gap-3 ${viewMode === m ? 'bg-white text-slate-950 shadow-xl' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                    >
                      <span className="material-icons text-lg">
                        {m === 'grid' ? 'grid_view' : 'view_list'}
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">
                        {m}
                      </span>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setIsMobileOpen(true)}
                  className="lg:hidden rounded-3xl border border-white/[0.08] bg-slate-900/80 backdrop-blur-md px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:text-white transition-all shadow-xl active:scale-95 flex items-center gap-3"
                >
                  <span className="material-icons text-lg">tune</span>
                  Options
                </button>
              </div>
            </div>

            {filteredChannels.length === 0 ? (
              <div className="rounded-[64px] border border-dashed border-white/[0.08] p-32 text-center bg-slate-900/20 backdrop-blur-md animate-fade-in shadow-inner">
                <span className="material-icons text-8xl mb-8 opacity-5 text-white">
                  settings_input_antenna
                </span>
                <div className="text-3xl font-black text-white mb-4 italic uppercase tracking-tighter">
                  No signals detected.
                </div>
                <div className="text-slate-500 max-w-sm mx-auto mb-10 font-medium leading-relaxed">
                  The search parameters did not match any community-provided streams. Try adjusting
                  your filters.
                </div>
                <button
                  onClick={clearFilters}
                  className="rounded-full bg-cyan-500 text-slate-950 px-12 py-5 text-xs font-black hover:bg-cyan-400 transition-all active:scale-95 shadow-2xl shadow-cyan-950/40 tracking-widest uppercase"
                >
                  Clear Signal Filters
                </button>
              </div>
            ) : (
              <>
                <div
                  className={
                    viewMode === 'grid'
                      ? 'grid gap-8 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'
                      : 'space-y-6'
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
                <div ref={observerTarget} className="h-64 flex items-center justify-center mt-12">
                  {pagedChannels.length < filteredChannels.length && (
                    <div className="flex flex-col items-center gap-4 animate-pulse">
                      <div className="h-2 w-2 rounded-full bg-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.8)]" />
                      <div className="text-[10px] font-black text-slate-600 uppercase tracking-[0.5em]">
                        Syncing Node Data
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
