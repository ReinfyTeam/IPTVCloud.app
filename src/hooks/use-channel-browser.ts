'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Channel } from '@/types';
import { useFavoritesPersistence, useFavoritesStore } from '@/store/favorites-store';
import { usePlayerStore } from '@/store/player-store';

function buildFacetSummary(
  channels: Channel[],
  pickValue: (_channel: Channel) => string | undefined,
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
  const [resolution, setResolution] = useState('');
  const [timezone, setTimezone] = useState('');
  const [subdivision, setSubdivision] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [status, setStatus] = useState('');
  const [blocklist, setBlocklist] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sortBy, setSortBy] = useState('viewers');

  useFavoritesPersistence();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlChannelId = new URLSearchParams(window.location.search).get('channel');
    if (!channels.length) return;

    if (urlChannelId && channels.some((_channel) => _channel.id === urlChannelId)) {
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
      countries: sort(channels.map((c) => c.country || '')),
      categories: sort(channels.map((c) => c.category || '')),
      languages: sort(channels.map((c) => c.language || '')),
      resolutions: sort(channels.map((c) => c.resolution || '')),
      timezones: sort(channels.map((c) => c.timezone || '')),
      subdivisions: sort(channels.map((c) => c.subdivision || '')),
      cities: sort(channels.map((c) => c.city || '')),
      regions: sort(channels.map((c) => c.region || '')),
      blocklist: [],
    };
  }, [channels]);

  const filteredChannels = useMemo(() => {
    let items = channels.filter((channel) => {
      const matchesSearch =
        !debouncedSearch ||
        [channel.name, channel.country, channel.category, channel.language]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(debouncedSearch));

      const matchesCountry = !country || channel.country === country;
      const matchesCategory = !category || channel.category === category;
      const matchesLanguage = !language || channel.language === language;
      const matchesResolution = !resolution || channel.resolution === resolution;
      const matchesTimezone = !timezone || channel.timezone === timezone;
      const matchesSubdivision = !subdivision || channel.subdivision === subdivision;
      const matchesCity = !city || channel.city === city;
      const matchesRegion = !region || channel.region === region;
      const matchesFavorites = !favoritesOnly || favoriteIds.includes(channel.id);

      let matchesStatus = true;
      if (status === 'online') matchesStatus = !channel.isOffline && !channel.isGeoBlocked;
      else if (status === 'offline') matchesStatus = !!channel.isOffline;
      else if (status === 'geo-blocked') matchesStatus = !!channel.isGeoBlocked;

      return (
        matchesSearch &&
        matchesCountry &&
        matchesCategory &&
        matchesLanguage &&
        matchesResolution &&
        matchesTimezone &&
        matchesSubdivision &&
        matchesCity &&
        matchesRegion &&
        matchesFavorites &&
        matchesStatus
      );
    });

    // Sorting
    if (sortBy === 'viewers') items.sort((a, b) => (b.viewersCount || 0) - (a.viewersCount || 0));
    else if (sortBy === 'name') items.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === 'favorites') items.sort((a, b) => (favoriteIds.includes(b.id) ? 1 : -1));
    else if (sortBy === 'recommended') items.sort((a, b) => (b.isLive ? 1 : -1));

    return items;
  }, [
    category,
    channels,
    country,
    debouncedSearch,
    favoriteIds,
    favoritesOnly,
    language,
    resolution,
    timezone,
    subdivision,
    city,
    region,
    status,
    sortBy,
  ]);

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
    () => buildFacetSummary(channels, (_channel) => _channel.category),
    [channels],
  );

  const countryHighlights = useMemo(
    () => buildFacetSummary(channels, (_channel) => _channel.country),
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
    setResolution('');
    setTimezone('');
    setSubdivision('');
    setCity('');
    setRegion('');
    setStatus('');
    setBlocklist('');
    setFavoritesOnly(false);
    setSortBy('viewers');
  }

  return {
    country,
    category,
    language,
    resolution,
    timezone,
    subdivision,
    city,
    region,
    status,
    blocklist,
    sortBy,
    filteredChannels,
    filterOptions,
    favoritesOnly,
    favoriteChannels,
    favoriteIds,
    categoryHighlights,
    countryHighlights,
    quickPicks,
    hasActiveFilters: Boolean(
      search ||
      country ||
      category ||
      language ||
      resolution ||
      timezone ||
      subdivision ||
      city ||
      region ||
      status ||
      favoritesOnly,
    ),
    isFavorite: (channelId: string) => favoriteIds.includes(channelId),
    search,
    selectedChannel,
    selectNextChannel: () => stepChannel(1),
    selectPreviousChannel: () => stepChannel(-1),
    setSearch,
    setCountry,
    setCategory,
    setFavoritesOnly,
    setLanguage,
    setResolution,
    setTimezone,
    setSubdivision,
    setCity,
    setRegion,
    setStatus,
    setBlocklist,
    setSortBy,
    applyCountry,
    applyCategory,
    clearFilters,
    selectChannel: (channel: Channel) => updateSelectedChannel(channel.id),
    toggleFavorite,
    viewMode,
    setViewMode,
  };
}
