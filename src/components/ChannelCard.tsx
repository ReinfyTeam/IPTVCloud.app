'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Channel } from '@/types';
import { useNetworkStatus } from '@/hooks/use-network';
import Hls from 'hls.js';
import { buildStreamProxyUrl } from '@/services/stream-service';

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
  const [isHovered, setIsHovered] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const isOnline = useNetworkStatus();
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

  const initials = channel.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const hasFlag = channel.country && channel.country !== 'UNKNOWN' && channel.country !== 'INTERNATIONAL';

  useEffect(() => {
    if (isHovered) {
      hoverTimerRef.current = setTimeout(() => {
        setShowPreview(true);
      }, 800); // Wait 800ms before showing preview
    } else {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      setShowPreview(false);
    }
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, [isHovered]);

  useEffect(() => {
    if (showPreview && !channel.isGeoBlocked) {
      const video = videoRef.current;
      if (!video) return;

      const initHls = async () => {
        try {
          const proxiedSrc = await buildStreamProxyUrl(channel.streamUrl);
          if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = proxiedSrc;
            video.play().catch(() => {});
          } else if (Hls.isSupported()) {
            const hls = new Hls({ enableWorker: true, lowLatencyMode: true, backBufferLength: 0 });
            hlsRef.current = hls;
            hls.loadSource(proxiedSrc);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              video.play().catch(() => {});
            });
          }
        } catch {
          // ignore
        }
      };
      initHls();
    } else {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.src = '';
        videoRef.current.load();
      }
    }
  }, [showPreview, channel.streamUrl, channel.isGeoBlocked]);

  if (mode === 'list') {
    return (
      <div
        onClick={() => onSelect(channel)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`group flex cursor-pointer items-center gap-3 rounded-2xl border p-3 backdrop-blur-md transition-all duration-300 transform-gpu ${
          !isOnline ? 'opacity-50 grayscale select-none pointer-events-none' : ''
        } ${
          active
            ? 'border-cyan-400/50 bg-cyan-400/[0.08] shadow-md shadow-cyan-900/20 scale-[1.02]'
            : 'border-white/[0.07] bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.06] hover:-translate-y-0.5'
        }`}
      >
        <div className="relative shrink-0 overflow-hidden rounded-xl h-12 w-12 bg-slate-900">
          {showPreview && !channel.isGeoBlocked ? (
            <video ref={videoRef} className="h-full w-full object-cover scale-150" muted playsInline />
          ) : channel.logo && !imgError ? (
            <img
              src={channel.logo}
              alt={channel.name}
              loading="lazy"
              onError={() => setImgError(true)}
              className="h-full w-full object-contain p-1"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs font-bold text-slate-400">
              {initials}
            </div>
          )}
          {active && (
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-cyan-400 ring-2 ring-slate-950 animate-pulse" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="truncate text-sm font-medium text-white">{channel.name}</div>
            {channel.isGeoBlocked && (
              <span className="shrink-0 rounded-full bg-red-500/20 px-1.5 py-0.5 text-[8px] font-bold text-red-400 border border-red-500/30">GEO BLOCKED</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
             <div className="truncate text-[10px] font-medium text-slate-500 uppercase tracking-tight">{channel.category}</div>
             {hasFlag && <span className="text-[10px] text-slate-600">•</span>}
             <div className="truncate text-[10px] text-slate-600 font-bold">{channel.country}</div>
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite?.(channel.id); }}
          className={`shrink-0 rounded-lg p-1.5 transition-all duration-200 active:scale-90 ${
            favorite ? 'text-amber-400' : 'text-slate-600 hover:text-slate-400 hover:bg-white/5'
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
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group relative cursor-pointer overflow-hidden rounded-2xl border backdrop-blur-md transition-all duration-300 animate-fade-in transform-gpu ${
        !isOnline ? 'opacity-50 grayscale select-none pointer-events-none' : ''
      } ${
        active
          ? 'border-cyan-400/50 bg-cyan-400/[0.08] shadow-lg shadow-cyan-900/30 scale-[1.03]'
          : 'border-white/[0.07] bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.06] hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20'
      }`}
    >
      {!isOnline && (
        <div className="absolute top-2 left-2 z-10 rounded-full bg-red-500/80 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
          OFFLINE
        </div>
      )}
      <div className="relative aspect-video overflow-hidden bg-slate-900">
        {showPreview && !channel.isGeoBlocked ? (
          <video
            ref={videoRef}
            className="h-full w-full object-cover transition-opacity duration-300"
            muted
            playsInline
            autoPlay
          />
        ) : channel.logo && !imgError ? (
          <img
            src={channel.logo}
            alt={channel.name}
            loading="lazy"
            onError={() => setImgError(true)}
            className="h-full w-full object-contain p-4 transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-slate-700">
            {initials}
          </div>
        )}
        
        {channel.isGeoBlocked && (
          <div className="absolute inset-0 bg-red-950/60 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center">
            <svg className="h-8 w-8 text-red-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            <div className="text-[10px] font-bold text-red-200 uppercase tracking-widest">Geo Blocked</div>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="truncate text-sm font-semibold text-white group-hover:text-cyan-400 transition-colors">{channel.name}</div>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <div className="truncate text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {channel.category}
              </div>
              <span className="text-slate-700 text-[10px]">•</span>
              <div className="truncate text-[10px] font-bold text-slate-600 uppercase">
                {channel.country}
              </div>
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite?.(channel.id); }}
            className={`shrink-0 rounded-lg p-1.5 transition-all duration-200 active:scale-90 ${
              favorite ? 'text-amber-400' : 'text-slate-700 hover:text-slate-400 hover:bg-white/5'
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
