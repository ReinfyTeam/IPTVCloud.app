import React from 'react';
import type { Metadata } from 'next';
import ChannelBrowser from '@/components/ChannelBrowser';
import { getChannels } from '@/services/channel-service';

export const metadata: Metadata = {
  title: 'Search — IPTVCloud.app',
  description: 'Browse thousands of live IPTV channels. Filter by country, category, or language.',
};

export default async function SearchPage() {
  const { channels } = await getChannels();
  return <ChannelBrowser channels={channels} />;
}
