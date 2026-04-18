import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getChannels } from '@/services/channel-service';
import ChannelPlayerView from './ChannelPlayerView';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const { channels } = await getChannels();
  const channel = channels.find((c) => c.id === decodeURIComponent(params.id));
  if (!channel) return { title: 'Channel Not Found — IPTVCloud.app' };

  return {
    title: `${channel.name} — IPTVCloud.app`,
    description: `Watch ${channel.name} live on IPTVCloud.app.`,
  };
}

export default async function ChannelPage({ params }: { params: { id: string } }) {
  const decodedId = decodeURIComponent(params.id);
  const { channels } = await getChannels();

  const channel = channels.find((c) => c.id === decodedId);
  if (!channel) notFound();

  // Find related channels (same category or country)
  const related = channels
    .filter(
      (c) =>
        c.id !== channel.id && (c.category === channel.category || c.country === channel.country),
    )
    .slice(0, 12);

  return <ChannelPlayerView channel={channel} relatedChannels={related} allChannels={channels} />;
}
