import React, { useState, useEffect, useRef } from 'react';
import { SongItem, StreamInfo } from '../types';
import {
  Search,
  Play,
  Square,
  Music,
  Download,
  FileText,
  ExternalLink,
  ChevronLeft,
  Terminal,
  RotateCw,
  Sparkles,
  Command as CommandIcon,
  Check,
  Radio,
  ArrowRight
} from 'lucide-react';

interface RaycastWindowProps {
  onSelectSong: (song: SongItem) => void;
  onAddToQueue: (song: SongItem) => void;
  onStop: () => void;
  currentSong: SongItem | null;
  isPlaying: boolean;
  isStreamLoading: boolean;
  streamInfo: StreamInfo | null;
}

const SETUP_MD = `# Setup required

This extension needs two tools installed on your Mac. Run these in a terminal:

\`\`\`
brew install mpv
brew install yt-dlp
\`\`\`

Then come back and press **↵** — or just quit and reopen the command.
`;

const POPULAR_SEARCHES = [
  'Daft Punk - Around the World',
  'Rick Astley - Never Gonna Give You Up',
  'The Weeknd - Blinding Lights',
  'Adele - Hello',
  'Lofi Girl Chill Beats',
  'Radiohead - Creep',
  'Hans Zimmer - Time',
];

export const RaycastWindow: React.FC<RaycastWindowProps> = ({
  onSelectSong,
  onAddToQueue,
  onStop,
  currentSong,
  isPlaying,
  isStreamLoading,
  streamInfo,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SongItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showActionPanel, setShowActionPanel] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ title: string; style?: 'success' | 'animated' | 'failure' } | null>(null);

  // Navigation state (simulating Raycast push / useNavigation)
  const [currentView, setCurrentView] = useState<'list' | 'lyrics' | 'setup'>('list');
  const [lyricsTarget, setLyricsTarget] = useState<{ id: string; title: string } | null>(null);
  const [lyricsContent, setLyricsContent] = useState<string | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [lyricsNotFound, setLyricsNotFound] = useState(false);

  // Missing dependencies simulation
  const [simulatedMissingDeps, setSimulatedMissingDeps] = useState<string[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const listContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (currentView === 'list') {
      inputRef.current?.focus();
    }
  }, [currentView]);

  // Debounced search via InnerTube
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/music/search?q=${encodeURIComponent(query)}&type=song`);
        const data = await res.json();
        if (data.results) {
          setResults(data.results);
          setSelectedIndex(0);
        }
      } catch (err: any) {
        showToast('Search failed: ' + err.message, 'failure');
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  const showToast = (title: string, style: 'success' | 'animated' | 'failure' = 'success') => {
    setToastMessage({ title, style });
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  // Open Lyrics view
  const openLyrics = async (song: SongItem) => {
    setLyricsTarget({ id: song.id, title: song.title });
    setCurrentView('lyrics');
    setLyricsLoading(true);
    setLyricsNotFound(false);
    setLyricsContent(null);
    setShowActionPanel(false);

    try {
      const res = await fetch(`/api/music/lyrics?id=${encodeURIComponent(song.id)}&title=${encodeURIComponent(song.title)}`);
      const data = await res.json();
      if (data.success && data.lyrics) {
        setLyricsContent(data.lyrics);
      } else {
        setLyricsNotFound(true);
      }
    } catch {
      setLyricsNotFound(true);
    } finally {
      setLyricsLoading(false);
    }
  };

  // Download song (.m4a with metadata)
  const handleDownload = async (song: SongItem) => {
    setShowActionPanel(false);
    setIsDownloading(true);
    showToast(`Downloading "${song.title}"…`, 'animated');

    try {
      // Trigger download from server
      const downloadUrl = `/api/music/download?id=${encodeURIComponent(song.id)}&title=${encodeURIComponent(song.title)}`;
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${song.title}.m4a`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast(`Saved "${song.title}" to your music folder`, 'success');
    } catch (err: any) {
      showToast('Download failed. Check yt-dlp: brew upgrade yt-dlp', 'failure');
    } finally {
      setIsDownloading(false);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (currentView === 'lyrics') {
        if (e.key === 'Escape') {
          e.preventDefault();
          setCurrentView('list');
        }
        return;
      }

      if (currentView === 'setup') {
        if (e.key === 'Enter') {
          e.preventDefault();
          setSimulatedMissingDeps([]);
          setCurrentView('list');
          showToast('Dependencies verified!', 'success');
        }
        return;
      }

      // Cmd+K / Ctrl+K Action Panel
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowActionPanel((prev) => !prev);
        return;
      }

      // Stop audio with Cmd+. or Cmd+S
      if ((e.metaKey || e.ctrlKey) && (e.key === '.' || e.key.toLowerCase() === 's')) {
        e.preventDefault();
        onStop();
        showToast('Playback stopped (mpv killed)');
        return;
      }

      if (showActionPanel) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setShowActionPanel(false);
          return;
        }
      }

      if (results.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
        } else if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
          e.preventDefault();
          const selected = results[selectedIndex];
          if (selected) {
            onSelectSong(selected);
            showToast(`Streaming "${selected.title}"`);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [results, selectedIndex, showActionPanel, currentView, onSelectSong, onStop]);

  const selectedSong = results[selectedIndex] || null;

  return (
    <div className="relative flex flex-col h-[600px] bg-[#121418] border border-[#262b35] rounded-xl shadow-2xl shadow-black/80 overflow-hidden font-sans">
      {/* Raycast Window Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#20252e] bg-[#161920]/90 backdrop-blur-md select-none">
        <div className="flex items-center gap-2">
          {/* macOS traffic light window dots */}
          <div className="flex items-center gap-1.5 mr-2">
            <span className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] inline-block" />
            <span className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123] inline-block" />
            <span className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29] inline-block" />
          </div>
          <span className="text-xs font-semibold tracking-wide text-neutral-200 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            Tube Tunes
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1e232d] text-neutral-400 border border-[#2e3544]">
            Raycast Extension
          </span>
        </div>

        {/* View state or test mode toggles */}
        <div className="flex items-center gap-2">
          {currentView === 'lyrics' && (
            <button
              onClick={() => setCurrentView('list')}
              className="flex items-center gap-1 text-[11px] font-mono text-neutral-300 hover:text-white px-2 py-0.5 rounded bg-[#202530]"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Back to Search (Esc)</span>
            </button>
          )}

          {/* Simulate Missing Dep toggle for testing step 9 */}
          <button
            onClick={() => {
              if (currentView === 'setup') {
                setCurrentView('list');
                setSimulatedMissingDeps([]);
              } else {
                setCurrentView('setup');
                setSimulatedMissingDeps(['mpv', 'yt-dlp']);
              }
            }}
            className={`text-[10px] font-mono px-2 py-1 rounded border transition-all ${
              currentView === 'setup'
                ? 'bg-amber-950/60 text-amber-400 border-amber-500/40'
                : 'bg-[#181b22] text-neutral-400 border-[#2a303d] hover:text-neutral-200'
            }`}
            title="Simulate first-run missing dependencies check"
          >
            {currentView === 'setup' ? 'Testing Setup Mode' : 'Simulate First-Run Setup'}
          </button>
        </div>
      </div>

      {/* VIEW: SETUP REQUIRED (Step 9 when missingDeps.length > 0) */}
      {currentView === 'setup' && (
        <div className="flex-1 flex flex-col justify-between p-6 bg-[#0e1014] text-neutral-200 overflow-y-auto">
          <div className="max-w-xl mx-auto space-y-4 pt-4">
            <div className="flex items-center gap-3 text-amber-400">
              <Terminal className="w-7 h-7" />
              <h2 className="text-xl font-bold tracking-tight text-white">Setup required</h2>
            </div>

            <p className="text-sm text-neutral-300 leading-relaxed">
              This extension needs two tools installed on your Mac. Run these in a terminal:
            </p>

            <div className="p-4 rounded-xl bg-[#141720] border border-[#272e3d] font-mono text-xs text-neutral-200 space-y-2 select-all">
              <div className="text-emerald-400">$ brew install mpv</div>
              <div className="text-emerald-400">$ brew install yt-dlp</div>
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed">
              Then come back and press <kbd className="px-1.5 py-0.5 rounded bg-[#1e232d] text-neutral-200 border border-neutral-700 font-mono">↵ Check Again</kbd> — or click the button below.
            </p>
          </div>

          <div className="pt-4 border-t border-[#1e232d] flex items-center justify-between">
            <span className="text-xs text-neutral-500 font-mono">Raycast Detail Mode (missingDeps)</span>
            <button
              onClick={() => {
                setSimulatedMissingDeps([]);
                setCurrentView('list');
                showToast('Dependencies verified! Launching search…', 'success');
              }}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-red-600/20"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Check Again (↵)</span>
            </button>
          </div>
        </div>
      )}

      {/* VIEW: LYRICS DETAIL (Step 8 LyricsView) */}
      {currentView === 'lyrics' && lyricsTarget && (
        <div className="flex-1 flex flex-col justify-between bg-[#0e1014] text-neutral-200 overflow-hidden">
          <div className="p-4 border-b border-[#1f242e] bg-[#14171f] flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                onClick={() => setCurrentView('list')}
                className="p-1 rounded hover:bg-[#202532] text-neutral-400 hover:text-white transition-colors"
                title="Back to search list (Esc)"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-sm font-bold text-white truncate max-w-md">{lyricsTarget.title}</h2>
                <div className="text-[11px] text-neutral-400 font-mono">Synced Lyrics • YouTube Music</div>
              </div>
            </div>

            <button
              onClick={() => {
                const s = results.find((r) => r.id === lyricsTarget.id);
                if (s) onSelectSong(s);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Play Song</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {lyricsLoading ? (
              <div className="h-full flex flex-col items-center justify-center text-neutral-400 space-y-3">
                <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-mono">Retrieving lyrics from YouTube Music InnerTube…</span>
              </div>
            ) : lyricsNotFound ? (
              <div className="h-full flex flex-col items-center justify-center text-neutral-400 space-y-2">
                <FileText className="w-8 h-8 text-neutral-600" />
                <p className="text-sm font-semibold text-neutral-300">
                  No lyrics found for "{lyricsTarget.title}"
                </p>
                <p className="text-xs text-neutral-500">
                  YouTube Music does not have synced lyrics registered for this track.
                </p>
              </div>
            ) : (
              <div className="max-w-xl mx-auto space-y-4">
                <div className="text-lg font-bold text-white border-b border-[#222834] pb-2">
                  {lyricsTarget.title}
                </div>
                <pre className="text-xs font-mono text-neutral-300 leading-relaxed whitespace-pre-wrap font-sans">
                  {lyricsContent}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW: MAIN SEARCH LIST (Step 9 Command) */}
      {currentView === 'list' && (
        <>
          {/* Raycast Command Search Bar */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#20252e] bg-[#14171e]">
            <div className="text-neutral-400">
              {loading ? (
                <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Search className="w-5 h-5 text-neutral-400" />
              )}
            </div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search YouTube Music…"
              className="flex-1 bg-transparent text-sm md:text-base text-neutral-100 placeholder-neutral-500 focus:outline-none"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="text-[11px] font-mono text-neutral-400 hover:text-neutral-200 px-1.5 py-0.5 rounded bg-[#202530]"
              >
                Clear
              </button>
            )}
          </div>

          {/* Results List */}
          <div
            ref={listContainerRef}
            className="flex-1 overflow-y-auto divide-y divide-[#1a1e27] p-1.5 focus:outline-none custom-scrollbar"
          >
            {results.length > 0 ? (
              results.map((song, idx) => {
                const isSelected = idx === selectedIndex;
                const isCurrent = currentSong?.id === song.id;

                return (
                  <div
                    key={song.id + '-' + idx}
                    onClick={() => {
                      setSelectedIndex(idx);
                      onSelectSong(song);
                      showToast(`Streaming "${song.title}"`);
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all select-none ${
                      isSelected
                        ? 'bg-red-500/15 border border-red-500/30 text-white'
                        : 'text-neutral-300 hover:bg-[#181b22] border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-3">
                      <div className="relative shrink-0 w-10 h-10 rounded-md overflow-hidden bg-[#1c202a] border border-[#2b303d]">
                        <img
                          src={song.thumbnail}
                          alt={song.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        {isCurrent && isPlaying ? (
                          <div className="absolute inset-0 bg-red-950/80 flex items-center justify-center">
                            <Radio className="w-4 h-4 text-red-400 animate-pulse" />
                          </div>
                        ) : null}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-[13px] font-medium truncate ${isSelected ? 'text-white font-semibold' : 'text-neutral-200'}`}>
                            {song.title}
                          </span>
                          {isCurrent && (
                            <span className="shrink-0 px-1.5 py-0.2 rounded text-[9px] font-mono uppercase tracking-wider bg-red-500 text-white font-bold">
                              {isPlaying ? 'PLAYING' : 'PAUSED'}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-neutral-400 truncate flex items-center gap-1.5">
                          <span>{song.artist}</span>
                          {song.album && (
                            <>
                              <span className="text-neutral-600">•</span>
                              <span className="text-neutral-500 truncate max-w-[160px]">{song.album}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 text-xs">
                      <span className="text-[11px] font-mono text-neutral-400 min-w-[38px] text-right">
                        {song.duration || '--:--'}
                      </span>

                      {isSelected && (
                        <div className="hidden sm:flex items-center gap-1.5 pl-1 text-[10px] text-red-400 font-mono">
                          <kbd className="px-1.5 py-0.5 rounded bg-[#261f26] border border-red-500/40 text-red-300">↵ Play</kbd>
                          <kbd className="px-1.5 py-0.5 rounded bg-[#1e232d] border border-neutral-700 text-neutral-300">⌘K Actions</kbd>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : query.trim() && !loading ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-neutral-400">
                <Music className="w-10 h-10 text-neutral-600 mb-3" />
                <p className="text-sm font-medium text-neutral-300">No matching tracks found</p>
                <p className="text-xs text-neutral-500 mt-1">Try another title or artist</p>
              </div>
            ) : (
              /* Empty Search Suggestions */
              <div className="p-6">
                <div className="flex items-center gap-2 text-xs font-semibold text-neutral-400 mb-3 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Quick Music Searches
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {POPULAR_SEARCHES.map((term) => (
                    <button
                      key={term}
                      onClick={() => setQuery(term)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-[#171a22] hover:bg-[#1e232d] border border-[#242934] text-left text-xs text-neutral-300 hover:text-white transition-all group"
                    >
                      <Search className="w-3.5 h-3.5 text-neutral-500 group-hover:text-red-400" />
                      <span className="truncate">{term}</span>
                    </button>
                  ))}
                </div>

                <div className="mt-8 p-4 rounded-xl bg-[#14171e]/70 border border-[#242935] text-xs text-neutral-400">
                  <div className="flex items-center gap-2 text-neutral-200 font-semibold mb-1">
                    <CommandIcon className="w-3.5 h-3.5 text-red-400" />
                    Tube Tunes Capabilities
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-[11px] font-mono text-neutral-300">
                    <span className="p-1.5 rounded bg-[#1b1f28] border border-[#262c38]">1. InnerTube Search</span>
                    <span className="p-1.5 rounded bg-[#1b1f28] border border-[#262c38]">2. Stream (yt-dlp)</span>
                    <span className="p-1.5 rounded bg-[#1b1f28] border border-[#262c38]">3. Download (.m4a)</span>
                    <span className="p-1.5 rounded bg-[#1b1f28] border border-[#262c38]">4. Synced Lyrics</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Raycast Bottom Action Bar */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-[#20252e] bg-[#14171f] text-[11px] text-neutral-400 select-none">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-[#202530] text-neutral-300 border border-[#2d3444] font-mono text-[10px]">↑</kbd>
                <kbd className="px-1 py-0.5 rounded bg-[#202530] text-neutral-300 border border-[#2d3444] font-mono text-[10px]">↓</kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-[#202530] text-neutral-300 border border-[#2d3444] font-mono text-[10px]">↵</kbd>
                Play
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-[#202530] text-neutral-300 border border-[#2d3444] font-mono text-[10px]">⌘.</kbd>
                Stop
              </span>
            </div>

            <button
              onClick={() => setShowActionPanel(!showActionPanel)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#222733] hover:bg-[#2c3342] text-neutral-200 border border-[#31394a] transition-all font-medium text-[11px]"
            >
              <span>Actions</span>
              <kbd className="px-1 py-0.5 rounded bg-[#161a22] text-neutral-400 font-mono text-[9px]">⌘K</kbd>
            </button>
          </div>
        </>
      )}

      {/* Action Panel Modal (Matching exact Tube Tunes actions) */}
      {showActionPanel && selectedSong && currentView === 'list' && (
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-4 z-50 animate-in fade-in duration-150"
          onClick={() => setShowActionPanel(false)}
        >
          <div
            className="w-full max-w-md bg-[#161921] border border-[#2b313f] rounded-xl shadow-2xl p-2 font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-2 border-b border-[#252a36] flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-200 truncate max-w-[280px]">
                {selectedSong.title}
              </span>
              <span className="text-[10px] text-neutral-500 font-mono">Action Panel (⌘K)</span>
            </div>

            <div className="p-1 space-y-0.5 text-xs">
              {/* Action 1: Play */}
              <button
                onClick={() => {
                  onSelectSong(selectedSong);
                  setShowActionPanel(false);
                  showToast(`Playing "${selectedSong.title}"`);
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-red-500 hover:text-white text-neutral-200 transition-colors text-left group"
              >
                <div className="flex items-center gap-2.5">
                  <Play className="w-4 h-4 fill-current" />
                  <span>Play</span>
                </div>
                <kbd className="px-1.5 py-0.5 rounded bg-black/20 text-[10px] font-mono">↵</kbd>
              </button>

              {/* Action 2: Download */}
              <button
                onClick={() => handleDownload(selectedSong)}
                disabled={isDownloading}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#252b37] text-neutral-300 transition-colors text-left"
              >
                <div className="flex items-center gap-2.5">
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>Download (.m4a with metadata)</span>
                </div>
                <span className="text-[10px] text-neutral-500 font-mono">yt-dlp</span>
              </button>

              {/* Action 3: Show Lyrics */}
              <button
                onClick={() => openLyrics(selectedSong)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#252b37] text-neutral-300 transition-colors text-left"
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <span>Show Lyrics</span>
                </div>
                <span className="text-[10px] text-neutral-500 font-mono">Detail View</span>
              </button>

              {/* Action 4: Open in Browser */}
              <a
                href={`https://music.youtube.com/watch?v=${selectedSong.id}`}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#252b37] text-neutral-300 transition-colors text-left"
              >
                <div className="flex items-center gap-2.5">
                  <ExternalLink className="w-4 h-4 text-neutral-400" />
                  <span>Open in Browser</span>
                </div>
              </a>

              {/* Action 5: Stop Playback */}
              <button
                onClick={() => {
                  onStop();
                  setShowActionPanel(false);
                  showToast('Playback stopped (mpv killed)');
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-neutral-800 text-red-400 transition-colors text-left border-t border-[#252a36] mt-1 pt-2"
              >
                <div className="flex items-center gap-2.5">
                  <Square className="w-4 h-4 fill-current" />
                  <span>Stop Playback</span>
                </div>
                <kbd className="px-1.5 py-0.5 rounded bg-black/20 text-[10px] font-mono">⌘.</kbd>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Raycast Toast */}
      {toastMessage && (
        <div className="absolute bottom-12 right-4 bg-[#1f242e] border border-[#323a49] text-white px-3 py-2 rounded-lg shadow-xl text-xs flex items-center gap-2 z-50 animate-in slide-in-from-bottom-2 duration-150">
          {toastMessage.style === 'animated' ? (
            <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          ) : toastMessage.style === 'failure' ? (
            <span className="w-2 h-2 rounded-full bg-red-500" />
          ) : (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          )}
          <span>{toastMessage.title}</span>
        </div>
      )}
    </div>
  );
};
