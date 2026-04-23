'use client';

import React, { useEffect, useMemo } from 'react';
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
import { getProxiedImageUrl } from '@/lib/image-proxy';
import { encodeBase64Url } from '@/lib/base64';
import { REVERSE_COUNTRY_MAP } from '@/lib/countries';

type Props = {
  channel: Channel;
  relatedChannels: Channel[];
  allChannels: Channel[];
};

export default function ChannelPlayerView({ channel, relatedChannels, allChannels }: Props) {
  const router = useRouter();
  const { isFavorite, toggleFavorite } = useFavoritesStore();
  const { addHistory } = useHistoryStore();
  const { setLastChannelId, theaterMode } = usePlayerStore();

  useEffect(() => {
    if (channel) {
      addHistory(channel);
      setLastChannelId(channel.id);
    }
  }, [channel, addHistory, setLastChannelId]);

  const selectChannel = (ch: Channel) => {
    router.push(`/channel/${encodeBase64Url(ch.id)}`);
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

  const popularChannels = useMemo(() => {
    return [...allChannels]
      .sort((a, b) => (b.viewersCount || 0) - (a.viewersCount || 0))
      .slice(0, 10);
  }, [allChannels]);

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6 bg-slate-950">
      <div className="mx-auto max-w-[1700px] space-y-6 sm:space-y-8 animate-fade-in transform-gpu">
        <div className={`grid gap-8 ${theaterMode ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3'}`}>
          <div
            className={`${theaterMode ? 'col-span-full' : 'lg:col-span-2'} space-y-4 sm:space-y-6`}
          >
            <Player
              channel={channel}
              autoPlay
              onNextChannel={nextChannel}
              onPreviousChannel={prevChannel}
            />

            <div
              className={`space-y-4 sm:space-y-6 ${theaterMode ? 'max-w-4xl mx-auto lg:mx-0' : ''}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-5 sm:p-6 rounded-[28px] sm:rounded-[32px] glass shadow-xl">
                <div className="flex items-center gap-4">
                  {channel.logo ? (
                    <Image
                      src={getProxiedImageUrl(channel.logo)}
                      alt={channel.name}
                      width={64}
                      height={64}
                      className="h-12 w-12 sm:h-16 sm:w-16 rounded-xl sm:rounded-2xl object-contain bg-slate-900 border border-white/10 p-2 shadow-lg shadow-black/50"
                    />
                  ) : (
                    <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-xl sm:rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center font-bold text-xl sm:text-2xl text-slate-700 shadow-lg uppercase italic">
                      {channel.name[0]}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <h1 className="text-xl sm:text-2xl font-black text-white truncate uppercase italic tracking-tighter leading-none">
                      {channel.name}
                    </h1>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="px-2 py-0.5 rounded-md bg-white/10 text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {channel.category}
                      </span>
                      {channel.country &&
                        channel.country !== 'UNKNOWN' &&
                        channel.country !== 'INTERNATIONAL' && (
                          <div className="h-2.5 w-3.5 sm:h-3 sm:w-4 rounded-sm overflow-hidden border border-white/10 shrink-0">
                            <Image
                              src={getProxiedImageUrl(
                                `https://flagcdn.com/w80/${REVERSE_COUNTRY_MAP[channel.country.toUpperCase()] || 'un'}.png`,
                              )}
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

                <div className="flex gap-3 sm:gap-4 w-full sm:w-auto shrink-0">
                  <button
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({
                          title: channel.name,
                          url: window.location.href,
                        });
                      } else {
                        void navigator.clipboard.writeText(window.location.href);
                        alert('Link copied to clipboard!');
                      }
                    }}
                    className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl glass-light flex items-center justify-center text-white hover:bg-white/10 transition-all active:scale-95 shadow-xl shrink-0"
                    title="Share Signal"
                  >
                    <span className="material-icons text-xl">share</span>
                  </button>
                  <button
                    onClick={() => toggleFavorite(channel.id)}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl sm:rounded-2xl px-6 sm:px-10 py-3 sm:py-3.5 text-xs sm:text-sm font-black transition-all shadow-xl active:scale-95 uppercase tracking-widest ${
                      isFavorite(channel.id)
                        ? 'bg-amber-400 text-slate-950 hover:bg-amber-500 shadow-amber-900/20'
                        : 'bg-white text-slate-950 hover:bg-slate-200 border border-white'
                    }`}
                  >
                    <span className="material-icons text-lg sm:text-xl">
                      {isFavorite(channel.id) ? 'star' : 'star_border'}
                    </span>
                    {isFavorite(channel.id) ? 'Saved' : 'Save Signal'}
                  </button>
                </div>
              </div>

              {channel.description && (
                <div className="p-6 sm:p-8 rounded-[32px] sm:rounded-[40px] glass shadow-lg">
                  <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-4 px-1">
                    Channel Signal Profile
                  </div>
                  <p className="text-sm sm:text-base text-slate-300 font-medium leading-relaxed italic px-1">
                    "{channel.description}"
                  </p>
                  {channel.tags && channel.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-6">
                      {channel.tags.map((tag) => (
                        <Link
                          key={tag}
                          href={`/search?category=${encodeURIComponent(tag)}`}
                          className="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/5 text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-cyan-400 transition-all"
                        >
                          #{tag}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="p-5 sm:p-6 rounded-[28px] sm:rounded-[32px] glass shadow-lg">
                <div className="flex items-center justify-between mb-4 px-1">
                  <div className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-500">
                    Live Program Guide
                  </div>
                  <Link
                    href={`/epg/${encodeBase64Url(channel.id)}`}
                    className="text-[9px] sm:text-[10px] font-black text-cyan-400 hover:text-cyan-300 uppercase tracking-widest transition-colors"
                  >
                    Full Schedule →
                  </Link>
                </div>
                <EpgStrip channelId={channel.id} compact />
              </div>

              <div className="min-h-[400px] sm:min-h-[500px]">
                <CommentSection channelId={channel.id} />
              </div>
            </div>
          </div>

          {/* Sidebar / Recommendations */}
          <div
            className={`${theaterMode ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' : 'flex flex-col gap-6'}`}
          >
            <SidebarSection title={`Related to ${channel.category}`} icon="category">
              <div className="flex flex-col gap-3">
                {relatedChannels.slice(0, 8).map((ch) => (
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
            </SidebarSection>

            <SidebarSection title="Trending Now" icon="local_fire_department">
              <div className="flex flex-col gap-3">
                {popularChannels.slice(0, 8).map((ch) => (
                  <ChannelCard
                    key={`pop-${ch.id}`}
                    channel={ch}
                    mode="list"
                    active={false}
                    favorite={isFavorite(ch.id)}
                    onSelect={selectChannel}
                    onToggleFavorite={toggleFavorite}
                  />
                ))}
              </div>
            </SidebarSection>
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 px-2">
        <span className="material-icons text-accent text-sm">{icon}</span>
        <h3 className="text-xs font-black text-white uppercase tracking-widest">{title}</h3>
      </div>
      {children}
    </div>
  );
}
