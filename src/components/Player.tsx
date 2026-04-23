'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { usePlayerShortcuts } from '@/hooks/use-player-shortcuts';
import { buildStreamProxyUrl } from '@/services/stream-service';
import { usePlayerStore } from '@/store/player-store';
import { encodeBase64Url } from '@/lib/base64';
import type { Channel } from '@/types';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';

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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [status, setStatus] = useState<PlayerStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [showControls, setShowControls] = useState(true);

  const { theaterMode, setTheaterMode, ambientMode, setAmbientMode } = usePlayerStore();

  // Unified Settings Menu
  const [showSettings, setShowSettings] = useState(false);
  const [settingsMenuLevel, setSettingsMenuLevel] = useState<'main' | 'quality' | 'captions'>(
    'main',
  );

  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState({ bitrate: 0, res: '0x0', buffer: 0, dropped: 0 });

  // Quality
  const [qualities, setQualities] = useState<QualityLevel[]>([]);
  const [currentQualityId, setCurrentQualityId] = useState<number>(-1);

  // Subtitles
  const [subtitles, setSubtitles] = useState<SubtitleTrack[]>([]);
  const [currentSubtitleId, setCurrentSubtitleId] = useState<number>(-1);

  // DVR & Time
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLive, setIsLive] = useState(false);
  const [isLiveSynced, setIsLiveSynced] = useState(true);
  const [isSeeking, setIsSeeking] = useState(false);

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
    const list: Array<{ key: string; original: string }> = [];
    if (channel?.id && channel.streamUrl)
      list.push({ key: channel.id, original: channel.streamUrl });
    if (channel?.fallbackUrls) {
      channel.fallbackUrls.forEach((u) => {
        if (u) list.push({ key: u, original: u });
      });
    }
    if (channel?.streamUrl && !(channel?.fallbackUrls || []).includes(channel.streamUrl)) {
      list.push({ key: channel.streamUrl, original: channel.streamUrl });
    }
    if (url) list.push({ key: url, original: url });
    if (streamUrl) list.push({ key: streamUrl, original: streamUrl });
    const deduped = Array.from(new Map(list.map((c) => [c.original, c])).values());
    return deduped;
  }, [channel?.id, channel?.fallbackUrls, channel?.streamUrl, streamUrl, url]);

  const [sourceIndex, setSourceIndex] = useState(0);
  const activeCandidate = sourceCandidates[sourceIndex] || null;
  const activeKey = activeCandidate?.key || null;
  const activeOriginalUrl = activeCandidate?.original || null;

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
          maxBufferSize: 15 * 1000 * 1000,
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
    if (!activeCandidate) {
      destroyHls();
      clearLoadTimeout();
      video.src = '';
      setStatus('idle');
      return;
    }
    void loadStream(activeKey!, activeOriginalUrl!);
    return () => {
      clearLoadTimeout();
      destroyHls();
    };
  }, [
    activeCandidate,
    clearLoadTimeout,
    loadStream,
    destroyHls,
    channel?.isGeoBlocked,
    activeKey,
    activeOriginalUrl,
  ]);

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
      if (isSeeking) return;
      setCurrentTime(video.currentTime);
      if (isLive) {
        const livePosition = hlsRef.current?.liveSyncPosition;
        if (livePosition) {
          const diff = Math.abs(livePosition - video.currentTime);
          setIsLiveSynced(diff < 5);
        } else {
          setIsLiveSynced(true);
        }
      } else {
        setIsLiveSynced(false);
      }
    };
    const onDurationChange = () => {
      const newDuration = video.duration;
      setDuration(newDuration);
      setIsLive(newDuration === Infinity);
    };

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
  }, [clearLoadTimeout, isLive, isSeeking]);

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
    const video = videoRef.current;
    if (!video) return;
    if (hlsRef.current && hlsRef.current.liveSyncPosition) {
      video.currentTime = hlsRef.current.liveSyncPosition;
    } else if (duration !== Infinity) {
      video.currentTime = duration;
    }
    setIsLiveSynced(true);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds === Infinity) return '0:00';
    const isNegative = seconds < 0;
    if (isNegative) seconds = -seconds;
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const formatted = `${m}:${s < 10 ? '0' : ''}${s}`;
    return isNegative ? `-${formatted}` : formatted;
  };

  const displayedTime =
    isLive && !isLiveSynced
      ? formatTime(currentTime - (hlsRef.current?.liveSyncPosition ?? duration))
      : formatTime(currentTime);

  const displayedDuration = isLive ? 'LIVE' : formatTime(duration);

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
    onToggleTheater: () => setTheaterMode(!theaterMode),
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
      className={`group relative overflow-hidden bg-black transition-all duration-500 transform-gpu glass
        ${!showControls && status === 'playing' ? 'cursor-none' : 'cursor-default'}
        ${isFullscreen ? 'fixed inset-0 z-[9999] h-screen w-screen !border-none !rounded-none !p-0 !m-0' : theaterMode ? 'rounded-none h-[60vh] sm:h-[80vh]' : 'rounded-[24px] sm:rounded-[40px] border border-white/[0.08] shadow-2xl h-[240px] sm:h-[500px] lg:h-[640px]'} 
        ${className || ''}`}
    >
      {/* Ambient Mode Backdrop */}
      {ambientMode && status === 'playing' && (
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-40">
          <video
            src={videoRef.current?.src}
            className="h-full w-full object-cover blur-[120px] scale-150"
            muted
            autoPlay
            loop
            playsInline
          />
        </div>
      )}

      <video
        ref={videoRef}
        className="h-full w-full object-contain bg-transparent relative z-10"
        poster={poster}
        playsInline
      />

      {/* Settings Menu Overlay */}
      {showSettings && (
        <div className="absolute bottom-20 right-4 sm:right-8 w-64 glass rounded-[24px] z-50 p-2 animate-fade-in shadow-2xl shadow-black/80 settings-menu-container">
          {settingsMenuLevel === 'main' && (
            <div className="space-y-1">
              <div className="px-4 py-2 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 mb-1">
                Player Control
              </div>
              <SettingsButton
                icon="high_quality"
                label="Quality"
                value={currentQualityName}
                onClick={() => setSettingsMenuLevel('quality')}
              />
              <SettingsButton
                icon="closed_caption"
                label="Subtitles"
                value={currentSubtitleName}
                onClick={() => setSettingsMenuLevel('captions')}
              />
              <div className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all text-slate-200">
                <div className="flex items-center gap-3">
                  <span className="material-icons text-[18px] opacity-70">blur_on</span>
                  <span className="text-xs font-semibold">Ambient Mode</span>
                </div>
                <button
                  onClick={() => setAmbientMode(!ambientMode)}
                  className={`h-5 w-10 rounded-full transition-all relative ${ambientMode ? 'bg-accent' : 'bg-slate-700'}`}
                >
                  <div
                    className={`absolute top-1 h-3 w-3 rounded-full bg-white transition-all ${ambientMode ? 'right-1' : 'left-1'}`}
                  />
                </button>
              </div>
              <SettingsButton
                icon="info"
                label="Stats for Nerds"
                value={showStats ? 'On' : 'Off'}
                onClick={() => setShowStats(!showStats)}
              />
            </div>
          )}

          {settingsMenuLevel === 'quality' && (
            <div className="space-y-1">
              <button
                onClick={() => setSettingsMenuLevel('main')}
                className="w-full flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-white transition-all border-b border-white/5 mb-1"
              >
                <span className="material-icons text-sm">west</span>
                <span className="text-[10px] font-black uppercase tracking-widest">
                  Back to settings
                </span>
              </button>
              <SettingsOption
                active={currentQualityId === -1}
                label="Auto"
                onClick={() => changeQuality(-1)}
              />
              {qualities.map((q) => (
                <SettingsOption
                  key={q.id}
                  active={currentQualityId === q.id}
                  label={q.name}
                  onClick={() => changeQuality(q.id)}
                />
              ))}
            </div>
          )}

          {settingsMenuLevel === 'captions' && (
            <div className="space-y-1">
              <button
                onClick={() => setSettingsMenuLevel('main')}
                className="w-full flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-white transition-all border-b border-white/5 mb-1"
              >
                <span className="material-icons text-sm">west</span>
                <span className="text-[10px] font-black uppercase tracking-widest">
                  Back to settings
                </span>
              </button>
              <SettingsOption
                active={currentSubtitleId === -1}
                label="Off"
                onClick={() => changeSubtitle(-1)}
              />
              {subtitles.map((s) => (
                <SettingsOption
                  key={s.id}
                  active={currentSubtitleId === s.id}
                  label={s.name}
                  onClick={() => changeSubtitle(s.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main UI Overlay */}
      <div
        className="absolute inset-0 z-20"
        onClick={(e) => {
          if (window.innerWidth < 1024) {
            const target = e.target as HTMLElement;
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

        {/* Stats for Nerds */}
        {showStats && (
          <div className="absolute top-20 left-4 sm:left-8 p-4 glass rounded-2xl z-40 text-[9px] font-mono text-cyan-400 space-y-1">
            <div>Resolution: {stats.res}</div>
            <div>Bitrate: {stats.bitrate} kbps</div>
            <div>Buffer: {stats.buffer}s</div>
            <div>Dropped: {stats.dropped}</div>
          </div>
        )}

        {/* Bottom Controls */}
        <div
          className={`absolute bottom-0 left-0 right-0 p-4 sm:p-8 transition-all duration-500 transform-gpu ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
        >
          <div className="flex flex-col gap-3 sm:gap-4">
            {/* DVR Timeline */}
            {!isNaN(duration) && duration > 0 && (
              <div className="w-full flex items-center gap-3 text-[9px] sm:text-[10px] font-mono text-white font-bold px-1 group/timeline">
                <span>{displayedTime}</span>
                <div className="flex-1 relative h-1 sm:h-1.5 group/track">
                  <div className="absolute inset-0 bg-white/20 rounded-full" />
                  <div
                    className="absolute inset-y-0 left-0 bg-red-600 rounded-full"
                    style={{ width: `${(currentTime / duration) * 100}%` }}
                  />
                  <input
                    type="range"
                    min="0"
                    max={duration === Infinity ? 0 : duration}
                    value={currentTime}
                    onMouseDown={() => setIsSeeking(true)}
                    onMouseUp={() => setIsSeeking(false)}
                    onChange={handleSeek}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div
                    className="absolute h-3 w-3 sm:h-4 sm:w-4 bg-white rounded-full border-2 border-red-600 -mt-1 sm:-mt-1.5 shadow-xl transition-transform group-hover/track:scale-110 pointer-events-none"
                    style={{ left: `calc(${(currentTime / duration) * 100}% - 6px)` }}
                  />
                </div>
                <span>{displayedDuration}</span>
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
                <IconButton
                  onClick={(e) => {
                    e?.stopPropagation();
                    setSettingsMenuLevel('main');
                    setShowSettings(!showSettings);
                  }}
                  active={showSettings}
                  className="h-8 w-8 sm:h-11 sm:w-11 settings-menu-container"
                >
                  <span
                    className={`material-icons text-base sm:text-xl transition-transform duration-500 ${showSettings ? 'rotate-90' : ''}`}
                  >
                    settings
                  </span>
                </IconButton>

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
      className={`h-11 w-11 rounded-full flex items-center justify-center transition-all duration-300 active:scale-90 ${active ? 'bg-accent text-slate-950 shadow-accent' : 'text-white hover:bg-white/10'} ${className}`}
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
