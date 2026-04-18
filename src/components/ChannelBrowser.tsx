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

type FacetItem = { name: string; count: number; sample: Channel[] };

function buildFacets(channels: Channel[], pick: (c: Channel) => string | undefined, limit = 8): FacetItem[] {
  const map = new Map<string, Channel[]>();
  for (const ch of channels) {
    const v = pick(ch)?.trim();
    if (!v) continue;
    const arr = map.get(v) || [];
    arr.push(ch);
    map.set(v, arr);
  }
  return [...map.entries()]
    .map(([name, items]) => ({ name, count: items.length, sample: items.filter(c => c.logo).slice(0, 4) }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit);
}

export default function ChannelBrowser({ channels }: { channels: Channel[] }) {
  const router = useRouter();
  const { viewMode, setViewMode } = usePlayerStore();
  const { ids: favoriteIds, toggleFavorite, isFavorite } = useFavoritesStore();
  const { addEntry: addHistory } = useHistoryStore();

  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('');
  const [category, setCategory] = useState('');
  const [language, setLanguage] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const debouncedSearch = useDebounce(search, 280);
  const ITEMS_PER_PAGE = 48;

  useEffect(() => { setPage(1); }, [debouncedSearch, country, category, language, favoritesOnly]);

  const filterOptions = useMemo(() => ({
    countries: [...new Set(channels.map((c) => c.country || 'International').filter(Boolean))].sort(),
    categories: [...new Set(channels.map((c) => c.category || 'uncategorized').filter(Boolean))].sort(),
    languages: [...new Set(channels.map((c) => c.language || 'Unknown').filter(Boolean))].sort(),
  }), [channels]);

  const filteredChannels = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    return channels.filter((c) => {
      if (q && !['name', 'country', 'category', 'language'].some((k) => (c[k as keyof Channel] as string)?.toLowerCase().includes(q))) return false;
      if (country && c.country !== country) return false;
      if (category && c.category !== category) return false;
      if (language && c.language !== language) return false;
      if (favoritesOnly && !favoriteIds.includes(c.id)) return false;
      return true;
    });
  }, [channels, debouncedSearch, country, category, language, favoritesOnly, favoriteIds]);

  const pagedChannels = useMemo(
    () => filteredChannels.slice(0, page * ITEMS_PER_PAGE),
    [filteredChannels, page],
  );

  const favoriteChannels = useMemo(() => channels.filter((c) => favoriteIds.includes(c.id)), [channels, favoriteIds]);

  const selectChannel = useCallback((ch: Channel) => {
    addHistory(ch);
    router.push(`/channel/${encodeURIComponent(ch.id)}`);
  }, [addHistory, router]);

  const clearFilters = () => { setSearch(''); setCountry(''); setCategory(''); setLanguage(''); setFavoritesOnly(false); };
  const hasFilters = Boolean(search || country || category || language || favoritesOnly);

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
        favoritesOnly={favoritesOnly}
        setFavoritesOnly={setFavoritesOnly}
        filterOptions={filterOptions}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />
      
      <div className="flex-1 lg:pl-64 transition-all duration-300 pb-20">
        <section id="channels" className="px-4 sm:px-6 py-6">
          <div className="mx-auto max-w-[1460px]">
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Search & Filter</div>
                <h2 className="text-xl font-semibold text-white flex items-center gap-3">
                  {hasFilters ? `${filteredChannels.length.toLocaleString()} results` : `All ${channels.length.toLocaleString()} channels`}
                  {hasFilters && (
                    <span className="rounded-full bg-cyan-400/10 border border-cyan-400/20 px-2.5 py-0.5 text-xs text-cyan-400">
                      Filtered
                    </span>
                  )}
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex rounded-xl border border-white/[0.07] bg-slate-900/80 backdrop-blur-md p-1 text-xs">
                  {(['grid', 'list'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setViewMode(m)}
                      className={`rounded-lg px-3 py-1.5 capitalize transition-all ${viewMode === m ? 'bg-cyan-500 text-slate-950 font-medium shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setIsMobileOpen(true)}
                  className="lg:hidden rounded-xl border border-white/[0.07] bg-slate-900/80 backdrop-blur-md px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors"
                >
                  Filters
                </button>
              </div>
            </div>

            {filteredChannels.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/[0.07] p-16 text-center bg-slate-900/30 backdrop-blur-md">
                <div className="text-5xl mb-4 opacity-50">📡</div>
                <div className="text-lg font-medium text-white mb-2">No channels found</div>
                <div className="text-slate-400 max-w-sm mx-auto">Try adjusting your search or clearing the active filters to see more results.</div>
                <button onClick={clearFilters} className="mt-6 rounded-full bg-cyan-500/10 border border-cyan-500/20 px-6 py-2.5 text-sm font-medium text-cyan-400 hover:bg-cyan-500/20 transition-all shadow-lg hover:shadow-cyan-500/10">
                  Clear all filters
                </button>
              </div>
            ) : (
              <>
                <div className={viewMode === 'grid' ? 'grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'space-y-2'}>
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
                {pagedChannels.length < filteredChannels.length && (
                  <div className="mt-10 flex justify-center">
                    <button
                      onClick={() => setPage((p) => p + 1)}
                      className="rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-md px-8 py-3 text-sm font-medium text-slate-300 hover:bg-white/[0.08] hover:text-white transition-all shadow-lg hover:-translate-y-0.5"
                    >
                      Load more ({filteredChannels.length - pagedChannels.length} remaining)
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
