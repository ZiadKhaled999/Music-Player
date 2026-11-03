export interface SongItem {
  id: string;
  title: string;
  artist: string;
  album?: string;
  year?: string;
  duration: string;
  durationSeconds?: number;
  thumbnail: string;
  type?: string;
  isLocal?: boolean;
  localBlobUrl?: string;
  fileSize?: string;
  fileType?: string;
}

export interface StreamInfo {
  success: boolean;
  url?: string;
  proxyUrl?: string;
  videoId: string;
  durationMs?: number;
  command?: string;
  error?: string;
}

export interface SyncedLyricLine {
  time: number;
  text: string;
}

export interface LyricsResponse {
  success: boolean;
  videoId: string;
  title: string;
  artist?: string;
  isSynced: boolean;
  lines: SyncedLyricLine[];
  plainLyrics: string;
  source?: string;
  error?: string;
}

export interface SystemStatus {
  ytdlp: {
    installed: boolean;
    version: string | null;
    path?: string;
    error?: string;
  };
  mpv: {
    installed: boolean;
    version: string | null;
    note?: string;
  };
  youtubei: {
    initialized: boolean;
    latencyMs: number;
    error?: string;
  };
  system: {
    platform: string;
    arch: string;
  };
}

declare global {
  interface Window {
    api?: {
      search: (q: string) => Promise<any>;
      getStreamUrl: (id: string) => Promise<any>;
    };
  }
}
