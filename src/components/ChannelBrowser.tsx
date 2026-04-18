'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import type { Channel } from '@/types';
import { useFavoritesStore } from '@/store/favorites-store';
import { usePlayerStore } from '@/store/player-store';
import { useHistoryStore } from '@/store/history-store';
import Player from './Player';
import ChannelCard from './ChannelCard';
import EpgStrip from './EpgStrip';
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
  const { selectedChannelId, setSelectedChannelId, viewMode, setViewMode } = usePlayerStore();
  const { ids: favoriteIds, toggleFavorite, isFavorite } = useFavoritesStore();
  const { addEntry: addHistory } = useHistoryStore();

  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('');
  const [category, setCategory] = useState('');
  const [language, setLanguage] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [shareUrl, setShareUrl] = useState('');
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const debouncedSearch = useDebounce(search, 280);
  const ITEMS_PER_PAGE = 48;

  useEffect(() => {
    if (typeof window !== 'undefined') setShareUrl(window.location.href);
  }, [selectedChannelId]);

  useEffect(() => {
    if (!channels.length) return;
    const urlId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('channel') : null;
    if (urlId && channels.some((c) => c.id === urlId)) {
      setSelectedChannelId(urlId);
    } else if (!selectedChannelId) {
      setSelectedChannelId(channels[0].id);
    }
  }, [channels]);

  useEffect(() => {
    if (!selectedChannelId || typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('channel', selectedChannelId);
    window.history.replaceState({}, '', url.toString());
  }, [selectedChannelId]);

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

  const categoryFacets = useMemo(() => buildFacets(channels, (c) => c.category), [channels]);
  const countryFacets = useMemo(() => buildFacets(channels, (c) => c.country), [channels]);
  const favoriteChannels = useMemo(() => channels.filter((c) => favoriteIds.includes(c.id)), [channels, favoriteIds]);

  const selectedChannel = useMemo(
    () => channels.find((c) => c.id === selectedChannelId) || null,
    [channels, selectedChannelId],
  );

  const currentIndex = filteredChannels.findIndex((c) => c.id === selectedChannelId);

  const selectChannel = useCallback((ch: Channel) => {
    setSelectedChannelId(ch.id);
    addHistory(ch);
    document.getElementById('watch')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [setSelectedChannelId, addHistory]);

  const selectNext = useCallback(() => {
    if (!filteredChannels.length) return;
    const next = filteredChannels[(currentIndex + 1) % filteredChannels.length];
    selectChannel(next);
  }, [filteredChannels, currentIndex, selectChannel]);

  const selectPrev = useCallback(() => {
    if (!filteredChannels.length) return;
    const prev = filteredChannels[(currentIndex - 1 + filteredChannels.length) % filteredChannels.length];
    selectChannel(prev);
  }, [filteredChannels, currentIndex, selectChannel]);

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
        <section id="hero" className="py-12 px-4 sm:px-6">
          <div className="mx-auto max-w-[1460px]">
            <div className="flex flex-col xl:flex-row gap-6">
              <div className="flex-1 animate-fade-in">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/[0.07] px-3 py-1.5 text-xs font-medium text-cyan-300 mb-5 shadow-lg shadow-cyan-500/10 backdrop-blur-md">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  Premium IPTV Dashboard
                </div>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-white leading-[1.1]">
                  Watch live TV,<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-sky-400">anywhere.</span>
                </h1>
                <p className="mt-5 text-lg text-slate-400 max-w-xl">
                  {channels.length.toLocaleString()} live channels across {filterOptions.countries.length} countries.
                  Browse by category, save favorites, and switch channels instantly.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <button
                    onClick={() => document.getElementById('watch')?.scrollIntoView({ behavior: 'smooth' })}
                    className="rounded-full bg-gradient-to-r from-cyan-500 to-sky-500 px-6 py-3 text-sm font-semibold text-slate-950 hover:scale-105 transition-transform shadow-lg shadow-cyan-500/25"
                  >
                    Start watching
                  </button>
                  <button
                    onClick={() => document.getElementById('channels')?.scrollIntoView({ behavior: 'smooth' })}
                    className="rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-md px-6 py-3 text-sm text-slate-300 hover:bg-white/[0.08] hover:text-white transition-all"
                  >
                    Browse channels
                  </button>
                  <button
                    onClick={() => setIsMobileOpen(true)}
                    className="lg:hidden rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-md px-6 py-3 text-sm text-slate-300 hover:bg-white/[0.08] hover:text-white transition-all flex items-center gap-2"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                    Filters
                  </button>
                </div>
              </div>

              {selectedChannel && (
                <div className="xl:w-80 animate-fade-in">
                  <div className="rounded-2xl border border-white/[0.07] bg-slate-900/50 backdrop-blur-xl p-4 shadow-xl shadow-black/20">
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-medium uppercase tracking-wider mb-4">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
                      Now Playing
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                      {selectedChannel.logo ? (
                        <img src={selectedChannel.logo} alt={selectedChannel.name} className="h-12 w-12 rounded-xl object-contain bg-slate-800/80 p-1" />
                      ) : (
                        <div className="h-12 w-12 rounded-xl bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500">
                          {selectedChannel.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-semibold text-white truncate">{selectedChannel.name}</div>
                        <div className="text-xs text-slate-500 truncate">
                          {[selectedChannel.country, selectedChannel.category].filter(Boolean).join(' · ')}
                        </div>
                      </div>
                    </div>
                    <EpgStrip channelId={selectedChannel.epgId} compact />
                    <div className="mt-4 flex gap-2">
                      <button onClick={selectPrev} className="flex-1 rounded-xl bg-white/[0.04] border border-white/[0.07] py-2 text-xs text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors">← Prev</button>
                      <button onClick={selectNext} className="flex-1 rounded-xl bg-white/[0.04] border border-white/[0.07] py-2 text-xs text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors">Next →</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section id="watch" className="px-4 sm:px-6 py-6 animate-fade-in">
          <div className="mx-auto max-w-[1460px]">
            <Player
              channel={selectedChannel}
              url={selectedChannel?.streamUrl}
              poster={selectedChannel?.logo}
              title={selectedChannel?.name}
              subtitle={selectedChannel ? [selectedChannel.country, selectedChannel.category].filter(Boolean).join(' · ') : undefined}
              streamUrl={selectedChannel?.streamUrl}
              shareUrl={shareUrl}
              onNextChannel={selectNext}
              onPreviousChannel={selectPrev}
              autoPlay
            />
          </div>
        </section>

        {favoriteChannels.length > 0 && (
          <section className="px-4 sm:px-6 py-6">
            <div className="mx-auto max-w-[1460px]">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-widest text-amber-400 mb-1">Your Favorites</div>
                  <h2 className="text-xl font-semibold text-white">{favoriteChannels.length} saved channel{favoriteChannels.length !== 1 ? 's' : ''}</h2>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {favoriteChannels.slice(0, 10).map((ch) => (
                  <ChannelCard
                    key={ch.id}
                    channel={ch}
                    active={ch.id === selectedChannelId}
                    favorite={isFavorite(ch.id)}
                    mode={viewMode}
                    onSelect={selectChannel}
                    onToggleFavorite={toggleFavorite}
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        <section id="channels" className="px-4 sm:px-6 py-6">
          <div className="mx-auto max-w-[1460px]">
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Channel Library</div>
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
                      active={ch.id === selectedChannelId}
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
