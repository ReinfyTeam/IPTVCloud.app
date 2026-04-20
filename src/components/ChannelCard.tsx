'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import type { Channel } from '@/types';
import { useNetworkStatus } from '@/hooks/use-network';
import { useAuthStore } from '@/store/auth-store';
import Hls from 'hls.js';
import { buildStreamProxyUrl } from '@/services/stream-service';
import { REVERSE_COUNTRY_MAP, getCountryName } from '@/lib/countries';
import { getLanguageName } from '@/lib/languages';
import { getProxiedImageUrl } from '@/lib/image-proxy';

type Props = {
  channel: Channel;
  onSelect: (_channel: Channel) => void;
  active?: boolean;
  mode?: 'grid' | 'list';
  favorite?: boolean;
  onToggleFavorite?: (_channelId: string) => void;
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
  const { isLoggedIn } = useAuthStore();
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [offline, setOffline] = useState(channel.isOffline);

  useEffect(() => {
    if (channel.isOffline === undefined && !offline) {
      const check = async () => {
        try {
          const res = await fetch(channel.streamUrl, {
            method: 'HEAD',
            signal: AbortSignal.timeout(3000),
          });
          setOffline(!res.ok);
        } catch {
          setOffline(true);
        }
      };
      void check();
    }
  }, [channel.streamUrl, channel.isOffline, offline]);

  const isInternational =
    !channel.country || channel.country === 'INTERNATIONAL' || channel.country === 'UNKNOWN';
  const hasFlag = !isInternational;
  const countryCode = hasFlag ? REVERSE_COUNTRY_MAP[channel.country!.toUpperCase()] : null;

  useEffect(() => {
    if (isHovered) {
      hoverTimerRef.current = setTimeout(() => {
        setShowPreview(true);
      }, 1000); // Reduced delay to 1 second
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

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLoggedIn()) {
      if (confirm('Please sign in to save channels to your favorites.')) {
        window.location.href = '/account/signin';
      }
      return;
    }
    onToggleFavorite?.(channel.id);
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
                className="absolute bottom-1 right-1 h-4 w-4 rounded-full bg-black/60 flex items-center justify-center text-foreground/80 hover:text-foreground"
              >
                <span className="material-icons text-[10px]">
                  {muted ? 'volume_off' : 'volume_up'}
                </span>
              </button>
            </div>
          ) : channel.logo && !imgError ? (
            <Image
              src={getProxiedImageUrl(channel.logo)}
              alt={channel.name}
              width={48}
              height={48}
              loading="lazy"
              onError={() => setImgError(true)}
              className="h-full w-full object-contain p-1 group-hover:scale-110 transition-transform duration-500"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-700">
              <span className="material-icons text-2xl">tv</span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-foreground truncate group-hover:text-cyan-400 transition-colors uppercase italic tracking-tighter">
              {channel.name}
            </h3>
            {countryCode && (
              <div className="h-3 w-4 rounded-sm overflow-hidden border border-white/10 shrink-0">
                <Image
                  src={getProxiedImageUrl(
                    `https://flagcdn.com/w80/${countryCode.toLowerCase()}.png`,
                  )}
                  alt=""
                  width={16}
                  height={12}
                  className="h-full w-full object-cover"
                />
              </div>
            )}
          </div>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black truncate opacity-60">
            {channel.category} • {getCountryName(channel.country || 'International')} •{' '}
            {getLanguageName(channel.language || 'English')}
          </p>
        </div>

        <button
          onClick={handleToggleFavorite}
          className={`shrink-0 rounded-full p-2 transition-all duration-300 active:scale-90 ${
            favorite
              ? 'text-amber-400 bg-amber-400/10'
              : 'text-slate-700 hover:text-slate-400 hover:bg-white/5'
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
      className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-[24px] sm:rounded-[32px] border transition-all duration-500 transform-gpu ${
        !isOnline ? 'opacity-50 grayscale select-none pointer-events-none' : ''
      } ${
        active
          ? 'border-cyan-500/50 bg-cyan-500/[0.05] shadow-[0_0_30px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/30'
          : 'border-white/[0.08] bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06] hover:-translate-y-2'
      }`}
    >
      <div className="relative aspect-video w-full overflow-hidden bg-slate-900 shadow-inner">
        {showPreview && !channel.isGeoBlocked ? (
          <div className="relative h-full w-full">
            <video ref={videoRef} className="h-full w-full object-cover" playsInline />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <button
              onClick={toggleMute}
              className="absolute bottom-3 right-3 h-8 w-8 rounded-full bg-black/60 flex items-center justify-center text-foreground backdrop-blur-md hover:bg-black/80 transition-all border border-white/10"
            >
              <span className="material-icons text-sm">{muted ? 'volume_off' : 'volume_up'}</span>
            </button>
          </div>
        ) : channel.logo && !imgError ? (
          <Image
            src={getProxiedImageUrl(channel.logo)}
            alt={channel.name}
            width={320}
            height={180}
            loading="lazy"
            onError={() => setImgError(true)}
            className="h-full w-full object-contain p-6 transition-transform duration-[800ms] group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-800">
            <span className="material-icons text-6xl">tv</span>
          </div>
        )}

        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <div className="rounded-full bg-black/40 px-3 py-1 text-[9px] font-black text-foreground backdrop-blur-md border border-white/10 tracking-widest uppercase italic">
            {channel.category}
          </div>
        </div>

        {channel.isGeoBlocked && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 text-center">
            <div className="space-y-2">
              <span className="material-icons text-red-500 text-3xl">public_off</span>
              <p className="text-[10px] font-bold text-red-300 uppercase tracking-widest leading-tight">
                GEO BLOCKED
              </p>
            </div>
          </div>
        )}

        {!channel.isGeoBlocked && offline && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 text-center">
            <div className="space-y-2">
              <span className="material-icons text-foreground/40 text-3xl">
                signal_disconnected
              </span>
              <p className="text-[10px] font-bold text-foreground/60 uppercase tracking-widest leading-tight">
                OFFLINE
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 sm:p-5 flex items-center justify-between gap-4 relative">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="truncate font-black text-foreground uppercase italic tracking-tighter group-hover:text-cyan-400 transition-colors">
              {channel.name}
            </h3>
            {countryCode && (
              <div className="h-2.5 w-3.5 rounded-[2px] overflow-hidden border border-white/10 shrink-0 opacity-60">
                <Image
                  src={getProxiedImageUrl(
                    `https://flagcdn.com/w80/${countryCode.toLowerCase()}.png`,
                  )}
                  alt={channel.country || ''}
                  width={20}
                  height={15}
                  className="h-full w-full object-cover"
                />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
              {getCountryName(channel.country || 'International')}
            </span>
            <span className="h-1 w-1 rounded-full bg-slate-700" />
            <span className="text-[9px] font-black text-cyan-500/60 uppercase tracking-tighter">
              {channel.viewersCount?.toLocaleString()} VIEWERS
            </span>
          </div>
        </div>

        <button
          onClick={handleToggleFavorite}
          className={`shrink-0 rounded-full p-2.5 transition-all duration-300 active:scale-90 ${
            favorite
              ? 'text-amber-400 bg-amber-400/10 border border-amber-400/20'
              : 'text-slate-600 hover:text-slate-300 hover:bg-white/5 border border-transparent'
          }`}
        >
          <span className="material-icons text-xl">{favorite ? 'star' : 'star_border'}</span>
        </button>
      </div>
    </div>
  );
}
