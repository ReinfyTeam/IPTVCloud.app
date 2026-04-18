'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import type { Channel } from '@/types';
import { useFavoritesStore } from '@/store/favorites-store';
import { usePlayerStore } from '@/store/player-store';
import { useHistoryStore } from '@/store/history-store';
import Player from './Player';
import ChannelCard from './ChannelCard';
import EpgStrip from './EpgStrip';

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
    .map(([name, items]) => ({ name, count: items.length, sample: items.slice(0, 4) }))
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
    countries: [...new Set(channels.map((c) => c.country || '').filter(Boolean))].sort(),
    categories: [...new Set(channels.map((c) => c.category || '').filter(Boolean))].sort(),
    languages: [...new Set(channels.map((c) => c.language || '').filter(Boolean))].sort(),
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
    <div className="pb-20">
      <section id="hero" className="pt-24 pb-12 px-4 sm:px-6">
        <div className="mx-auto max-w-[1460px]">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 animate-fade-up">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/[0.07] px-3 py-1.5 text-xs font-medium text-cyan-300 mb-5">
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
                  className="rounded-full bg-cyan-500 px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-400 transition-colors shadow-lg shadow-cyan-500/25"
                >
                  Start watching
                </button>
                <button
                  onClick={() => document.getElementById('channels')?.scrollIntoView({ behavior: 'smooth' })}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 text-sm text-slate-300 hover:bg-white/[0.08] hover:text-white transition-colors"
                >
                  Browse channels
                </button>
              </div>
              <div className="mt-8 grid grid-cols-3 gap-4 max-w-sm">
                {[
                  { label: 'Live channels', value: channels.length.toLocaleString() },
                  { label: 'Countries', value: filterOptions.countries.length },
                  { label: 'Categories', value: filterOptions.categories.length },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3 text-center">
                    <div className="text-xl font-bold text-white">{value}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {selectedChannel && (
              <div className="lg:w-80 animate-fade-up-delayed">
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium uppercase tracking-wider">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
                    Now Playing
                  </div>
                  <div className="flex items-center gap-3">
                    {selectedChannel.logo ? (
                      <img src={selectedChannel.logo} alt={selectedChannel.name} className="h-12 w-12 rounded-xl object-contain bg-slate-900" />
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
                  <div className="flex gap-2">
                    <button onClick={selectPrev} className="flex-1 rounded-xl bg-white/[0.04] border border-white/[0.07] py-2 text-xs text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors">← Prev</button>
                    <button onClick={selectNext} className="flex-1 rounded-xl bg-white/[0.04] border border-white/[0.07] py-2 text-xs text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors">Next →</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section id="watch" className="px-4 sm:px-6 py-6">
        <div className="mx-auto max-w-[1460px]">
          <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
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
            />

            <div className="rounded-[24px] border border-white/[0.07] bg-white/[0.03] p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white">Browse</h3>
                <div className="flex rounded-xl border border-white/[0.07] bg-slate-950/80 p-1 text-xs">
                  {(['grid', 'list'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setViewMode(m)}
                      className={`rounded-lg px-3 py-1.5 capitalize transition-colors ${viewMode === m ? 'bg-cyan-500 text-slate-950 font-medium' : 'text-slate-400 hover:text-white'}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35"/></svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search channels…"
                  className="w-full rounded-xl border border-white/[0.07] bg-slate-950/80 py-2.5 pl-9 pr-4 text-sm text-white placeholder:text-slate-500 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/25 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <select value={country} onChange={(e) => setCountry(e.target.value)} className="rounded-xl border border-white/[0.07] bg-slate-950/80 px-3 py-2 text-xs text-slate-300 outline-none">
                  <option value="">All countries</option>
                  {filterOptions.countries.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-xl border border-white/[0.07] bg-slate-950/80 px-3 py-2 text-xs text-slate-300 outline-none">
                  <option value="">All categories</option>
                  {filterOptions.categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={language} onChange={(e) => setLanguage(e.target.value)} className="rounded-xl border border-white/[0.07] bg-slate-950/80 px-3 py-2 text-xs text-slate-300 outline-none">
                  <option value="">All languages</option>
                  {filterOptions.languages.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
                <button
                  onClick={() => setFavoritesOnly((v) => !v)}
                  className={`rounded-xl border px-3 py-2 text-xs transition-colors ${favoritesOnly ? 'border-amber-400/50 bg-amber-400/10 text-amber-300' : 'border-white/[0.07] bg-slate-950/80 text-slate-400 hover:text-white'}`}
                >
                  {favoritesOnly ? '★ Favorites only' : '☆ Favorites filter'}
                </button>
              </div>

              {hasFilters && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {[search && `"${search}"`, country, category, language, favoritesOnly && 'Favorites'].filter((v): v is string => Boolean(v)).map((tag) => (
                    <span key={tag} className="rounded-full bg-cyan-400/10 border border-cyan-400/20 px-2 py-0.5 text-[10px] text-cyan-300">
                      {tag}
                    </span>
                  ))}
                  <button onClick={clearFilters} className="rounded-full border border-white/[0.07] px-2 py-0.5 text-[10px] text-slate-400 hover:text-white transition-colors">Clear</button>
                </div>
              )}

              <div className="text-xs text-slate-500">
                {filteredChannels.length.toLocaleString()} channel{filteredChannels.length !== 1 ? 's' : ''}
                {hasFilters ? ' match' : ' total'}
              </div>
            </div>
          </div>
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
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
              {favoriteChannels.slice(0, 12).map((ch) => (
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

      <section className="px-4 sm:px-6 py-6">
        <div className="mx-auto max-w-[1460px]">
          <div className="mb-4">
            <div className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Browse by Category</div>
            <h2 className="text-xl font-semibold text-white">Categories</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {categoryFacets.map((facet) => (
              <button
                key={facet.name}
                onClick={() => { setCategory(facet.name); document.getElementById('channels')?.scrollIntoView({ behavior: 'smooth' }); }}
                className={`group rounded-2xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 ${category === facet.name ? 'border-cyan-400/40 bg-cyan-400/[0.06]' : 'border-white/[0.07] bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.06]'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-white text-sm">{facet.name}</div>
                  <div className="text-xs text-slate-500">{facet.count}</div>
                </div>
                <div className="flex gap-1">
                  {facet.sample.slice(0, 4).map((ch) =>
                    ch.logo ? (
                      <img key={ch.id} src={ch.logo} alt={ch.name} className="h-7 w-7 rounded-lg object-contain bg-slate-900" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    ) : null
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6 py-6">
        <div className="mx-auto max-w-[1460px]">
          <div className="mb-4">
            <div className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Browse by Country</div>
            <h2 className="text-xl font-semibold text-white">Countries</h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {countryFacets.map((facet) => (
              <button
                key={facet.name}
                onClick={() => { setCountry(facet.name); document.getElementById('channels')?.scrollIntoView({ behavior: 'smooth' }); }}
                className={`rounded-xl border p-3 text-left transition-all duration-200 ${country === facet.name ? 'border-cyan-400/40 bg-cyan-400/[0.06]' : 'border-white/[0.07] bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.06]'}`}
              >
                <div className="font-medium text-white text-sm">{facet.name}</div>
                <div className="text-xs text-slate-500 mt-0.5">{facet.count} channels</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section id="channels" className="px-4 sm:px-6 py-6">
        <div className="mx-auto max-w-[1460px]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Channel Library</div>
              <h2 className="text-xl font-semibold text-white">
                {hasFilters ? `${filteredChannels.length.toLocaleString()} results` : `All ${channels.length.toLocaleString()} channels`}
              </h2>
            </div>
            {hasFilters && (
              <button onClick={clearFilters} className="rounded-full border border-white/[0.07] px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/[0.04] transition-colors">
                Clear filters
              </button>
            )}
          </div>

          {filteredChannels.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/[0.07] p-12 text-center">
              <div className="text-4xl mb-3">📺</div>
              <div className="text-slate-400">No channels match your filters.</div>
              <button onClick={clearFilters} className="mt-4 rounded-full bg-cyan-500/10 border border-cyan-500/20 px-4 py-2 text-sm text-cyan-400 hover:bg-cyan-500/20 transition-colors">
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <div className={viewMode === 'grid' ? 'grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6' : 'space-y-2'}>
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
                <div className="mt-8 flex justify-center">
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-8 py-3 text-sm text-slate-300 hover:bg-white/[0.08] hover:text-white transition-colors"
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
  );
}
