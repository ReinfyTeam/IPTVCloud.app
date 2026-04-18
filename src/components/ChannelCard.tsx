'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { Channel } from '@/types';
import { useNetworkStatus } from '@/hooks/use-network';
import Hls from 'hls.js';
import { buildStreamProxyUrl } from '@/services/stream-service';
import { REVERSE_COUNTRY_MAP } from '@/lib/countries';

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

  const isInternational =
    !channel.country || channel.country === 'INTERNATIONAL' || channel.country === 'UNKNOWN';
  const hasFlag = !isInternational;
  const countryCode = hasFlag ? REVERSE_COUNTRY_MAP[channel.country!.toUpperCase()] : null;

  useEffect(() => {
    if (isHovered) {
      hoverTimerRef.current = setTimeout(() => {
        setShowPreview(true);
      }, 5000); // 5 second delay before preview
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
            const hls = new Hls({
              enableWorker: true,
              lowLatencyMode: true,
              backBufferLength: 0,
              capLevelToPlayerSize: true,
            });
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
            ? 'border-cyan-400/50 bg-cyan-400/[0.08] shadow-md shadow-cyan-900/20 scale-[1.01]'
            : 'border-white/[0.07] bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.06] hover:-translate-y-0.5'
        }`}
      >
        <div className="relative shrink-0 overflow-hidden rounded-xl h-12 w-12 bg-slate-900 shadow-inner">
          {showPreview && !channel.isGeoBlocked ? (
            <div className="relative h-full w-full">
              <video ref={videoRef} className="h-full w-full object-cover scale-150" playsInline />
              <button
                onClick={toggleMute}
                className="absolute bottom-0.5 right-0.5 h-4 w-4 rounded-full bg-black/60 flex items-center justify-center text-white z-10 hover:bg-cyan-500 transition-colors"
              >
                <span className="material-icons text-[10px]">
                  {muted ? 'volume_off' : 'volume_up'}
                </span>
              </button>
            </div>
          ) : channel.logo && !imgError ? (
            <img
              src={channel.logo}
              alt={channel.name}
              loading="lazy"
              onError={() => setImgError(true)}
              className="h-full w-full object-contain p-1 group-hover:scale-110 transition-transform duration-500"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs font-bold text-slate-400">
              {initials}
            </div>
          )}
          {active && (
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-cyan-400 ring-2 ring-slate-950 animate-pulse shadow-lg" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="truncate text-sm font-medium text-white group-hover:text-cyan-400 transition-colors">
              {channel.name}
            </div>
            {channel.isGeoBlocked && (
              <span className="shrink-0 rounded-full bg-red-500/20 px-1.5 py-0.5 text-[8px] font-bold text-red-400 border border-red-500/30">
                GEO BLOCKED
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="truncate text-[10px] font-medium text-slate-500 uppercase tracking-tight">
              {channel.category}
            </div>
            <span className="text-[10px] text-slate-600">•</span>
            <div className="flex items-center gap-1.5 min-w-0">
              {isInternational ? (
                <span className="material-icons text-[10px] text-slate-600">public</span>
              ) : countryCode ? (
                <img
                  src={`https://flagcdn.com/w20/${countryCode}.png`}
                  alt={channel.country}
                  className="h-3 w-4 rounded-sm object-cover shadow-sm"
                />
              ) : null}
              <div className="truncate text-[10px] text-slate-600 font-bold">
                {channel.country || 'INTERNATIONAL'}
              </div>
            </div>
          </div>
        </div>
        <div className="hidden sm:flex flex-col items-end gap-1 px-2 shrink-0">
          <div className="flex items-center gap-1 text-[9px] font-bold text-slate-500">
            <span className="h-1 w-1 rounded-full bg-red-500 animate-pulse" />
            {channel.viewersCount?.toLocaleString() || '0'}
          </div>
          {channel.resolution && (
            <div className="text-[8px] font-bold text-cyan-500/50 uppercase tracking-widest">
              {channel.resolution}
            </div>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite?.(channel.id);
          }}
          className={`shrink-0 rounded-lg p-1.5 transition-all duration-200 active:scale-90 ${
            favorite ? 'text-amber-400' : 'text-slate-600 hover:text-slate-400 hover:bg-white/5'
          }`}
        >
          <span className="material-icons text-lg">{favorite ? 'star' : 'star_border'}</span>
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={handleSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group relative cursor-pointer overflow-hidden rounded-[28px] border backdrop-blur-md transition-all duration-500 animate-fade-in transform-gpu ${
        !isOnline ? 'opacity-50 grayscale select-none pointer-events-none' : ''
      } ${
        active
          ? 'border-cyan-400/50 bg-cyan-400/[0.08] shadow-lg shadow-cyan-900/30 scale-[1.02]'
          : 'border-white/[0.07] bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.06] hover:-translate-y-2 hover:shadow-2xl hover:shadow-black/40'
      }`}
    >
      {!isOnline && (
        <div className="absolute top-3 left-3 z-10 rounded-full bg-red-500/80 px-3 py-1 text-[9px] font-black text-white backdrop-blur-md shadow-lg">
          OFFLINE
        </div>
      )}
      <div className="relative aspect-video overflow-hidden bg-slate-900 shadow-inner">
        {showPreview && !channel.isGeoBlocked ? (
          <div className="relative h-full w-full">
            <video
              ref={videoRef}
              className="h-full w-full object-cover transition-opacity duration-300"
              playsInline
            />
            <button
              onClick={toggleMute}
              className="absolute bottom-3 right-3 h-8 w-8 rounded-full bg-black/60 flex items-center justify-center text-white z-10 hover:bg-cyan-500 transition-colors shadow-lg backdrop-blur-sm active:scale-90"
            >
              <span className="material-icons text-sm">{muted ? 'volume_off' : 'volume_up'}</span>
            </button>
          </div>
        ) : channel.logo && !imgError ? (
          <img
            src={channel.logo}
            alt={channel.name}
            loading="lazy"
            onError={() => setImgError(true)}
            className="h-full w-full object-contain p-6 transition-transform duration-[800ms] group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-slate-700/50">
            {initials}
          </div>
        )}

        {channel.isGeoBlocked && (
          <div className="absolute inset-0 bg-red-950/60 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center">
            <span className="material-icons text-3xl text-red-400 mb-2">lock_person</span>
            <div className="text-[10px] font-bold text-red-200 uppercase tracking-[0.2em]">
              Geo Restricted
            </div>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-bold text-white">
              {channel.viewersCount?.toLocaleString() || '0'} watching
            </span>
          </div>
          {channel.resolution && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-white/10 text-white backdrop-blur-sm border border-white/10">
              {channel.resolution}
            </span>
          )}
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold text-white group-hover:text-cyan-400 transition-colors tracking-tight">
              {channel.name}
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="truncate text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white/[0.03] px-2 py-0.5 rounded-md border border-white/[0.05]">
                {channel.category}
              </div>
              <span className="text-slate-800 text-[10px]">•</span>
              <div className="flex items-center gap-1.5 min-w-0">
                {isInternational ? (
                  <span className="material-icons text-[10px] text-slate-600">public</span>
                ) : countryCode ? (
                  <img
                    src={`https://flagcdn.com/w20/${countryCode}.png`}
                    alt={channel.country}
                    className="h-2.5 w-3.5 rounded-[2px] object-cover shadow-sm opacity-60"
                  />
                ) : null}
                <div className="truncate text-[10px] text-slate-600 font-bold uppercase">
                  {channel.country || 'INTERNATIONAL'}
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite?.(channel.id);
            }}
            className={`shrink-0 rounded-full p-2 transition-all duration-300 active:scale-90 ${
              favorite
                ? 'text-amber-400 bg-amber-400/10'
                : 'text-slate-700 hover:text-slate-400 hover:bg-white/5'
            }`}
          >
            <span className="material-icons text-xl">{favorite ? 'star' : 'star_border'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
