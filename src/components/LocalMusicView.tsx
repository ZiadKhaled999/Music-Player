import React, { useState, useRef, useEffect } from 'react';
import { SongItem } from '../types';
import {
  Folder,
  FolderOpen,
  Play,
  Pause,
  Music,
  ArrowLeft,
  Search,
  HardDrive,
  Volume2,
  FileAudio,
  Radio,
  Sliders,
  Settings
} from 'lucide-react';
import { getHighResThumbnail } from '../utils/image';

interface LocalMusicViewProps {
  localSongs: SongItem[];
  folderName: string;
  onSelectSong: (song: SongItem) => void;
  onOpenFolderPicker: () => void;
  onBackToSearch: () => void;
  currentSong: SongItem | null;
  isPlaying: boolean;
  onOpenSettings: () => void;
  downloadPath: string;
}

export const LocalMusicView: React.FC<LocalMusicViewProps> = ({
  localSongs,
  folderName,
  onSelectSong,
  onOpenFolderPicker,
  onBackToSearch,
  currentSong,
  isPlaying,
  onOpenSettings,
  downloadPath,
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const filteredSongs = localSongs.filter((song) => {
    const q = filterQuery.toLowerCase();
    return (
      song.title.toLowerCase().includes(q) ||
      song.artist.toLowerCase().includes(q) ||
      (song.fileType && song.fileType.toLowerCase().includes(q))
    );
  });

  // Animated Audio Visualizer Canvas reacting when music is playing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let phase = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const numBars = 64;
      const barWidth = width / numBars - 2;

      for (let i = 0; i < numBars; i++) {
        // dynamic heights simulating active audio spectrum
        let barHeight = 8;
        if (isPlaying && currentSong?.isLocal) {
          const freq = Math.sin(phase + i * 0.15) * 0.5 + 0.5;
          const bass = Math.cos(phase * 1.5 + i * 0.05) * 0.5 + 0.5;
          barHeight = Math.max(6, (freq * 0.7 + bass * 0.3) * (height * 0.85));
        } else {
          barHeight = 4 + Math.sin(i * 0.2) * 2;
        }

        const x = i * (barWidth + 2);
        const y = height - barHeight;

        const gradient = ctx.createLinearGradient(0, y, 0, height);
        if (isPlaying && currentSong?.isLocal) {
          gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
          gradient.addColorStop(1, 'rgba(255, 255, 255, 0.15)');
        } else {
          gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
          gradient.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, [2, 2, 0, 0]);
        ctx.fill();
      }

      phase += 0.08;
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, currentSong]);

  return (
    <div className="flex-1 flex flex-col max-w-7xl 2xl:max-w-[1800px] w-full mx-auto px-4 sm:px-8 py-6 animate-in fade-in duration-300">
      {/* Top Bar Navigation */}
      <header className="flex items-center justify-between pb-6 border-b border-white/10 gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToSearch}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/15 active:scale-95 text-white/80 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            title="Back to search"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <img
            src="/assets/logo.png"
            alt="Music Player"
            className="w-9 h-9 rounded-xl object-contain bg-white/5 p-1 border border-white/10 shrink-0"
          />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-serif font-bold text-white tracking-tight">
                {folderName || 'Local Music Library'}
              </h2>
            </div>
            <p className="text-xs lg:text-sm font-mono text-white/50 mt-0.5">
              {localSongs.length} local {localSongs.length === 1 ? 'track' : 'tracks'} discovered
            </p>
          </div>
        </div>

        {/* Actions: Settings & Select another folder */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSettings}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs lg:text-sm font-medium flex items-center gap-2 transition-all cursor-pointer border border-white/10 hover:border-white/20"
            title={`Settings (${downloadPath})`}
          >
            <Settings className="w-4 h-4 text-white/80" />
            <span>Settings</span>
          </button>

          <button
            onClick={onOpenFolderPicker}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs lg:text-sm font-medium flex items-center gap-2 transition-all cursor-pointer border border-white/10 hover:border-white/20"
          >
            <FolderOpen className="w-4 h-4 text-white/80" />
            <span>Change Folder</span>
          </button>
        </div>
      </header>

      {/* Interactive Visualizer Banner */}
      <div className="my-6 p-6 lg:p-8 rounded-3xl bg-neutral-950/80 border border-white/10 relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl">
        <div className="z-10 flex items-center gap-4 min-w-0">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden relative">
            {currentSong?.isLocal ? (
              <img
                src={getHighResThumbnail(currentSong.thumbnail, currentSong.id)}
                alt={currentSong.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <FileAudio className="w-7 h-7 text-white/40" />
            )}
            {isPlaying && currentSong?.isLocal && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] lg:text-xs font-mono text-white/80 uppercase tracking-wider">
                {isPlaying && currentSong?.isLocal ? 'Playing Local' : 'Local Visualizer'}
              </span>
            </div>
            <h3 className="font-heading font-semibold text-lg lg:text-xl text-white truncate mt-1">
              {currentSong?.isLocal ? currentSong.title : 'Select any local track to visualize'}
            </h3>
            <p className="text-xs lg:text-sm font-mono text-white/50 truncate">
              {currentSong?.isLocal ? currentSong.artist : 'Real-time audio waveform and spectrum'}
            </p>
          </div>
        </div>

        {/* Real-time Spectrum Visualizer Canvas */}
        <div className="w-full sm:w-72 lg:w-96 h-14 lg:h-16 bg-black/60 rounded-2xl p-2 border border-white/10 flex items-center justify-center shrink-0">
          <canvas
            ref={canvasRef}
            width={340}
            height={52}
            className="w-full h-full"
          />
        </div>
      </div>

      {/* Filter and View toggles */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-md lg:max-w-lg">
          <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter local tracks by name or artist..."
            className="w-full bg-white/5 hover:bg-white/10 focus:bg-white/10 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm font-sans text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-all"
          />
        </div>

        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1 rounded-lg text-xs lg:text-sm font-mono transition-all cursor-pointer ${
              viewMode === 'grid' ? 'bg-white/20 text-white font-medium' : 'text-white/40 hover:text-white'
            }`}
          >
            Grid
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1 rounded-lg text-xs lg:text-sm font-mono transition-all cursor-pointer ${
              viewMode === 'list' ? 'bg-white/20 text-white font-medium' : 'text-white/40 hover:text-white'
            }`}
          >
            List
          </button>
        </div>
      </div>

      {/* Empty State */}
      {filteredSongs.length === 0 && (
        <div className="py-24 text-center space-y-3">
          <Folder className="w-10 h-10 text-white/20 mx-auto" />
          <p className="font-heading font-medium text-base text-white/70">
            {localSongs.length === 0
              ? 'No audio files found in selected folder'
              : `No tracks matching "${filterQuery}"`}
          </p>
          <p className="text-xs font-mono text-white/40">
            Supported audio formats: MP3, WAV, FLAC, M4A, OGG, AAC
          </p>
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && filteredSongs.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-5 lg:gap-6 pb-36">
          {filteredSongs.map((song) => {
            const isCurrentActive = currentSong?.id === song.id;

            return (
              <div
                key={song.id}
                onClick={() => onSelectSong(song)}
                className="group flex flex-col cursor-pointer transition-all duration-200 select-none"
              >
                {/* Artwork */}
                <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-neutral-900 border border-white/10 shadow-md group-hover:shadow-2xl group-hover:scale-[1.02] transition-all duration-200">
                  <img
                    src={getHighResThumbnail(song.thumbnail, song.id)}
                    alt={song.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:brightness-105"
                  />

                  {/* Format tag badge */}
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md border border-white/10 text-[10px] font-mono text-white/80 uppercase">
                    {song.fileType || 'Audio'}
                  </div>

                  {/* Play overlay */}
                  <div
                    className={`absolute inset-0 bg-black/45 backdrop-blur-[2px] flex items-center justify-center transition-opacity duration-200 ${
                      isCurrentActive && isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    <div className="w-11 h-11 rounded-full bg-white text-black flex items-center justify-center shadow-lg transform group-hover:scale-105 transition-transform">
                      {isCurrentActive && isPlaying ? (
                        <Pause className="w-5 h-5 fill-current" />
                      ) : (
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Title & metadata */}
                <h4 className="font-heading font-medium text-sm sm:text-[15px] text-neutral-100 truncate mt-2.5 leading-snug group-hover:text-white">
                  {song.title}
                </h4>
                <div className="flex items-center justify-between text-xs text-neutral-400 mt-0.5">
                  <span className="truncate">{song.artist}</span>
                  {song.fileSize && (
                    <span className="font-mono text-[11px] text-white/40 shrink-0 ml-2">
                      {song.fileSize}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && filteredSongs.length > 0 && (
        <div className="space-y-1.5 pb-36">
          {filteredSongs.map((song, index) => {
            const isCurrentActive = currentSong?.id === song.id;

            return (
              <div
                key={song.id}
                onClick={() => onSelectSong(song)}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer group ${
                  isCurrentActive
                    ? 'bg-white/15 border-white/30 text-white'
                    : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/5 hover:border-white/15 text-neutral-300'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <span className="w-6 text-center font-mono text-xs text-white/40">
                    {index + 1}
                  </span>

                  <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-neutral-800 shrink-0 border border-white/10">
                    <img
                      src={getHighResThumbnail(song.thumbnail, song.id)}
                      alt={song.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      {isCurrentActive && isPlaying ? (
                        <Pause className="w-4 h-4 fill-white text-white" />
                      ) : (
                        <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                      )}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <h5 className="font-heading font-medium text-sm text-white truncate">
                      {song.title}
                    </h5>
                    <p className="text-xs font-mono text-white/50 truncate">
                      {song.artist}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono text-white/40 shrink-0">
                  {song.fileType && (
                    <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 uppercase text-[10px]">
                      {song.fileType}
                    </span>
                  )}
                  {song.fileSize && <span>{song.fileSize}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
