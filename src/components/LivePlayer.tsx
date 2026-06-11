import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Hls from 'hls.js';
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCw, AlertCircle, Users, Radio, CheckCircle, HelpCircle } from 'lucide-react';
import { Channel } from '../types';
import { useFullscreenIdle } from '../hooks/useFullscreenIdle';

interface LivePlayerProps {
  channel: Channel | null;
  onStreamError?: (channelId: string) => void;
  onStreamSuccess?: (channelId: string) => void;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  onPreviousChannel?: () => void;
  onNextChannel?: () => void;
}

export default function LivePlayer({ 
  channel, 
  onStreamError, 
  onStreamSuccess,
  favorites,
  onToggleFavorite,
  onPreviousChannel,
  onNextChannel
}: LivePlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Video State
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('lumina-player-volume');
    return saved ? parseFloat(saved) : 0.8;
  });
  const [isMuted, setIsMuted] = useState(() => {
    return localStorage.getItem('lumina-player-muted') === 'true';
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const [hasFatalError, setHasFatalError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [streamHealth, setStreamHealth] = useState<'Checking' | 'Stable' | 'Weak' | 'Dead'>('Checking');

  const { isFullscreen, controlsVisible } = useFullscreenIdle(containerRef, 3000, isPlaying);

  const isFavorite = useMemo(() => {
    return channel ? favorites.includes(channel.id) : false;
  }, [channel, favorites]);

  // Handle stream initialization
  const initializeStream = useCallback(() => {
    if (!channel || !videoRef.current) return;

    setIsLoading(true);
    setHasFatalError(false);
    setErrorMessage('');
    setStreamHealth('Checking');

    // Clean up previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const video = videoRef.current;
    const streamUrl = channel.streamUrl;

    // Direct MP4 or native playback
    const isMp4 = streamUrl.toLowerCase().endsWith('.mp4') || streamUrl.includes('sample/BigBuckBunny');

    if (Hls.isSupported() && !isMp4) {
      const hls = new Hls({
        maxMaxBufferLength: 15,
        enableWorker: true,
        lowLatencyMode: true,
        manifestLoadingMaxRetry: 3,
        levelLoadingMaxRetry: 3,
      });

      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        setErrorCount(0);
        setStreamHealth('Stable');
        if (onStreamSuccess) onStreamSuccess(channel.id);
        
        video.play()
          .then(() => setIsPlaying(true))
          .catch(() => {
            // Browsers often block autoplay without user interaction
            setIsPlaying(false);
          });
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          console.warn('Fatal HLS Error:', data.type, data.details);
          setStreamHealth('Weak');
          
          if (errorCount < 3) {
            setErrorCount(prev => prev + 1);
            setIsLoading(true);
            // Retry
            setTimeout(() => {
              hls.recoverMediaError();
            }, 1500);
          } else {
            hls.destroy();
            hlsRef.current = null;
            setHasFatalError(true);
            setIsLoading(false);
            setStreamHealth('Dead');
            setErrorMessage(`Failed to connect after empty data or timeout (${data.details})`);
            if (onStreamError) onStreamError(channel.id);
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl') || isMp4) {
      // Native Apple HLS (Safari / iOS) or Direct MP4 file
      video.src = streamUrl;
      
      const handleLoadedMetadata = () => {
        setIsLoading(false);
        setErrorCount(0);
        setStreamHealth('Stable');
        if (onStreamSuccess) onStreamSuccess(channel.id);
        video.play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      };

      const handleNativeError = () => {
        if (errorCount < 3) {
          setErrorCount(prev => prev + 1);
          setIsLoading(true);
          setTimeout(() => {
            video.load();
          }, 1500);
        } else {
          setHasFatalError(true);
          setIsLoading(false);
          setStreamHealth('Dead');
          setErrorMessage('Playback error. Stream may be offline or restricted.');
          if (onStreamError) onStreamError(channel.id);
        }
      };

      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('error', handleNativeError);

      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('error', handleNativeError);
      };
    } else {
      setIsLoading(false);
      setHasFatalError(true);
      setErrorMessage('HLS playback is not supported on this browser.');
    }
  }, [channel, errorCount, onStreamError, onStreamSuccess]);

  // Trigger stream load when channel changes
  useEffect(() => {
    setErrorCount(0);
    initializeStream();

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [channel?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Play / Pause Handlers
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  }, [isPlaying]);

  // Sync Volume
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : volume;
      videoRef.current.muted = isMuted;
    }
    localStorage.setItem('lumina-player-volume', volume.toString());
    localStorage.setItem('lumina-player-muted', isMuted ? 'true' : 'false');
  }, [volume, isMuted]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (val > 0) setIsMuted(false);
  };

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  // Refresh Connection
  const handleRefresh = () => {
    setErrorCount(0);
    initializeStream();
  };

  // Fullscreen trigger
  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(err => console.error(err));
      // Attempt to lock orientation to landscape on mobile
      if (screen.orientation && typeof screen.orientation.lock === 'function') {
        screen.orientation.lock('landscape').catch(() => {});
      }
    } else {
      document.exitFullscreen().catch(err => console.error(err));
      // Unlock or revert to portrait when exiting fullscreen
      if (screen.orientation) {
        if (typeof screen.orientation.unlock === 'function') {
          screen.orientation.unlock();
        } else if (typeof screen.orientation.lock === 'function') {
          screen.orientation.lock('portrait').catch(() => {});
        }
      }
    }
  }, []);

  const [showVolumeOverlay, setShowVolumeOverlay] = useState(false);
  const volumeOverlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const displayVolumeOverlay = useCallback(() => {
    setShowVolumeOverlay(true);
    if (volumeOverlayTimeoutRef.current) {
      clearTimeout(volumeOverlayTimeoutRef.current);
    }
    volumeOverlayTimeoutRef.current = setTimeout(() => {
      setShowVolumeOverlay(false);
    }, 1000);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'SELECT'
      ) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          displayVolumeOverlay();
          break;
        case 'arrowup':
          e.preventDefault();
          setVolume(prev => {
            const newVol = Math.min(1, prev + 0.05);
            if (newVol > 0) setIsMuted(false);
            return newVol;
          });
          displayVolumeOverlay();
          break;
        case 'arrowdown':
          e.preventDefault();
          setVolume(prev => {
            const newVol = Math.max(0, prev - 0.05);
            if (newVol === 0) setIsMuted(true);
            return newVol;
          });
          displayVolumeOverlay();
          break;
        case 'arrowleft':
          e.preventDefault();
          if (onPreviousChannel) onPreviousChannel();
          break;
        case 'arrowright':
          e.preventDefault();
          if (onNextChannel) onNextChannel();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (volumeOverlayTimeoutRef.current) {
        clearTimeout(volumeOverlayTimeoutRef.current);
      }
    };
  }, [togglePlay, toggleFullscreen, toggleMute, onPreviousChannel, onNextChannel, displayVolumeOverlay]);

  if (!channel) {
    return (
      <div className="w-full aspect-video rounded-2xl bg-slate-950/60 border border-white/5 flex flex-col items-center justify-center p-6 text-center shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-radial-at-t from-cyan-500/10 via-transparent to-transparent opacity-60" />
        <Radio className="w-16 h-16 text-cyan-400 mb-4 animate-pulse" />
        <h3 className="text-xl font-semibold text-white mb-2">No Channel Selected</h3>
        <p className="text-sm text-slate-400 max-w-md">
          Choose a channel from the guide below or search for your favorite stations to start streaming instantly.
        </p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      id="lumina-main-player"
      className={`relative w-full aspect-video rounded-2xl bg-black overflow-hidden shadow-2xl group border border-white/10 ${
        isFullscreen && !controlsVisible ? 'cursor-none' : ''
      }`}
    >
      {/* Video Tag */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
      />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center text-center z-20 pointer-events-none">
          <div className="w-12 h-12 border-4 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mb-4" />
          <p className="text-sm font-medium text-cyan-300">
            {errorCount > 0 ? `Loading... Attempting connection ${errorCount}/3` : 'Initializing stream buffer...'}
          </p>
          <p className="text-xs text-slate-400 mt-2 truncate max-w-lg">{channel.name}</p>
        </div>
      )}

      {/* Error overlay */}
      {hasFatalError && (
        <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-6 text-center z-20">
          <AlertCircle className="w-14 h-14 text-rose-500 mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Streaming Offline or Access Restricted</h3>
          <p className="text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
            {errorMessage || 'This stream cannot be resolved in your network environment. Make sure your playlist source allows direct CORS access.'}
          </p>
          <div className="flex gap-4">
            <button
              onClick={handleRefresh}
              className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 active:scale-95 transition-transform text-white font-medium text-sm rounded-xl flex items-center gap-2 shadow-lg shadow-cyan-500/20"
            >
              <RotateCw className="w-4 h-4" />
              Force Retry
            </button>
          </div>
        </div>
      )}

      {/* Volume Overlay Center Animation */}
      <div 
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/60 backdrop-blur-md rounded-full px-6 py-4 text-white flex items-center gap-3 z-30 pointer-events-none transition-all duration-300 ${
          showVolumeOverlay ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
        }`}
      >
        {isMuted || volume === 0 ? (
          <VolumeX className="w-8 h-8" />
        ) : volume > 0.5 ? (
          <Volume2 className="w-8 h-8" />
        ) : (
          <Volume2 className="w-8 h-8 opacity-70" />
        )}
        <span className="font-bold text-xl">
          {isMuted ? 'Muted' : `${Math.round(volume * 100)}%`}
        </span>
      </div>

      {/* Floating Header Badges - Visible on Hover or Paused */}
      <div className={`absolute top-2 left-2 right-2 md:top-4 md:left-4 md:right-4 flex justify-between items-start z-10 transition-all duration-300 pointer-events-none ${controlsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
        <div className="flex flex-col gap-2 pointer-events-auto">
          <div className="flex items-center gap-1 md:gap-1.5 bg-rose-600/90 text-white font-extrabold text-[8px] md:text-[9px] uppercase px-1.5 py-0.5 md:px-2.5 md:py-1 rounded border border-rose-500/30 tracking-wider shadow-lg live-pulse">
            <span className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-white block" />
            LIVE
          </div>
        </div>

        <div className="flex items-center gap-1 md:gap-2 pointer-events-auto flex-wrap justify-end">
          {/* Stream Health Indicator */}
          <div className={`flex items-center gap-0.5 md:gap-1 px-1.5 py-0.5 md:px-2.5 md:py-1 rounded text-[8px] md:text-[10px] font-bold border ${
            streamHealth === 'Stable' ? 'bg-emerald-950/80 border-emerald-500/25 text-emerald-400' :
            streamHealth === 'Weak' ? 'bg-amber-950/80 border-amber-500/25 text-amber-400' :
            streamHealth === 'Dead' ? 'bg-rose-950/80 border-rose-500/25 text-rose-400' :
            'bg-slate-900/80 border-slate-700/25 text-slate-300'
          }`}>
            {streamHealth === 'Stable' && <CheckCircle className="w-2.5 h-2.5 md:w-3 md:h-3" />}
            {streamHealth === 'Weak' && <AlertCircle className="w-2.5 h-2.5 md:w-3 md:h-3" />}
            {streamHealth === 'Dead' && <AlertCircle className="w-2.5 h-2.5 md:w-3 md:h-3" />}
            {streamHealth === 'Checking' && <span className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-cyan-400 animate-ping" />}
            <span className="hidden md:inline">{streamHealth} Feed</span>
            <span className="inline md:hidden">{streamHealth}</span>
          </div>

          <div className="flex items-center gap-1 md:gap-1.5 bg-slate-800/80 border border-gray-700/85 text-gray-300 text-[8px] md:text-[10px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 md:px-2.5 md:py-1 rounded shadow-lg">
            <Users className="w-2.5 h-2.5 md:w-3 md:h-3 text-cyan-400" />
            <span className="hidden md:inline">{channel.viewsCount || '45K Viewers'}</span>
            <span className="inline md:hidden">{channel.viewsCount || '45K'}</span>
          </div>
        </div>
      </div>

      {/* Overlay controls - fade in on hover */}
      <div className={`absolute inset-x-0 bottom-0 player-gradient p-2 md:p-6 z-10 transition-all duration-300 flex flex-col gap-2 md:gap-4 pointer-events-none ${controlsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        
        {/* Progress Timeline spacer */}
        <div className="flex items-center justify-between pointer-events-auto px-2 md:px-0">
          <div className="flex items-center gap-2 md:gap-4">
            {channel.logo ? (
              <img 
                src={channel.logo} 
                alt={`${channel.name} logo`} 
                className="w-8 h-8 md:w-12 md:h-12 rounded-lg object-contain bg-white p-1 md:p-1.5 shadow-xl flex-shrink-0"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-8 h-8 md:w-12 md:h-12 rounded-lg bg-gray-800 flex items-center justify-center border border-white/5 flex-shrink-0">
                <Radio className="w-4 h-4 md:w-6 md:h-6 text-cyan-400" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-sm sm:text-xl md:text-2xl font-bold text-white tracking-tight drop-shadow-md select-text truncate max-w-[200px] sm:max-w-[300px] md:max-w-[500px]">{channel.name}</h1>
              <p className="text-[9px] md:text-xs text-slate-400/90 font-medium truncate max-w-[200px] md:max-w-full">News • {channel.category || 'Streaming'}</p>
            </div>
          </div>
        </div>

        {/* Media Control Bar */}
        <div className="flex flex-row items-center justify-between glass p-2 md:p-3 rounded-xl border border-white/10 pointer-events-auto backdrop-blur-md">
          <div className="flex gap-2 md:gap-4 items-center">
            <button
              onClick={togglePlay}
              className="text-white hover:text-cyan-400 transition-colors active:scale-90 duration-150 p-1 md:p-0"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-5 h-5 md:w-7 md:h-7 fill-current" /> : <Play className="w-5 h-5 md:w-7 md:h-7 fill-current" />}
            </button>

            <button
              onClick={handleRefresh}
              className="p-1 md:p-1.5 text-gray-400 hover:text-white hover:bg-gray-800/40 rounded-lg transition-colors hidden sm:block"
              title="Refresh Stream"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Volume Controllers */}
            <div className="hidden sm:flex items-center gap-2 group/volume bg-gray-900 px-2.5 py-1 rounded-lg border border-gray-800">
              <button 
                onClick={toggleMute}
                className="text-gray-400 hover:text-white transition-colors"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 md:w-20 accent-cyan-400 h-1 rounded-sm bg-slate-700/60 cursor-pointer"
                aria-label="Volume Slider"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-6 text-[10px] md:text-[11px] font-bold text-gray-300">
            <span className="text-cyan-400 tracking-wider hidden sm:inline">1080p • 60FPS</span>
            <span className="text-cyan-400 tracking-wider sm:hidden">HD</span>

            {/* Direct Favorite Button */}
            <button
              onClick={() => onToggleFavorite(channel.id)}
              className={`hover:text-rose-400 transition-colors p-1 md:p-0 ${
                isFavorite ? 'text-rose-500' : 'text-gray-400'
              }`}
            >
              <svg 
                className={`w-4 h-4 md:w-4 md:h-4 ${isFavorite ? 'fill-rose-500' : ''}`}
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
              </svg>
            </button>

            <button
              onClick={toggleFullscreen}
              className="hover:text-white text-gray-400 transition-colors uppercase tracking-wider font-extrabold flex items-center gap-1 p-1 md:p-0"
              title="Toggle Fullscreen"
              aria-label="Toggle Fullscreen"
            >
              <Maximize className="w-4 h-4 md:hidden" />
              <span className="hidden md:inline">Fullscreen</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
