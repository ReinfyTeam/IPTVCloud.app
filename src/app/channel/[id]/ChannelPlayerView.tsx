'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useFavoritesStore } from '@/store/favorites-store';
import { useHistoryStore } from '@/store/history-store';
import { usePlayerStore } from '@/store/player-store';
import type { Channel } from '@/types';
import Player from '@/components/Player';
import EpgStrip from '@/components/EpgStrip';
import CommentSection from '@/components/CommentSection';
import ChannelCard from '@/components/ChannelCard';

type Props = {
  channel: Channel;
  relatedChannels: Channel[];
  allChannels: Channel[];
};

export default function ChannelPlayerView({ channel, relatedChannels, allChannels }: Props) {
  const router = useRouter();
  const { isFavorite, toggleFavorite } = useFavoritesStore();
  const { addHistory } = useHistoryStore();
  const { setLastChannelId } = usePlayerStore();

  useEffect(() => {
    if (channel) {
      addHistory(channel);
      setLastChannelId(channel.id);
    }
  }, [channel, addHistory, setLastChannelId]);

  const selectChannel = (ch: Channel) => {
    router.push(`/channel/${encodeURIComponent(ch.id)}`);
  };

  const nextChannel = () => {
    const idx = allChannels.findIndex((c) => c.id === channel.id);
    if (idx !== -1 && idx < allChannels.length - 1) {
      selectChannel(allChannels[idx + 1]);
    }
  };

  const prevChannel = () => {
    const idx = allChannels.findIndex((c) => c.id === channel.id);
    if (idx > 0) {
      selectChannel(allChannels[idx - 1]);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6">
      <div className="mx-auto max-w-[1460px] space-y-8 animate-fade-in transform-gpu">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Player
              channel={channel}
              autoPlay
              onNextChannel={nextChannel}
              onPreviousChannel={prevChannel}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-8">
                <div className="flex items-center justify-between gap-4 p-6 rounded-[32px] bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl shadow-xl">
                  <div className="flex items-center gap-4">
                    {channel.logo ? (
                      <Image
                        src={channel.logo}
                        alt={channel.name}
                        width={64}
                        height={64}
                        className="h-16 w-16 rounded-2xl object-contain bg-slate-900 border border-white/10 p-2 shadow-lg shadow-black/50"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center font-bold text-2xl text-slate-700 shadow-lg">
                        {channel.name[0]}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <h1 className="text-2xl font-black text-white truncate uppercase italic tracking-tighter">
                        {channel.name}
                      </h1>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          {channel.category}
                        </span>
                        {channel.country &&
                          channel.country !== 'UNKNOWN' &&
                          channel.country !== 'INTERNATIONAL' && (
                            <div className="h-3 w-4 rounded-sm overflow-hidden border border-white/10">
                              <Image
                                src={`https://flagcdn.com/w20/${channel.country.toLowerCase()}.png`}
                                alt={channel.country}
                                width={20}
                                height={15}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          )}
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
                    <span className="material-icons text-lg">
                      {isFavorite(channel.id) ? 'star' : 'star_border'}
                    </span>
                    {isFavorite(channel.id) ? 'Saved' : 'Save'}
                  </button>
                </div>

                <div className="pt-6 border-t border-white/[0.06]">
                  <div className="flex items-center justify-between mb-4 px-2">
                    <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                      Live Program Guide
                    </div>
                    <Link
                      href={`/epg/${encodeURIComponent(channel.id)}`}
                      className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 uppercase tracking-widest transition-colors"
                    >
                      Full Schedule →
                    </Link>
                  </div>
                  <EpgStrip channelId={channel.epgId} />
                </div>
              </div>

              <div className="min-h-[400px]">
                <CommentSection channelId={channel.id} />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest px-2 mb-2">
              Related Channels
            </h3>
            <div className="flex flex-col gap-2">
              {relatedChannels.map((ch) => (
                <ChannelCard
                  key={ch.id}
                  channel={ch}
                  mode="list"
                  active={false}
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
