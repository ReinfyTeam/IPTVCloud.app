import React from 'react';
import ChannelBrowser from '@/components/ChannelBrowser';
import { getChannels } from '@/services/channel-service';

export default async function HomePage() {
  const { channels } = await getChannels();
  return (
    <main className="min-h-screen bg-slate-950">
      <ChannelBrowser channels={channels} />
    </main>
  );
}
