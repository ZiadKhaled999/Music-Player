import React, { useState, useRef, useEffect } from 'react';
import { SongItem } from '../types';
import {
  ArrowLeft,
  Play,
  Pause,
  Download,
  FileText,
  ListPlus,
  Music2,
  Folder,
  Flame,
  ChevronRight,
  ListMusic,
  Monitor,
  Settings
} from 'lucide-react';
import { getHighResThumbnail } from '../utils/image';

interface InitialSearchViewProps {
  onSelectSong: (song: SongItem) => void;
  onShowLyrics: (song: SongItem) => void;
  onDownloadSong: (song: SongItem) => void;
  onAddToQueue: (song: SongItem) => void;
  currentSong: SongItem | null;
  isPlaying: boolean;
  downloadingSongId: string | null;
  onOpenLocalView: () => void;
  onOpenPlaylists: () => void;
  onOpenElectronGuide: () => void;
  onOpenSettings: () => void;
  downloadPath: string;
}

// Curated high quality trending songs
const DEFAULT_TRENDING: SongItem[] = [
  {
    id: '34Na4j8AVgA',
    title: 'Starboy',
    artist: 'The Weeknd ft. Daft Punk',
    album: 'Starboy',
    year: '2016',
    duration: '3:50',
    durationSeconds: 230,
    thumbnail: 'https://i.ytimg.com/vi/34Na4j8AVgA/hqdefault.jpg',
  },
  {
    id: 'd5gx47-P8c0',
    title: 'Birds of a Feather',
    artist: 'Billie Eilish',
    album: 'Hit Me Hard and Soft',
    year: '2024',
    duration: '3:16',
    durationSeconds: 196,
    thumbnail: 'https://i.ytimg.com/vi/d5gx47-P8c0/hqdefault.jpg',
  },
  {
    id: 'eVli-tstM5E',
    title: 'Espresso',
    artist: 'Sabrina Carpenter',
    album: 'Short n Sweet',
    year: '2024',
    duration: '2:55',
    durationSeconds: 175,
    thumbnail: 'https://i.ytimg.com/vi/eVli-tstM5E/hqdefault.jpg',
  },
  {
    id: 'H58vbez_m4E',
    title: 'Not Like Us',
    artist: 'Kendrick Lamar',
    album: 'Single',
    year: '2024',
    duration: '4:34',
    durationSeconds: 274,
    thumbnail: 'https://i.ytimg.com/vi/H58vbez_m4E/hqdefault.jpg',
  },
  {
    id: 'aEZ8wU4m_4I',
    title: 'Too Sweet',
    artist: 'Hozier',
    album: 'Unheard',
    year: '2024',
    duration: '4:11',
    durationSeconds: 251,
    thumbnail: 'https://i.ytimg.com/vi/aEZ8wU4m_4I/hqdefault.jpg',
  },
  {
    id: '1RKqOmSkGgM',
    title: 'Good Luck, Babe!',
    artist: 'Chappell Roan',
    album: 'Single',
    year: '2024',
    duration: '3:38',
    durationSeconds: 218,
    thumbnail: 'https://i.ytimg.com/vi/1RKqOmSkGgM/hqdefault.jpg',
  },
  {
    id: 'TWcyIpul8OE',
    title: 'Holocene',
    artist: 'Bon Iver',
    album: 'Bon Iver',
    year: '2011',
    duration: '5:37',
    durationSeconds: 337,
    thumbnail: 'https://i.ytimg.com/vi/TWcyIpul8OE/hqdefault.jpg',
  },
];

export const InitialSearchView: React.FC<InitialSearchViewProps> = ({
  onSelectSong,
  onShowLyrics,
  onDownloadSong,
  onAddToQueue,
  currentSong,
  isPlaying,
  downloadingSongId,
  onOpenLocalView,
  onOpenPlaylists,
  onOpenElectronGuide,
  onOpenSettings,
  downloadPath,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SongItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [trendingSongs, setTrendingSongs] = useState<SongItem[]>(DEFAULT_TRENDING);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Auto-focus on first mount
  useEffect(() => {
    inputRef.current?.focus();
  }, [hasSearched]);

  // Stable fixed Trending Music list (never changes or updates dynamically)

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const term = query.trim();
    if (!term) return;

    setHasSearched(true);
    setIsSearching(true);
    setResults([]);

    try {
      const data = window.api?.search
        ? await window.api.search(term)
        : await fetch(`/api/music/search?q=${encodeURIComponent(term)}`).then((r) => r.json());
      if (data.results && Array.isArray(data.results)) {
        setResults(data.results);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleBackToInitial = () => {
    setQuery('');
    setResults([]);
    setHasSearched(false);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans select-none overflow-x-hidden">
      {/* INITIAL SCREEN: Pure black background with centered seamless search + Trending row */}
      {!hasSearched ? (
        <div className="flex-1 flex flex-col justify-between p-6 sm:p-10 md:p-12 lg:p-16 max-w-7xl 2xl:max-w-[1800px] w-full mx-auto animate-in fade-in duration-500">
          {/* Top Quick Bar: Brand Logo & Playlists, Local View, Settings */}
          <div className="w-full flex items-center justify-between gap-3 pt-2 flex-wrap">
            <div className="flex items-center gap-3">
              <img
                src="./assets/logo.png"
                alt="Music Player"
                className="w-9 h-9 rounded-xl object-contain bg-white/5 p-1 border border-white/10 shadow-md"
              />
              <span className="font-heading font-bold text-base sm:text-lg text-white tracking-tight">
                Music Player
              </span>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={onOpenPlaylists}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/15 text-white/80 hover:text-white text-xs lg:text-sm font-mono border border-white/10 hover:border-white/20 transition-all cursor-pointer backdrop-blur-md"
                title="Manage & play custom playlists"
              >
                <ListMusic className="w-4 h-4 text-white" />
                <span>My Playlists</span>
              </button>

              <button
                onClick={onOpenLocalView}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/15 text-white/80 hover:text-white text-xs lg:text-sm font-mono border border-white/10 hover:border-white/20 transition-all cursor-pointer backdrop-blur-md"
                title="Select a local folder with music"
              >
                <Folder className="w-4 h-4 text-white" />
                <span>Local View</span>
              </button>

              <button
                onClick={onOpenSettings}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/15 text-white/80 hover:text-white text-xs lg:text-sm font-mono border border-white/10 hover:border-white/20 transition-all cursor-pointer backdrop-blur-md"
                title={`Download location: ${downloadPath}`}
              >
                <Settings className="w-4 h-4 text-white" />
                <span>Settings</span>
              </button>
            </div>
          </div>

          {/* Center: The Borderless Seamless Input with bold serif font */}
          <div className="my-auto py-12 lg:py-20 flex flex-col items-center justify-center text-center">
            <form onSubmit={handleSearch} className="w-full max-w-4xl lg:max-w-5xl xl:max-w-6xl 2xl:max-w-7xl flex flex-col items-center gap-6 lg:gap-8">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="search any song..."
                className="w-full bg-transparent border-0 outline-none text-center text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-serif font-bold text-white placeholder:text-white/20 tracking-normal focus:outline-none focus:ring-0 shadow-none caret-white transition-all"
                autoComplete="off"
                spellCheck="false"
              />

              <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
                {/* Subtle Minimalist Prompt */}
                <div className="flex items-center gap-2 text-xs lg:text-sm font-mono text-white/30 tracking-widest uppercase">
                  <span className="w-2 h-2 rounded-full bg-white/40 animate-pulse" />
                  <span>Press enter to search</span>
                </div>

                <span className="text-white/20 text-xs hidden sm:inline">·</span>

                {/* Local View button shortcut */}
                <button
                  type="button"
                  onClick={onOpenLocalView}
                  className="flex items-center gap-1.5 text-xs lg:text-sm font-mono text-white/50 hover:text-white underline underline-offset-4 decoration-white/20 hover:decoration-white transition-all cursor-pointer"
                >
                  <Folder className="w-3.5 h-3.5" />
                  <span>browse local folder</span>
                </button>
              </div>
            </form>
          </div>

          {/* BOTTOM SECTION: Trending Music Row */}
          <div className="w-full pt-8 pb-12 border-t border-white/10">
            <div className="flex items-center justify-between mb-4 lg:mb-6">
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-semibold text-sm sm:text-base lg:text-lg text-white/90 tracking-wide">
                  Trending Music
                </h3>
              </div>
              <span className="text-xs lg:text-sm font-mono text-white/40">
                Top Hits · Click to play
              </span>
            </div>

            {/* Horizontal Trending Cards Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 2xl:grid-cols-7 gap-4 lg:gap-6">
              {trendingSongs.slice(0, 7).map((song) => {
                const isCurrentActive = currentSong?.id === song.id;
                const highResUrl = getHighResThumbnail(song.thumbnail, song.id);

                return (
                  <div
                    key={song.id}
                    onClick={() => onSelectSong(song)}
                    className="group flex flex-col cursor-pointer transition-all duration-200 select-none"
                  >
                    <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-neutral-900 border border-white/10 shadow-md group-hover:shadow-2xl group-hover:scale-[1.03] transition-all duration-200">
                      <img
                        src={highResUrl}
                        alt={song.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:brightness-105"
                        loading="lazy"
                      />

                      {/* Hover Overlay */}
                      <div
                        className={`absolute inset-0 bg-black/45 backdrop-blur-[2px] flex items-center justify-center transition-opacity duration-200 ${
                          isCurrentActive && isPlaying
                            ? 'opacity-100'
                            : 'opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        <div className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center shadow-lg transform group-hover:scale-105 transition-transform">
                          {isCurrentActive && isPlaying ? (
                            <Pause className="w-4 h-4 fill-current" />
                          ) : (
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          )}
                        </div>
                      </div>
                    </div>

                    <h4 className="font-heading font-medium text-xs sm:text-sm text-neutral-100 truncate mt-2 group-hover:text-white">
                      {song.title}
                    </h4>
                    <p className="text-[11px] font-mono text-neutral-400 truncate mt-0.5 group-hover:text-neutral-300">
                      {song.artist}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* AFTER ENTER PRESSED: Top bar matching uploaded screenshot + 7-column responsive desktop grid */
        <div className="flex-1 flex flex-col max-w-7xl 2xl:max-w-[1800px] w-full mx-auto px-4 sm:px-8 py-5 animate-in fade-in duration-200">
          {/* Top Search Header */}
          <header className="sticky top-0 z-30 pt-1 pb-5 bg-black/95 backdrop-blur-md">
            <form onSubmit={handleSearch} className="flex items-center gap-3">
              {/* Back Arrow button ← */}
              <button
                type="button"
                onClick={handleBackToInitial}
                className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/15 active:scale-95 text-white/80 hover:text-white flex items-center justify-center transition-all cursor-pointer shrink-0"
                title="Back to home"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              {/* Logo Branding */}
              <img
                src="./assets/logo.png"
                alt="Music Player"
                onClick={handleBackToInitial}
                className="w-9 h-9 rounded-xl object-contain bg-white/5 p-1 border border-white/10 shrink-0 cursor-pointer hover:border-white/30 transition-all"
                title="Back to Home"
              />

              {/* Bold Serif Search Input */}
              <div className="relative flex-1 flex items-center">
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search songs..."
                  className="w-full bg-transparent border-0 outline-none text-xl sm:text-2xl lg:text-3xl font-serif font-bold text-white placeholder:text-white/30 tracking-tight focus:outline-none focus:ring-0 caret-white pr-4"
                  autoComplete="off"
                  spellCheck="false"
                />
              </div>

              {/* Playlists Button */}
              <button
                type="button"
                onClick={onOpenPlaylists}
                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/15 text-white/80 hover:text-white font-mono text-xs lg:text-sm flex items-center gap-1.5 transition-all cursor-pointer border border-white/10 shrink-0"
                title="Playlists"
              >
                <ListMusic className="w-4 h-4" />
                <span className="hidden sm:inline">Playlists</span>
              </button>

              {/* Local View Button */}
              <button
                type="button"
                onClick={onOpenLocalView}
                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/15 text-white/80 hover:text-white font-mono text-xs lg:text-sm flex items-center gap-1.5 transition-all cursor-pointer border border-white/10 shrink-0"
                title="Switch to Local Music Folder"
              >
                <Folder className="w-4 h-4" />
                <span className="hidden sm:inline">Local View</span>
              </button>

              {/* Settings Button */}
              <button
                type="button"
                onClick={onOpenSettings}
                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/15 text-white/80 hover:text-white font-mono text-xs lg:text-sm flex items-center gap-1.5 transition-all cursor-pointer border border-white/10 shrink-0"
                title={`Settings (${downloadPath})`}
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Settings</span>
              </button>

              {/* Search submit button */}
              <button
                type="submit"
                disabled={isSearching}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs lg:text-sm font-medium transition-all cursor-pointer disabled:opacity-40 shrink-0"
              >
                {isSearching ? 'Searching…' : 'Search'}
              </button>
            </form>
          </header>

          {/* LOADING STATE */}
          {isSearching && (
            <div className="flex-1 flex flex-col items-center justify-center py-24 space-y-4 animate-in fade-in duration-200">
              <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              <p className="text-xs font-mono text-white/40 tracking-wider uppercase">
                Loading music catalog…
              </p>
            </div>
          )}

          {/* NO RESULTS FOUND */}
          {!isSearching && results.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center py-24 text-center space-y-3">
              <Music2 className="w-10 h-10 text-white/20" />
              <p className="font-heading font-medium text-base text-white/70">
                No songs found for "{query}"
              </p>
              <p className="text-xs font-mono text-white/40">
                Try searching for an artist name, song title, or genre
              </p>
            </div>
          )}

          {/* RESPONSIVE DESKTOP ALBUM GRID */}
          {!isSearching && results.length > 0 && (
            <div className="pb-36 animate-in fade-in duration-300">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-5 lg:gap-6">
                {results.map((song) => {
                  const isCurrentActive = currentSong?.id === song.id;
                  const yearText = song.year || (song.album && !song.album.toLowerCase().includes('unknown') ? song.album : 'Song');
                  const subtitle = song.year ? `${song.artist} · ${song.year}` : `${song.artist} · ${song.album || 'Single'}`;
                  const highResCover = getHighResThumbnail(song.thumbnail, song.id);

                  return (
                    <div
                      key={song.id}
                      onClick={() => onSelectSong(song)}
                      className="group flex flex-col cursor-pointer transition-all duration-200 select-none"
                    >
                      <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-neutral-900 border border-white/10 shadow-md group-hover:shadow-2xl group-hover:scale-[1.02] transition-all duration-200">
                        <img
                          src={highResCover}
                          alt={song.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:brightness-105"
                          loading="lazy"
                        />

                        {/* Hover Overlay */}
                        <div
                          className={`absolute inset-0 bg-black/45 backdrop-blur-[2px] flex items-center justify-center transition-opacity duration-200 ${
                            isCurrentActive && isPlaying
                              ? 'opacity-100'
                              : 'opacity-0 group-hover:opacity-100'
                          }`}
                        >
                          {isCurrentActive && isPlaying ? (
                            <div className="w-11 h-11 rounded-full bg-white text-black flex items-center justify-center shadow-lg">
                              <Pause className="w-5 h-5 fill-current" />
                            </div>
                          ) : (
                            <div className="w-11 h-11 rounded-full bg-white text-black flex items-center justify-center shadow-lg transform group-hover:scale-105 transition-transform">
                              <Play className="w-5 h-5 fill-current ml-0.5" />
                            </div>
                          )}
                        </div>

                        {/* Hover Actions */}
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/60 backdrop-blur-md rounded-xl p-1 border border-white/10"
                        >
                          <button
                            onClick={() => onShowLyrics(song)}
                            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
                            title="Show Synced Lyrics"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onAddToQueue(song)}
                            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
                            title="Add to queue"
                          >
                            <ListPlus className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onDownloadSong(song)}
                            disabled={downloadingSongId === song.id}
                            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
                            title="Download audio master"
                          >
                            {downloadingSongId === song.id ? (
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Download className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      <h4 className="font-heading font-medium text-sm sm:text-[15px] text-neutral-100 truncate mt-2.5 leading-snug group-hover:text-white">
                        {song.title}
                      </h4>

                      <p className="text-xs text-neutral-400 truncate mt-0.5 leading-tight group-hover:text-neutral-300">
                        {subtitle}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
