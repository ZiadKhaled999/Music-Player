import React, { useState, useEffect } from 'react';
import { SongItem } from '../types';
import { Playlist, getPlaylists, createPlaylist, addSongToPlaylist } from '../utils/playlistStore';
import { X, Plus, Check, FolderPlus, ListMusic } from 'lucide-react';

interface AddToPlaylistModalProps {
  song: SongItem;
  onClose: () => void;
  onNotification: (msg: string, type: 'success' | 'info' | 'error') => void;
}

export const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({
  song,
  onClose,
  onNotification,
}) => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  useEffect(() => {
    setPlaylists(getPlaylists());
  }, []);

  const handleSelectPlaylist = (playlist: Playlist) => {
    const res = addSongToPlaylist(playlist.id, song);
    onNotification(res.message, res.success ? 'success' : 'info');
    if (res.success) {
      onClose();
    }
  };

  const handleCreateAndAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const created = createPlaylist(newTitle, newDesc);
    const res = addSongToPlaylist(created.id, song);
    onNotification(res.message, 'success');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-neutral-950 border border-white/10 rounded-3xl shadow-2xl overflow-hidden font-sans select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 bg-neutral-900/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ListMusic className="w-4 h-4 text-white" />
            <h3 className="font-heading font-bold text-sm tracking-wide text-white uppercase">
              Add to Playlist
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Track Summary */}
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/5">
            <img
              src={song.thumbnail}
              alt={song.title}
              className="w-10 h-10 rounded-xl object-cover border border-white/10"
            />
            <div className="min-w-0 flex-1">
              <div className="font-heading font-semibold text-xs text-white truncate">
                {song.title}
              </div>
              <div className="text-[11px] font-mono text-white/50 truncate">
                {song.artist}
              </div>
            </div>
          </div>

          {showCreateNew ? (
            <form onSubmit={handleCreateAndAdd} className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-mono text-white/60 mb-1">
                  Playlist Title
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Chill Beats, Late Night Vibes..."
                  autoFocus
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-xs font-sans focus:outline-none focus:border-white/40"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-white/60 mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Short description..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-xs font-sans focus:outline-none focus:border-white/40"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateNew(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-mono transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newTitle.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-white hover:bg-neutral-200 disabled:opacity-40 text-black font-semibold text-xs transition-colors"
                >
                  Create & Add
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <button
                onClick={() => setShowCreateNew(true)}
                className="w-full py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-heading font-medium text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <FolderPlus className="w-4 h-4" />
                <span>Create New Playlist</span>
              </button>

              <div className="max-h-60 overflow-y-auto space-y-1.5 custom-scrollbar pr-1 pt-2">
                {playlists.map((pl) => {
                  const alreadyContains = pl.songs.some((s) => s.id === song.id);
                  return (
                    <button
                      key={pl.id}
                      onClick={() => handleSelectPlaylist(pl)}
                      className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                        alreadyContains
                          ? 'bg-white/[0.02] border-white/5 opacity-60'
                          : 'bg-white/[0.03] border-white/10 hover:bg-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-heading font-semibold text-xs text-white truncate">
                          {pl.name}
                        </div>
                        <div className="text-[10px] font-mono text-white/50 truncate mt-0.5">
                          {pl.songs.length} tracks {pl.description ? `• ${pl.description}` : ''}
                        </div>
                      </div>
                      {alreadyContains && <Check className="w-4 h-4 text-white/50 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
