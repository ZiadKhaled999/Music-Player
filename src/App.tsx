import React, { useState, useEffect, useRef } from 'react';
import { SongItem, StreamInfo, LyricsResponse } from './types';
import { InitialSearchView } from './components/InitialSearchView';
import { LocalMusicView } from './components/LocalMusicView';
import { StudioPlayer } from './components/StudioPlayer';
import { StudioLyricsCard } from './components/StudioLyricsCard';
import { TrackOverviewModal } from './components/TrackOverviewModal';
import { QueueDrawer } from './components/QueueDrawer';
import { AddToPlaylistModal } from './components/AddToPlaylistModal';
import { PlaylistManagerModal } from './components/PlaylistManagerModal';
import { ElectronGuideModal } from './components/ElectronGuideModal';
import { SettingsModal } from './components/SettingsModal';
import { AudioEngine } from './components/AudioEngine';
import { ErrorBoundary } from './components/ErrorBoundary';
import { isAudioFile, createLocalSongItem } from './utils/localMusic';
import { getHighResThumbnail } from './utils/image';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Maximize2,
  FileText,
  ListMusic,
  Download,
  AlertCircle,
  Check,
  Music2,
  Folder
} from 'lucide-react';

export default function App() {
  const [currentSong, setCurrentSong] = useState<SongItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueue] = useState<SongItem[]>([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(-1);

  // Studio Player full-screen state
  const [isStudioOpen, setIsStudioOpen] = useState(false);

  // Local Music Folder View
  const [isLocalViewOpen, setIsLocalViewOpen] = useState(false);
  const [localSongs, setLocalSongs] = useState<SongItem[]>([]);
  const [localFolderName, setLocalFolderName] = useState('');
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  // Playback parameters
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seekToTime, setSeekToTime] = useState<number | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);

  // Modals & Drawers
  const [showLyricsModal, setShowLyricsModal] = useState(false);
  const [showOverviewModal, setShowOverviewModal] = useState(false);
  const [showQueueDrawer, setShowQueueDrawer] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [showAddToPlaylistModal, setShowAddToPlaylistModal] = useState(false);
  const [songToAddToPlaylist, setSongToAddToPlaylist] = useState<SongItem | null>(null);
  const [showElectronGuideModal, setShowElectronGuideModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Settings: Download Destination Path (default: 'Downloads', updates to local folder on pick)
  const [downloadPath, setDownloadPath] = useState('Downloads');

  // Synced Lyrics Data
  const [lyricsData, setLyricsData] = useState<LyricsResponse | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [lyricsNotFound, setLyricsNotFound] = useState(false);

  // Downloads & Notifications
  const [downloadingSongId, setDownloadingSongId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleSeek(Math.min(duration || 1000, currentTime + 5));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleSeek(Math.max(0, currentTime - 5));
      } else if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setIsMuted((prev) => !prev);
      } else if (e.key.toLowerCase() === 'l' && currentSong) {
        e.preventDefault();
        handleOpenLyrics(currentSong);
      } else if (e.key.toLowerCase() === 'd' && currentSong) {
        e.preventDefault();
        handleDownloadSong(currentSong);
      } else if (e.key === 'Escape') {
        if (showSettingsModal) setShowSettingsModal(false);
        else if (showAddToPlaylistModal) setShowAddToPlaylistModal(false);
        else if (showPlaylistModal) setShowPlaylistModal(false);
        else if (showElectronGuideModal) setShowElectronGuideModal(false);
        else if (showLyricsModal) setShowLyricsModal(false);
        else if (showOverviewModal) setShowOverviewModal(false);
        else if (showQueueDrawer) setShowQueueDrawer(false);
        else if (isStudioOpen) setIsStudioOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSong, currentTime, duration, showLyricsModal, showOverviewModal, showQueueDrawer, isStudioOpen, showPlaylistModal, showAddToPlaylistModal, showElectronGuideModal]);

  // Open Local Folder Picker
  const handleOpenFolderPicker = async () => {
    if (localSongs.length > 0 && !isLocalViewOpen) {
      setIsLocalViewOpen(true);
      return;
    }

    if ('showDirectoryPicker' in window) {
      try {
        const dirHandle = await (window as any).showDirectoryPicker();
        const songs: SongItem[] = [];
        let index = 0;

        for await (const entry of dirHandle.values()) {
          if (entry.kind === 'file') {
            const file = await entry.getFile();
            if (isAudioFile(file.name, file.type)) {
              songs.push(createLocalSongItem(file, index++, dirHandle.name));
            }
          }
        }

        if (songs.length > 0) {
          setLocalSongs(songs);
          setLocalFolderName(dirHandle.name);
          setDownloadPath(dirHandle.name);
          setIsLocalViewOpen(true);
          showNotification(`Loaded ${songs.length} tracks from "${dirHandle.name}"`, 'success');
        } else {
          setLocalFolderName(dirHandle.name);
          setDownloadPath(dirHandle.name);
          setIsLocalViewOpen(true);
          showNotification(`No audio files found in "${dirHandle.name}"`, 'info');
        }
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.warn('showDirectoryPicker error, using input fallback:', err);
      }
    }

    folderInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const songs: SongItem[] = [];
    let detectedFolder = 'Selected Folder';
    let index = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (isAudioFile(file.name, file.type)) {
        if (file.webkitRelativePath) {
          const parts = file.webkitRelativePath.split('/');
          if (parts.length > 1) detectedFolder = parts[0];
        }
        songs.push(createLocalSongItem(file, index++, detectedFolder));
      }
    }

    if (songs.length > 0) {
      setLocalSongs(songs);
      setLocalFolderName(detectedFolder);
      setDownloadPath(detectedFolder);
      setIsLocalViewOpen(true);
      showNotification(`Discovered ${songs.length} audio tracks in "${detectedFolder}"`, 'success');
    } else {
      setIsLocalViewOpen(true);
      showNotification('No audio files detected in selected folder', 'info');
    }
  };

  // Song Selection -> Opens Full-screen Studio Player
  const handleSelectSong = (song: SongItem) => {
    setCurrentSong(song);
    setIsPlaying(true);
    setIsStudioOpen(true);
    setSeekToTime(0);
    setTimeout(() => setSeekToTime(null), 150);

    // Update Queue
    const existingIndex = queue.findIndex((s) => s.id === song.id);
    if (existingIndex >= 0) {
      setCurrentQueueIndex(existingIndex);
    } else {
      const newQueue = [...queue, song];
      setQueue(newQueue);
      setCurrentQueueIndex(newQueue.length - 1);
    }

    // Prefetch lyrics in background (if not local)
    if (!song.isLocal) {
      fetchLyrics(song);
    } else {
      setLyricsData({
        success: true,
        videoId: song.id,
        title: song.title,
        artist: song.artist,
        isSynced: false,
        lines: [],
        plainLyrics: `Local track: "${song.title}"\nArtist: ${song.artist}\nFormat: ${song.fileType || 'Audio'}\nFile size: ${song.fileSize || 'Local file'}\n\nSynced streaming lyrics are available for online YouTube tracks.`,
      });
    }
  };

  const handlePlayPlaylist = (songs: SongItem[]) => {
    if (songs.length === 0) return;
    setQueue(songs);
    setCurrentQueueIndex(0);
    handleSelectSong(songs[0]);
    setShowPlaylistModal(false);
    showNotification(`Playing playlist (${songs.length} tracks)`, 'success');
  };

  const handleOpenAddToPlaylist = (song: SongItem) => {
    setSongToAddToPlaylist(song);
    setShowAddToPlaylistModal(true);
  };

  const handleAddToQueue = (song: SongItem) => {
    setQueue((prev) => {
      if (prev.some((s) => s.id === song.id)) {
        showNotification(`"${song.title}" is already in your tracks`, 'info');
        return prev;
      }
      showNotification(`Added "${song.title}" to tracks queue`, 'success');
      return [...prev, song];
    });
  };

  const handleNext = () => {
    if (currentQueueIndex + 1 < queue.length) {
      const nextSong = queue[currentQueueIndex + 1];
      setCurrentQueueIndex((prev) => prev + 1);
      handleSelectSong(nextSong);
    }
  };

  const handlePrev = () => {
    if (currentTime > 4) {
      handleSeek(0);
      return;
    }
    if (currentQueueIndex > 0) {
      const prevSong = queue[currentQueueIndex - 1];
      setCurrentQueueIndex((prev) => prev - 1);
      handleSelectSong(prevSong);
    } else {
      handleSeek(0);
    }
  };

  const handleSeek = (time: number) => {
    setSeekToTime(time);
    setCurrentTime(time);
    setTimeout(() => setSeekToTime(null), 100);
  };

  const handleStop = () => {
    setIsPlaying(false);
    handleSeek(0);
  };

  // Fetch Lyrics
  const fetchLyrics = async (song: SongItem) => {
    setLyricsLoading(true);
    setLyricsNotFound(false);
    setLyricsData(null);

    try {
      const data: LyricsResponse = window.api?.lyrics
        ? await window.api.lyrics(song.id, song.title, song.artist)
        : await fetch(
            `/api/music/lyrics?id=${encodeURIComponent(song.id)}&title=${encodeURIComponent(song.title)}&artist=${encodeURIComponent(song.artist)}`
          ).then((r) => r.json());
      if (data.success && (data.lines?.length > 0 || data.plainLyrics)) {
        setLyricsData(data);
      } else {
        setLyricsNotFound(true);
      }
    } catch {
      setLyricsNotFound(true);
    } finally {
      setLyricsLoading(false);
    }
  };

  const handleOpenLyrics = (song: SongItem) => {
    if (!song.isLocal && (!lyricsData || lyricsData.videoId !== song.id)) {
      fetchLyrics(song);
    }
    setShowLyricsModal(true);
  };

  // Download song
  const handleDownloadSong = async (song: SongItem) => {
    setDownloadingSongId(song.id);

    if (song.isLocal && song.localBlobUrl) {
      try {
        const link = document.createElement('a');
        link.href = song.localBlobUrl;
        link.download = `${song.title}.${(song.fileType || 'mp3').toLowerCase()}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showNotification(`Saved "${song.title}" to ${downloadPath}!`, 'success');
      } catch {
        showNotification('Could not export local track.', 'error');
      } finally {
        setTimeout(() => setDownloadingSongId(null), 1000);
      }
      return;
    }

    showNotification(`Downloading audio master for "${song.title}"…`, 'info');

    try {
      if (window.api?.download) {
        const result = await window.api.download(song.id, song.title);
        if (result?.success) {
          showNotification(`Saved "${song.title}" to ${result.filePath}!`, 'success');
        } else {
          showNotification(result?.error || 'Download failed.', 'error');
        }
      } else {
        const downloadUrl = `/api/music/download?id=${encodeURIComponent(song.id)}&title=${encodeURIComponent(song.title)}`;
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `${song.title}.m4a`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showNotification(`Saved "${song.title}" (.m4a) to ${downloadPath}!`, 'success');
      }
    } catch {
      showNotification('Download failed. Please check network.', 'error');
    } finally {
      setTimeout(() => setDownloadingSongId(null), 1200);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-white/20 selection:text-white">
      {/* Hidden File / Directory input for local folder selection */}
      <input
        type="file"
        ref={folderInputRef}
        onChange={handleFileInputChange}
        // @ts-ignore
        webkitdirectory=""
        // @ts-ignore
        directory=""
        multiple
        className="hidden"
      />

      {/* PERSISTENT AUDIO PLAYBACK ENGINE */}
      <AudioEngine
        currentSong={currentSong}
        isPlaying={isPlaying}
        playbackSpeed={playbackSpeed}
        volume={volume}
        isMuted={isMuted}
        seekToTime={seekToTime}
        onTimeUpdate={(cur, dur) => {
          setCurrentTime(cur);
          if (dur > 0) setDuration(dur);
        }}
        onEnded={() => {
          if (currentQueueIndex + 1 < queue.length) {
            handleNext();
          } else {
            setIsPlaying(false);
          }
        }}
      />

      {/* MAIN VIEW: Local Music View OR Initial Search View */}
      {isLocalViewOpen ? (
        <LocalMusicView
          localSongs={localSongs}
          folderName={localFolderName}
          onSelectSong={handleSelectSong}
          onOpenFolderPicker={handleOpenFolderPicker}
          onBackToSearch={() => setIsLocalViewOpen(false)}
          currentSong={currentSong}
          isPlaying={isPlaying}
          onOpenSettings={() => setShowSettingsModal(true)}
          downloadPath={downloadPath}
        />
      ) : (
        <InitialSearchView
          onSelectSong={handleSelectSong}
          onShowLyrics={handleOpenLyrics}
          onDownloadSong={handleDownloadSong}
          onAddToQueue={handleAddToQueue}
          currentSong={currentSong}
          isPlaying={isPlaying}
          downloadingSongId={downloadingSongId}
          onOpenLocalView={handleOpenFolderPicker}
          onOpenPlaylists={() => setShowPlaylistModal(true)}
          onOpenElectronGuide={() => setShowElectronGuideModal(true)}
          onOpenSettings={() => setShowSettingsModal(true)}
          downloadPath={downloadPath}
        />
      )}

      {/* VIEW 2: FULL-SCREEN STUDIO PLAYER */}
      {isStudioOpen && currentSong && (
        <ErrorBoundary fallbackTitle="Could not load studio player" onReset={() => setIsStudioOpen(false)}>
          <StudioPlayer
            song={currentSong}
            queue={queue}
            onSelectSong={handleSelectSong}
            isPlaying={isPlaying}
            onPlayPause={() => setIsPlaying(!isPlaying)}
            onStop={handleStop}
            onNext={handleNext}
            onPrev={handlePrev}
            currentTime={currentTime}
            duration={duration}
            onSeek={handleSeek}
            onOpenLyrics={() => handleOpenLyrics(currentSong)}
            onOpenOverview={() => setShowOverviewModal(true)}
            onOpenQueue={() => setShowQueueDrawer(true)}
            onOpenAddToPlaylist={handleOpenAddToPlaylist}
            onDownload={handleDownloadSong}
            onCloseFullScreen={() => setIsStudioOpen(false)}
            playbackSpeed={playbackSpeed}
            onChangeSpeed={(sp) => setPlaybackSpeed(sp)}
            volume={volume}
            onVolumeChange={(v) => setVolume(v)}
            isMuted={isMuted}
            onToggleMute={() => setIsMuted(!isMuted)}
          />
        </ErrorBoundary>
      )}

      {/* VIEW 3: SYNCED LYRICS CARD */}
      {showLyricsModal && currentSong && (
        <ErrorBoundary fallbackTitle="Could not display lyrics" onReset={() => setShowLyricsModal(false)}>
          <StudioLyricsCard
            song={currentSong}
            lyricsData={lyricsData}
            currentTime={currentTime}
            loading={lyricsLoading}
            notFound={lyricsNotFound}
            onClose={() => setShowLyricsModal(false)}
            onSeek={handleSeek}
            onDownload={handleDownloadSong}
            isPlaying={isPlaying}
          />
        </ErrorBoundary>
      )}

      {/* TRACK OVERVIEW MODAL */}
      {showOverviewModal && currentSong && (
        <TrackOverviewModal
          song={currentSong}
          onClose={() => setShowOverviewModal(false)}
          onDownload={handleDownloadSong}
          onOpenAddToPlaylist={handleOpenAddToPlaylist}
        />
      )}

      {/* QUEUE DRAWER */}
      {showQueueDrawer && (
        <QueueDrawer
          queue={queue}
          currentIndex={currentQueueIndex}
          currentSong={currentSong}
          onSelectQueueIndex={(idx) => {
            setCurrentQueueIndex(idx);
            handleSelectSong(queue[idx]);
          }}
          onRemoveFromQueue={(idx) => {
            setQueue((prev) => prev.filter((_, i) => i !== idx));
          }}
          onClearQueue={() => {
            setQueue([]);
            setCurrentQueueIndex(-1);
          }}
          onClose={() => setShowQueueDrawer(false)}
          onOpenAddToPlaylist={handleOpenAddToPlaylist}
          onDownload={handleDownloadSong}
        />
      )}

      {/* PLAYLIST MANAGER MODAL */}
      {showPlaylistModal && (
        <PlaylistManagerModal
          onClose={() => setShowPlaylistModal(false)}
          onPlaySong={handleSelectSong}
          onPlayAllSongs={handlePlayPlaylist}
          onNotification={showNotification}
        />
      )}

      {/* ADD TO PLAYLIST MODAL */}
      {showAddToPlaylistModal && songToAddToPlaylist && (
        <AddToPlaylistModal
          song={songToAddToPlaylist}
          onClose={() => {
            setShowAddToPlaylistModal(false);
            setSongToAddToPlaylist(null);
          }}
          onNotification={showNotification}
        />
      )}

      {/* ELECTRON DESKTOP APP GUIDE MODAL */}
      {showElectronGuideModal && (
        <ElectronGuideModal onClose={() => setShowElectronGuideModal(false)} />
      )}

      {/* SETTINGS MODAL */}
      {showSettingsModal && (
        <SettingsModal
          downloadPath={downloadPath}
          onSetDownloadPath={(path) => setDownloadPath(path)}
          onClose={() => setShowSettingsModal(false)}
          onNotification={showNotification}
        />
      )}

      {/* PERSISTENT BOTTOM DOCK (Only visible when studio player is minimized) */}
      {!isStudioOpen && currentSong && (
        <div
          onClick={() => setIsStudioOpen(true)}
          className="fixed bottom-4 inset-x-4 max-w-4xl mx-auto z-40 p-3 rounded-2xl bg-neutral-950/95 backdrop-blur-xl border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.9)] flex items-center justify-between gap-4 cursor-pointer hover:border-white/30 transition-all select-none animate-in slide-in-from-bottom-4 duration-300"
        >
          {/* Left: Thumbnail & Title */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-11 h-11 rounded-xl overflow-hidden shrink-0 border border-white/10 bg-neutral-900">
              <img
                src={getHighResThumbnail(currentSong.thumbnail, currentSong.id)}
                alt={currentSong.title}
                className="w-full h-full object-cover"
              />
              {isPlaying && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                </div>
              )}
            </div>

            <div className="min-w-0">
              <h4 className="font-heading font-semibold text-sm text-white truncate">
                {currentSong.title}
              </h4>
              <p className="text-xs font-mono text-white/50 truncate">
                {currentSong.artist}
              </p>
            </div>
          </div>

          {/* Center: Timers & Transport Controls */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-white/40 hidden sm:inline">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              className="p-1.5 text-white/60 hover:text-white transition-colors cursor-pointer"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsPlaying(!isPlaying);
              }}
              className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow hover:bg-white/90 transition-all cursor-pointer"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              className="p-1.5 text-white/60 hover:text-white transition-colors cursor-pointer"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Right: Expand to Studio View */}
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleOpenLyrics(currentSong);
              }}
              className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer hidden sm:block"
              title="Synced Lyrics"
            >
              <FileText className="w-4 h-4 text-white" />
            </button>

            <button
              onClick={() => setIsStudioOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-mono font-medium flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Studio View</span>
            </button>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className="fixed bottom-24 right-6 bg-[#14161d] border border-white/15 text-white px-4 py-3 rounded-2xl shadow-2xl text-xs font-mono flex items-center gap-2.5 z-50 animate-in slide-in-from-bottom-2 duration-150">
          {toast.type === 'info' ? (
            <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          ) : (
            <Check className="w-4 h-4 text-emerald-400" />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
