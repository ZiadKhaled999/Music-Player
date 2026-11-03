import React from 'react';
import { SongItem } from '../types';
import { X, Layers, ListPlus, Download, ExternalLink, Music2 } from 'lucide-react';

interface TrackOverviewModalProps {
  song: SongItem;
  onClose: () => void;
  onDownload: (song: SongItem) => void;
  onOpenAddToPlaylist?: (song: SongItem) => void;
}

export const TrackOverviewModal: React.FC<TrackOverviewModalProps> = ({
  song,
  onClose,
  onDownload,
  onOpenAddToPlaylist,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-neutral-950/95 border border-white/15 rounded-3xl shadow-[0_24px_60px_rgba(0,0,0,0.9)] overflow-hidden font-sans select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 bg-neutral-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/10 border border-white/10">
              <Layers className="w-4 h-4 text-rose-500" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-sm tracking-wide text-white uppercase">
                Track Overview
              </h3>
              <p className="text-[11px] font-mono text-white/40 truncate max-w-xs">
                {song.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body - Pure Metadata Only */}
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/10">
            <img
              src={song.thumbnail}
              alt={song.title}
              className="w-20 h-20 rounded-2xl object-cover border border-white/10 shadow-xl shrink-0"
            />
            <div className="min-w-0 flex-1 space-y-1 font-mono text-xs">
              <h4 className="font-heading font-bold text-base text-white truncate">
                {song.title}
              </h4>
              <p className="text-white/70 truncate">
                {song.artist}
              </p>
              <div className="flex items-center gap-2 pt-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-white/10 border border-white/15 text-white/90 font-medium">
                  {song.isLocal ? 'Local Storage' : 'Digital Master'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/5 text-white/70">
                  {song.duration || '03:30'}
                </span>
              </div>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
              <span className="text-white/40 block">Album / Collection</span>
              <span className="text-white font-medium truncate block">{song.album || 'Single'}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
              <span className="text-white/40 block">Duration</span>
              <span className="text-white font-medium">{song.duration || '03:30'}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
              <span className="text-white/40 block">Release Year</span>
              <span className="text-white font-medium">{song.year || '2026'}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
              <span className="text-white/40 block">Audio Format</span>
              <span className="text-white font-medium">{song.fileType ? song.fileType.toUpperCase() : 'M4A / Stereo'}</span>
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-2 flex items-center gap-3">
            {onOpenAddToPlaylist && (
              <button
                onClick={() => {
                  onClose();
                  onOpenAddToPlaylist(song);
                }}
                className="py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-heading font-medium text-xs flex items-center gap-2 transition-all cursor-pointer border border-white/10 active:scale-95"
              >
                <ListPlus className="w-4 h-4 text-rose-400" />
                <span>Add to Playlist</span>
              </button>
            )}

            <button
              onClick={() => onDownload(song)}
              className="flex-1 py-3 px-4 rounded-xl bg-white text-black hover:bg-neutral-200 font-heading font-semibold text-xs transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </button>

            {!song.isLocal && (
              <a
                href={`https://www.youtube.com/watch?v=${song.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors border border-white/10"
                title="Open Link"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
