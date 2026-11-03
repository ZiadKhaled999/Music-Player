import React, { useState, useEffect, useRef } from 'react';
import { SongItem } from '../types';
import {
  Search,
  Play,
  Download,
  FileText,
  Clock,
  Sparkles,
  ListPlus,
  Volume2,
  X,
  Flame,
  Music,
  Radio
} from 'lucide-react';

interface YouTubeMusicViewProps {
  onPlaySong: (song: SongItem) => void;
  onDownloadSong: (song: SongItem) => void;
  onShowLyrics: (song: SongItem) => void;
  onAddToQueue: (song: SongItem) => void;
  currentSong: SongItem | null;
  isPlaying: boolean;
  downloadingSongId: string | null;
}

const POPULAR_SONGS = [
  { name: 'Blinding Lights', artist: 'The Weeknd', query: 'The Weeknd Blinding Lights' },
  { name: 'Starboy', artist: 'The Weeknd ft. Daft Punk', query: 'The Weeknd Starboy' },
  { name: 'Around The World', artist: 'Daft Punk', query: 'Daft Punk Around The World' },
  { name: 'Never Gonna Give You Up', artist: 'Rick Astley', query: 'Rick Astley Never Gonna Give You Up' },
  { name: 'Interstellar Theme', artist: 'Hans Zimmer', query: 'Hans Zimmer Interstellar Theme' },
  { name: 'Creep', artist: 'Radiohead', query: 'Radiohead Creep' },
  { name: 'Hello', artist: 'Adele', query: 'Adele Hello' },
  { name: 'Lofi Chill Beats', artist: 'Lofi Girl', query: 'Lofi Girl Chill Beats' },
];

export const YouTubeMusicView: React.FC<YouTubeMusicViewProps> = ({
  onPlaySong,
  onDownloadSong,
  onShowLyrics,
  onAddToQueue,
  currentSong,
  isPlaying,
  downloadingSongId,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SongItem[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Initial song search
  useEffect(() => {
    executeSearch('Top Hits');
  }, []);

  const executeSearch = async (searchTerm: string) => {
    const term = searchTerm.trim();
    if (!term) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/music/search?q=${encodeURIComponent(term)}`);
      const data = await res.json();
      if (data.results) {
        setResults(data.results);
      }
    } catch (err) {
      console.error('Song search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(query);
  };

  return (
    <div className="space-y-6">
      {/* Search Header Banner */}
      <div className="bg-[#0F0F0F] border border-[#222222] rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
        {/* Subtle red glow accent in background */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#FF3B30]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-2xl mx-auto space-y-4 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1A1A1A] border border-[#2D2D2D] text-xs font-mono text-[#FF3B30] font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#FF3B30] animate-pulse" />
            Songs Only • YouTube Music
          </div>

          <h2 className="font-heading font-extrabold text-2xl md:text-3xl tracking-tight text-[#FFFFFF]">
            Search and stream any song instantly.
          </h2>

          {/* Dedicated Search Form with Search Button */}
          <form onSubmit={handleSearchSubmit} className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#777777] pointer-events-none">
                <Search className="w-5 h-5" />
              </div>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search song title or artist…"
                className="w-full pl-12 pr-10 py-3.5 rounded-2xl bg-[#161616] border border-[#2D2D2D] text-[#FFFFFF] placeholder-[#666666] font-mono text-sm focus:outline-none focus:border-[#FF3B30] focus:ring-2 focus:ring-[#FF3B30]/20 shadow-inner transition-all"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#777777] hover:text-[#FFFFFF] p-1 rounded-full cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Dedicated Search Button */}
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3.5 rounded-2xl bg-[#FF3B30] hover:bg-[#FF4E45] text-white font-heading font-semibold text-sm shadow-lg shadow-[#FF3B30]/25 active:scale-98 transition-all flex items-center gap-2 shrink-0 cursor-pointer disabled:opacity-60"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              <span>Search</span>
            </button>
          </form>
        </div>
      </div>

      {/* Quick Song Suggestions Row */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-heading font-bold text-sm text-[#CCCCCC]">
            <Flame className="w-4 h-4 text-[#FF3B30]" />
            <span>Popular Songs</span>
          </div>
          <span className="text-xs font-mono text-[#666666]">Click to load</span>
        </div>

        <div className="flex gap-2.5 overflow-x-auto pb-1 custom-scrollbar">
          {POPULAR_SONGS.map((item) => (
            <button
              key={item.query}
              onClick={() => {
                setQuery(item.query);
                executeSearch(item.query);
              }}
              className="shrink-0 px-3.5 py-2 rounded-xl bg-[#121212] border border-[#222222] hover:border-[#FF3B30]/50 text-left transition-all hover:bg-[#181818] cursor-pointer group"
            >
              <div className="font-heading font-semibold text-xs text-[#E0E0E0] group-hover:text-[#FF3B30] truncate max-w-[150px]">
                {item.name}
              </div>
              <div className="text-[11px] font-mono text-[#888888] truncate max-w-[150px]">
                {item.artist}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Songs Tracklist Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-heading font-bold text-base text-[#FFFFFF] flex items-center gap-2">
            <span>Songs</span>
            <span className="text-xs font-mono font-normal px-2.5 py-0.5 rounded-full bg-[#181818] border border-[#2B2B2B] text-[#AAAAAA]">
              {results.length} songs found
            </span>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3 bg-[#0E0E0E] border border-[#222222] rounded-3xl">
            <div className="w-8 h-8 border-3 border-[#FF3B30] border-t-transparent rounded-full animate-spin" />
            <span className="font-mono text-xs text-[#888888]">Searching YouTube Music songs…</span>
          </div>
        ) : results.length === 0 ? (
          <div className="py-16 text-center bg-[#0E0E0E] border border-[#222222] rounded-3xl p-6">
            <Music className="w-10 h-10 text-[#444444] mx-auto mb-2" />
            <h3 className="font-heading font-semibold text-sm text-[#FFFFFF]">No songs found</h3>
            <p className="font-mono text-xs text-[#777777] mt-1">Try another song title or artist name</p>
          </div>
        ) : (
          <div className="bg-[#0E0E0E] border border-[#222222] rounded-3xl overflow-hidden shadow-2xl divide-y divide-[#1C1C1C]">
            {/* Table Header */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-[#141414] text-xs font-mono text-[#888888] font-medium select-none">
              <div className="col-span-1">#</div>
              <div className="col-span-5">Song Title & Artist</div>
              <div className="col-span-3">Album</div>
              <div className="col-span-1 text-right">Duration</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            {/* Song Rows */}
            {results.map((song, idx) => {
              const isCurrent = currentSong?.id === song.id;
              const isDownloadingThis = downloadingSongId === song.id;

              return (
                <div
                  key={song.id + '-' + idx}
                  className={`grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 items-center px-4 md:px-6 py-3.5 transition-colors group ${
                    isCurrent
                      ? 'bg-[#FF3B30]/10 text-white'
                      : 'hover:bg-[#161616]'
                  }`}
                >
                  {/* Number / Play indicator */}
                  <div className="hidden md:flex items-center col-span-1 text-xs font-mono text-[#666666]">
                    {isCurrent && isPlaying ? (
                      <Volume2 className="w-4 h-4 text-[#FF3B30] animate-pulse" />
                    ) : (
                      <span className="group-hover:hidden">{idx + 1}</span>
                    )}
                    <button
                      onClick={() => onPlaySong(song)}
                      className="hidden group-hover:block p-1 rounded-lg text-[#FF3B30] hover:text-white cursor-pointer"
                      title="Play song"
                    >
                      <Play className="w-4 h-4 fill-current" />
                    </button>
                  </div>

                  {/* Title, Artwork & Artist */}
                  <div className="col-span-12 md:col-span-5 flex items-center gap-3.5 min-w-0">
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-[#1A1A1A] border border-[#262626] shrink-0 shadow-md">
                      <img
                        src={song.thumbnail}
                        alt={song.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <button
                        onClick={() => onPlaySong(song)}
                        className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <Play className="w-5 h-5 text-white fill-current ml-0.5" />
                      </button>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-heading font-semibold text-sm truncate ${isCurrent ? 'text-[#FF3B30]' : 'text-[#FFFFFF]'}`}>
                          {song.title}
                        </span>
                        {isCurrent && (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-[#FF3B30] text-white shrink-0">
                            PLAYING
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-mono text-[#AAAAAA] truncate">
                        {song.artist}
                      </div>
                    </div>
                  </div>

                  {/* Album */}
                  <div className="hidden md:block col-span-3 text-xs font-mono text-[#777777] truncate">
                    {song.album || '—'}
                  </div>

                  {/* Duration */}
                  <div className="hidden md:block col-span-1 text-xs font-mono text-[#888888] text-right">
                    {song.duration || '--:--'}
                  </div>

                  {/* Explicit Action Buttons */}
                  <div className="col-span-12 md:col-span-2 flex items-center justify-end gap-1.5 pt-1 md:pt-0">
                    {/* Play Button */}
                    <button
                      onClick={() => onPlaySong(song)}
                      className="px-3 py-1.5 rounded-xl bg-[#FF3B30] text-white hover:bg-[#FF4E45] text-xs font-heading font-medium flex items-center gap-1.5 shadow-md shadow-[#FF3B30]/25 transition-all cursor-pointer"
                      title="Play song"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Play</span>
                    </button>

                    {/* Dedicated Download Button */}
                    <button
                      onClick={() => onDownloadSong(song)}
                      disabled={isDownloadingThis}
                      className="p-2 rounded-xl bg-[#1A1A1A] border border-[#2D2D2D] text-[#CCCCCC] hover:text-[#FF3B30] hover:border-[#FF3B30]/40 transition-all cursor-pointer disabled:opacity-50"
                      title="Download as .m4a"
                    >
                      {isDownloadingThis ? (
                        <div className="w-3.5 h-3.5 border-2 border-[#FF3B30] border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {/* Synced Lyrics Button */}
                    <button
                      onClick={() => onShowLyrics(song)}
                      className="p-2 rounded-xl bg-[#1A1A1A] border border-[#2D2D2D] text-[#CCCCCC] hover:text-[#FFFFFF] hover:border-[#444444] transition-all cursor-pointer"
                      title="Show Synced Lyrics"
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </button>

                    {/* Add to Queue */}
                    <button
                      onClick={() => onAddToQueue(song)}
                      className="p-2 rounded-xl bg-[#1A1A1A] border border-[#2D2D2D] text-[#888888] hover:text-[#FFFFFF] transition-all cursor-pointer"
                      title="Add to queue"
                    >
                      <ListPlus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
