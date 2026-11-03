import React, { useEffect, useRef, useState, useMemo } from 'react';
import { SongItem, LyricsResponse, SyncedLyricLine } from '../types';
import {
  X,
  Copy,
  Check,
  Download,
  FileText
} from 'lucide-react';

interface StudioLyricsCardProps {
  song: SongItem;
  lyricsData: LyricsResponse | null;
  currentTime: number;
  loading: boolean;
  notFound: boolean;
  onClose: () => void;
  onSeek: (time: number) => void;
  onDownload: (song: SongItem) => void;
  isPlaying: boolean;
}

export const StudioLyricsCard: React.FC<StudioLyricsCardProps> = ({
  song,
  lyricsData,
  currentTime = 0,
  loading = false,
  notFound = false,
  onClose,
  onSeek,
  onDownload,
  isPlaying,
}) => {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'synced' | 'plain'>('synced');
  const [autoScroll, setAutoScroll] = useState(true);

  const activeLineRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const safeCurrentTime = typeof currentTime === 'number' && !isNaN(currentTime) ? currentTime : 0;

  // Filter and validate lines
  const lines: SyncedLyricLine[] = useMemo(() => {
    if (!lyricsData || !Array.isArray(lyricsData.lines)) return [];
    return lyricsData.lines
      .filter((l): l is SyncedLyricLine => !!l && typeof l.text === 'string')
      .map((l) => ({
        time: typeof l.time === 'number' && !isNaN(l.time) ? l.time : 0,
        text: String(l.text || '').trim(),
      }))
      .filter((l) => l.text.length > 0)
      .sort((a, b) => a.time - b.time);
  }, [lyricsData]);

  const isSynced = Boolean(lyricsData?.isSynced && lines.length > 0);

  // Active line index
  const activeIndex = useMemo(() => {
    if (!isSynced || lines.length === 0) return -1;
    for (let i = 0; i < lines.length; i++) {
      const lineTime = lines[i]?.time ?? 0;
      const nextLineTime = lines[i + 1]?.time;
      if (safeCurrentTime >= lineTime) {
        if (i === lines.length - 1 || (typeof nextLineTime === 'number' && safeCurrentTime < nextLineTime)) {
          return i;
        }
      }
    }
    return -1;
  }, [isSynced, lines, safeCurrentTime]);

  // Smooth scroll active line into view
  useEffect(() => {
    if (autoScroll && activeLineRef.current && scrollContainerRef.current && activeIndex >= 0) {
      try {
        activeLineRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      } catch {
        // Fallback
      }
    }
  }, [activeIndex, autoScroll]);

  const handleCopy = () => {
    try {
      const plain = lyricsData?.plainLyrics?.trim();
      const textToCopy = plain || lines.map((l) => l.text).join('\n');
      if (textToCopy && navigator.clipboard) {
        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Fallback
    }
  };

  const formatTimestamp = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/20 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 md:p-8 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* 100% Totally Transparent Modal Container with Deep Backdrop Blur */}
      <div
        className="relative w-full max-w-4xl lg:max-w-5xl h-[85vh] max-h-[820px] rounded-[36px] bg-transparent backdrop-blur-3xl border border-white/20 shadow-[0_30px_90px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Transparent Top Header Bar */}
        <div className="pt-4 pb-3 px-6 sm:px-8 flex items-center justify-between border-b border-white/15 bg-transparent backdrop-blur-2xl">
          {/* Track Identity Header */}
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative shrink-0">
              <img
                src={song.thumbnail}
                alt={song.title}
                className="w-10 h-10 rounded-xl object-cover border border-white/20 shadow-md"
              />
              {isPlaying && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-black animate-pulse" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="font-heading font-bold text-sm sm:text-base text-white truncate leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                {song.title}
              </h3>
              <p className="text-xs font-mono text-white/70 truncate drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
                {song.artist}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {isSynced && (
              <button
                onClick={() => setViewMode(viewMode === 'synced' ? 'plain' : 'synced')}
                className="px-3 py-1 rounded-full text-xs font-mono font-medium border border-white/20 bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer backdrop-blur-md"
                title="Toggle between Synced and Plain text lyrics"
              >
                {viewMode === 'synced' ? 'Synced View' : 'Plain Text'}
              </button>
            )}
            <button
              onClick={handleCopy}
              className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
              title="Copy Lyrics"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={() => onDownload(song)}
              className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
              title="Download Song"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/15 transition-colors ml-1 cursor-pointer"
              title="Close lyrics"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Totally Transparent Body */}
        <div className="flex-1 relative overflow-hidden bg-transparent backdrop-blur-3xl p-6 sm:p-10 flex flex-col">
          {/* Loading State */}
          {loading && (
            <div className="flex-1 flex flex-col items-center justify-center text-white space-y-4">
              <div className="w-9 h-9 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <p className="font-heading font-medium text-sm text-white/80 tracking-wide drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
                Fetching synchronized lyrics…
              </p>
            </div>
          )}

          {/* Not Found State */}
          {!loading && notFound && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-white space-y-3">
              <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-white/80 border border-white/20">
                <FileText className="w-7 h-7" />
              </div>
              <h4 className="font-heading font-bold text-xl text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">Lyrics Not Available</h4>
              <p className="text-sm font-sans text-white/70 max-w-sm drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
                No synced lyrics are currently found for this track in the music catalog.
              </p>
            </div>
          )}

          {/* Synced Lyrics List - Wide Kinetic Typography */}
          {!loading && !notFound && viewMode === 'synced' && lines.length > 0 && (
            <div
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto custom-scrollbar space-y-6 py-12 px-3 sm:px-6 scroll-smooth"
            >
              {lines.map((line, idx) => {
                const isActive = idx === activeIndex;
                const isPast = idx < activeIndex;

                return (
                  <div
                    key={`${line.time}-${idx}`}
                    ref={isActive ? activeLineRef : null}
                    onClick={() => {
                      onSeek(line.time);
                      setAutoScroll(true);
                    }}
                    className={`transition-all duration-300 cursor-pointer text-left group ${
                      isActive
                        ? 'opacity-100 scale-[1.01] transform'
                        : isPast
                        ? 'opacity-40 hover:opacity-85'
                        : 'opacity-50 hover:opacity-90'
                    }`}
                  >
                    {/* Timestamp hint on hover */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-mono tracking-wider text-white/60 opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                        {formatTimestamp(line.time)} • Tap to jump here
                      </span>
                    </div>

                    {/* Kinetic Typography Line */}
                    <p
                      className={`font-heading leading-snug tracking-tight transition-all duration-300 ${
                        isActive
                          ? 'text-2xl sm:text-3xl md:text-4xl font-extrabold text-white drop-shadow-[0_3px_15px_rgba(0,0,0,0.95)]'
                          : 'text-lg sm:text-xl md:text-2xl font-bold text-white/70 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]'
                      }`}
                    >
                      {line.text}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Plain Lyrics Mode */}
          {!loading && !notFound && (viewMode === 'plain' || lines.length === 0) && (
            <div className="flex-1 overflow-y-auto custom-scrollbar py-6 px-4 sm:px-6">
              <pre className="font-heading text-lg sm:text-xl font-bold text-white whitespace-pre-wrap leading-relaxed tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
                {lyricsData?.plainLyrics || lines.map((l) => l.text).join('\n')}
              </pre>
            </div>
          )}

          {/* Transparent Bottom Card Footer */}
          <div className="pt-3.5 border-t border-white/15 flex items-center justify-between text-xs text-white/70 font-mono">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">{isSynced ? 'Synchronized with audio' : 'Static lyrics'}</span>
            </div>
            {isSynced && (
              <button
                onClick={() => setAutoScroll(!autoScroll)}
                className={`px-3 py-1 rounded-full transition-all text-xs cursor-pointer border border-white/15 backdrop-blur-md ${
                  autoScroll ? 'bg-white/20 text-white font-medium' : 'text-white/60 hover:text-white'
                }`}
              >
                {autoScroll ? 'Auto-scroll On' : 'Auto-scroll Off'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
