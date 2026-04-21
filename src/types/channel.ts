export interface Channel {
  id: string;
  name: string;
  logo?: string;
  country?: string;
  subdivision?: string;
  city?: string;
  region?: string;
  timezone?: string;
  language?: string;
  category?: string;
  resolution?: string;
  viewersCount?: number;
  streamUrl: string;
  epgId?: string;
  epgUrl?: string;
  isLive?: boolean;
  fallbackUrls?: string[];
  isGeoBlocked?: boolean;
  isNsfw?: boolean;
  launched?: string;
  closed?: string;
  replacedBy?: string;
  website?: string;
  description?: string;
  isOffline?: boolean;
  tags?: string[];
  source?: 'iptv-org' | 'community';
}

export interface ChannelDataset {
  channels: Channel[];
  fetchedAt: number;
  epgUrl?: string;
}

export interface ChannelQuery {
  q?: string;
  page?: number;
  limit?: number;
  country?: string;
  subdivision?: string;
  city?: string;
  region?: string;
  timezone?: string;
  blocklist?: string;
  category?: string;
  language?: string;
  resolution?: string;
  status?: 'online' | 'offline' | 'geo-blocked';
  ids?: string[];
  source?: 'iptv-org' | 'community';
}

export interface PaginatedChannels {
  items: Channel[];
  total: number;
  fetchedAt: string;
}

export interface ChannelFilters {
  countries: string[];
  categories: string[];
  languages: string[];
  resolutions: string[];
  subdivisions: string[];
  cities: string[];
  regions: string[];
  timezones: string[];
  blocklist: string[];
}

export interface SearchResponse extends PaginatedChannels {
  filters: ChannelFilters;
  query: Omit<ChannelQuery, 'ids'>;
}
