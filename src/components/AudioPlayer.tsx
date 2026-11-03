import React, { useEffect, useRef, useState } from 'react';
import { SongItem, StreamInfo } from '../types';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
  SkipForward,
  SkipBack,
  Download,
  FileText,
  ListMusic,
  Repeat,
  Repeat1,
  Shuffle,
  Music,
  RefreshCw,
  Radio
} from 'lucide-react';

interface AudioPlayerProps {
  currentSong: SongItem | null;
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  hasNext: boolean;
  hasPrev: boolean;
  streamInfo: StreamInfo | null;
  isStreamLoading: boolean;
  onOpenLyrics: () => void;
  onDownload: (song: SongItem) => void;
  onToggleQueue: () => void;
  isQueueOpen: boolean;
  queueCount: number;
  onCurrentTimeChange?: (currentTime: number, duration: number) => void;
  seekToTime?: number | null;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  currentSong,
  isPlaying,
  onPlayPause,
  onNext,
  onPrev,
  hasNext,
  hasPrev,
  streamInfo,
  isStreamLoading,
  onOpenLyrics,
  onDownload,
  onToggleQueue,
  isQueueOpen,
  queueCount,
  onCurrentTimeChange,
  seekToTime,
}) => {
  const ytPlayerRef = useRef<any>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [isShuffling, setIsShuffling] = useState(false);
  const [hoverSeekTime, setHoverSeekTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number>(0);
  const [isPlayerReady, setIsPlayerReady] = useState(false);

  // Initialize YouTube Iframe API once
  useEffect(() => {
    if (!(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // Initialize or update YouTube Player when song changes
  useEffect(() => {
    setCurrentTime(0);
    setDuration(currentSong?.durationSeconds || 0);

    if (!currentSong) {
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.stopVideo();
        } catch {
          // ignore
        }
      }
      return;
    }

    const initOrLoad = () => {
      if (!(window as any).YT || !(window as any).YT.Player) {
        setTimeout(initOrLoad, 100);
        return;
      }

      if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === 'function') {
        try {
          ytPlayerRef.current.loadVideoById(currentSong.id);
          ytPlayerRef.current.setVolume(isMuted ? 0 : volume * 100);
          ytPlayerRef.current.setPlaybackRate(playbackSpeed);
          if (isPlaying) {
            ytPlayerRef.current.playVideo();
          }
          return;
        } catch (e) {
          console.warn('Re-instantiating player:', e);
        }
      }

      try {
        ytPlayerRef.current = new (window as any).YT.Player('yt-audio-engine', {
          height: '1',
          width: '1',
          videoId: currentSong.id,
          playerVars: {
            autoplay: isPlaying ? 1 : 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: (event: any) => {
              setIsPlayerReady(true);
              event.target.setVolume(isMuted ? 0 : volume * 100);
              event.target.setPlaybackRate(playbackSpeed);
              if (isPlaying) {
                event.target.playVideo();
              }
            },
            onStateChange: (event: any) => {
              // 0 = YT.PlayerState.ENDED
              if (event.data === 0) {
                if (repeatMode === 'one') {
                  event.target.seekTo(0, true);
                  event.target.playVideo();
                } else {
                  onNext();
                }
              }
            },
          },
        });
      } catch (err) {
        console.error('Error creating YT player:', err);
      }
    };

    initOrLoad();
  }, [currentSong?.id]);

  // Handle Play/Pause
  useEffect(() => {
    if (!ytPlayerRef.current || !currentSong) return;
    try {
      if (isPlaying) {
        ytPlayerRef.current.playVideo();
      } else {
        ytPlayerRef.current.pauseVideo();
      }
    } catch {
      // ignore
    }
  }, [isPlaying, currentSong]);

  // Handle External Seek (e.g. lyrics line click)
  useEffect(() => {
    if (seekToTime !== undefined && seekToTime !== null && ytPlayerRef.current) {
      try {
        ytPlayerRef.current.seekTo(seekToTime, true);
        setCurrentTime(seekToTime);
        if (isPlaying) {
          ytPlayerRef.current.playVideo();
        }
      } catch (e) {
        console.warn('Seek error:', e);
      }
    }
  }, [seekToTime]);

  // Volume & Speed updates
  useEffect(() => {
    if (ytPlayerRef.current && typeof ytPlayerRef.current.setVolume === 'function') {
      try {
        ytPlayerRef.current.setVolume(isMuted ? 0 : volume * 100);
        ytPlayerRef.current.setPlaybackRate(playbackSpeed);
      } catch {
        // ignore
      }
    }
  }, [volume, isMuted, playbackSpeed]);

  // Synchronize playback time
  useEffect(() => {
    let timer: any = null;
    if (isPlaying) {
      timer = setInterval(() => {
        if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
          try {
            const cur = ytPlayerRef.current.getCurrentTime() || 0;
            const dur = ytPlayerRef.current.getDuration() || duration;
            setCurrentTime(cur);
            if (dur > 0) setDuration(dur);
            onCurrentTimeChange?.(cur, dur);
          } catch {
            // ignore
          }
        }
      }, 400);
    }
    return () => clearInterval(timer);
  }, [isPlaying, duration, onCurrentTimeChange]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        onPlayPause();
      } else if (e.key === 'ArrowRight' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        seekRelative(5);
      } else if (e.key === 'ArrowLeft' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        seekRelative(-5);
      } else if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setIsMuted((prev) => !prev);
      } else if (e.key.toLowerCase() === 'l' && currentSong) {
        e.preventDefault();
        onOpenLyrics();
      } else if (e.key.toLowerCase() === 'd' && currentSong) {
        e.preventDefault();
        onDownload(currentSong);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSong, onPlayPause, onOpenLyrics, onDownload]);

  const seekRelative = (seconds: number) => {
    if (!ytPlayerRef.current) return;
    try {
      const cur = ytPlayerRef.current.getCurrentTime() || currentTime;
      const target = Math.min(Math.max(0, cur + seconds), duration || 1000);
      ytPlayerRef.current.seekTo(target, true);
      setCurrentTime(target);
    } catch {
      // ignore
    }
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !ytPlayerRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = fraction * duration;
    try {
      ytPlayerRef.current.seekTo(newTime, true);
      setCurrentTime(newTime);
    } catch {
      // ignore
    }
  };

  const handleProgressBarMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const hoverX = e.clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, hoverX / rect.width));
    setHoverSeekTime(fraction * duration);
    setHoverPosition(hoverX);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const toggleRepeat = () => {
    if (repeatMode === 'off') setRepeatMode('all');
    else if (repeatMode === 'all') setRepeatMode('one');
    else setRepeatMode('off');
  };

  const cycleSpeed = () => {
    if (playbackSpeed === 1) setPlaybackSpeed(1.25);
    else if (playbackSpeed === 1.25) setPlaybackSpeed(1.5);
    else if (playbackSpeed === 1.5) setPlaybackSpeed(2);
    else setPlaybackSpeed(1);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!currentSong) {
    return (
      <div className="border-t border-[#222222] bg-[#0E0E0E] px-6 py-4 shadow-2xl flex items-center justify-between text-xs font-mono text-[#888888]">
        {/* Hidden off-screen audio engine container */}
        <div className="absolute -top-[9999px] left-0 pointer-events-none opacity-0">
          <div id="yt-audio-engine" />
        </div>

        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] border border-[#262626] flex items-center justify-center text-[#FF3B30]">
            <Music className="w-5 h-5 opacity-40" />
          </div>
          <div>
            <div className="font-heading font-semibold text-sm text-[#FFFFFF]">No song playing</div>
            <div className="text-[11px] text-[#777777]">Search and tap any song above to listen</div>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-[11px]">
          <span className="w-2 h-2 rounded-full bg-[#FF3B30] animate-pulse" />
          <span className="text-[#999999]">Tube Tunes Song Player Ready</span>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-[#222222] bg-[#0D0D0D] shadow-2xl relative select-none">
      {/* Hidden off-screen audio engine container */}
      <div className="absolute -top-[9999px] left-0 pointer-events-none opacity-0">
        <div id="yt-audio-engine" />
      </div>

      {/* Progress Bar with smooth hover tooltip */}
      <div
        ref={progressBarRef}
        onClick={handleProgressBarClick}
        onMouseMove={handleProgressBarMouseMove}
        onMouseLeave={() => setHoverSeekTime(null)}
        className="w-full h-1.5 bg-[#1F1F1F] hover:h-2.5 group cursor-pointer transition-all relative border-b border-[#222222]"
      >
        <div
          className="h-full bg-[#FF3B30] relative transition-all duration-75"
          style={{ width: `${progressPercent}%` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-[#FFFFFF] shadow-md opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Hover Time Tooltip */}
        {hoverSeekTime !== null && (
          <div
            className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded-md bg-[#222222] text-white text-[10px] font-mono shadow-md pointer-events-none z-30"
            style={{ left: `${hoverPosition}px` }}
          >
            {formatTime(hoverSeekTime)}
          </div>
        )}
      </div>

      {/* Main Player Row */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-4">
        {/* Left: Artwork & Metadata */}
        <div className="flex items-center gap-3.5 min-w-[220px] max-w-[340px]">
          <div className="relative group shrink-0">
            <img
              src={currentSong.thumbnail}
              alt={currentSong.title}
              className="w-13 h-13 rounded-xl object-cover border border-[#242424] shadow-md"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            {isPlaying && (
              <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center gap-0.5 backdrop-blur-[1px]">
                <span className="w-1 bg-[#FF3B30] rounded-full animate-bounce [animation-delay:0ms] h-4" />
                <span className="w-1 bg-[#FF6363] rounded-full animate-bounce [animation-delay:150ms] h-3" />
                <span className="w-1 bg-[#FF3B30] rounded-full animate-bounce [animation-delay:300ms] h-5" />
              </div>
            )}
          </div>

          <div className="overflow-hidden">
            <div className="font-heading font-bold text-sm text-[#FFFFFF] truncate" title={currentSong.title}>
              {currentSong.title}
            </div>
            <div className="text-xs font-mono text-[#999999] truncate flex items-center gap-1.5" title={currentSong.artist}>
              <span>{currentSong.artist}</span>
              {currentSong.album && (
                <>
                  <span className="text-[#444444]">•</span>
                  <span className="text-[#777777] truncate">{currentSong.album}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Center: Controls & Timers */}
        <div className="flex-1 max-w-xl flex flex-col items-center gap-1">
          <div className="flex items-center gap-3 md:gap-5">
            {/* Shuffle */}
            <button
              onClick={() => setIsShuffling(!isShuffling)}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                isShuffling ? 'text-[#FF3B30] bg-[#FF3B30]/10' : 'text-[#777777] hover:text-[#FFFFFF]'
              }`}
              title={isShuffling ? 'Shuffle on' : 'Shuffle off'}
            >
              <Shuffle className="w-4 h-4" />
            </button>

            {/* Prev */}
            <button
              onClick={onPrev}
              disabled={!hasPrev}
              className="p-2 text-[#AAAAAA] hover:text-[#FFFFFF] disabled:opacity-30 disabled:hover:text-[#AAAAAA] transition-colors cursor-pointer"
              title="Previous Song"
            >
              <SkipBack className="w-5 h-5 fill-current" />
            </button>

            {/* Play / Pause Primary Button */}
            <button
              onClick={onPlayPause}
              disabled={isStreamLoading}
              className="w-11 h-11 rounded-full bg-[#FF3B30] hover:bg-[#FF4E45] text-white flex items-center justify-center shadow-lg shadow-[#FF3B30]/30 active:scale-95 transition-all cursor-pointer"
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isStreamLoading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>

            {/* Next */}
            <button
              onClick={onNext}
              disabled={!hasNext}
              className="p-2 text-[#AAAAAA] hover:text-[#FFFFFF] disabled:opacity-30 disabled:hover:text-[#AAAAAA] transition-colors cursor-pointer"
              title="Next Song"
            >
              <SkipForward className="w-5 h-5 fill-current" />
            </button>

            {/* Repeat Mode */}
            <button
              onClick={toggleRepeat}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                repeatMode !== 'off' ? 'text-[#FF3B30] bg-[#FF3B30]/10' : 'text-[#777777] hover:text-[#FFFFFF]'
              }`}
              title={repeatMode === 'one' ? 'Repeat One' : repeatMode === 'all' ? 'Repeat All' : 'Repeat Off'}
            >
              {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
            </button>
          </div>

          {/* Time Counter */}
          <div className="flex items-center gap-2 text-xs font-mono text-[#888888]">
            <span className="font-medium text-[#FFFFFF]">{formatTime(currentTime)}</span>
            <span>/</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right: Actions, Lyrics, Download & Volume */}
        <div className="flex items-center gap-3 md:gap-4 justify-end min-w-[220px]">
          {/* Speed Selector */}
          <button
            onClick={cycleSpeed}
            className="px-2 py-1 rounded-md text-xs font-mono font-medium bg-[#1A1A1A] border border-[#2D2D2D] text-[#CCCCCC] hover:text-white transition-colors cursor-pointer"
            title="Playback Speed"
          >
            {playbackSpeed}x
          </button>

          {/* Lyrics Button */}
          <button
            onClick={onOpenLyrics}
            className="p-2 rounded-xl text-[#AAAAAA] hover:text-[#FF3B30] hover:bg-[#1C1C1C] transition-all cursor-pointer"
            title="Show Synced Lyrics (L)"
          >
            <FileText className="w-4 h-4" />
          </button>

          {/* Download Button */}
          <button
            onClick={() => onDownload(currentSong)}
            className="p-2 rounded-xl text-[#AAAAAA] hover:text-[#FF3B30] hover:bg-[#1C1C1C] transition-all cursor-pointer"
            title="Download song (.m4a with tags)"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Queue Drawer Button */}
          <button
            onClick={onToggleQueue}
            className={`p-2 rounded-xl border transition-all relative cursor-pointer ${
              isQueueOpen
                ? 'bg-[#FF3B30] text-white border-[#FF3B30]'
                : 'text-[#AAAAAA] hover:text-[#FFFFFF] bg-[#161616] border-[#292929]'
            }`}
            title="Playback Queue"
          >
            <ListMusic className="w-4 h-4" />
            {queueCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#FF3B30] text-white text-[9px] font-bold font-mono flex items-center justify-center">
                {queueCount}
              </span>
            )}
          </button>

          {/* Volume Slider */}
          <div className="hidden lg:flex items-center gap-2 text-[#888888]">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="hover:text-white transition-colors cursor-pointer"
              title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-[#FF3B30]" />
              ) : volume < 0.5 ? (
                <Volume1 className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.02}
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setVolume(parseFloat(e.target.value));
                setIsMuted(false);
              }}
              className="w-18 h-1 bg-[#2C2C2C] rounded-lg appearance-none cursor-pointer accent-[#FF3B30]"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
