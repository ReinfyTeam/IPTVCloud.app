import React from 'react';
import type { Metadata } from 'next';
import ChannelBrowser from '@/components/ChannelBrowser';
import { getChannels } from '@/services/channel-service';

export const metadata: Metadata = {
  title: 'Search — IPTVCloud.app',
  description: 'Browse thousands of live IPTV channels. Filter by country, category, or language.',
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string; country?: string; category?: string; language?: string };
}) {
  const { channels } = await getChannels();
  return (
    <ChannelBrowser
      channels={channels}
      initialSearch={searchParams.q || ''}
      initialCountry={searchParams.country || ''}
      initialCategory={searchParams.category || ''}
      initialLanguage={searchParams.language || ''}
    />
  );
}
