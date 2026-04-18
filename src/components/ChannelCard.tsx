"use client";

import React from 'react';
import type { Channel } from '@/types';

type Props = {
  channel: Channel;
  onSelect: (channel: Channel) => void;
  active?: boolean;
  mode?: 'grid' | 'list';
  favorite?: boolean;
  onToggleFavorite?: (channelId: string) => void;
};

export default function ChannelCard({
  channel,
  onSelect,
  active = false,
  mode = 'grid',
  favorite = false,
  onToggleFavorite,
}: Props) {
  return (
    <div
      onClick={() => onSelect(channel)}
      className={`hover-lift group cursor-pointer overflow-hidden rounded-[24px] border transition duration-300 ${
        active
          ? 'border-cyan-400 bg-cyan-400/10 shadow-lg shadow-cyan-900/30'
          : 'border-white/10 bg-white/5 hover:border-white/20'
      } ${mode === 'list' ? 'flex items-center gap-4 p-3' : ''}`}
      title={channel.name}
    >
      {channel.logo ? (
        <img
          alt={channel.name}
          className={mode === 'list' ? 'h-16 w-16 rounded-2xl bg-black object-cover transition duration-300 group-hover:scale-[1.04]' : 'h-36 w-full bg-black object-cover transition duration-300 group-hover:scale-[1.04]'}
          loading="lazy"
          src={channel.logo}
        />
      ) : (
        <div
          className={
            mode === 'list'
              ? 'flex h-16 w-16 items-center justify-center rounded-2xl bg-black text-xs text-gray-400'
              : 'flex h-36 w-full items-center justify-center bg-black text-gray-400'
          }
        >
          No logo
        </div>
      )}
      <div className={mode === 'list' ? 'min-w-0 flex-1' : 'p-3'}>
        <div className="flex items-center justify-between gap-2">
          <div className="truncate text-sm font-semibold text-white">{channel.name}</div>
          <button
            className={`shrink-0 rounded-full px-2 py-1 text-xs ${
              favorite ? 'bg-amber-400 text-slate-950' : 'bg-white/10 text-slate-300'
            }`}
            onClick={(event) => {
              event.stopPropagation();
              onToggleFavorite?.(channel.id);
            }}
            type="button"
          >
            {favorite ? 'Saved' : 'Save'}
          </button>
        </div>
        <div className="truncate text-xs text-slate-400">
          {[channel.country, channel.category, channel.language].filter(Boolean).join(' • ') || 'Live stream'}
        </div>
      </div>
    </div>
  );
}
