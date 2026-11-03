import React, { useState, useRef, useEffect } from 'react';
import { SongItem, StreamInfo } from '../types';
import { getHighResThumbnail } from '../utils/image';
import {
  ChevronLeft,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  Square,
  RotateCcw,
  RotateCw,
  Repeat,
  Repeat1,
  Flag,
  ListPlus,
  Download,
  Plus,
  Sliders,
  Activity,
  Layers,
  Volume2,
  VolumeX,
  Volume1,
  FileText,
  ListMusic,
  ExternalLink,
  RefreshCw,
  User,
  Music2
} from 'lucide-react';

interface CuePoint {
  id: string;
  time: number;
  label: string;
}

interface StudioPlayerProps {
  song: SongItem;
  isPlaying: boolean;
  onPlayPause: () => void;
  onStop: () => void;
  onNext: () => void;
  onPrev: () => void;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  queue?: SongItem[];
  onSelectSong?: (song: SongItem) => void;
  onOpenLyrics: () => void;
  onOpenOverview: () => void;
  onOpenQueue: () => void;
  onOpenAddToPlaylist?: (song: SongItem) => void;
  onDownload: (song: SongItem) => void;
  onCloseFullScreen: () => void;
  playbackSpeed: number;
  onChangeSpeed: (speed: number) => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const StudioPlayer: React.FC<StudioPlayerProps> = ({
  song,
  queue = [],
  onSelectSong,
  isPlaying,
  onPlayPause,
  onStop,
  onNext,
  onPrev,
  currentTime = 0,
  duration = 0,
  onSeek,
  onOpenLyrics,
  onOpenOverview,
  onOpenQueue,
  onOpenAddToPlaylist,
  onDownload,
  onCloseFullScreen,
  playbackSpeed = 1,
  onChangeSpeed,
  volume = 0.85,
  onVolumeChange,
  isMuted = false,
  onToggleMute,
}) => {
  // Studio tabs: Pre Production, Production, Post Production (matching Screenshot 1)
  const [productionTab, setProductionTab] = useState<'pre' | 'prod' | 'post'>('prod');
  
  // View mode: Minimize View, Player View, Comments View (matching Screenshot 1)
  const [viewMode, setViewMode] = useState<'minimize' | 'player' | 'comments'>('player');

  // Liquid ripple / fluid distortion visualizer mode
  const [visualMode, setVisualMode] = useState<'fluid' | 'waveform' | 'clean'>('fluid');

  // A-B Loop State
  const [loopPointA, setLoopPointA] = useState<number | null>(null);
  const [loopPointB, setLoopPointB] = useState<number | null>(null);

  // Overview & Tracks Menu States (In-place Floating Menus)
  const [showOverviewMenu, setShowOverviewMenu] = useState(false);
  const [showTracksMenu, setShowTracksMenu] = useState(false);
  const [tracksTab, setTracksTab] = useState<'playlist' | 'project'>('playlist');

  // Cue Points
  const [cuePoints, setCuePoints] = useState<CuePoint[]>([
    { id: '1', time: 0, label: 'Intro' },
  ]);
  const [showCuePopover, setShowCuePopover] = useState(false);
  const [showSpeedPopover, setShowSpeedPopover] = useState(false);

  // Repeat mode
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');

  // Scrubbing & Hover
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState<number>(0);

  // A-B loop execution logic
  useEffect(() => {
    if (loopPointA !== null && loopPointB !== null && loopPointB > loopPointA) {
      if (currentTime >= loopPointB) {
        onSeek(loopPointA);
      }
    }
  }, [currentTime, loopPointA, loopPointB, onSeek]);

  const togglePointA = () => {
    if (loopPointA !== null && loopPointB === null) {
      setLoopPointA(null);
    } else {
      setLoopPointA(currentTime);
      if (loopPointB !== null && currentTime >= loopPointB) {
        setLoopPointB(null);
      }
    }
  };

  const togglePointB = () => {
    if (loopPointB !== null) {
      setLoopPointB(null);
    } else {
      if (loopPointA !== null && currentTime > loopPointA) {
        setLoopPointB(currentTime);
      } else {
        setLoopPointB(currentTime);
      }
    }
  };

  const clearABLoop = () => {
    setLoopPointA(null);
    setLoopPointB(null);
  };

  const handleAddCue = () => {
    const newCue: CuePoint = {
      id: Date.now().toString(),
      time: currentTime,
      label: `Cue ${cuePoints.length + 1} (${formatTime(currentTime)})`,
    };
    setCuePoints((prev) => [...prev, newCue].sort((a, b) => a.time - b.time));
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = fraction * (duration || 1);
    onSeek(targetTime);
  };

  const handleProgressBarMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, x / rect.width));
    setHoverTime(fraction * (duration || 1));
    setHoverX(x);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const highResCover = getHighResThumbnail(song.thumbnail, song.id);

  return (
    <div className="fixed inset-0 z-40 bg-black text-white flex flex-col font-sans select-none overflow-hidden animate-in fade-in zoom-in-[0.99] duration-300">
      {/* SVG Liquid Ripple Filter for the cover art distortion (matching Screenshot 1) */}
      <svg className="hidden">
        <defs>
          <filter id="liquid-ripple" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency={isPlaying ? '0.012 0.035' : '0.008 0.02'}
              numOctaves="3"
              result="noise"
            >
              {isPlaying && (
                <animate
                  attributeName="baseFrequency"
                  dur="12s"
                  values="0.012 0.035; 0.016 0.045; 0.012 0.035"
                  repeatCount="indefinite"
                />
              )}
            </feTurbulence>
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={visualMode === 'fluid' ? 32 : 0}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      {/* TOP BAR - Clean & Minimalist */}
      <header className="h-14 px-4 sm:px-8 border-b border-white/10 bg-black/80 backdrop-blur-md flex items-center justify-between shrink-0 z-20">
        {/* Left: Back / Title button */}
        <div className="flex items-center gap-3">
          <button
            onClick={onCloseFullScreen}
            className="flex items-center gap-2 text-white/80 hover:text-white transition-colors cursor-pointer group"
            title="Return to search"
          >
            <ChevronLeft className="w-5 h-5 text-white/60 group-hover:text-white transition-colors" />
            <img
              src="/assets/logo.png"
              alt="Music Player Logo"
              className="w-7 h-7 rounded-lg object-contain bg-white/5 p-0.5 border border-white/10 shrink-0"
            />
            <span className="font-heading font-semibold text-sm sm:text-base tracking-tight truncate max-w-[280px] sm:max-w-md">
              {song.title}
            </span>
          </button>
        </div>

        {/* Right: Clean Minimize action */}
        <div className="flex items-center gap-3">
          <button
            onClick={onCloseFullScreen}
            className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Minimize Studio View"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* MAIN STUDIO STAGE matching Screenshot 1 */}
      <main className="flex-1 relative flex items-center justify-center p-3 sm:p-6 md:p-8 min-h-0 overflow-hidden bg-black">
        {/* Ambient background glow from high quality song art */}
        <div
          className="absolute inset-0 opacity-25 filter blur-3xl pointer-events-none scale-110"
          style={{
            backgroundImage: `url(${highResCover})`,
            backgroundPosition: 'center',
            backgroundSize: 'cover',
          }}
        />

        {/* Central Stage Canvas */}
        <div className="relative w-full max-w-5xl lg:max-w-6xl xl:max-w-7xl 2xl:max-w-[1650px] h-full rounded-[28px] sm:rounded-[36px] lg:rounded-[44px] bg-[#0c0d10] border border-white/10 shadow-[0_20px_70px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col justify-end">
          {/* Main Visualizer Image with Fluid Ripple Effect & Ultra High Resolution */}
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
            <img
              src={highResCover}
              alt={song.title}
              className={`w-full h-full object-cover transition-all duration-700 ${
                visualMode === 'fluid'
                  ? 'scale-105 filter-[url(#liquid-ripple)] brightness-95 contrast-105'
                  : 'scale-100'
              }`}
            />
            {/* Subtle cinematic vignette gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/30 pointer-events-none" />
          </div>

          {/* FLOATING ACTION PILL BUTTONS & OVERVIEW MENU */}
          <div className="relative z-10 p-4 sm:p-6 flex flex-col items-center">
            
            {/* OVERVIEW METADATA MENU (Smooth animated dropdown menu above buttons - NO technical jargon) */}
            {showOverviewMenu && (
              <div className="mb-4 w-full max-w-md bg-zinc-950/95 border border-white/20 rounded-3xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.9)] backdrop-blur-2xl animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300 ease-out font-sans select-none z-30 relative">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-rose-500" />
                    <span className="font-heading font-bold text-xs uppercase tracking-wider text-white">
                      Track Metadata
                    </span>
                  </div>
                  <button
                    onClick={() => setShowOverviewMenu(false)}
                    className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition-colors cursor-pointer text-xs"
                    title="Close Overview Menu"
                  >
                    ✕
                  </button>
                </div>

                {/* Track Metadata Card */}
                <div className="flex items-start gap-4">
                  <img
                    src={highResCover}
                    alt={song.title}
                    className="w-20 h-20 rounded-2xl object-cover border border-white/15 shadow-xl shrink-0"
                  />
                  <div className="min-w-0 flex-1 space-y-1 font-mono text-xs">
                    <h4 className="font-heading font-bold text-sm text-white truncate">
                      {song.title}
                    </h4>
                    <p className="text-white/70 truncate text-xs">
                      {song.artist}
                    </p>

                    <div className="pt-2 flex flex-col gap-1.5 text-[11px] text-white/60">
                      <div className="flex justify-between">
                        <span className="text-white/40">Album:</span>
                        <span className="text-white/90 truncate max-w-[140px] font-medium">{song.album || 'Single'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/40">Duration:</span>
                        <span className="text-white/90 font-medium">{song.duration || formatTime(duration)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/40">Release Year:</span>
                        <span className="text-white/90 font-medium">{song.year || '2026'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/40">Source:</span>
                        <span className="text-white/90 font-medium">{song.isLocal ? 'Local Storage' : 'Digital Master'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Shortcuts */}
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2">
                  <button
                    onClick={() => {
                      setShowOverviewMenu(false);
                      onOpenAddToPlaylist && onOpenAddToPlaylist(song);
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-white/10 active:scale-95"
                  >
                    <ListPlus className="w-3.5 h-3.5 text-rose-400" />
                    <span>Add to Playlist</span>
                  </button>

                  <button
                    onClick={() => {
                      onDownload(song);
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-white text-black hover:bg-neutral-200 text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                </div>
              </div>
            )}

            {/* TRACKS MENU (Smooth animated dropdown menu matching Overview menu) */}
            {showTracksMenu && (
              <div className="mb-4 w-full max-w-lg bg-zinc-950/95 border border-white/20 rounded-3xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.9)] backdrop-blur-2xl animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300 ease-out font-sans select-none z-30 relative">
                {/* Header with Tabs */}
                <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                  <div className="flex items-center gap-3">
                    <ListMusic className="w-4 h-4 text-rose-500" />
                    <span className="font-heading font-bold text-xs uppercase tracking-wider text-white">
                      Tracks
                    </span>
                    {/* Tabs matching Reference Screenshot */}
                    <div className="flex items-center p-0.5 rounded-xl bg-white/10 text-[11px] font-mono ml-2">
                      <button
                        onClick={() => setTracksTab('playlist')}
                        className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                          tracksTab === 'playlist' ? 'bg-white/20 text-white font-bold' : 'text-white/60 hover:text-white'
                        }`}
                      >
                        Playlist
                      </button>
                      <button
                        onClick={() => setTracksTab('project')}
                        className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                          tracksTab === 'project' ? 'bg-white/20 text-white font-bold' : 'text-white/60 hover:text-white'
                        }`}
                      >
                        Project Files
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowTracksMenu(false)}
                    className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition-colors cursor-pointer text-xs"
                    title="Close Tracks Menu"
                  >
                    ✕
                  </button>
                </div>

                {/* Album Header Banner */}
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 mb-3">
                  <img
                    src={highResCover}
                    alt={song.title}
                    className="w-12 h-12 rounded-xl object-cover border border-white/10 shadow-md shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-heading font-bold text-sm text-white truncate">
                      {song.album || song.title}
                    </h4>
                    <p className="text-[11px] font-mono text-white/50 truncate">
                      {song.artist} • LP • {song.duration || '03:30'}
                    </p>
                  </div>
                  <button
                    onClick={() => onOpenAddToPlaylist && onOpenAddToPlaylist(song)}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white flex items-center justify-center transition-all cursor-pointer active:scale-90 shrink-0"
                    title="Add current track to playlist"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Tracks List */}
                <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 font-mono text-xs">
                  {queue.length > 0 ? (
                    queue.map((item, idx) => {
                      const isActive = item.id === song.id;
                      return (
                        <div
                          key={item.id + idx}
                          onClick={() => {
                            if (onSelectSong) onSelectSong(item);
                          }}
                          className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer group ${
                            isActive
                              ? 'bg-rose-500/20 border-rose-500/40 text-white font-semibold'
                              : 'bg-white/[0.02] hover:bg-white/10 border-white/5 text-white/80 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-5 text-center text-white/40 text-[11px]">
                              {idx + 1}
                            </span>
                            <span className="truncate max-w-[180px] sm:max-w-[220px]">
                              {item.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[11px]">
                            <span className="px-1.5 py-0.5 rounded bg-white/10 text-white/60 text-[10px]">
                              {idx % 2 === 0 ? 'A' : 'B'}
                            </span>
                            <span className="text-white/40">{item.duration || '03:30'}</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    // Fallback project files preview if queue is empty
                    [
                      { id: '1', title: `${song.title} (Mix-01).wav`, dur: '3:08', mix: 'A' },
                      { id: '2', title: 'Pulse Drift (Mix-02).wav', dur: '4:05', mix: 'B' },
                      { id: '3', title: 'Neon Veins (Mix-01).wav', dur: '4:26', mix: 'A' },
                      { id: '4', title: 'Slow Collapse (Mix-03).wav', dur: '3:52', mix: 'A' },
                    ].map((item, idx) => (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                          idx === 0
                            ? 'bg-rose-500/20 border-rose-500/40 text-white font-semibold'
                            : 'bg-white/[0.02] hover:bg-white/10 border-white/5 text-white/80'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-5 text-center text-white/40 text-[11px]">
                            {idx + 1}
                          </span>
                          <span className="truncate max-w-[220px]">{item.title}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="px-1.5 py-0.5 rounded bg-white/10 text-white/60 text-[10px]">
                            {item.mix}
                          </span>
                          <span className="text-white/40">{item.dur}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 3 Floating Action Pill Buttons with Ultra-Smooth Animation */}
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              {/* [ ◫ Overview ↗ ] Button -> Opens smooth metadata menu */}
              <button
                onClick={() => {
                  setShowOverviewMenu(!showOverviewMenu);
                  setShowTracksMenu(false);
                }}
                className={`px-5 py-2.5 rounded-full backdrop-blur-xl border font-mono text-xs sm:text-sm font-medium flex items-center gap-2.5 shadow-2xl transition-all duration-300 ease-out hover:scale-105 active:scale-95 cursor-pointer ${
                  showOverviewMenu
                    ? 'bg-rose-600/30 border-rose-500/50 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)]'
                    : 'bg-black/60 hover:bg-black/80 border-white/15 text-white/90 hover:text-white'
                }`}
              >
                <Layers className={`w-4 h-4 transition-transform duration-300 ${showOverviewMenu ? 'rotate-90 text-rose-400' : 'text-white/70'}`} />
                <span>Overview</span>
                <span className="text-white/40 text-[10px]">↗</span>
              </button>

              {/* [ ☷ Tracks ↗ ] Button -> Opens smooth tracks menu */}
              <button
                onClick={() => {
                  setShowTracksMenu(!showTracksMenu);
                  setShowOverviewMenu(false);
                }}
                className={`px-5 py-2.5 rounded-full backdrop-blur-xl border font-mono text-xs sm:text-sm font-medium flex items-center gap-2.5 shadow-2xl transition-all duration-300 ease-out hover:scale-105 active:scale-95 cursor-pointer ${
                  showTracksMenu
                    ? 'bg-rose-600/30 border-rose-500/50 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)]'
                    : 'bg-black/60 hover:bg-black/80 border-white/15 text-white/90 hover:text-white'
                }`}
              >
                <ListMusic className={`w-4 h-4 transition-transform duration-300 ${showTracksMenu ? 'rotate-90 text-rose-400' : 'text-white/70'}`} />
                <span>Tracks</span>
                <span className="text-white/40 text-[10px]">↗</span>
              </button>

              {/* [ ≡ Lyrics ↗ ] Button */}
              <button
                onClick={onOpenLyrics}
                className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 text-white font-mono text-xs sm:text-sm font-medium flex items-center gap-2.5 shadow-2xl transition-all duration-300 ease-out hover:scale-105 active:scale-95 cursor-pointer"
              >
                <FileText className="w-4 h-4 text-white" />
                <span>Lyrics</span>
                <span className="text-white/60 text-[10px]">↗</span>
              </button>
            </div>
          </div>

          {/* RIGHT FLOATING VERTICAL TOOLBAR matching Screenshot 1 */}
          <div className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-2.5 p-2 rounded-full bg-black/65 backdrop-blur-xl border border-white/15 shadow-2xl">
            {/* Stream reload */}
            <button
              onClick={() => onSeek(0)}
              className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/15 transition-all cursor-pointer"
              title="Restart song"
            >
              <RotateCcw className="w-4 h-4" />
            </button>


            {/* Playback Speed menu toggle */}
            <div className="relative">
              <button
                onClick={() => setShowSpeedPopover(!showSpeedPopover)}
                className={`p-2 rounded-full transition-all cursor-pointer ${
                  playbackSpeed !== 1 ? 'text-[#ff3377] bg-white/10' : 'text-white/70 hover:text-white hover:bg-white/15'
                }`}
                title="Playback Speed"
              >
                <Sliders className="w-4 h-4" />
              </button>

              {showSpeedPopover && (
                <div className="absolute right-12 top-0 bg-zinc-950/95 border border-white/20 rounded-3xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.95)] z-50 flex flex-col gap-3 w-60 font-mono text-xs animate-in fade-in zoom-in-95 slide-in-from-right-3 duration-200 backdrop-blur-2xl select-none">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <div className="flex items-center gap-2 text-white font-bold">
                      <Sliders className="w-4 h-4 text-rose-500" />
                      <span>Speed & Tempo</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-400 font-bold text-[11px]">
                      {playbackSpeed}x
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((sp) => (
                      <button
                        key={sp}
                        onClick={() => {
                          onChangeSpeed(sp);
                        }}
                        className={`py-2 rounded-xl transition-all cursor-pointer font-bold text-center active:scale-95 ${
                          playbackSpeed === sp
                            ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-[0_0_12px_rgba(239,68,68,0.6)]'
                            : 'bg-white/5 hover:bg-white/15 text-white/70 hover:text-white border border-white/5'
                        }`}
                      >
                        {sp}x
                      </button>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-white/40">Fine-Tune:</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onChangeSpeed(Math.max(0.25, parseFloat((playbackSpeed - 0.05).toFixed(2))))}
                        className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold active:scale-90 transition-all cursor-pointer border border-white/10"
                        title="Slow down (-0.05x)"
                      >
                        -0.05
                      </button>
                      <button
                        onClick={() => onChangeSpeed(Math.min(3.0, parseFloat((playbackSpeed + 0.05).toFixed(2))))}
                        className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold active:scale-90 transition-all cursor-pointer border border-white/10"
                        title="Speed up (+0.05x)"
                      >
                        +0.05
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Cue marker drawer toggle */}
            <button
              onClick={() => setShowCuePopover(!showCuePopover)}
              className={`p-2 rounded-full transition-all cursor-pointer ${
                cuePoints.length > 1 ? 'text-[#ff3377] bg-white/10' : 'text-white/70 hover:text-white hover:bg-white/15'
              }`}
              title="Cue Markers"
            >
              <Flag className="w-4 h-4" />
            </button>

            {/* Volume toggle */}
            <button
              onClick={onToggleMute}
              className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/15 transition-all cursor-pointer"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </main>

      {/* BOTTOM CONTROL BAR - Ultra-Modern Glassmorphic Audio Deck */}
      <footer className="relative border-t border-white/10 bg-zinc-950/90 backdrop-blur-2xl px-4 sm:px-8 py-3.5 shrink-0 z-30 shadow-[0_-10px_40px_rgba(0,0,0,0.8)]">
        <div className="max-w-7xl 2xl:max-w-[1800px] mx-auto flex flex-col gap-3">
          
          {/* WAVEFORM & TIMELINE SCRUBBER CONTAINER */}
          <div className="relative flex items-center gap-3 w-full">
            <span className="text-[11px] font-mono text-white/50 w-10 text-right shrink-0">
              {formatTime(currentTime)}
            </span>

            {/* Interactive Progress Bar */}
            <div
              ref={progressBarRef}
              onClick={handleProgressBarClick}
              onMouseMove={handleProgressBarMouseMove}
              onMouseLeave={() => setHoverTime(null)}
              className="flex-1 h-2 hover:h-3.5 bg-white/10 hover:bg-white/15 rounded-full cursor-pointer relative transition-all duration-200 group overflow-visible shadow-inner"
            >
              {/* Active Audio Range Glow - ONLY GRADIENT RED */}
              <div
                className="h-full bg-gradient-to-r from-red-700 via-red-600 to-rose-600 rounded-full relative shadow-[0_0_14px_rgba(239,68,68,0.8)] transition-all duration-75"
                style={{ width: `${progressPercent}%` }}
              >
                {/* Playhead Handle */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.9)] opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-110 transition-all duration-150" />
              </div>

              {/* Loop A Indicator */}
              {loopPointA !== null && duration > 0 && (
                <div
                  className="absolute top-0 bottom-0 w-1 bg-amber-400 z-20 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.8)]"
                  style={{ left: `${(loopPointA / duration) * 100}%` }}
                  title={`Loop A: ${formatTime(loopPointA)}`}
                >
                  <span className="absolute -top-5 -translate-x-1/2 px-1 py-0.2 bg-amber-400 text-black text-[9px] font-mono font-bold rounded shadow-sm">
                    A
                  </span>
                </div>
              )}

              {/* Loop B Indicator */}
              {loopPointB !== null && duration > 0 && (
                <div
                  className="absolute top-0 bottom-0 w-1 bg-emerald-400 z-20 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                  style={{ left: `${(loopPointB / duration) * 100}%` }}
                  title={`Loop B: ${formatTime(loopPointB)}`}
                >
                  <span className="absolute -top-5 -translate-x-1/2 px-1 py-0.2 bg-emerald-400 text-black text-[9px] font-mono font-bold rounded shadow-sm">
                    B
                  </span>
                </div>
              )}

              {/* Cue points on timeline (Filtered to keep progress bar start strictly gradient red) */}
              {cuePoints.filter(cue => cue.time > 0.5).map((cue) => {
                const cuePct = duration > 0 ? (cue.time / duration) * 100 : 0;
                return (
                  <div
                    key={cue.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSeek(cue.time);
                    }}
                    className="absolute top-0 bottom-0 w-1 bg-rose-500 hover:w-1.5 hover:bg-red-400 transition-all z-20 rounded-full shadow-[0_0_8px_rgba(244,63,94,0.9)]"
                    style={{ left: `${cuePct}%` }}
                    title={`${cue.label}: ${formatTime(cue.time)}`}
                  />
                );
              })}

              {/* Hover Seeker Tooltip */}
              {hoverTime !== null && (
                <div
                  className="absolute -top-9 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-zinc-900 border border-white/20 text-white text-[10px] font-mono shadow-2xl pointer-events-none z-30 flex items-center gap-1.5 backdrop-blur-md"
                  style={{ left: `${hoverX}px` }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-ping" />
                  <span>{formatTime(hoverTime)}</span>
                </div>
              )}
            </div>

            <span className="text-[11px] font-mono text-white/40 w-10 shrink-0">
              {formatTime(duration)}
            </span>
          </div>

          {/* MAIN 3-ZONE CONTROL DECK */}
          <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4">
            
            {/* LEFT ZONE: MINIMALIST TRACK INFO */}
            <div className="flex items-center gap-3 justify-start min-w-0">
              {/* Minimalist Active Track Title Chip */}
              <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-2xl bg-white/[0.04] border border-white/10 min-w-0 max-w-[240px] sm:max-w-[280px]">
                <Music2 className="w-3.5 h-3.5 text-rose-500 shrink-0 animate-pulse" />
                <span className="text-xs font-mono text-white/90 truncate tracking-tight">
                  {song.title} <span className="text-white/40 font-normal">({song.artist})</span>
                </span>
              </div>
            </div>

            {/* CENTER ZONE: TRANSPORT CONTROLS */}
            <div className="flex items-center justify-center gap-2 sm:gap-3">
              {/* Skip Prev */}
              <button
                onClick={onPrev}
                className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all duration-150 active:scale-90 cursor-pointer"
                title="Previous track"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              {/* Rewind -10s */}
              <button
                onClick={() => onSeek(Math.max(0, currentTime - 10))}
                className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all duration-150 active:scale-90 cursor-pointer"
                title="Rewind 10 seconds"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* MAIN PLAY / PAUSE BUTTON */}
              <button
                onClick={onPlayPause}
                className="w-11 h-11 rounded-full bg-gradient-to-tr from-white via-slate-100 to-white hover:scale-105 active:scale-95 text-black flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.4)] transition-all duration-200 cursor-pointer"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 fill-current text-black" />
                ) : (
                  <Play className="w-5 h-5 fill-current text-black ml-0.5" />
                )}
              </button>

              {/* Stop */}
              <button
                onClick={onStop}
                className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all duration-150 active:scale-90 cursor-pointer"
                title="Stop playback"
              >
                <Square className="w-4 h-4 fill-current text-white/70" />
              </button>

              {/* Forward +10s */}
              <button
                onClick={() => onSeek(Math.min(duration, currentTime + 10))}
                className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all duration-150 active:scale-90 cursor-pointer"
                title="Forward 10 seconds"
              >
                <RotateCw className="w-4 h-4" />
              </button>

              {/* Skip Next */}
              <button
                onClick={onNext}
                className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all duration-150 active:scale-90 cursor-pointer"
                title="Next track"
              >
                <ChevronLeft className="w-5 h-5 rotate-180" />
              </button>

              {/* Repeat Mode Toggle */}
              <button
                onClick={() => {
                  if (repeatMode === 'off') setRepeatMode('all');
                  else if (repeatMode === 'all') setRepeatMode('one');
                  else setRepeatMode('off');
                }}
                className={`p-2 rounded-xl transition-all duration-150 cursor-pointer ${
                  repeatMode !== 'off'
                    ? 'bg-pink-500/20 text-pink-400 border border-pink-500/40 shadow-[0_0_10px_rgba(236,72,153,0.3)]'
                    : 'text-white/40 hover:text-white hover:bg-white/10'
                }`}
                title={`Repeat Mode: ${repeatMode}`}
              >
                {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
              </button>
            </div>

            {/* RIGHT ZONE: PLAYLIST, CUES, SPEED, DOWNLOAD, A-B LOOP, VOLUME */}
            <div className="flex items-center justify-end gap-1.5 sm:gap-2">
              
              {/* Cue Marker Popover Toggle & Counter */}
              <div className="relative">
                <button
                  onClick={() => setShowCuePopover(!showCuePopover)}
                  className={`p-2 rounded-xl transition-all duration-150 cursor-pointer flex items-center gap-1 ${
                    showCuePopover || cuePoints.length > 1
                      ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                  title="Cue Points"
                >
                  <Flag className="w-4 h-4" />
                  {cuePoints.length > 0 && (
                    <span className="text-[10px] font-mono font-bold">{cuePoints.length}</span>
                  )}
                </button>

                {/* Cue Popover Drawer */}
                {showCuePopover && (
                  <div className="absolute right-0 bottom-12 bg-zinc-900 border border-white/15 rounded-2xl p-3 shadow-2xl z-40 w-56 font-mono text-xs animate-in fade-in slide-in-from-bottom-2 duration-150 backdrop-blur-xl">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                      <span className="font-bold text-white/90">Cue Markers</span>
                      <button
                        onClick={handleAddCue}
                        className="px-2 py-0.5 rounded-lg bg-pink-500 hover:bg-pink-600 text-white text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Add Cue
                      </button>
                    </div>

                    <div className="max-h-36 overflow-y-auto flex flex-col gap-1 pr-1">
                      {cuePoints.map((cue) => (
                        <div
                          key={cue.id}
                          onClick={() => onSeek(cue.time)}
                          className="flex items-center justify-between p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
                        >
                          <span className="truncate">{cue.label}</span>
                          <span className="text-[10px] text-pink-400 font-bold shrink-0">
                            {formatTime(cue.time)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Add to my playlist */}
              <button
                onClick={() => onOpenAddToPlaylist && onOpenAddToPlaylist(song)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-all duration-150 active:scale-95 cursor-pointer"
                title="Add to my playlist"
              >
                <ListPlus className="w-4 h-4 text-white" />
              </button>



              {/* Download Master Audio */}
              <button
                onClick={() => onDownload(song)}
                className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all duration-150 cursor-pointer"
                title="Download Audio File"
              >
                <Download className="w-4 h-4" />
              </button>

              {/* Volume Toggle Control */}
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-white/5 border border-white/10">
                <button
                  onClick={onToggleMute}
                  className="p-1 text-white/70 hover:text-white transition-colors cursor-pointer"
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? (
                    <VolumeX className="w-4 h-4 text-rose-400" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-white/80" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                  className="w-14 sm:w-16 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-pink-500"
                  title="Volume"
                />
              </div>

              {/* A-B Loop Controls */}
              <div className="flex items-center p-0.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono">
                <button
                  onClick={togglePointA}
                  className={`px-2.5 py-1 rounded-lg transition-all duration-150 cursor-pointer ${
                    loopPointA !== null
                      ? 'bg-amber-400 text-black font-bold shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                      : 'text-white/60 hover:text-white'
                  }`}
                  title={loopPointA !== null ? `Loop A set: ${formatTime(loopPointA)}` : 'Set Loop Point A'}
                >
                  A
                </button>
                <button
                  onClick={togglePointB}
                  className={`px-2.5 py-1 rounded-lg transition-all duration-150 cursor-pointer ${
                    loopPointB !== null
                      ? 'bg-emerald-400 text-black font-bold shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                      : 'text-white/60 hover:text-white'
                  }`}
                  title={loopPointB !== null ? `Loop B set: ${formatTime(loopPointB)}` : 'Set Loop Point B'}
                >
                  B
                </button>
                {(loopPointA !== null || loopPointB !== null) && (
                  <button
                    onClick={clearABLoop}
                    className="px-1.5 py-0.5 text-[11px] text-white/40 hover:text-rose-400 transition-colors cursor-pointer"
                    title="Clear A-B Loop"
                  >
                    ×
                  </button>
                )}
              </div>

            </div>

          </div>
        </div>
      </footer>
    </div>
  );
};

