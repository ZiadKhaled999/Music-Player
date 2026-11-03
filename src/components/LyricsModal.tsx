import React, { useEffect, useRef, useState, useMemo } from 'react';
import { SongItem, LyricsResponse, SyncedLyricLine } from '../types';
import {
  X,
  FileText,
  Download,
  Play,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Radio,
  Volume2
} from 'lucide-react';

interface LyricsModalProps {
  song: SongItem | null;
  lyricsData: LyricsResponse | null;
  currentTime: number;
  loading: boolean;
  notFound: boolean;
  onClose: () => void;
  onPlay: (song: SongItem) => void;
  onDownload: (song: SongItem) => void;
  onSeek: (time: number) => void;
  isPlaying: boolean;
}

export const LyricsModal: React.FC<LyricsModalProps> = ({
  song,
  lyricsData,
  currentTime = 0,
  loading = false,
  notFound = false,
  onClose,
  onPlay,
  onDownload,
  onSeek,
  isPlaying = false,
}) => {
  const [autoScroll, setAutoScroll] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<'synced' | 'plain'>('synced');
  const [copied, setCopied] = useState(false);

  const activeLineRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const safeCurrentTime = typeof currentTime === 'number' && !isNaN(currentTime) ? currentTime : 0;

  const lines: SyncedLyricLine[] = useMemo(() => {
    if (!lyricsData || !Array.isArray(lyricsData.lines)) return [];
    return lyricsData.lines
      .filter((l): l is SyncedLyricLine => !!l && typeof l.text === 'string')
      .map((l) => ({
        time: typeof l.time === 'number' && !isNaN(l.time) ? l.time : 0,
        text: String(l.text || '').trim(),
      }))
      .filter((l) => l.text.length > 0);
  }, [lyricsData]);

  const isSynced = Boolean(lyricsData?.isSynced && lines.length > 0);

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

  useEffect(() => {
    if (autoScroll && activeLineRef.current && containerRef.current && activeIndex >= 0) {
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

  const formatTimestamp = (secs: unknown): string => {
    const num = typeof secs === 'number' && !isNaN(secs) ? Math.max(0, secs) : 0;
    const m = Math.floor(num / 60);
    const s = Math.floor(num % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

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

  const handleLineClick = (time: number) => {
    if (!song) return;
    if (!isPlaying) {
      onPlay(song);
    }
    onSeek(time);
    setAutoScroll(true);
  };

  if (!song) return null;

  return (
    <div
      className="fixed inset-0 bg-black/20 backdrop-blur-xl z-50 flex items-center justify-center p-3 md:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={`bg-transparent border border-white/20 rounded-3xl w-full flex flex-col shadow-2xl overflow-hidden font-sans transition-all duration-300 backdrop-blur-3xl ${
          isExpanded ? 'max-w-5xl h-[92vh]' : 'max-w-3xl max-h-[85vh]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="px-5 md:px-6 py-4 border-b border-white/15 bg-transparent backdrop-blur-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative shrink-0">
              <img
                src={song.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100&h=100&fit=crop'}
                alt={song.title || 'Song'}
                className="w-11 h-11 rounded-xl object-cover border border-white/20 shadow-md"
              />
              {isPlaying && (
                <div className="absolute inset-0 bg-black/30 rounded-xl flex items-center justify-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-bold text-base text-white truncate drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                  {song.title}
                </h3>
                {isSynced && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/15 text-white text-[10px] font-mono font-medium shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Synced
                  </span>
                )}
              </div>
              <p className="text-xs font-mono text-white/70 truncate drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
                {song.artist} {song.album ? `• ${song.album}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
            {!isPlaying && (
              <button
                onClick={() => onPlay(song)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-heading font-bold transition-all shadow-md cursor-pointer"
                title="Play song"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span className="hidden sm:inline">Play</span>
              </button>
            )}

            {isSynced && (
              <div className="flex items-center bg-white/10 p-0.5 rounded-xl border border-white/15 text-xs font-mono backdrop-blur-md">
                <button
                  onClick={() => setViewMode('synced')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'synced'
                      ? 'bg-rose-600 text-white font-medium shadow-sm'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  Karaoke
                </button>
                <button
                  onClick={() => setViewMode('plain')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'plain'
                      ? 'bg-rose-600 text-white font-medium shadow-sm'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  Text
                </button>
              </div>
            )}

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all hidden sm:block cursor-pointer"
              title={isExpanded ? 'Restore size' : 'Expand view'}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={() => onDownload(song)}
              className="p-2 rounded-xl bg-white/10 border border-white/15 text-white hover:bg-white/20 transition-all cursor-pointer"
              title="Download song"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all ml-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Container */}
        <div
          ref={containerRef}
          onWheel={() => setAutoScroll(false)}
          onTouchMove={() => setAutoScroll(false)}
          className="flex-1 overflow-y-auto p-5 md:p-10 custom-scrollbar bg-transparent backdrop-blur-3xl relative scroll-smooth"
        >
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-3 border-rose-500 border-t-transparent rounded-full animate-spin" />
              <p className="font-mono text-xs text-white/70 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">Fetching lyrics…</p>
            </div>
          ) : notFound || (!lyricsData?.plainLyrics && lines.length === 0) ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-3 text-center">
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white/70">
                <FileText className="w-6 h-6" />
              </div>
              <h4 className="font-heading font-bold text-sm text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">No lyrics found</h4>
              <p className="font-mono text-xs text-white/70 max-w-sm px-4 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
                No synced or plain lyrics are available for "{song.title}".
              </p>
            </div>
          ) : viewMode === 'synced' && isSynced ? (
            <div className="max-w-2xl mx-auto space-y-3 py-6">
              {lines.map((line, idx) => {
                const isActive = idx === activeIndex;
                const isPast = idx < activeIndex;

                return (
                  <div
                    key={`${line.time}-${idx}`}
                    ref={isActive ? activeLineRef : null}
                    onClick={() => handleLineClick(line.time)}
                    className={`group flex items-start gap-4 p-3.5 rounded-2xl cursor-pointer transition-all duration-200 select-none ${
                      isActive
                        ? 'bg-rose-500/20 border border-rose-500/40 scale-102 shadow-lg shadow-rose-500/10 backdrop-blur-md'
                        : 'hover:bg-white/10 border border-transparent'
                    }`}
                  >
                    <div className="shrink-0 mt-0.5">
                      <span
                        className={`text-[11px] font-mono px-2 py-0.5 rounded-md transition-colors ${
                          isActive
                            ? 'bg-rose-600 text-white font-bold'
                            : 'bg-white/10 text-white/60 group-hover:text-white'
                        }`}
                      >
                        {formatTimestamp(line.time)}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div
                        className={`font-heading transition-all duration-200 ${
                          isActive
                            ? 'font-bold text-white tracking-tight text-xl drop-shadow-[0_3px_12px_rgba(0,0,0,0.95)]'
                            : isPast
                            ? 'font-medium text-white/40 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]'
                            : 'font-medium text-white/80 group-hover:text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]'
                        }`}
                      >
                        {line.text}
                      </div>

                      {isActive && (
                        <div className="mt-1 flex items-center gap-1.5 text-[11px] font-mono text-rose-400 font-semibold drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                          <Radio className="w-3 h-3 animate-pulse" />
                          <span>Now playing</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="max-w-xl mx-auto space-y-4 py-4 px-2">
              <pre className="text-sm font-mono leading-relaxed text-white whitespace-pre-wrap select-text font-sans drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                {lyricsData?.plainLyrics || lines.map((l) => l.text).join('\n')}
              </pre>
            </div>
          )}
        </div>

        {/* Footer Bar */}
        <div className="px-5 md:px-6 py-3.5 border-t border-white/15 bg-transparent backdrop-blur-2xl flex items-center justify-between text-xs font-mono text-white/70">
          <div className="flex items-center gap-3">
            {isSynced && viewMode === 'synced' && (
              <button
                onClick={() => setAutoScroll(!autoScroll)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all cursor-pointer border-white/15 backdrop-blur-md ${
                  autoScroll
                    ? 'bg-rose-600 text-white font-medium border-rose-500'
                    : 'bg-white/10 text-white/60 hover:text-white'
                }`}
              >
                <span>{autoScroll ? 'Auto-scroll On' : 'Auto-scroll Paused'}</span>
              </button>
            )}
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/10 border border-white/15 text-white hover:bg-white/20 transition-all font-medium cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Lyrics</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
