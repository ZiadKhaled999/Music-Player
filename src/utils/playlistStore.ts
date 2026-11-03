import { SongItem } from '../types';

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  songs: SongItem[];
}

const STORAGE_KEY = 'audiospot_playlists_v1';

export const getPlaylists = (): Playlist[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Default initial playlist if empty
      const defaultPlaylists: Playlist[] = [
        {
          id: 'favorites',
          name: 'My Favorites',
          description: 'Your favorite tracks in one place',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          songs: [],
        },
      ];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultPlaylists));
      return defaultPlaylists;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to read playlists from localStorage', err);
    return [];
  }
};

export const savePlaylists = (playlists: Playlist[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(playlists));
  } catch (err) {
    console.error('Failed to save playlists to localStorage', err);
  }
};

export const createPlaylist = (name: string, description: string = ''): Playlist => {
  const playlists = getPlaylists();
  const newPlaylist: Playlist = {
    id: 'pl_' + Date.now(),
    name: name.trim() || 'Untitled Playlist',
    description: description.trim(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    songs: [],
  };
  const updated = [newPlaylist, ...playlists];
  savePlaylists(updated);
  return newPlaylist;
};

export const deletePlaylist = (id: string): Playlist[] => {
  const playlists = getPlaylists();
  const updated = playlists.filter((p) => p.id !== id);
  savePlaylists(updated);
  return updated;
};

export const addSongToPlaylist = (playlistId: string, song: SongItem): { success: boolean; message: string } => {
  const playlists = getPlaylists();
  const index = playlists.findIndex((p) => p.id === playlistId);
  if (index === -1) {
    return { success: false, message: 'Playlist not found' };
  }

  const playlist = playlists[index];
  const exists = playlist.songs.some((s) => s.id === song.id);
  if (exists) {
    return { success: false, message: `"${song.title}" is already in "${playlist.name}"` };
  }

  playlist.songs.push(song);
  playlist.updatedAt = Date.now();
  playlists[index] = playlist;
  savePlaylists(playlists);

  return { success: true, message: `Added "${song.title}" to "${playlist.name}"` };
};

export const removeSongFromPlaylist = (playlistId: string, songId: string): Playlist[] => {
  const playlists = getPlaylists();
  const index = playlists.findIndex((p) => p.id === playlistId);
  if (index !== -1) {
    playlists[index].songs = playlists[index].songs.filter((s) => s.id !== songId);
    playlists[index].updatedAt = Date.now();
    savePlaylists(playlists);
  }
  return playlists;
};
