'use client';

import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { usePlayerShortcuts } from '@/hooks/use-player-shortcuts';

type Props = {
  url?: string | null;
  poster?: string;
  title?: string;
  subtitle?: string;
  streamUrl?: string;
  shareUrl?: string;
  controls?: boolean;
  autoPlay?: boolean;
  className?: string;
  onNextChannel?: () => void;
  onPreviousChannel?: () => void;
};

export default function Player({
  url,
  poster,
  title,
  subtitle,
  streamUrl,
  shareUrl,
  controls = true,
  autoPlay = false,
  className,
  onNextChannel,
  onPreviousChannel,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPictureInPicture, setIsPictureInPicture] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [copiedLabel, setCopiedLabel] = useState<'stream' | 'share' | null>(null);

  function toggleMute() {
    if (!videoRef.current) return;
    const nextMuted = !videoRef.current.muted;
    videoRef.current.muted = nextMuted;
    setMuted(nextMuted);
  }

  async function toggleFullscreen() {
    if (!videoRef.current) return;
    if (document.fullscreenElement !== videoRef.current) {
      await videoRef.current.requestFullscreen?.();
    } else {
      await document.exitFullscreen?.();
    }
  }

  async function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      await video.play().catch(() => {});
    } else {
      video.pause();
    }
  }

  async function togglePictureInPicture() {
    const video = videoRef.current as (HTMLVideoElement & { requestPictureInPicture?: () => Promise<unknown> }) | null;
    if (!video || typeof document === 'undefined') return;

    try {
      if ((document as Document & { pictureInPictureElement?: Element | null }).pictureInPictureElement) {
        await (document as Document & { exitPictureInPicture?: () => Promise<void> }).exitPictureInPicture?.();
      } else {
        await video.requestPictureInPicture?.();
      }
    } catch {
      // Ignore unsupported PiP transitions.
    }
  }

  async function copyValue(kind: 'stream' | 'share') {
    const value = kind === 'stream' ? streamUrl : shareUrl;
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopiedLabel(kind);
  }

  usePlayerShortcuts({
    onToggleMute: toggleMute,
    onToggleFullscreen: toggleFullscreen,
    onTogglePlay: togglePlay,
    onNextChannel,
    onPreviousChannel,
    onTogglePictureInPicture: togglePictureInPicture,
  });

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!url) {
      video.pause();
      video.src = '';
      return;
    }

    setIsPlaying(false);

    let hls: Hls | null = null;

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
      if (autoPlay) video.play().catch(() => {});
      return;
    }

    if (Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (autoPlay) video.play().catch(() => {});
      });
    } else {
      video.src = url;
      if (autoPlay) video.play().catch(() => {});
    }

    return () => {
      if (hls) hls.destroy();
    };
  }, [url, autoPlay]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const syncState = () => {
      setMuted(video.muted);
      setVolume(video.volume);
      setIsPlaying(!video.paused);
    };

    const onFullscreenChange = () => setIsFullscreen(document.fullscreenElement === video);
    const onEnterPictureInPicture = () => setIsPictureInPicture(true);
    const onLeavePictureInPicture = () => setIsPictureInPicture(false);

    syncState();
    video.addEventListener('play', syncState);
    video.addEventListener('pause', syncState);
    video.addEventListener('volumechange', syncState);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    video.addEventListener('enterpictureinpicture', onEnterPictureInPicture as EventListener);
    video.addEventListener('leavepictureinpicture', onLeavePictureInPicture as EventListener);

    return () => {
      video.removeEventListener('play', syncState);
      video.removeEventListener('pause', syncState);
      video.removeEventListener('volumechange', syncState);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      video.removeEventListener('enterpictureinpicture', onEnterPictureInPicture as EventListener);
      video.removeEventListener('leavepictureinpicture', onLeavePictureInPicture as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!copiedLabel) return;
    const timer = window.setTimeout(() => setCopiedLabel(null), 1800);
    return () => window.clearTimeout(timer);
  }, [copiedLabel]);

  return (
    <div className={`overflow-hidden rounded-[32px] border border-white/10 bg-black shadow-2xl shadow-black/30 animate-fade-up ${className || ''}`}>
      <div className="flex items-center justify-between gap-4 border-b border-white/10 bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/60 px-5 py-4">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-cyan-300">Live Player</div>
          <div className="mt-1 text-lg font-semibold text-white">{title || 'Select a channel'}</div>
          <div className="text-sm text-slate-400">{subtitle || 'HLS.js with native fallback'}</div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
          <button className="rounded-full bg-white/10 px-3 py-2" onClick={() => void togglePlay()} type="button">
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button className="rounded-full bg-white/10 px-3 py-2" onClick={toggleMute} type="button">
            {muted ? 'Unmute' : 'Mute'}
          </button>
          <button className="rounded-full bg-white/10 px-3 py-2" onClick={() => void togglePictureInPicture()} type="button">
            {isPictureInPicture ? 'Exit PiP' : 'PiP'}
          </button>
          <button className="rounded-full bg-white/10 px-3 py-2" onClick={() => void toggleFullscreen()} type="button">
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </button>
        </div>
      </div>
      <video
        ref={videoRef}
        className="h-[360px] w-full bg-black object-cover transition-all duration-500 lg:h-[520px]"
        controls={controls}
        poster={poster}
      />
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 bg-slate-950/90 px-5 py-4">
        <div className="flex items-center gap-3">
          <button className="rounded-full bg-white/10 px-3 py-2 text-sm text-slate-200" onClick={onPreviousChannel} type="button">
            Prev
          </button>
          <button className="rounded-full bg-white/10 px-3 py-2 text-sm text-slate-200" onClick={onNextChannel} type="button">
            Next
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-3 text-sm text-slate-300">
            <span>Volume</span>
            <input
              className="accent-cyan-400"
              max="1"
              min="0"
              onChange={(event) => {
                const nextVolume = Number(event.target.value);
                if (!videoRef.current) return;
                videoRef.current.volume = nextVolume;
                if (nextVolume > 0 && videoRef.current.muted) {
                  videoRef.current.muted = false;
                }
                setVolume(nextVolume);
                setMuted(videoRef.current.muted);
              }}
              step="0.05"
              type="range"
              value={volume}
            />
          </label>
          <button
            className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200"
            onClick={() => void copyValue('share')}
            type="button"
          >
            {copiedLabel === 'share' ? 'Link copied' : 'Copy link'}
          </button>
          <button
            className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200"
            onClick={() => void copyValue('stream')}
            type="button"
          >
            {copiedLabel === 'stream' ? 'Stream copied' : 'Copy stream'}
          </button>
        </div>
      </div>
    </div>
  );
}
