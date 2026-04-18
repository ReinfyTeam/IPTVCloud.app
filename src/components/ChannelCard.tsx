'use client';

import React, { useState, useRef, useEffect } from 'react';
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
  const [muted, setMuted] = useState(true);
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
      }, 5000); // 5 second delay before preview starts
    } else {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      setShowPreview(false);
      setMuted(true);
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
            video.muted = muted;
            video.play().catch(() => {});
          } else if (Hls.isSupported()) {
            const hls = new Hls({ enableWorker: true, lowLatencyMode: true, backBufferLength: 0 });
            hlsRef.current = hls;
            hls.loadSource(proxiedSrc);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              video.muted = muted;
              video.play().catch(() => {});
            });
            hls.on(Hls.Events.ERROR, () => setShowPreview(false));
          }
        } catch {
          setShowPreview(false);
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
  }, [showPreview, channel.streamUrl, channel.isGeoBlocked, muted]);

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMuted(!muted);
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect(channel);
  };

  if (mode === 'list') {
    return (
      <div
        onClick={handleSelect}
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
            <div className="relative h-full w-full">
              <video ref={videoRef} className="h-full w-full object-cover scale-150" playsInline />
              <button
                onClick={toggleMute}
                className="absolute bottom-0.5 right-0.5 h-4 w-4 rounded-full bg-black/60 flex items-center justify-center text-white z-10 hover:bg-cyan-500 transition-colors"
              >
                {muted ? (
                  <svg className="h-2 w-2" fill="currentColor" viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77zM3 9v6h4l5 5V4L7 9H3z"/></svg>
                ) : (
                  <svg className="h-2 w-2" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                )}
              </button>
            </div>
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
            <div className="truncate text-sm font-medium text-white group-hover:text-cyan-400 transition-colors">{channel.name}</div>
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
      onClick={handleSelect}
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
          <div className="relative h-full w-full">
            <video
              ref={videoRef}
              className="h-full w-full object-cover transition-opacity duration-300"
              playsInline
            />
            <button
              onClick={toggleMute}
              className="absolute bottom-2 right-2 h-8 w-8 rounded-full bg-black/60 flex items-center justify-center text-white z-10 hover:bg-cyan-500 transition-colors shadow-lg"
            >
              {muted ? (
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77zM3 9v6h4l5 5V4L7 9H3z"/></svg>
              ) : (
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
              )}
            </button>
          </div>
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
