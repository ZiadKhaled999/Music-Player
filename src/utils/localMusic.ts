import { SongItem } from '../types';

const LOCAL_ARTWORK_POOL = [
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&auto=format&fit=crop&q=85',
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&auto=format&fit=crop&q=85',
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1200&auto=format&fit=crop&q=85',
  'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=1200&auto=format&fit=crop&q=85',
  'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=1200&auto=format&fit=crop&q=85',
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200&auto=format&fit=crop&q=85',
  'https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=1200&auto=format&fit=crop&q=85',
  'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=1200&auto=format&fit=crop&q=85',
];

export function isAudioFile(filename: string, mimeType?: string): boolean {
  if (mimeType && mimeType.startsWith('audio/')) return true;
  const audioExtensions = /\.(mp3|wav|flac|m4a|aac|ogg|opus|wma|aiff|alac)$/i;
  return audioExtensions.test(filename);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function createLocalSongItem(file: File, index: number, folderName: string): SongItem {
  // Strip extension
  let cleanName = file.name.replace(/\.[^/.]+$/, '');
  cleanName = cleanName.replace(/_/g, ' ').replace(/-/g, ' - ').trim();

  let artist = folderName || 'Local File';
  let title = cleanName;

  // If filename is "Artist - Title"
  if (cleanName.includes(' - ')) {
    const parts = cleanName.split(' - ');
    if (parts.length >= 2) {
      artist = parts[0].trim();
      title = parts.slice(1).join(' - ').trim();
    }
  }

  // Pick artwork based on title string hash
  let hash = 0;
  for (let i = 0; i < file.name.length; i++) {
    hash = (hash << 5) - hash + file.name.charCodeAt(i);
    hash |= 0;
  }
  const artIndex = Math.abs(hash) % LOCAL_ARTWORK_POOL.length;
  const artwork = LOCAL_ARTWORK_POOL[artIndex];

  // Detect file format
  const ext = file.name.split('.').pop()?.toUpperCase() || 'AUDIO';

  const blobUrl = URL.createObjectURL(file);

  return {
    id: `local_${Date.now()}_${index}`,
    title,
    artist,
    album: folderName,
    year: 'Local',
    duration: '03:45',
    durationSeconds: 225,
    thumbnail: artwork,
    type: 'local',
    isLocal: true,
    localBlobUrl: blobUrl,
    fileSize: formatFileSize(file.size),
    fileType: ext,
  };
}
