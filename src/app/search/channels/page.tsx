import React from 'react';
import type { Metadata } from 'next';
import ChannelBrowser from '@/components/ChannelBrowser';
import { getChannels } from '@/services/channel-service';

export const metadata: Metadata = {
  title: 'Channel Search — IPTVCloud.app',
  description: 'Browse thousands of live IPTV channels. Filter by country, category, or language.',
};

export default async function SearchChannelsPage({
  searchParams,
}: {
  searchParams: {
    q?: string;
    country?: string;
    category?: string;
    language?: string;
    timezone?: string;
    subdivision?: string;
    city?: string;
    region?: string;
    status?: string;
    sort?: string;
    resolution?: string;
    favorites?: string;
  };
}) {
  const { channels } = await getChannels();
  return (
    <ChannelBrowser
      channels={channels}
      initialSearch={searchParams.q || ''}
      initialCountry={searchParams.country || ''}
      initialCategory={searchParams.category || ''}
      initialLanguage={searchParams.language || ''}
      initialTimezone={searchParams.timezone || ''}
      initialSubdivision={searchParams.subdivision || ''}
      initialCity={searchParams.city || ''}
      initialRegion={searchParams.region || ''}
      initialStatus={searchParams.status || ''}
      initialSortBy={searchParams.sort || 'viewers'}
      initialResolution={searchParams.resolution || ''}
    />
  );
}
