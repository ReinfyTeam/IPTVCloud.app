import React from 'react';
import { notFound } from 'next/navigation';
import { getChannelById } from '@/services/channel-service';
import Player from '@/components/Player';

export default async function EmbedPage({ params }: { params: { id: string } }) {
  const channel = await getChannelById(decodeURIComponent(params.id));
  if (!channel) notFound();

  return (
    <div className="fixed inset-0 bg-black">
      <Player
        channel={channel}
        url={channel.streamUrl}
        title={channel.name}
        autoPlay
        className="h-full w-full rounded-none border-0"
      />
    </div>
  );
}
