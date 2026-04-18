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
import Image from 'next/image';

...
          {showPreview && !channel.isGeoBlocked ? (
            <div className="relative h-full w-full">
              <video ref={videoRef} className="h-full w-full object-cover scale-150" playsInline />
...
          ) : channel.logo && !imgError ? (
            <Image
              src={channel.logo}
              alt={channel.name}
              width={48}
              height={48}
              loading="lazy"
              onError={() => setImgError(true)}
              className="h-full w-full object-contain p-1 group-hover:scale-110 transition-transform duration-500"
            />
          ) : (
...
                <Image
                  src={`https://flagcdn.com/w20/${countryCode}.png`}
                  alt={channel.country}
                  width={20}
                  height={15}
                  className="h-3 w-4 rounded-sm object-cover shadow-sm"
                />
                ) : null}
                </div>
                </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-white truncate group-hover:text-cyan-400 transition-colors">
                {channel.name}
              </h3>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                {channel.category}
              </p>
            </div>
          </div>
        ) : channel.logo && !imgError ? (
          <Image
            src={channel.logo}
            alt={channel.name}
            width={200}
            height={200}
            loading="lazy"
            onError={() => setImgError(true)}
            className="h-full w-full object-contain p-4 group-hover:scale-105 transition-transform"
          />
            className="h-full w-full object-contain p-6 transition-transform duration-[800ms] group-hover:scale-110"
          />
        ) : (
...
                ) : countryCode ? (
                  <Image
                    src={`https://flagcdn.com/w20/${countryCode}.png`}
                    alt={channel.country}
                    width={20}
                    height={15}
                    className="h-2.5 w-3.5 rounded-[2px] object-cover shadow-sm opacity-60"
                  />
                ) : null}
...
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
