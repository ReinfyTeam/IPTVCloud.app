import React from 'react';
import { getChannelById } from '@/services/channel-service';
import { decodeBase64Url } from '@/lib/base64';
import Player from '@/components/Player';
import { notFound } from 'next/navigation';

export default async function EmbedPage({ params }: { params: { id: string } }) {
  const channelId = decodeBase64Url(params.id);
  const channel = await getChannelById(channelId);

  if (!channel) {
    notFound();
  }

  return (
    <div className="fixed inset-0 bg-black">
      <Player channel={channel} autoPlay className="h-full w-full !border-none !rounded-none" />
    </div>
  );
}
