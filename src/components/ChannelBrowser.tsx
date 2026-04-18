'use client';

import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { useChannelBrowser } from '@/hooks/use-channel-browser';
import Player from './Player';
import ChannelCard from './ChannelCard';
import type { Channel } from '@/types';

function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">{title}</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">{description}</p>
      </div>
      {action}
    </div>
  );
}

function scrollToSection(sectionId: string) {
  document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function HighlightCard({
  title,
  value,
  tone = 'default',
}: {
  title: string;
  value: string | number;
  tone?: 'default' | 'accent' | 'warm';
}) {
  const toneClass =
    tone === 'accent'
      ? 'from-cyan-400/25 to-sky-500/10'
      : tone === 'warm'
        ? 'from-amber-300/20 to-orange-500/10'
        : 'from-white/10 to-white/5';

  return (
    <div className={`rounded-[28px] border border-white/10 bg-gradient-to-br ${toneClass} p-4 shadow-lg shadow-black/20`}>
      <div className="text-sm text-slate-400">{title}</div>
      <div className="mt-2 text-3xl font-semibold text-white">{value}</div>
    </div>
  );
}

export default function ChannelBrowser({ channels }: { channels: Channel[] }) {
  const {
    applyCategory,
    applyCountry,
    category,
    categoryHighlights,
    clearFilters,
    country,
    countryHighlights,
    favoriteChannels,
    favoritesOnly,
    filteredChannels,
    filterOptions,
    hasActiveFilters,
    isFavorite,
    language,
    quickPicks,
    search,
    selectedChannel,
    selectChannel,
    selectNextChannel,
    selectPreviousChannel,
    setCategory,
    setCountry,
    setFavoritesOnly,
    setLanguage,
    setSearch,
    setViewMode,
    toggleFavorite,
    viewMode,
  } = useChannelBrowser(channels);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [currentShareUrl, setCurrentShareUrl] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setCurrentShareUrl(window.location.href);
  }, [selectedChannel?.id]);

  async function handleShareChannel() {
    if (!selectedChannel) return;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${selectedChannel.name} on IPTVCloud.app`,
          text: `Watch ${selectedChannel.name} live on IPTVCloud.app`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setFeedback('Channel link copied to clipboard.');
      }
    } catch {
      // Ignore user-cancelled shares.
    }
  }

  async function handleCopyStreamUrl() {
    if (!selectedChannel?.streamUrl) return;
    await navigator.clipboard.writeText(selectedChannel.streamUrl);
    setFeedback('Stream URL copied to clipboard.');
  }

  React.useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 2200);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1460px] space-y-8">
        <nav className="sticky top-4 z-30 animate-fade-up rounded-full border border-white/[0.12] bg-slate-950/70 px-3 py-3 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-cyan-400 text-sm font-semibold text-slate-950">
                IC
              </div>
              <div>
                <div className="text-sm font-semibold text-white">IPTVCloud.app</div>
                <div className="text-xs text-slate-400">Live channels, cleaner navigation, faster browsing</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm">
              {[
                ['Watch', 'watch'],
                ['Quick Picks', 'quick-picks'],
                ['Favorites', 'favorites'],
                ['Categories', 'categories'],
                ['Countries', 'countries'],
                ['Library', 'channels'],
              ].map(([label, id]) => (
                <button
                  className="rounded-full border border-transparent bg-white/5 px-4 py-2 text-slate-200 transition hover:border-white/10 hover:bg-white/10"
                  key={id}
                  onClick={() => scrollToSection(id)}
                  type="button"
                >
                  {label}
                </button>
              ))}
              <Link
                className="rounded-full bg-cyan-400 px-4 py-2 font-medium text-slate-950 transition hover:bg-cyan-300"
                href="/admin"
              >
                Admin
              </Link>
            </div>
          </div>
        </nav>

        <section className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="animate-fade-up rounded-[36px] border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">
            <div className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs uppercase tracking-[0.35em] text-cyan-200">
              Premium IPTV Dashboard
            </div>
            <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Cleaner browsing, smarter sections, and quicker channel switching.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
              Jump between curated picks, favorites, categories, and countries without losing the live player.
              The layout keeps discovery and watching in one continuous flow.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                className="rounded-full bg-cyan-400 px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-cyan-300"
                onClick={() => scrollToSection('watch')}
                type="button"
              >
                Start watching
              </button>
              <button
                className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-slate-100 transition hover:border-white/20 hover:bg-white/10"
                onClick={() => scrollToSection('channels')}
                type="button"
              >
                Open channel library
              </button>
              <button
                className="rounded-full border border-amber-300/20 bg-amber-300/10 px-5 py-3 text-sm text-amber-100 transition hover:bg-amber-300/[0.15]"
                onClick={() => scrollToSection('favorites')}
                type="button"
              >
                View favorites
              </button>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <HighlightCard title="Live channels" tone="accent" value={channels.length} />
              <HighlightCard title="Visible now" value={filteredChannels.length} />
              <HighlightCard title="Saved favorites" tone="warm" value={favoriteChannels.length} />
            </div>
          </div>

          <div className="animate-fade-up-delayed rounded-[36px] border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-950/95 p-6 shadow-2xl shadow-black/30">
            <SectionHeading
              action={
                <div className="flex flex-wrap gap-2">
                  <button
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 transition hover:bg-white/10"
                    onClick={() => void handleShareChannel()}
                    type="button"
                  >
                    Share channel
                  </button>
                  <button
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 transition hover:bg-white/10"
                    onClick={() => void handleCopyStreamUrl()}
                    type="button"
                  >
                    Copy stream URL
                  </button>
                </div>
              }
              description="The current channel stays pinned as your live focus while the rest of the dashboard adapts around it."
              eyebrow="Now Playing"
              title={selectedChannel?.name || 'Select a channel'}
            />

            <div className="flex items-start gap-4 rounded-[28px] border border-white/10 bg-white/5 p-4">
              {selectedChannel?.logo ? (
                <img
                  alt={selectedChannel.name}
                  className="h-20 w-20 rounded-[22px] bg-black object-cover shadow-lg shadow-black/30"
                  src={selectedChannel.logo}
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-[22px] bg-black text-xs text-slate-500">
                  No logo
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-lg font-semibold text-white">{selectedChannel?.name || 'Waiting for selection'}</div>
                <div className="mt-2 text-sm text-slate-400">
                  {[selectedChannel?.country, selectedChannel?.category, selectedChannel?.language].filter(Boolean).join(' • ') ||
                    'Choose a live channel to begin playback.'}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedChannel?.country && (
                    <button
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 transition hover:bg-white/10"
                      onClick={() => {
                        applyCountry(selectedChannel.country!);
                        scrollToSection('channels');
                      }}
                      type="button"
                    >
                      {selectedChannel.country}
                    </button>
                  )}
                  {selectedChannel?.category && (
                    <button
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 transition hover:bg-white/10"
                      onClick={() => {
                        applyCategory(selectedChannel.category!);
                        scrollToSection('channels');
                      }}
                      type="button"
                    >
                      {selectedChannel.category}
                    </button>
                  )}
                  <div className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs text-cyan-100">
                    Shareable link ready
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-4">
                <div className="text-sm text-slate-400">Channel link</div>
                <div className="mt-2 truncate text-sm text-white">{currentShareUrl || 'Current page URL'}</div>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-4">
                <div className="text-sm text-slate-400">Keyboard</div>
                <div className="mt-2 text-sm text-white">Space, F, M, Arrow keys</div>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-4">
                <div className="text-sm text-slate-400">Focus mode</div>
                <div className="mt-2 text-sm text-white">Pinned live player, filter-driven browsing</div>
              </div>
            </div>

            {feedback && (
              <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                {feedback}
              </div>
            )}
          </div>
        </section>

        <section className="animate-fade-up" id="watch">
          <SectionHeading
            description="Everything needed to watch, search, and filter is grouped here so the live experience stays simple."
            eyebrow="Watch"
            title="Live player and controls"
          />

          <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
            <Player
              autoPlay={false}
              onNextChannel={selectNextChannel}
              onPreviousChannel={selectPreviousChannel}
              poster={selectedChannel?.logo}
              shareUrl={currentShareUrl}
              streamUrl={selectedChannel?.streamUrl}
              subtitle={selectedChannel?.country || selectedChannel?.category || selectedChannel?.language}
              title={selectedChannel?.name}
              url={selectedChannel?.streamUrl}
            />

            <section className="rounded-[32px] border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Control Deck</p>
                  <h3 className="mt-2 text-2xl font-semibold text-white">Browse with intent</h3>
                </div>
                <div className="flex rounded-full border border-white/10 bg-slate-900/80 p-1">
                  <button
                    className={`rounded-full px-3 py-1.5 text-sm ${viewMode === 'grid' ? 'bg-cyan-400 text-slate-950' : 'text-slate-300'}`}
                    onClick={() => setViewMode('grid')}
                    type="button"
                  >
                    Grid
                  </button>
                  <button
                    className={`rounded-full px-3 py-1.5 text-sm ${viewMode === 'list' ? 'bg-cyan-400 text-slate-950' : 'text-slate-300'}`}
                    onClick={() => setViewMode('list')}
                    type="button"
                  >
                    List
                  </button>
                </div>
              </div>

              <label className="mb-3 block">
                <span className="mb-2 block text-sm text-slate-300">Search by name, country, category, or language</span>
                <input
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Try News, Philippines, Sports, English..."
                  value={search}
                />
              </label>

              <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <select
                  className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white"
                  onChange={(event) => setCountry(event.target.value)}
                  value={country}
                >
                  <option value="">All countries</option>
                  {filterOptions.countries.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                <select
                  className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white"
                  onChange={(event) => setCategory(event.target.value)}
                  value={category}
                >
                  <option value="">All categories</option>
                  {filterOptions.categories.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                <select
                  className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white"
                  onChange={(event) => setLanguage(event.target.value)}
                  value={language}
                >
                  <option value="">All languages</option>
                  {filterOptions.languages.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                <button
                  className={`rounded-2xl border px-4 py-3 text-sm transition ${
                    favoritesOnly
                      ? 'border-amber-400 bg-amber-400 text-slate-950'
                      : 'border-white/10 bg-slate-950/80 text-white hover:bg-slate-900'
                  }`}
                  onClick={() => setFavoritesOnly(!favoritesOnly)}
                  type="button"
                >
                  {favoritesOnly ? 'Showing favorites only' : 'Favorites filter'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
                <HighlightCard title="Channels" value={channels.length} />
                <HighlightCard title="Visible" tone="accent" value={filteredChannels.length} />
                <HighlightCard title="Playing" value={selectedChannel?.name || 'None'} />
                <HighlightCard title="Favorites" tone="warm" value={favoriteChannels.length} />
              </div>

              {hasActiveFilters && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {[search && `Search: ${search}`, country, category, language, favoritesOnly && 'Favorites']
                    .filter((item): item is string => Boolean(item))
                    .map((item) => (
                      <div
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200"
                        key={item}
                      >
                        {item}
                      </div>
                    ))}
                  <button
                    className="rounded-full border border-white/10 bg-slate-950/80 px-3 py-1.5 text-xs text-slate-200 transition hover:bg-white/10"
                    onClick={clearFilters}
                    type="button"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </section>
          </div>
        </section>

        <section className="animate-fade-up" id="quick-picks">
          <SectionHeading
            description="A compact rail that keeps discovery fast. These picks adapt to your current filters and selected channel."
            eyebrow="Quick Picks"
            title="Jump back into live viewing"
          />

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {quickPicks.map((channel, index) => (
              <button
                className={`group rounded-[28px] border border-white/10 bg-white/5 p-4 text-left transition duration-300 hover:-translate-y-1 hover:border-cyan-300/30 hover:bg-white/[0.08] ${
                  index === 0 ? 'animate-fade-up' : 'animate-fade-up-delayed'
                }`}
                key={channel.id}
                onClick={() => {
                  selectChannel(channel);
                  scrollToSection('watch');
                }}
                type="button"
              >
                <div className="flex items-center gap-4">
                  {channel.logo ? (
                    <img alt={channel.name} className="h-16 w-16 rounded-[20px] bg-black object-cover shadow-lg shadow-black/20" src={channel.logo} />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-black text-xs text-slate-500">
                      No logo
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-lg font-semibold text-white">{channel.name}</div>
                    <div className="mt-1 truncate text-sm text-slate-400">
                      {[channel.country, channel.category, channel.language].filter(Boolean).join(' • ') || 'Live stream'}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="animate-fade-up" id="favorites">
          <SectionHeading
            action={
              favoriteChannels.length > 0 ? (
                <button
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10"
                  onClick={() => {
                    setFavoritesOnly(true);
                    scrollToSection('channels');
                  }}
                  type="button"
                >
                  Open favorites in library
                </button>
              ) : null
            }
            description="Saved channels live in their own section so returning to your go-to streams takes one click."
            eyebrow="Favorites"
            title="Your saved channels"
          />

          {favoriteChannels.length === 0 ? (
            <div className="rounded-[32px] border border-dashed border-white/10 bg-white/[0.04] p-8 text-center text-slate-400">
              Save channels from any card and they will appear here for fast access.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {favoriteChannels.map((channel) => (
                <ChannelCard
                  active={channel.id === selectedChannel?.id}
                  channel={channel}
                  favorite={isFavorite(channel.id)}
                  key={channel.id}
                  onSelect={(item) => {
                    selectChannel(item);
                    scrollToSection('watch');
                  }}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </div>
          )}
        </section>

        <section className="animate-fade-up" id="categories">
          <SectionHeading
            description="Browse by programming intent instead of raw lists. Pick a category and jump directly into a focused library state."
            eyebrow="Categories"
            title="Category overview"
          />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {categoryHighlights.map((item) => (
              <button
                className="group rounded-[30px] border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.03] p-5 text-left shadow-xl shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-cyan-300/30"
                key={item.name}
                onClick={() => {
                  applyCategory(item.name);
                  scrollToSection('channels');
                }}
                type="button"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xl font-semibold text-white">{item.name}</div>
                    <div className="mt-1 text-sm text-slate-400">{item.count} channels available</div>
                  </div>
                  <div className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-100">
                    Explore
                  </div>
                </div>
                <div className="mt-5 flex -space-x-3">
                  {item.sample.map((sample) =>
                    sample.logo ? (
                      <img
                        alt={sample.name}
                        className="h-12 w-12 rounded-full border-2 border-slate-950 bg-black object-cover shadow-md shadow-black/30"
                        key={sample.id}
                        src={sample.logo}
                      />
                    ) : (
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-slate-950 bg-black text-[10px] text-slate-500"
                        key={sample.id}
                      >
                        TV
                      </div>
                    ),
                  )}
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="animate-fade-up" id="countries">
          <SectionHeading
            description="Navigate region-first when you know where you want to watch from. Country cards apply filters and move you straight to the relevant list."
            eyebrow="Countries"
            title="Country overview"
          />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {countryHighlights.map((item) => (
              <button
                className="group rounded-[30px] border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-950/90 p-5 text-left shadow-xl shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-white/20"
                key={item.name}
                onClick={() => {
                  applyCountry(item.name);
                  scrollToSection('channels');
                }}
                type="button"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xl font-semibold text-white">{item.name}</div>
                    <div className="mt-1 text-sm text-slate-400">{item.count} channels ready</div>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                    Filter
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-2 text-xs text-slate-400">
                  {item.sample.slice(0, 4).map((sample) => (
                    <div className="truncate rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-slate-200" key={sample.id}>
                      {sample.name}
                    </div>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="animate-fade-up" id="channels">
          <SectionHeading
            action={
              filteredChannels.length > 0 ? (
                <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
                  {filteredChannels.length} visible channels
                </div>
              ) : null
            }
            description="The full channel library remains here, now cleaner to scan and easier to navigate after using the dashboard shortcuts above."
            eyebrow="Library"
            title="Channel library"
          />

          {filteredChannels.length === 0 ? (
            <div className="rounded-[32px] border border-dashed border-white/10 bg-white/[0.04] p-10 text-center">
              <div className="text-lg font-medium text-white">No channels match the current filters.</div>
              <p className="mt-2 text-sm text-slate-400">Reset the active filters and try another combination.</p>
              <button
                className="mt-5 rounded-full bg-cyan-400 px-5 py-3 text-sm font-medium text-slate-950"
                onClick={clearFilters}
                type="button"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5'
                  : 'grid grid-cols-1 gap-3'
              }
            >
              {filteredChannels.map((channel) => (
                <ChannelCard
                  active={channel.id === selectedChannel?.id}
                  channel={channel}
                  favorite={isFavorite(channel.id)}
                  key={channel.id}
                  mode={viewMode}
                  onSelect={selectChannel}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
