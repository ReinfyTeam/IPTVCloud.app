export interface Channel {
  id: string;
  name: string;
  logo?: string;
  country?: string;
  language?: string;
  category?: string;
  resolution?: string;
  viewersCount?: number;
  streamUrl: string;
  epgId?: string;
  isLive: true;
  fallbackUrls?: string[];
  isGeoBlocked?: boolean;
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
  category?: string;
  language?: string;
  resolution?: string;
  ids?: string[];
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
}

export interface SearchResponse extends PaginatedChannels {
  filters: ChannelFilters;
  query: Omit<ChannelQuery, 'ids'>;
}
