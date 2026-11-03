import React, { useState } from 'react';
import { SongItem } from '../types';
import { ListMusic, Trash2, Volume2, X, Music, Play, ListPlus, Plus, ChevronDown, Check, Settings, Download, Maximize2, FolderDown } from 'lucide-react';
import { getHighResThumbnail } from '../utils/image';

interface QueueDrawerProps {
  queue: SongItem[];
  currentIndex: number;
  currentSong?: SongItem | null;
  onSelectQueueIndex: (index: number) => void;
  onRemoveFromQueue: (index: number) => void;
  onClearQueue: () => void;
  onClose: () => void;
  onOpenAddToPlaylist?: (song: SongItem) => void;
  onDownload?: (song: SongItem) => void;
}

export const QueueDrawer: React.FC<QueueDrawerProps> = ({
  queue,
  currentIndex,
  currentSong,
  onSelectQueueIndex,
  onRemoveFromQueue,
  onClearQueue,
  onClose,
  onOpenAddToPlaylist,
  onDownload,
}) => {
  const [activeTab, setActiveTab] = useState<'playlist' | 'projectFiles'>('playlist');
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);

  const activeTrack = currentSong || (queue.length > 0 ? queue[Math.max(0, currentIndex)] : null);
  const albumTitle = activeTrack?.album && !activeTrack.album.toLowerCase().includes('unknown') ? activeTrack.album : activeTrack?.title || 'Echo Mirage';
  const artistName = activeTrack?.artist || 'Echo Mirage';
  const albumCover = activeTrack ? getHighResThumbnail(activeTrack.thumbnail, activeTrack.id) : '';

  // Project stems mock list
  const projectFiles = [
    { name: `${activeTrack?.title || 'Track'}_Vocals_Master_24bit.wav`, size: '42.4 MB', type: 'Vocals Stem' },
    { name: `${activeTrack?.title || 'Track'}_Bass_Sub_PCM.wav`, size: '38.1 MB', type: 'Bass & Sub' },
    { name: `${activeTrack?.title || 'Track'}_Drums_Percussion.wav`, size: '51.8 MB', type: 'Drums Stem' },
    { name: `${activeTrack?.title || 'Track'}_Synth_Lead_Stereo.wav`, size: '45.2 MB', type: 'Synths & FX' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center sm:justify-start sm:p-6 p-3 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#18191c]/95 border border-white/10 rounded-3xl shadow-[0_24px_70px_rgba(0,0,0,0.95)] overflow-hidden font-sans select-none flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header: icon + "Tracks" + Expand/Close icon matching screenshot */}
        <div className="px-5 py-3.5 border-b border-white/10 bg-[#121316] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ListMusic className="w-4 h-4 text-white" />
            <span className="font-heading font-bold text-sm text-white tracking-wide">
              Tracks
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Expand / Close"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs: Playlist / Project Files matching screenshot */}
        <div className="flex items-center border-b border-white/10 bg-[#141518] px-5 gap-6 text-xs font-heading font-medium">
          <button
            onClick={() => setActiveTab('playlist')}
            className={`py-3 transition-colors border-b-2 cursor-pointer ${
              activeTab === 'playlist'
                ? 'border-white text-white font-semibold'
                : 'border-transparent text-white/40 hover:text-white/80'
            }`}
          >
            Playlist
          </button>
          <button
            onClick={() => setActiveTab('projectFiles')}
            className={`py-3 transition-colors border-b-2 cursor-pointer ${
              activeTab === 'projectFiles'
                ? 'border-white text-white font-semibold'
                : 'border-transparent text-white/40 hover:text-white/80'
            }`}
          >
            Project Files
          </button>
        </div>

        {/* TAB CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {activeTab === 'playlist' ? (
            <>
              {/* Album Header Block matching screenshot */}
              {activeTrack && (
                <div className="p-4 rounded-2xl bg-[#202126] border border-white/10 flex items-center justify-between gap-3 shadow-md">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <img
                      src={albumCover}
                      alt={albumTitle}
                      className="w-14 h-14 rounded-xl object-cover border border-white/10 shrink-0 shadow-lg"
                    />
                    <div className="min-w-0">
                      <h3 className="font-heading font-bold text-base text-white truncate leading-snug">
                        {albumTitle}
                      </h3>
                      <p className="text-xs font-mono text-white/50 truncate mt-0.5">
                        {artistName} · LP · 50 min 37 sec
                      </p>
                    </div>
                  </div>

                  {/* Circular '+' button matching screenshot */}
                  <button
                    onClick={() => onOpenAddToPlaylist && onOpenAddToPlaylist(activeTrack)}
                    className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center shrink-0 border border-white/15 transition-all active:scale-95 cursor-pointer"
                    title="Add to my playlist"
                  >
                    <Plus className="w-5 h-5 text-white" />
                  </button>
                </div>
              )}

              {/* Track List Table matching screenshot */}
              {queue.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center text-white/40 space-y-2">
                  <Music className="w-8 h-8 text-white/20" />
                  <p className="text-xs font-mono">No tracks in playlist</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {queue.map((song, idx) => {
                    const isCurrent = idx === currentIndex;
                    const mixVariant = idx % 2 === 0 ? 'A' : 'B';
                    const isMastered = idx % 3 !== 0;

                    return (
                      <div
                        key={song.id + '-' + idx}
                        className={`group relative flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-white/10 text-white border border-white/15 font-medium'
                            : 'text-white/80 hover:bg-white/5 border border-transparent'
                        }`}
                        onClick={() => onSelectQueueIndex(idx)}
                      >
                        {/* Index & Title */}
                        <div className="flex items-center gap-3 min-w-0 pr-2">
                          <span className="w-4 text-center font-mono text-xs text-white/40 shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-heading text-xs text-white truncate">
                            {song.title} (Mix-0{(idx % 3) + 1}).wav
                          </span>
                        </div>

                        {/* Mix badge, Status Icon, Duration & Dropdown Arrow */}
                        <div className="flex items-center gap-2.5 shrink-0 text-xs font-mono">
                          {/* Mix A/B Badge */}
                          <span className="text-[10px] text-white/60 font-bold px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
                            {mixVariant}
                          </span>

                          {/* Gear or Check status icon */}
                          {isMastered ? (
                            <Check className="w-3.5 h-3.5 text-white/60" />
                          ) : (
                            <Settings className="w-3.5 h-3.5 text-white/40 animate-spin-slow" />
                          )}

                          {/* Duration */}
                          <span className="text-white/50 text-[11px] min-w-[32px] text-right">
                            {song.duration || '3:08'}
                          </span>

                          {/* Dropdown Menu Arrow ▾ */}
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdown(activeDropdown === idx ? null : idx);
                              }}
                              className="p-1 rounded text-white/40 hover:text-white transition-colors cursor-pointer"
                              title="Track options"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>

                            {/* Dropdown Popover */}
                            {activeDropdown === idx && (
                              <div
                                className="absolute right-0 top-6 w-44 bg-[#23252b] border border-white/15 rounded-xl shadow-2xl p-1.5 z-50 text-xs font-mono space-y-1 animate-in fade-in zoom-in-95"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  onClick={() => {
                                    onSelectQueueIndex(idx);
                                    setActiveDropdown(null);
                                  }}
                                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-white flex items-center gap-2"
                                >
                                  <Play className="w-3.5 h-3.5 text-white/70" />
                                  <span>Play Track</span>
                                </button>

                                {onOpenAddToPlaylist && (
                                  <button
                                    onClick={() => {
                                      onOpenAddToPlaylist(song);
                                      setActiveDropdown(null);
                                    }}
                                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-white flex items-center gap-2"
                                  >
                                    <ListPlus className="w-3.5 h-3.5 text-white/70" />
                                    <span>Add to Playlist</span>
                                  </button>
                                )}

                                {onDownload && (
                                  <button
                                    onClick={() => {
                                      onDownload(song);
                                      setActiveDropdown(null);
                                    }}
                                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-white flex items-center gap-2"
                                  >
                                    <Download className="w-3.5 h-3.5 text-white/70" />
                                    <span>Download Master</span>
                                  </button>
                                )}

                                <button
                                  onClick={() => {
                                    onRemoveFromQueue(idx);
                                    setActiveDropdown(null);
                                  }}
                                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-rose-400 flex items-center gap-2"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Remove</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            /* PROJECT FILES TAB */
            <div className="space-y-2 font-mono text-xs">
              <p className="text-[11px] text-white/40 mb-2">
                Exported Master Stems & Multitrack Files
              </p>
              {projectFiles.map((file, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-[#202126] border border-white/5 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="text-white font-medium truncate">{file.name}</div>
                    <div className="text-[10px] text-white/40 mt-0.5">{file.type} • {file.size}</div>
                  </div>
                  <button
                    onClick={() => activeTrack && onDownload && onDownload(activeTrack)}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0"
                    title="Download stem"
                  >
                    <FolderDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

