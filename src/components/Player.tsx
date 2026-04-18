'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { usePlayerShortcuts } from '@/hooks/use-player-shortcuts';
import { buildStreamProxyUrl } from '@/services/stream-service';
import type { Channel } from '@/types';

type Props = {
  channel?: Channel | null;
  url?: string | null;
  poster?: string;
  title?: string;
  subtitle?: string;
  streamUrl?: string;
  shareUrl?: string;
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
  const [theaterMode, setTheaterMode] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState({ bitrate: 0, res: '0x0', buffer: 0, dropped: 0 });
  const [showEmbed, setShowEmbed] = useState(false);
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
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

  const tryNextSource = useCallback(
    (message = 'Trying backup stream...') => {
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
    },
    [clearLoadTimeout, destroyHls, sourceCandidates.length],
  );

  const loadStream = useCallback(
    async (src: string, originalUrl: string) => {
      const video = videoRef.current;
      if (!video) return;
      const proxiedSrc = await buildStreamProxyUrl(src);
      destroyHls();
      clearLoadTimeout();
      setStatus('loading');
      setErrorMsg('');
      loadTimeoutRef.current = setTimeout(() => {
        tryNextSource('Stream load timed out.');
      }, 15000);

      const isHls = /\.m3u8($|[?#])/i.test(originalUrl);

      if (isHls && Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 60,
          capLevelToPlayerSize: true,
        });
        hlsRef.current = hls;
        hls.loadSource(proxiedSrc);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (autoPlay) video.play().catch(() => {});
        });
        hls.on(Hls.Events.ERROR, (_evt, data) => {
          if (data.fatal) tryNextSource('Primary stream failed.');
        });
      } else {
        video.src = proxiedSrc;
        video.load();
        if (autoPlay) video.play().catch(() => {});
      }
    },
    [autoPlay, clearLoadTimeout, destroyHls, tryNextSource],
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (channel?.isGeoBlocked) {
      setStatus('error');
      setErrorMsg('This content is GEO BLOCKED in your region.');
      return;
    }
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
  }, [activeUrl, clearLoadTimeout, loadStream, destroyHls, channel?.isGeoBlocked]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateStats = () => {
      if (hlsRef.current) {
        const level = hlsRef.current.levels[hlsRef.current.currentLevel];
        setStats({
          bitrate: Math.round((level?.bitrate || 0) / 1000),
          res: `${video.videoWidth}x${video.videoHeight}`,
          buffer: Math.round(
            video.buffered.length > 0 ? video.buffered.end(0) - video.currentTime : 0,
          ),
          dropped: (video as any).getVideoPlaybackQuality?.()?.droppedVideoFrames || 0,
        });
      }
    };

    const onPlaying = () => {
      clearLoadTimeout();
      setStatus('playing');
    };
    const onPause = () => setStatus('paused');
    const onWaiting = () => setStatus('loading');
    const onVolumeChange = () => {
      setMuted(video.muted);
      setVolume(video.volume);
    };
    const onFullscreenChange = () =>
      setIsFullscreen(
        document.fullscreenElement === video || document.fullscreenElement === containerRef.current,
      );

    video.addEventListener('playing', onPlaying);
    video.addEventListener('pause', onPause);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('volumechange', onVolumeChange);
    document.addEventListener('fullscreenchange', onFullscreenChange);

    const statsInterval = setInterval(updateStats, 2000);

    return () => {
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('volumechange', onVolumeChange);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      clearInterval(statsInterval);
    };
  }, [clearLoadTimeout]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.paused ? video.play().catch(() => {}) : video.pause();
  }, []);

  const toggleMute = useCallback(() => {
    if (videoRef.current) videoRef.current.muted = !videoRef.current.muted;
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) await document.exitFullscreen?.();
    else await el.requestFullscreen?.();
  }, []);

  const togglePiP = useCallback(async () => {
    const video = videoRef.current as any;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await video.requestPictureInPicture();
    } catch {}
  }, []);

  const openPopout = () => {
    if (!activeUrl) return;
    window.open(
      `/channel/${encodeURIComponent(channel?.id || '')}?popout=true`,
      'IPTVCloudPopout',
      'width=800,height=450',
    );
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  useEffect(() => {
    const hide = () => setShowContextMenu(false);
    window.addEventListener('click', hide);
    return () => window.removeEventListener('click', hide);
  }, []);

  usePlayerShortcuts({
    onToggleMute: toggleMute,
    onToggleFullscreen: () => void toggleFullscreen(),
    onTogglePlay: togglePlay,
    onNextChannel,
    onPreviousChannel,
    onTogglePictureInPicture: () => void togglePiP(),
    onToggleTheater: () => setTheaterMode((v) => !v),
  });

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
      onContextMenu={handleContextMenu}
      className={`group relative overflow-hidden bg-black transition-all duration-500 transform-gpu ${theaterMode ? 'rounded-none' : 'rounded-[40px] border border-white/[0.08] shadow-2xl shadow-black/50'} ${className || ''} ${theaterMode ? 'aspect-video w-full' : isFullscreen ? 'h-screen w-screen' : 'h-[300px] sm:h-[500px] lg:h-[640px] w-full'}`}
    >
      <video ref={videoRef} className="h-full w-full object-contain" poster={poster} playsInline />

      {/* Stats for Nerds Overlay */}
      {showStats && (
        <div className="absolute top-4 left-4 z-40 bg-black/80 backdrop-blur-xl border border-white/10 p-4 rounded-3xl text-[10px] font-mono text-cyan-400 space-y-1 shadow-2xl animate-fade-in">
          <div className="flex justify-between gap-8">
            <span>Bitrate:</span> <span>{stats.bitrate} kbps</span>
          </div>
          <div className="flex justify-between gap-8">
            <span>Resolution:</span> <span>{stats.res}</span>
          </div>
          <div className="flex justify-between gap-8">
            <span>Buffer Health:</span> <span>{stats.buffer}s</span>
          </div>
          <div className="flex justify-between gap-8">
            <span>Dropped Frames:</span> <span>{stats.dropped}</span>
          </div>
          <button
            onClick={() => setShowStats(false)}
            className="w-full mt-2 text-white/40 hover:text-white uppercase text-[8px] font-bold"
          >
            Close Stats
          </button>
        </div>
      )}

      {/* Embed Modal */}
      {showEmbed && (
        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-8 animate-fade-in">
          <div className="max-w-md w-full text-center space-y-6">
            <h3 className="text-xl font-bold text-white">Embed this stream</h3>
            <div className="bg-slate-900 border border-white/10 p-4 rounded-2xl text-[10px] font-mono text-slate-400 break-all select-all">
              {`<iframe src="${window.location.origin}/embed/${channel?.id}" width="100%" height="100%" frameborder="0" allowfullscreen></iframe>`}
            </div>
            <button
              onClick={() => setShowEmbed(false)}
              className="px-8 py-3 rounded-full bg-white/10 text-white font-bold text-xs hover:bg-white/20 transition-all"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {showContextMenu && (
        <div
          className="fixed z-[100] min-w-[180px] bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-1.5 shadow-2xl animate-fade-in transform-gpu"
          style={{ top: contextMenuPos.y, left: contextMenuPos.x }}
        >
          {[
            { label: 'Stats for nerds', icon: 'query_stats', onClick: () => setShowStats(true) },
            { label: 'Popout Player', icon: 'open_in_new', onClick: openPopout },
            { label: 'Embed Player', icon: 'code', onClick: () => setShowEmbed(true) },
            {
              label: 'Copy Stream URL',
              icon: 'link',
              onClick: () => void navigator.clipboard.writeText(activeUrl || ''),
            },
          ].map((item) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-xs text-slate-300 hover:text-white transition-all"
            >
              <span className="material-icons text-sm opacity-50">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}

      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none z-30">
          <div className="h-16 w-16 rounded-full border-[3px] border-cyan-400/20 border-t-cyan-400 animate-spin shadow-[0_0_30px_rgba(6,182,212,0.4)]" />
        </div>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950/90 z-40 px-6 text-center">
          <span className="material-icons text-5xl text-red-500 mb-2">error_outline</span>
          <p className="text-sm font-bold text-red-300 uppercase tracking-widest">{errorMsg}</p>
          <button
            onClick={() => {
              setSourceIndex(0);
              setStatus('loading');
            }}
            className="rounded-full bg-white/10 px-8 py-3 text-xs font-black text-white hover:bg-white/20 transition-all uppercase tracking-widest border border-white/10"
          >
            Try Again
          </button>
        </div>
      )}

      <div
        className={`absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90 pointer-events-none transition-opacity duration-500 z-10 ${showControls || status !== 'playing' ? 'opacity-100' : 'opacity-0'}`}
      />

      <div
        className={`absolute inset-0 flex flex-col justify-between p-6 sm:p-8 transition-all duration-500 z-20 ${showControls || status !== 'playing' ? 'opacity-100' : 'opacity-0 pointer-events-none translate-y-4'}`}
      >
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              {status === 'playing' && (
                <span className="flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 text-[9px] font-black text-white shadow-xl shadow-red-950/50">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                  LIVE
                </span>
              )}
              {captionsEnabled && (
                <span className="px-2 py-0.5 rounded-md border border-white/40 text-[8px] font-bold text-white/60">
                  CC
                </span>
              )}
            </div>
            <div className="truncate text-xl sm:text-2xl font-black text-white tracking-tighter drop-shadow-2xl uppercase">
              {displayTitle || 'No Source'}
            </div>
            {displaySubtitle && (
              <div className="truncate text-[10px] font-bold text-slate-400 drop-shadow-md tracking-widest uppercase mt-1 opacity-80">
                {displaySubtitle}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 sm:gap-3">
              <IconButton onClick={togglePlay} active={status === 'playing'}>
                <span className="material-icons text-2xl">
                  {status === 'playing' ? 'pause' : 'play_arrow'}
                </span>
              </IconButton>
              <IconButton onClick={onPreviousChannel}>
                <span className="material-icons text-2xl">skip_previous</span>
              </IconButton>
              <IconButton onClick={onNextChannel}>
                <span className="material-icons text-2xl">skip_next</span>
              </IconButton>

              <div className="flex items-center gap-3 ml-4 group/volume bg-white/5 rounded-full px-2 py-1 border border-white/5">
                <IconButton onClick={toggleMute}>
                  <span className="material-icons text-xl">
                    {muted || volume === 0
                      ? 'volume_off'
                      : volume < 0.5
                        ? 'volume_down'
                        : 'volume_up'}
                  </span>
                </IconButton>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={muted ? 0 : volume}
                  onChange={(e) => {
                    if (videoRef.current) {
                      videoRef.current.volume = Number(e.target.value);
                      videoRef.current.muted = Number(e.target.value) === 0;
                    }
                  }}
                  className="w-0 sm:w-20 opacity-0 group-hover/volume:w-20 group-hover/volume:opacity-100 transition-all duration-300 accent-white cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-3">
              <IconButton
                onClick={() => setCaptionsEnabled(!captionsEnabled)}
                active={captionsEnabled}
              >
                <span className="material-icons text-xl">closed_caption</span>
              </IconButton>
              <IconButton onClick={() => void togglePiP()}>
                <span className="material-icons text-xl">picture_in_picture_alt</span>
              </IconButton>
              <IconButton onClick={() => setTheaterMode(!theaterMode)} active={theaterMode}>
                <span className="material-icons text-xl">width_normal</span>
              </IconButton>
              <IconButton onClick={() => void toggleFullscreen()}>
                <span className="material-icons text-xl">
                  {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
                </span>
              </IconButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function IconButton({
  children,
  onClick,
  active,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={`h-11 w-11 rounded-full flex items-center justify-center transition-all duration-300 active:scale-90 ${active ? 'bg-cyan-500 text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.4)]' : 'text-white hover:bg-white/10'}`}
    >
      {children}
    </button>
  );
}
