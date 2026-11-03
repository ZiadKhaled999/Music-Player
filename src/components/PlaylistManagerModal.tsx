import React, { useState, useEffect } from 'react';
import { SongItem } from '../types';
import { Playlist, getPlaylists, createPlaylist, deletePlaylist, removeSongFromPlaylist } from '../utils/playlistStore';
import { X, Play, Trash2, ListMusic, Plus, FolderPlus, Music } from 'lucide-react';

interface PlaylistManagerModalProps {
  onClose: () => void;
  onPlaySong: (song: SongItem) => void;
  onPlayAllSongs: (songs: SongItem[]) => void;
  onNotification: (msg: string, type: 'success' | 'info' | 'error') => void;
}

export const PlaylistManagerModal: React.FC<PlaylistManagerModalProps> = ({
  onClose,
  onPlaySong,
  onPlayAllSongs,
  onNotification,
}) => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [descInput, setDescInput] = useState('');

  const refreshPlaylists = () => {
    const list = getPlaylists();
    setPlaylists(list);
    if (!selectedPlaylistId && list.length > 0) {
      setSelectedPlaylistId(list[0].id);
    }
  };

  useEffect(() => {
    refreshPlaylists();
  }, []);

  const selectedPlaylist = playlists.find((p) => p.id === selectedPlaylistId) || playlists[0];

  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    const created = createPlaylist(nameInput, descInput);
    setNameInput('');
    descInput && setDescInput('');
    setShowCreateForm(false);
    refreshPlaylists();
    setSelectedPlaylistId(created.id);
    onNotification(`Created playlist "${created.name}"`, 'success');
  };

  const handleDeletePlaylist = (id: string, name: string) => {
    const updated = deletePlaylist(id);
    setPlaylists(updated);
    if (selectedPlaylistId === id) {
      setSelectedPlaylistId(updated.length > 0 ? updated[0].id : null);
    }
    onNotification(`Deleted playlist "${name}"`, 'info');
  };

  const handleRemoveTrack = (playlistId: string, songId: string, songTitle: string) => {
    const updated = removeSongFromPlaylist(playlistId, songId);
    setPlaylists(updated);
    onNotification(`Removed "${songTitle}" from playlist`, 'info');
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl h-[80vh] bg-neutral-950 border border-white/10 rounded-3xl shadow-2xl overflow-hidden font-sans flex flex-col md:flex-row select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Sidebar: Playlists List */}
        <div className="w-full md:w-72 bg-neutral-900/80 border-b md:border-b-0 md:border-r border-white/10 flex flex-col shrink-0">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ListMusic className="w-4 h-4 text-white" />
              <h3 className="font-heading font-bold text-xs text-white tracking-wide uppercase">
                My Playlists
              </h3>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="New Playlist"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {playlists.map((pl) => {
              const isActive = pl.id === selectedPlaylistId;
              return (
                <div
                  key={pl.id}
                  onClick={() => {
                    setSelectedPlaylistId(pl.id);
                    setShowCreateForm(false);
                  }}
                  className={`group p-3 rounded-2xl cursor-pointer transition-all flex items-center justify-between ${
                    isActive
                      ? 'bg-white/15 border border-white/20 text-white shadow-md'
                      : 'hover:bg-white/5 text-white/70 border border-transparent'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-heading font-semibold text-xs truncate text-white">
                      {pl.name}
                    </div>
                    <div className="text-[10px] font-mono text-white/40 truncate">
                      {pl.songs.length} {pl.songs.length === 1 ? 'track' : 'tracks'}
                    </div>
                  </div>
                  {pl.id !== 'favorites' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePlaylist(pl.id, pl.name);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-white/40 hover:text-rose-400 transition-opacity cursor-pointer"
                      title="Delete playlist"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Content Area: Active Playlist Tracks */}
        <div className="flex-1 flex flex-col min-w-0 bg-neutral-950">
          {/* Top Bar */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div className="min-w-0">
              <h2 className="font-heading font-bold text-lg text-white truncate">
                {showCreateForm ? 'Create New Playlist' : selectedPlaylist?.name || 'Playlists'}
              </h2>
              {selectedPlaylist?.description && !showCreateForm && (
                <p className="text-xs font-mono text-white/50 truncate">
                  {selectedPlaylist.description}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {showCreateForm ? (
              <form onSubmit={handleCreatePlaylist} className="max-w-md space-y-4">
                <div>
                  <label className="block text-xs font-mono text-white/60 mb-1">
                    Playlist Name
                  </label>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="e.g. Synthwave Mix, Workout Motivation..."
                    autoFocus
                    className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/15 text-white text-sm font-sans focus:outline-none focus:border-white/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-white/60 mb-1">
                    Description
                  </label>
                  <textarea
                    value={descInput}
                    onChange={(e) => setDescInput(e.target.value)}
                    placeholder="Short description of this mix..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/15 text-white text-sm font-sans focus:outline-none focus:border-white/40 resize-none"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-mono transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!nameInput.trim()}
                    className="px-6 py-2.5 rounded-xl bg-white hover:bg-neutral-200 disabled:opacity-40 text-black font-semibold text-xs transition-colors"
                  >
                    Create Playlist
                  </button>
                </div>
              </form>
            ) : selectedPlaylist ? (
              <div className="space-y-4">
                {/* Playlist Action Header */}
                <div className="flex items-center justify-between bg-white/[0.03] p-4 rounded-2xl border border-white/5">
                  <div className="text-xs font-mono text-white/60">
                    Total Tracks: <span className="text-white font-bold">{selectedPlaylist.songs.length}</span>
                  </div>

                  {selectedPlaylist.songs.length > 0 && (
                    <button
                      onClick={() => onPlayAllSongs(selectedPlaylist.songs)}
                      className="px-4 py-2 rounded-xl bg-white text-black font-heading font-semibold text-xs flex items-center gap-2 hover:bg-neutral-200 transition-all cursor-pointer shadow-lg"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Play Playlist</span>
                    </button>
                  )}
                </div>

                {/* Song List */}
                {selectedPlaylist.songs.length === 0 ? (
                  <div className="py-16 text-center text-white/40 space-y-2">
                    <Music className="w-10 h-10 mx-auto text-white/20" />
                    <p className="font-heading font-medium text-sm text-white/70">
                      No tracks in this playlist
                    </p>
                    <p className="text-xs font-mono text-white/40">
                      Search for songs or local tracks and click "Add to Playlist" to populate it.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedPlaylist.songs.map((song, idx) => (
                      <div
                        key={song.id + '-' + idx}
                        className="group flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.07] hover:border-white/15 transition-all cursor-pointer"
                        onClick={() => onPlaySong(song)}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <span className="text-xs font-mono text-white/40 w-5 text-center shrink-0">
                            {idx + 1}
                          </span>
                          <img
                            src={song.thumbnail}
                            alt={song.title}
                            className="w-11 h-11 rounded-xl object-cover border border-white/10 shrink-0"
                          />
                          <div className="min-w-0">
                            <h4 className="font-heading font-semibold text-xs text-white truncate">
                              {song.title}
                            </h4>
                            <p className="text-[11px] font-mono text-white/50 truncate mt-0.5">
                              {song.artist}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs font-mono text-white/40">
                            {song.duration}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveTrack(selectedPlaylist.id, song.id, song.title);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-white/40 hover:text-rose-400 hover:bg-white/10 transition-all cursor-pointer"
                            title="Remove from playlist"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
