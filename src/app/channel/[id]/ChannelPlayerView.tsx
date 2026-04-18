'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Channel } from '@/types';
import { useFavoritesStore } from '@/store/favorites-store';
import { useHistoryStore } from '@/store/history-store';
import Player from '@/components/Player';
import ChannelCard from '@/components/ChannelCard';
import EpgStrip from '@/components/EpgStrip';

export default function ChannelPlayerView({ 
  channel, 
  relatedChannels,
  allChannels 
}: { 
  channel: Channel; 
  relatedChannels: Channel[];
  allChannels: Channel[];
}) {
  const router = useRouter();
  const { ids: favoriteIds, toggleFavorite, isFavorite } = useFavoritesStore();
  const { addEntry: addHistory } = useHistoryStore();
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') setShareUrl(window.location.href);
    addHistory(channel);
  }, [channel, addHistory]);

  const selectChannel = useCallback((ch: Channel) => {
    router.push(`/channel/${encodeURIComponent(ch.id)}`);
  }, [router]);

  const currentIndex = allChannels.findIndex(c => c.id === channel.id);

  const selectNext = useCallback(() => {
    if (allChannels.length === 0) return;
    const next = allChannels[(currentIndex + 1) % allChannels.length];
    selectChannel(next);
  }, [allChannels, currentIndex, selectChannel]);

  const selectPrev = useCallback(() => {
    if (allChannels.length === 0) return;
    const prev = allChannels[(currentIndex - 1 + allChannels.length) % allChannels.length];
    selectChannel(prev);
  }, [allChannels, currentIndex, selectChannel]);

  return (
    <div className="pt-16 pb-20 px-4 sm:px-6">
      <div className="mx-auto max-w-[1600px] mt-6">
        <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
          
          <div className="flex flex-col gap-6">
            <Player
              channel={channel}
              url={channel.streamUrl}
              poster={channel.logo}
              title={channel.name}
              subtitle={[channel.country, channel.category].filter(Boolean).join(' · ')}
              streamUrl={channel.streamUrl}
              shareUrl={shareUrl}
              onNextChannel={selectNext}
              onPreviousChannel={selectPrev}
              autoPlay
            />

            <div className="rounded-3xl border border-white/[0.07] bg-white/[0.03] p-6 backdrop-blur-md">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                  {channel.logo ? (
                    <img src={channel.logo} alt={channel.name} className="h-16 w-16 rounded-2xl object-contain bg-slate-900 border border-white/10 p-2 shadow-lg shadow-black/50" />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800 text-xl font-bold text-slate-500 border border-white/10 shadow-lg">
                      {channel.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h1 className="text-2xl font-bold text-white">{channel.name}</h1>
                    <div className="flex items-center gap-2 mt-1">
                      {channel.country && channel.country !== 'UNKNOWN' && channel.country !== 'INTERNATIONAL' && (
                        <img src={`https://flagcdn.com/w20/${channel.country.toLowerCase()}.png`} alt={channel.country} className="h-3 w-4 rounded-sm" />
                      )}
                      <span className="text-sm text-slate-400 font-medium">{channel.category}</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-sm text-slate-400">{channel.language}</span>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => toggleFavorite(channel.id)}
                  className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all ${
                    isFavorite(channel.id) 
                      ? 'bg-amber-400/20 text-amber-400 hover:bg-amber-400/30 border border-amber-400/30' 
                      : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                  }`}
                >
                  <svg className="h-4 w-4" fill={isFavorite(channel.id) ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                  </svg>
                  {isFavorite(channel.id) ? 'Saved to Favorites' : 'Save Channel'}
                </button>
              </div>

              <div className="pt-6 border-t border-white/[0.06]">
                <div className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">Live Program Guide</div>
                <EpgStrip channelId={channel.epgId} />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="font-semibold text-white px-2">Related Channels</h3>
            <div className="flex flex-col gap-2">
              {relatedChannels.map((ch) => (
                <ChannelCard
                  key={ch.id}
                  channel={ch}
                  mode="list"
                  favorite={isFavorite(ch.id)}
                  onSelect={selectChannel}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
