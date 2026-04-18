'use client';

import React, { useState } from 'react';
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
  const [imgError, setImgError] = useState(false);

  const initials = channel.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (mode === 'list') {
    return (
      <div
        onClick={() => onSelect(channel)}
        className={`group flex cursor-pointer items-center gap-3 rounded-2xl border p-3 transition-all duration-200 ${
          active
            ? 'border-cyan-400/50 bg-cyan-400/[0.08] shadow-md shadow-cyan-900/20'
            : 'border-white/[0.07] bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.06]'
        }`}
      >
        <div className="relative shrink-0">
          {channel.logo && !imgError ? (
            <img
              src={channel.logo}
              alt={channel.name}
              loading="lazy"
              onError={() => setImgError(true)}
              className="h-12 w-12 rounded-xl bg-slate-900 object-contain p-1"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 text-xs font-bold text-slate-400">
              {initials}
            </div>
          )}
          {active && (
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-cyan-400 ring-2 ring-slate-950 animate-pulse" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {channel.country && channel.country !== 'UNKNOWN' && (
              <img
                src={`https://flagcdn.com/w20/${channel.country.toLowerCase()}.png`}
                alt={channel.country}
                className="h-3 w-4 rounded-sm object-cover"
              />
            )}
            <div className="truncate text-sm font-medium text-white">{channel.name}</div>
          </div>
          <div className="truncate text-xs text-slate-500">
            {channel.category}
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite?.(channel.id); }}
          className={`shrink-0 rounded-lg p-1.5 transition-colors ${
            favorite ? 'text-amber-400' : 'text-slate-600 hover:text-slate-400'
          }`}
          aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <svg className="h-4 w-4" fill={favorite ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={() => onSelect(channel)}
      className={`group relative cursor-pointer overflow-hidden rounded-2xl border transition-all duration-200 ${
        active
          ? 'border-cyan-400/50 bg-cyan-400/[0.08] shadow-lg shadow-cyan-900/30'
          : 'border-white/[0.07] bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.06] hover:-translate-y-0.5'
      }`}
    >
      <div className="relative aspect-video overflow-hidden bg-slate-900">
        {channel.logo && !imgError ? (
          <img
            src={channel.logo}
            alt={channel.name}
            loading="lazy"
            onError={() => setImgError(true)}
            className="h-full w-full object-contain p-4 transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-slate-700">
            {initials}
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {channel.country && channel.country !== 'UNKNOWN' && (
                <img
                  src={`https://flagcdn.com/w20/${channel.country.toLowerCase()}.png`}
                  alt={channel.country}
                  className="h-3 w-4 rounded-sm object-cover"
                />
              )}
              <div className="truncate text-sm font-medium text-white">{channel.name}</div>
            </div>
            <div className="mt-0.5 truncate text-xs text-slate-500">
              {channel.category}
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite?.(channel.id); }}
            className={`shrink-0 rounded-lg p-1.5 transition-colors ${
              favorite ? 'text-amber-400' : 'text-slate-700 hover:text-slate-400'
            }`}
          >
            <svg className="h-4 w-4" fill={favorite ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
