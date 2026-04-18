'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Hls from 'hls.js';
import { buildStreamProxyUrl } from '@/services/stream-service';

type Props = {
  streamUrl: string;
  channelId: string;
  poster?: string;
};

export default function HeroVideo({ streamUrl, channelId, poster }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const router = useRouter();
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;
    const video = videoRef.current;
    if (!video) return;

    const initStream = async () => {
      try {
        const proxiedSrc = await buildStreamProxyUrl(streamUrl);
        if (!active) return;

        if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = proxiedSrc;
          video.play().catch(() => setHasError(true));
        } else if (Hls.isSupported()) {
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 10,
          });
          hlsRef.current = hls;
          hls.loadSource(proxiedSrc);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            if (active) video.play().catch(() => setHasError(true));
          });
          hls.on(Hls.Events.ERROR, (_evt, data) => {
            if (data.fatal) setHasError(true);
          });
        }
      } catch {
        if (active) setHasError(true);
      }
    };

    initStream();

    return () => {
      active = false;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [streamUrl]);

  return (
    <div
      className="absolute inset-0 cursor-pointer overflow-hidden bg-slate-950 group"
      onClick={() => router.push(`/channel/${encodeURIComponent(channelId)}`)}
    >
      {!hasError && (
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover opacity-60 mix-blend-screen scale-105 group-hover:scale-100 transition-transform duration-[10s] ease-out"
          muted
          autoPlay
          loop
          playsInline
          poster={poster}
        />
      )}
      {hasError && poster && (
        <img
          src={poster}
          alt="Channel Poster"
          className="absolute inset-0 h-full w-full object-cover opacity-30 blur-xl scale-110"
        />
      )}
      {/* Gradient Overlay to ensure text readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/40" />
      
      {/* Play Icon Overlay */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-24 w-24 rounded-full bg-cyan-500/20 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100 border border-cyan-400/30">
        <svg className="h-10 w-10 text-cyan-400 ml-1.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
      </div>
    </div>
  );
}
