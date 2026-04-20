'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { usePlayerShortcuts } from '@/hooks/use-player-shortcuts';
import { buildStreamProxyUrl } from '@/services/stream-service';
import { encodeBase64Url } from '@/lib/base64';
import type { Channel } from '@/types';

type Props = {
  channel?: Channel | null;
  url?: string | null;
  poster?: string;
  title?: string;
  subtitle?: string;
  streamUrl?: string;
  _shareUrl?: string;
  autoPlay?: boolean;
  className?: string;
  onNextChannel?: () => void;
  onPreviousChannel?: () => void;
};

type PlayerStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

type QualityLevel = {
  id: number;
  height: number;
  bitrate: number;
  name: string;
};

type SubtitleTrack = {
  id: number;
  name: string;
  lang: string;
};

export default function Player({
  channel,
  url,
  poster,
  title,
  subtitle,
  streamUrl,
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
  const [status, setStatus] = useState<PlayerStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [theaterMode, setTheaterMode] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // Unified Settings Menu
  const [showSettings, setShowSettings] = useState(false);
  const [settingsMenuLevel, setSettingsMenuLevel] = useState<'main' | 'quality' | 'captions'>(
    'main',
  );

  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState({ bitrate: 0, res: '0x0', buffer: 0, dropped: 0 });
  const [showEmbed, setShowEmbed] = useState(false);

  // Quality
  const [qualities, setQualities] = useState<QualityLevel[]>([]);
  const [currentQualityId, setCurrentQualityId] = useState<number>(-1);

  // Subtitles
  const [subtitles, setSubtitles] = useState<SubtitleTrack[]>([]);
  const [currentSubtitleId, setCurrentSubtitleId] = useState<number>(-1);

  // DVR & Time
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLiveSynced, setIsLiveSynced] = useState(true);

  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const savedVol = localStorage.getItem('player-volume');
    const savedMuted = localStorage.getItem('player-muted');
    if (savedVol !== null) setVolume(parseFloat(savedVol));
    if (savedMuted === 'true') setMuted(true);
  }, []);

  useEffect(() => {
    localStorage.setItem('player-volume', volume.toString());
    localStorage.setItem('player-muted', muted.toString());
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = muted;
    }
  }, [volume, muted]);

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
    controlsTimeoutRef.current = setTimeout(() => {
      if (status === 'playing' && !showSettings) {
        setShowControls(false);
      }
    }, 3000);
  }, [status, showSettings]);

  const destroyHls = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    setQualities([]);
    setCurrentQualityId(-1);
    setSubtitles([]);
    setCurrentSubtitleId(-1);
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
          backBufferLength: 30,
          capLevelToPlayerSize: true,
          abrBandWidthFactor: 0.8,
          abrBandWidthUpFactor: 0.6,
          maxBufferLength: 10,
          maxMaxBufferLength: 20,
          maxBufferSize: 15 * 1000 * 1000, // 15MB buffer max for low connections
          maxBufferHole: 0.5,
          startLevel: -1,
          autoStartLoad: true,
          liveSyncDurationCount: 3,
          liveMaxLatencyDurationCount: 10,
        });
        hlsRef.current = hls;
        hls.loadSource(proxiedSrc);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          const mappedQualities = hls.levels.map((level, id) => ({
            id,
            height: level.height,
            bitrate: level.bitrate,
            name: `${level.height}p${level.frameRate ? Math.round(level.frameRate) : ''}`,
          }));
          setQualities(mappedQualities.sort((a, b) => b.height - a.height));

          if (hls.subtitleTracks.length > 0) {
            const mappedSubs = hls.subtitleTracks.map((st, id) => ({
              id,
              name: st.name || `Track ${id + 1}`,
              lang: st.lang || 'Unknown',
            }));
            setSubtitles(mappedSubs);
          }

          if (autoPlay) video.play().catch(() => {});
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, (_evt, data) => {
          setCurrentQualityId(hls.autoLevelEnabled ? -1 : data.level);
        });

        hls.on(Hls.Events.SUBTITLE_TRACK_SWITCH, (_evt, data) => {
          setCurrentSubtitleId(data.id);
        });

        hls.on(Hls.Events.ERROR, (_evt, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                tryNextSource('Primary stream failed.');
                break;
            }
          }
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
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));

    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      // DVR live sync detection
      if (hlsRef.current && hlsRef.current.liveSyncPosition) {
        const diff = Math.abs(hlsRef.current.liveSyncPosition - video.currentTime);
        setIsLiveSynced(diff < 5); // Within 5 seconds is considered "live"
      } else {
        const diff = Math.abs(video.duration - video.currentTime);
        setIsLiveSynced(diff < 5 || isNaN(diff));
      }
    };
    const onDurationChange = () => setDuration(video.duration);

    video.addEventListener('playing', onPlaying);
    video.addEventListener('pause', onPause);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('volumechange', onVolumeChange);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('durationchange', onDurationChange);
    document.addEventListener('fullscreenchange', onFullscreenChange);

    const statsInterval = setInterval(updateStats, 2000);

    return () => {
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('volumechange', onVolumeChange);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('durationchange', onDurationChange);
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
    try {
      if (document.fullscreenElement) await document.exitFullscreen?.();
      else await el.requestFullscreen?.();
    } catch {}
  }, []);

  const togglePiP = useCallback(async () => {
    const video = videoRef.current as any;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await video.requestPictureInPicture();
    } catch {}
  }, []);

  const changeQuality = (id: number) => {
    if (!hlsRef.current) return;
    hlsRef.current.currentLevel = id;
    setCurrentQualityId(id);
    setShowSettings(false);
  };

  const changeSubtitle = (id: number) => {
    if (!hlsRef.current) return;
    hlsRef.current.subtitleTrack = id;
    setCurrentSubtitleId(id);
    setShowSettings(false);
  };

  const syncToLive = () => {
    if (hlsRef.current && hlsRef.current.liveSyncPosition) {
      if (videoRef.current) videoRef.current.currentTime = hlsRef.current.liveSyncPosition;
    } else if (videoRef.current && !isNaN(videoRef.current.duration)) {
      videoRef.current.currentTime = videoRef.current.duration;
    }
    setIsLiveSynced(true);
  };

  const onSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Number(e.target.value);
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  useEffect(() => {
    const hideSettings = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.settings-menu-container')) {
        setShowSettings(false);
      }
    };
    if (showSettings) window.addEventListener('click', hideSettings);
    return () => window.removeEventListener('click', hideSettings);
  }, [showSettings]);

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

  const currentQualityName =
    currentQualityId === -1
      ? `Auto${hlsRef.current && hlsRef.current.levels[hlsRef.current.currentLevel] ? ` (${hlsRef.current.levels[hlsRef.current.currentLevel].height}p)` : ''}`
      : qualities.find((q) => q.id === currentQualityId)?.name || 'Auto';

  const currentSubtitleName =
    currentSubtitleId === -1
      ? 'Off'
      : subtitles.find((s) => s.id === currentSubtitleId)?.name || 'Off';

  return (
    <div
      ref={containerRef}
      onMouseMove={resetControlsTimer}
      onMouseEnter={resetControlsTimer}
      onMouseLeave={() => {
        if (!showSettings) setShowControls(false);
      }}
      onClick={(e) => {
        // Handle mobile tap to show/hide controls
        if (window.innerWidth < 1024) {
          const target = e.target as HTMLElement;
          // Don't toggle if clicking on a control button
          if (!target.closest('button') && !target.closest('input')) {
            setShowControls(!showControls);
            if (!showControls) resetControlsTimer();
          }
        }
      }}
      onDoubleClick={() => void toggleFullscreen()}
      className={`group relative overflow-hidden bg-black transition-all duration-500 transform-gpu 
        ${!showControls && status === 'playing' ? 'cursor-none' : 'cursor-default'}
        ${isFullscreen ? 'fixed inset-0 z-[9999] h-screen w-screen !border-none !rounded-none !p-0 !m-0' : theaterMode ? 'rounded-none h-[60vh] sm:h-[70vh]' : 'rounded-[24px] sm:rounded-[40px] border border-white/[0.08] shadow-2xl shadow-black/50 h-[240px] sm:h-[500px] lg:h-[640px]'} 
        ${className || ''}`}
    >
      <video
        ref={videoRef}
        className="h-full w-full object-contain bg-black"
        poster={poster}
        playsInline
      />

      {/* Main UI Overlay */}
      <div
        className="absolute inset-0 z-20"
        onClick={(e) => {
          // Handle mobile tap to show/hide controls
          if (window.innerWidth < 1024) {
            const target = e.target as HTMLElement;
            // Don't toggle if clicking on a control button or settings menu
            if (
              !target.closest('button') &&
              !target.closest('input') &&
              !target.closest('.settings-menu-container')
            ) {
              setShowControls(!showControls);
              if (!showControls) resetControlsTimer();
            }
          }
        }}
      >
        {/* Top Header */}
        <div
          className={`absolute top-0 left-0 right-0 p-4 sm:p-8 transition-all duration-500 transform-gpu ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 mb-1">
                <div className="truncate text-base sm:text-2xl font-black text-white tracking-tighter drop-shadow-2xl uppercase italic">
                  {displayTitle || 'No Source'}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    syncToLive();
                  }}
                  className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[8px] sm:text-[9px] font-black shadow-xl transition-all shrink-0 ${
                    isLiveSynced
                      ? 'bg-red-600 text-white shadow-red-950/50 pointer-events-none'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700 cursor-pointer border border-white/10'
                  }`}
                >
                  <span
                    className={`h-1 w-1 rounded-full ${isLiveSynced ? 'bg-white animate-pulse' : 'bg-slate-500'}`}
                  />
                  LIVE
                </button>
              </div>
              {displaySubtitle && (
                <div className="truncate text-[8px] sm:text-[10px] font-black text-slate-400 drop-shadow-md tracking-widest uppercase opacity-80 italic">
                  {displaySubtitle}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Controls */}
        <div
          className={`absolute bottom-0 left-0 right-0 p-4 sm:p-8 transition-all duration-500 transform-gpu ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
        >
          <div className="flex flex-col gap-3 sm:gap-4">
            {/* DVR Timeline */}
            {!isNaN(duration) && duration > 0 && (
              <div className="w-full flex items-center gap-3 text-[9px] sm:text-[10px] font-mono text-white font-bold px-1 group/timeline">
                <span>{formatTime(currentTime)}</span>
                <div className="flex-1 relative h-1 sm:h-1.5 group/track">
                  <div className="absolute inset-0 bg-white/20 rounded-full" />
                  <div
                    className="absolute inset-y-0 left-0 bg-red-600 rounded-full"
                    style={{ width: `${(currentTime / duration) * 100}%` }}
                  />
                  <input
                    type="range"
                    min="0"
                    max={duration}
                    value={currentTime}
                    onChange={onSeek}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div
                    className="absolute h-3 w-3 sm:h-4 sm:w-4 bg-white rounded-full border-2 border-red-600 -mt-1 sm:-mt-1.5 shadow-xl transition-transform group-hover/track:scale-110 pointer-events-none"
                    style={{ left: `calc(${(currentTime / duration) * 100}% - 6px)` }}
                  />
                </div>
                <span>{formatTime(duration)}</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-0.5 sm:gap-2">
                <IconButton onClick={togglePlay} className="h-8 w-8 sm:h-11 sm:w-11">
                  <span className="material-icons text-lg sm:text-2xl">
                    {status === 'playing' ? 'pause' : 'play_arrow'}
                  </span>
                </IconButton>

                <IconButton onClick={onPreviousChannel} className="h-8 w-8 sm:h-11 sm:w-11">
                  <span className="material-icons text-lg sm:text-2xl">skip_previous</span>
                </IconButton>
                <IconButton onClick={onNextChannel} className="h-8 w-8 sm:h-11 sm:w-11">
                  <span className="material-icons text-lg sm:text-2xl">skip_next</span>
                </IconButton>

                {/* Volume Hover Control */}
                <div className="hidden sm:flex items-center group/volume hover:bg-white/10 rounded-full transition-all overflow-hidden h-11 ml-2">
                  <button
                    onClick={toggleMute}
                    className="h-11 w-11 flex items-center justify-center text-white shrink-0 hover:scale-110 transition-transform"
                  >
                    <span className="material-icons text-xl">
                      {muted || volume === 0
                        ? 'volume_off'
                        : volume < 0.5
                          ? 'volume_down'
                          : 'volume_up'}
                    </span>
                  </button>
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
                    className="w-0 opacity-0 group-hover/volume:w-20 group-hover/volume:opacity-100 group-hover/volume:mr-3 transition-all duration-300 accent-white cursor-pointer h-1"
                  />
                </div>

                {/* Mobile Volume Toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMute();
                  }}
                  className="sm:hidden h-8 w-8 flex items-center justify-center text-white active:scale-90 transition-transform"
                >
                  <span className="material-icons text-lg">
                    {muted || volume === 0 ? 'volume_off' : 'volume_up'}
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-0.5 sm:gap-2">
                <div className="settings-menu-container">
                  <IconButton
                    onClick={(e) => {
                      e?.stopPropagation();
                      setSettingsMenuLevel('main');
                      setShowSettings(!showSettings);
                    }}
                    active={showSettings}
                    className="h-8 w-8 sm:h-11 sm:w-11"
                  >
                    <span
                      className={`material-icons text-base sm:text-xl transition-transform duration-500 ${showSettings ? 'rotate-90' : ''}`}
                    >
                      settings
                    </span>
                  </IconButton>
                </div>

                <IconButton onClick={() => void togglePiP()} className="hidden sm:flex h-11 w-11">
                  <span className="material-icons text-xl">picture_in_picture_alt</span>
                </IconButton>
                <IconButton
                  onClick={() => setTheaterMode(!theaterMode)}
                  active={theaterMode}
                  className="hidden sm:flex h-11 w-11"
                >
                  <span className="material-icons text-xl">width_normal</span>
                </IconButton>
                <IconButton
                  onClick={() => void toggleFullscreen()}
                  className="h-8 w-8 sm:h-11 sm:w-11"
                >
                  <span className="material-icons text-lg sm:text-xl">
                    {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
                  </span>
                </IconButton>
              </div>
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
  className = '',
}: {
  children: React.ReactNode;
  onClick?: (e?: React.MouseEvent) => void;
  active?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      className={`h-11 w-11 rounded-full flex items-center justify-center transition-all duration-300 active:scale-90 ${active ? 'bg-cyan-500 text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.4)]' : 'text-white hover:bg-white/10'} ${className}`}
    >
      {children}
    </button>
  );
}

function SettingsButton({
  onClick,
  icon,
  label,
  value,
}: {
  onClick: (e: React.MouseEvent) => void;
  icon: string;
  label: string;
  value?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all text-slate-200 hover:text-white"
    >
      <div className="flex items-center gap-3">
        <span className="material-icons text-[18px] opacity-70">{icon}</span>
        <span className="text-xs font-semibold">{label}</span>
      </div>
      {value !== undefined && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 font-medium">{value}</span>
          <span className="material-icons text-sm opacity-50">chevron_right</span>
        </div>
      )}
    </button>
  );
}

function SettingsOption({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: (e: React.MouseEvent) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-xs font-medium ${active ? 'text-white bg-white/10' : 'text-slate-300 hover:bg-white/5'}`}
    >
      <span className={`material-icons text-sm ${active ? 'opacity-100' : 'opacity-0'}`}>
        check
      </span>
      <span>{label}</span>
    </button>
  );
}
