'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { usePlayerShortcuts } from '@/hooks/use-player-shortcuts';
import { buildStreamProxyUrl, isLikelyHlsManifest } from '@/services/stream-service';
import type { Channel } from '@/types';

type Props = {
  channel?: Channel | null;
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

type PlayerStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

export default function Player({
  channel,
  url,
  poster,
  title,
  subtitle,
  streamUrl,
  shareUrl,
  autoPlay = false,
  className,
  onNextChannel,
  onPreviousChannel,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPiP, setIsPiP] = useState(false);
  const [status, setStatus] = useState<PlayerStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedLabel, setCopiedLabel] = useState<'stream' | 'share' | null>(null);
  const [theaterMode, setTheaterMode] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [sleepTimer, setSleepTimer] = useState<number | null>(null);
  const [sleepCountdown, setSleepCountdown] = useState<number | null>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sourceCandidates = useMemo(() => {
    return Array.from(
      new Set(
        [channel?.streamUrl, ...(channel?.fallbackUrls || []), url, streamUrl]
          .filter((value): value is string => Boolean(value && value.trim()))
          .map((value) => value.trim()),
      ),
    );
  }, [channel?.fallbackUrls, channel?.streamUrl, streamUrl, url]);

  const [sourceIndex, setSourceIndex] = useState(0);
  const activeUrl = sourceCandidates[sourceIndex] || null;

  useEffect(() => {
    setSourceIndex(0);
  }, [sourceCandidates]);

  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  const destroyHls = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  }, []);

  const clearLoadTimeout = useCallback(() => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
  }, []);

  const tryNextSource = useCallback((message = 'Trying backup stream...') => {
    let advanced = false;

    setSourceIndex((current) => {
      if (current < sourceCandidates.length - 1) {
        advanced = true;
        return current + 1;
      }
      return current;
    });

    destroyHls();
    clearLoadTimeout();

    if (advanced) {
      setStatus('loading');
      setErrorMsg(message);
      return true;
    }

    setStatus('error');
    setErrorMsg('Could not resolve any streams for this channel.');
    return false;
  }, [clearLoadTimeout, destroyHls, sourceCandidates.length]);

  const isLikelyHlsUrl = useCallback((value: string) => /\.m3u8($|[?#])/i.test(value), []);

  const loadStream = useCallback(async (src: string, originalUrl: string) => {
    const video = videoRef.current;
    if (!video) return;

    // Await the proxy URL generation
    const proxiedSrc = await buildStreamProxyUrl(src);

    destroyHls();
    clearLoadTimeout();
    setStatus('loading');
    setErrorMsg('');

    loadTimeoutRef.current = setTimeout(() => {
      tryNextSource('Stream load timed out. Trying backup stream...');
    }, 12000);

    let isHls = isLikelyHlsUrl(originalUrl);
    if (!isHls) {
      try {
        const headRes = await fetch(proxiedSrc, { method: 'HEAD' });
        const cType = headRes.headers.get('content-type') || '';
        isHls = cType.toLowerCase().includes('mpegurl') || cType.toLowerCase().includes('m3u8');
      } catch (e) {
        // Ignore HEAD error and fall back
      }
    }

    if (video.canPlayType('application/vnd.apple.mpegurl') && isHls) {
      video.src = proxiedSrc;
      video.load();
      if (autoPlay) video.play().catch(() => {});
      return;
    }

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
      });
      hlsRef.current = hls;
      hls.loadSource(proxiedSrc);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (autoPlay) video.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (data.fatal) {
          tryNextSource('Primary stream failed. Trying backup stream...');
        }
      });
    } else {
      video.src = proxiedSrc;
      video.load();
      if (autoPlay) video.play().catch(() => {});
    }
  }, [autoPlay, clearLoadTimeout, destroyHls, isLikelyHlsUrl, tryNextSource]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!activeUrl) {
      destroyHls();
      clearLoadTimeout();
      video.src = '';
      setStatus('idle');
      return;
    }
    loadStream(activeUrl, activeUrl);
    return () => {
      clearLoadTimeout();
      destroyHls();
    };
  }, [activeUrl, clearLoadTimeout, loadStream, destroyHls]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => { clearLoadTimeout(); setStatus('playing'); };
    const onPlaying = () => { clearLoadTimeout(); setStatus('playing'); };
    const onCanPlay = () => { clearLoadTimeout(); setStatus(video.paused ? 'paused' : 'playing'); };
    const onPause = () => setStatus('paused');
    const onWaiting = () => setStatus('loading');
    const onLoadedMetadata = () => clearLoadTimeout();
    const onError = () => {
      if (!tryNextSource('Playback failed. Trying backup stream...')) {
        setStatus('error');
      }
    };
    const onVolumeChange = () => { setMuted(video.muted); setVolume(video.volume); };
    const onFullscreenChange = () => setIsFullscreen(document.fullscreenElement === video || document.fullscreenElement === containerRef.current);
    const onEnterPiP = () => setIsPiP(true);
    const onLeavePiP = () => setIsPiP(false);

    video.addEventListener('play', onPlay);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('error', onError);
    video.addEventListener('volumechange', onVolumeChange);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    video.addEventListener('enterpictureinpicture', onEnterPiP as EventListener);
    video.addEventListener('leavepictureinpicture', onLeavePiP as EventListener);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('error', onError);
      video.removeEventListener('volumechange', onVolumeChange);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      video.removeEventListener('enterpictureinpicture', onEnterPiP as EventListener);
      video.removeEventListener('leavepictureinpicture', onLeavePiP as EventListener);
    };
  }, [clearLoadTimeout, tryNextSource]);

  useEffect(() => {
    if (!sleepTimer) { setSleepCountdown(null); return; }
    const endTime = Date.now() + sleepTimer * 60 * 1000;
    const interval = setInterval(() => {
      const remaining = Math.ceil((endTime - Date.now()) / 1000);
      if (remaining <= 0) {
        videoRef.current?.pause();
        setSleepTimer(null);
        setSleepCountdown(null);
        clearInterval(interval);
      } else {
        setSleepCountdown(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [sleepTimer]);

  useEffect(() => {
    if (!copiedLabel) return;
    const t = setTimeout(() => setCopiedLabel(null), 1800);
    return () => clearTimeout(t);
  }, [copiedLabel]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.paused ? video.play().catch(() => {}) : video.pause();
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen?.();
    } else {
      await el.requestFullscreen?.();
    }
  }, []);

  const togglePiP = useCallback(async () => {
    const video = videoRef.current as HTMLVideoElement & { requestPictureInPicture?: () => Promise<void> };
    if (!video) return;
    try {
      if ((document as Document & { pictureInPictureElement?: Element }).pictureInPictureElement) {
        await (document as Document & { exitPictureInPicture?: () => Promise<void> }).exitPictureInPicture?.();
      } else {
        await video.requestPictureInPicture?.();
      }
    } catch {}
  }, []);

  const takeScreenshot = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `${title || 'screenshot'}.png`;
    link.click();
  }, [title]);

  const copyValue = useCallback(async (kind: 'stream' | 'share') => {
    const value = kind === 'stream' ? (activeUrl || streamUrl) : shareUrl;
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopiedLabel(kind);
  }, [activeUrl, streamUrl, shareUrl]);

  usePlayerShortcuts({
    onToggleMute: toggleMute,
    onToggleFullscreen: () => void toggleFullscreen(),
    onTogglePlay: togglePlay,
    onNextChannel,
    onPreviousChannel,
    onTogglePictureInPicture: () => void togglePiP(),
    onScreenshot: takeScreenshot,
    onToggleTheater: () => setTheaterMode((v) => !v),
  });

  const videoHeight = theaterMode
    ? 'aspect-video w-full'
    : isFullscreen
    ? 'h-screen w-screen'
    : 'h-[300px] sm:h-[460px] lg:h-[560px] w-full';

  const displayTitle = channel?.name || title;
  const displaySubtitle = channel
    ? [channel.country, channel.category, channel.language].filter(Boolean).join(' · ')
    : subtitle;

  return (
    <div
      ref={containerRef}
      onMouseMove={resetControlsTimer}
      onMouseEnter={resetControlsTimer}
      onMouseLeave={() => setShowControls(false)}
      onDoubleClick={() => void toggleFullscreen()}
      className={`group relative overflow-hidden bg-black ${theaterMode ? 'rounded-none' : 'rounded-[28px] border border-white/[0.08] shadow-2xl shadow-black/50'} ${className || ''} ${videoHeight}`}
    >
      <video
        ref={videoRef}
        className="h-full w-full object-contain"
        poster={poster}
        playsInline
      />

      {status === 'idle' && !activeUrl && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/80">
          <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center">
            <svg className="h-8 w-8 text-slate-600" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </div>
          <p className="text-sm text-slate-500">Select a channel to start watching</p>
        </div>
      )}
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 pointer-events-none">
          <div className="h-12 w-12 rounded-full border-[3px] border-cyan-400/30 border-t-cyan-400 animate-spin shadow-lg shadow-cyan-500/20" />
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/90 z-20">
          <div className="h-14 w-14 rounded-full bg-red-500/10 flex items-center justify-center">
            <svg className="h-7 w-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
          </div>
          <p className="text-sm font-medium text-red-300">{errorMsg}</p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSourceIndex(0);
              setStatus('loading');
              setErrorMsg('');
            }}
            className="rounded-full bg-white/10 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/20 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Scrim Overlays */}
      <div className={`absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/80 pointer-events-none transition-opacity duration-300 ${showControls || status !== 'playing' ? 'opacity-100' : 'opacity-0'}`} />

      {/* Controls Container */}
      <div className={`absolute inset-0 flex flex-col justify-between p-4 transition-opacity duration-300 ${showControls || status !== 'playing' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        
        {/* Top Bar */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              {status === 'playing' && (
                <span className="flex items-center gap-1.5 rounded-full bg-red-500/80 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-bold text-white shadow-lg">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                  LIVE
                </span>
              )}
            </div>
            <div className="truncate text-base md:text-lg font-bold text-white drop-shadow-md">{displayTitle || 'Select a channel'}</div>
            {displaySubtitle && <div className="truncate text-xs md:text-sm font-medium text-slate-300 drop-shadow-md">{displaySubtitle}</div>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); void copyValue('share'); }}
              className="flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20 transition-colors"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
              {copiedLabel === 'share' ? 'Copied!' : 'Share'}
            </button>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col gap-2">
          {/* Timeline Bar (Visual only for live streams) */}
          <div className="group/timeline flex cursor-pointer items-center h-4 relative">
            <div className="h-1 w-full bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-red-500 w-[98%]" />
            </div>
            <div className="absolute right-[2%] h-3 w-3 bg-red-500 rounded-full scale-0 group-hover/timeline:scale-100 transition-transform" />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 sm:gap-2">
              <IconButton onClick={(e) => { e.stopPropagation(); togglePlay(); }} title={status === 'playing' ? 'Pause (Space)' : 'Play (Space)'}>
                {status === 'playing' ? (
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                ) : (
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                )}
              </IconButton>
              
              <IconButton onClick={(e) => { e.stopPropagation(); onPreviousChannel?.(); }} title="Previous channel (←)">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"/></svg>
              </IconButton>
              <IconButton onClick={(e) => { e.stopPropagation(); onNextChannel?.(); }} title="Next channel (→)">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7"/></svg>
              </IconButton>

              <div className="flex items-center gap-2 ml-2 group/volume">
                <IconButton onClick={(e) => { e.stopPropagation(); toggleMute(); }} title={muted ? 'Unmute (M)' : 'Mute (M)'}>
                  {muted || volume === 0 ? (
                    <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/><path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"/></svg>
                  ) : volume < 0.5 ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072"/></svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M12 6v12m-3.536-9.536A5 5 0 008 12m0 0a5 5 0 00.464 2.536M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
                  )}
                </IconButton>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={muted ? 0 : volume}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (videoRef.current) {
                      videoRef.current.volume = v;
                      videoRef.current.muted = v === 0;
                    }
                  }}
                  className="w-0 sm:w-20 opacity-0 sm:opacity-100 group-hover/volume:w-20 group-hover/volume:opacity-100 transition-all duration-300 accent-white cursor-pointer"
                />
              </div>
              <div className="hidden sm:block text-xs font-medium text-white/90 ml-2">LIVE</div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              <select
                value={sleepTimer ?? ''}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setSleepTimer(e.target.value ? Number(e.target.value) : null)}
                className="hidden sm:block rounded-lg bg-black/40 backdrop-blur-md border border-white/20 px-2 py-1 text-xs font-medium text-white cursor-pointer outline-none hover:bg-white/20 transition-colors"
                title="Sleep timer"
              >
                <option value="">Off</option>
                <option value="15">15m</option>
                <option value="30">30m</option>
                <option value="60">1h</option>
              </select>

              <IconButton onClick={(e) => { e.stopPropagation(); void togglePiP(); }} title="Picture-in-Picture (P)" active={isPiP}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="2" y="4" width="20" height="16" rx="2"/><rect x="12" y="12" width="9" height="7" rx="1" fill="currentColor" stroke="none"/></svg>
              </IconButton>
              
              <IconButton onClick={(e) => { e.stopPropagation(); setTheaterMode((v) => !v); }} title="Theater mode (T)" active={theaterMode}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="2" y="7" width="20" height="14" rx="2"/><path strokeLinecap="round" d="M7 3h10"/></svg>
              </IconButton>

              <IconButton onClick={(e) => { e.stopPropagation(); void toggleFullscreen(); }} title="Fullscreen (F)" active={isFullscreen}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  {isFullscreen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9L4 4m0 0l5 0m-5 0l0 5m6 6l5 5m0 0l-5 0m5 0l0-5"/>
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 3h6m0 0v6m0-6l-7 7M9 21H3m0 0v-6m0 6l7-7"/>
                  )}
                </svg>
              </IconButton>
            </div>
          </div>
        </div>
      </div>

      {sleepCountdown !== null && sleepCountdown <= 60 && (
        <div className="absolute top-4 right-4 z-20 rounded-xl bg-black/70 px-3 py-2 text-xs font-bold text-amber-400 backdrop-blur-sm border border-amber-400/20">
          Sleep in {sleepCountdown}s
        </div>
      )}
    </div>
  );
}

function IconButton({
  children,
  onClick,
  title,
  active,
}: {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  title?: string;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`rounded-full p-2 transition-all duration-200 ${
        active ? 'bg-cyan-500/20 text-cyan-400' : 'text-white hover:bg-white/20'
      }`}
    >
      {children}
    </button>
  );
}
