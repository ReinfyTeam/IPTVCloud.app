'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Channel } from '@/types';
import { useFavoritesPersistence, useFavoritesStore } from '@/store/favorites-store';
import { usePlayerStore } from '@/store/player-store';

type FacetSummary = {
  name: string;
  count: number;
  sample: Channel[];
};

function buildFacetSummary(
  channels: Channel[],
  pickValue: (channel: Channel) => string | undefined,
  limit = 6,
) {
  const map = new Map<string, Channel[]>();

  for (const channel of channels) {
    const value = pickValue(channel)?.trim();
    if (!value) continue;
    const existing = map.get(value) || [];
    existing.push(channel);
    map.set(value, existing);
  }

  return Array.from(map.entries())
    .map(([name, items]) => ({
      name,
      count: items.length,
      sample: items.slice(0, 4),
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit);
}

export function useChannelBrowser(channels: Channel[]) {
  const { selectedChannelId, setSelectedChannelId, viewMode, setViewMode } = usePlayerStore();
  const favoriteIds = useFavoritesStore((state) => state.ids);
  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [country, setCountry] = useState('');
  const [category, setCategory] = useState('');
  const [language, setLanguage] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  useFavoritesPersistence();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlChannelId = new URLSearchParams(window.location.search).get('channel');
    if (!channels.length) return;

    if (urlChannelId && channels.some((channel) => channel.id === urlChannelId)) {
      if (selectedChannelId !== urlChannelId) {
        setSelectedChannelId(urlChannelId);
      }
      return;
    }

    if (!selectedChannelId) {
      setSelectedChannelId(channels[0].id);
    }
  }, [channels, selectedChannelId, setSelectedChannelId]);

  useEffect(() => {
    if (typeof window === 'undefined' || !selectedChannelId) return;

    const url = new URL(window.location.href);
    if (url.searchParams.get('channel') === selectedChannelId) return;

    url.searchParams.set('channel', selectedChannelId);
    window.history.replaceState({}, '', url.toString());
  }, [selectedChannelId]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const filterOptions = useMemo(() => {
    const sort = (items: string[]) =>
      Array.from(new Set(items.filter(Boolean))).sort((a, b) => a.localeCompare(b));

    return {
      countries: sort(channels.map((channel) => channel.country || '')),
      categories: sort(channels.map((channel) => channel.category || '')),
      languages: sort(channels.map((channel) => channel.language || '')),
    };
  }, [channels]);

  const filteredChannels = useMemo(() => {
    return channels.filter((channel) => {
      const matchesSearch =
        !debouncedSearch ||
        [channel.name, channel.country, channel.category, channel.language]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(debouncedSearch));

      const matchesCountry = !country || channel.country === country;
      const matchesCategory = !category || channel.category === category;
      const matchesLanguage = !language || channel.language === language;
      const matchesFavorites = !favoritesOnly || favoriteIds.includes(channel.id);

      return (
        matchesSearch && matchesCountry && matchesCategory && matchesLanguage && matchesFavorites
      );
    });
  }, [category, channels, country, debouncedSearch, favoriteIds, favoritesOnly, language]);

  const selectedChannel =
    filteredChannels.find((channel) => channel.id === selectedChannelId) ||
    channels.find((channel) => channel.id === selectedChannelId) ||
    filteredChannels[0] ||
    null;

  const favoriteChannels = useMemo(
    () => channels.filter((channel) => favoriteIds.includes(channel.id)).slice(0, 8),
    [channels, favoriteIds],
  );

  const categoryHighlights = useMemo(
    () => buildFacetSummary(channels, (channel) => channel.category),
    [channels],
  );

  const countryHighlights = useMemo(
    () => buildFacetSummary(channels, (channel) => channel.country),
    [channels],
  );

  const quickPicks = useMemo(() => {
    const pool = selectedChannel
      ? [
          selectedChannel,
          ...filteredChannels.filter((channel) => channel.id !== selectedChannel.id),
        ]
      : filteredChannels;
    return pool.slice(0, 6);
  }, [filteredChannels, selectedChannel]);

  function updateSelectedChannel(channelId: string) {
    setSelectedChannelId(channelId);
  }

  function stepChannel(direction: 1 | -1) {
    if (filteredChannels.length === 0) return;
    const currentIndex = filteredChannels.findIndex((channel) => channel.id === selectedChannelId);
    const nextIndex =
      currentIndex === -1
        ? 0
        : (currentIndex + direction + filteredChannels.length) % filteredChannels.length;
    updateSelectedChannel(filteredChannels[nextIndex].id);
  }

  function applyCountry(value: string) {
    setCountry(value);
    setFavoritesOnly(false);
  }

  function applyCategory(value: string) {
    setCategory(value);
    setFavoritesOnly(false);
  }

  function clearFilters() {
    setSearch('');
    setCountry('');
    setCategory('');
    setLanguage('');
    setFavoritesOnly(false);
  }

  return {
    country,
    category,
    filteredChannels,
    filterOptions,
    favoritesOnly,
    favoriteChannels,
    favoriteIds,
    categoryHighlights,
    countryHighlights,
    quickPicks,
    hasActiveFilters: Boolean(search || country || category || language || favoritesOnly),
    isFavorite: (channelId: string) => favoriteIds.includes(channelId),
    language,
    search,
    selectedChannel,
    selectNextChannel: () => stepChannel(1),
    selectPreviousChannel: () => stepChannel(-1),
    setSearch,
    setCountry,
    setCategory,
    setFavoritesOnly,
    setLanguage,
    applyCountry,
    applyCategory,
    clearFilters,
    selectChannel: (channel: Channel) => updateSelectedChannel(channel.id),
    toggleFavorite,
    viewMode,
    setViewMode,
  };
}
