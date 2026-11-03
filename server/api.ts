import { Router, Request, Response } from 'express';
import { execFile } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { Innertube, UniversalCache } from 'youtubei.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
function resolveYtdlpPath(): string {
  const exe = process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";
  if (process.resourcesPath) {
    const packaged = path.join(process.resourcesPath, "bin", exe);
    if (fs.existsSync(packaged)) return packaged;
  }
  return path.join(projectRoot, "bin", exe);
}

const ytdlpPath = resolveYtdlpPath();
let downloadsDir: string | null = null;

function getDownloadsDir(): string {
  if (!downloadsDir) {
    const base = process.env.MUSIC_PLAYER_DATA_DIR || projectRoot;
    downloadsDir = path.join(base, 'downloads');
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
    }
  }
  return downloadsDir;
}

export const apiRouter = Router();

let ytPromise: Promise<Innertube> | null = null;
async function getInnertube(): Promise<Innertube> {
  if (!ytPromise) {
    ytPromise = Innertube.create({
      cache: new UniversalCache(false),
      retrieve_player: true,
      generate_session_locally: true,
    }).catch((err) => {
      ytPromise = null;
      throw err;
    });
  }
  return ytPromise;
}

// System Health Check
apiRouter.get('/system/check', async (req: Request, res: Response) => {
  const status: Record<string, any> = {
    ytdlp: { installed: false, version: null, path: ytdlpPath },
    mpv: { installed: false, version: null },
    youtubei: { initialized: false, latencyMs: 0 },
    system: { platform: process.platform, arch: process.arch },
  };

  // Check yt-dlp binary
  try {
    if (fs.existsSync(ytdlpPath)) {
      const ytdlpVer = await new Promise<string>((resolve, reject) => {
        execFile(ytdlpPath, ['--version'], { timeout: 4000 }, (err, stdout) => {
          if (err) reject(err);
          else resolve(stdout.trim());
        });
      });
      status.ytdlp.installed = true;
      status.ytdlp.version = ytdlpVer;
    }
  } catch (err: any) {
    status.ytdlp.error = err.message;
  }

  // Check mpv
  try {
    const mpvVer = await new Promise<string>((resolve, reject) => {
      execFile('mpv', ['--version'], { timeout: 4000 }, (err, stdout) => {
        if (err) reject(err);
        else resolve(stdout.trim().split('\n')[0]);
      });
    });
    status.mpv.installed = true;
    status.mpv.version = mpvVer;
  } catch (err: any) {
    status.mpv.installed = false;
    status.mpv.note = 'Local Raycast extension requires `brew install mpv` on user macOS/Linux system.';
  }

  // Check youtubei.js
  const t0 = Date.now();
  try {
    const yt = await getInnertube();
    status.youtubei.initialized = !!yt;
    status.youtubei.latencyMs = Date.now() - t0;
  } catch (err: any) {
    status.youtubei.error = err.message;
  }

  res.json(status);
});

// Music Search endpoint (strictly songs only)
apiRouter.get('/music/search', async (req: Request, res: Response) => {
  const query = (req.query.q as string || '').trim();

  if (!query) {
    return res.json({ results: [], query: '' });
  }

  try {
    const yt = await getInnertube();
    // Strictly search for songs only
    const searchResult = await yt.music.search(query, { type: 'song' });
    const parsedItems: any[] = [];

    const getThumb = (item: any, videoId?: string): string => {
      let rawUrl = '';
      if (item.thumbnails && Array.isArray(item.thumbnails) && item.thumbnails.length > 0) {
        rawUrl = item.thumbnails[item.thumbnails.length - 1]?.url || item.thumbnails[0]?.url;
      } else if (item.thumbnail?.contents && Array.isArray(item.thumbnail.contents) && item.thumbnail.contents.length > 0) {
        const last = item.thumbnail.contents[item.thumbnail.contents.length - 1];
        rawUrl = last?.url || '';
      }

      if (rawUrl) {
        if (rawUrl.includes('googleusercontent.com') || rawUrl.includes('ggpht.com')) {
          return rawUrl.replace(/=w\d+-h\d+[^&?]*/gi, '=w1200-h1200-l90-rj').replace(/=s\d+[^&?]*/gi, '=s1200');
        }
        if (rawUrl.includes('ytimg.com')) {
          return rawUrl.replace(/\/(default|mqdefault|sddefault)\.jpg/gi, '/hqdefault.jpg');
        }
        return rawUrl;
      }

      if (videoId) {
        return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
      }
      return '';
    };

    if (searchResult.contents && Array.isArray(searchResult.contents)) {
      for (const shelf of searchResult.contents as any[]) {
        const items = shelf.contents || [];
        for (const item of items) {
          if (!item) continue;
          
          const id = item.id || item.video_id || (item.endpoint?.payload?.videoId) || '';
          if (!id) continue;

          const title = (typeof item.title === 'string' ? item.title : item.title?.text) || 'Unknown Song';
          
          let artistName = '';
          if (Array.isArray(item.artists) && item.artists.length > 0) {
            artistName = item.artists.map((a: any) => a.name).filter(Boolean).join(', ');
          } else if (item.author) {
            artistName = typeof item.author === 'string' ? item.author : item.author?.name || '';
          } else if (Array.isArray(item.authors) && item.authors.length > 0) {
            artistName = item.authors.map((a: any) => a.name).filter(Boolean).join(', ');
          }

          let albumName = '';
          if (item.album) {
            albumName = typeof item.album === 'string' ? item.album : item.album?.name || '';
          }

          let durationText = '';
          let durationSeconds = 0;
          if (item.duration) {
            if (typeof item.duration === 'string') {
              durationText = item.duration;
            } else {
              durationText = item.duration.text || '';
              durationSeconds = item.duration.seconds || 0;
            }
          }

          let year = '';
          if (item.year) {
            year = typeof item.year === 'string' ? item.year : String(item.year?.text || item.year);
          } else if (item.subtitle && item.subtitle.runs) {
            // If we have runs, the year is typically the last run if it's a 4-digit number
            const runs = item.subtitle.runs;
            for (let i = runs.length - 1; i >= 0; i--) {
              const text = runs[i].text || '';
              if (/^\d{4}$/.test(text.trim())) {
                year = text.trim();
                break;
              }
            }
          }

          if (!year && item.subtitle) {
            const subText = typeof item.subtitle === 'string' ? item.subtitle : item.subtitle?.text || '';
            // Match 4-digit years but avoid things that look like view counts or durations
            const yearMatch = subText.match(/\b(19\d\d|20\d\d)\b/);
            if (yearMatch) {
              // Simple heuristic: if the matched year is surrounded by dots or is at the end, it's more likely a year
              year = yearMatch[1];
            }
          }

          parsedItems.push({
            id,
            title,
            artist: artistName || 'Unknown Artist',
            album: albumName,
            year,
            duration: durationText,
            durationSeconds,
            thumbnail: getThumb(item, id) || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
            type: 'song',
          });
        }
      }
    }

    return res.json({
      query,
      results: parsedItems,
      count: parsedItems.length,
    });
  } catch (error: any) {
    console.error('InnerTube song search error:', error);
    return res.status(500).json({
      error: error.message || 'InnerTube song search failed',
      results: [],
    });
  }
});



// Stream URL Extraction endpoint via yt-dlp
apiRouter.get('/music/stream', (req: Request, res: Response) => {
  const videoId = (req.query.id as string || '').trim();
  if (!videoId) {
    return res.status(400).json({ error: 'Missing video id parameter' });
  }

  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return res.status(400).json({ error: 'Invalid YouTube video ID format' });
  }

  const startTime = Date.now();
  const args = [
    '--js-runtimes',
    'node:/usr/local/bin/node',
    '-f',
    'bestaudio',
    '-g',
    `https://www.youtube.com/watch?v=${videoId}`,
  ];

  execFile(ytdlpPath, args, { timeout: 25000 }, (err, stdout, stderr) => {
    const durationMs = Date.now() - startTime;
    if (err) {
      console.error('yt-dlp stream error:', stderr || err.message);
      return res.status(500).json({
        success: false,
        error: stderr || err.message,
        durationMs,
        command: `yt-dlp -f bestaudio -g https://www.youtube.com/watch?v=${videoId}`,
      });
    }

    const streamUrl = stdout.trim();
    return res.json({
      success: true,
      url: streamUrl,
      proxyUrl: `/api/music/proxy?url=${encodeURIComponent(streamUrl)}`,
      videoId,
      durationMs,
      command: `yt-dlp -f bestaudio -g https://www.youtube.com/watch?v=${videoId}`,
    });
  });
});

// Audio stream proxy endpoint for browsers with Range support
apiRouter.get('/music/proxy', async (req: Request, res: Response) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl || !targetUrl.startsWith('http')) {
    return res.status(400).send('Invalid audio URL');
  }

  try {
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };
    if (req.headers.range) {
      headers['Range'] = req.headers.range;
    }

    const response = await fetch(targetUrl, { headers });
    
    res.status(response.status);
    response.headers.forEach((val, key) => {
      if (!['transfer-encoding', 'connection'].includes(key.toLowerCase())) {
        res.setHeader(key, val);
      }
    });

    if (response.body) {
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();
    } else {
      res.end();
    }
  } catch (err: any) {
    if (!res.headersSent) {
      res.status(502).send('Proxy error: ' + err.message);
    }
  }
});

// Lyrics endpoint with synchronized time-coded lyric support
apiRouter.get('/music/lyrics', async (req: Request, res: Response) => {
  const videoId = (req.query.id as string || '').trim();
  const rawTitle = (req.query.title as string || '').trim();
  const rawArtist = (req.query.artist as string || '').trim();

  if (!videoId) {
    return res.status(400).json({ error: 'Missing video id parameter' });
  }

  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return res.status(400).json({ error: 'Invalid YouTube video ID format' });
  }

  // Clean title for lyric matching (remove (Official Video), [4K], etc.)
  const cleanTitle = rawTitle
    .replace(/\s*(\(|\[)(official\s*(video|audio|music\s*video|lyric\s*video|visualizer|remaster|hd|4k)?).*?(\)|\])/gi, '')
    .replace(/\s*-\s*official\s*(video|audio|music\s*video)/gi, '')
    .replace(/\s*feat\.?.*$/i, '')
    .trim() || rawTitle;

  const cleanArtist = rawArtist.split(',')[0].replace(/\s*feat\.?.*$/i, '').trim();

  // Strategy 1: LRCLIB Synchronized Lyrics API (High quality exact timestamps)
  try {
    const lrcSearchQuery = `${cleanArtist} ${cleanTitle}`.trim();
    const lrcRes = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(lrcSearchQuery)}`, {
      headers: { 'User-Agent': 'TubeTunes/1.0 (https://tubetunes.app)' },
    });

    if (lrcRes.ok) {
      const items: any[] = await lrcRes.json();
      const match = items.find((i) => i.syncedLyrics && i.syncedLyrics.length > 30);
      
      if (match && match.syncedLyrics) {
        const syncedLines: { time: number; text: string }[] = [];
        const regex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;

        for (const line of match.syncedLyrics.split('\n')) {
          const m = line.match(regex);
          if (m) {
            const min = parseInt(m[1], 10);
            const sec = parseInt(m[2], 10);
            const ms = parseFloat('0.' + m[3]);
            const time = Math.round((min * 60 + sec + ms) * 100) / 100;
            const text = m[4].trim();
            if (text) {
              syncedLines.push({ time, text });
            }
          }
        }

        if (syncedLines.length > 0) {
          return res.json({
            success: true,
            videoId,
            title: rawTitle,
            artist: rawArtist,
            isSynced: true,
            lines: syncedLines,
            plainLyrics: match.plainLyrics || syncedLines.map((l) => l.text).join('\n'),
            source: 'LRCLIB Synced',
          });
        }
      }
    }
  } catch (lrcErr) {
    console.warn('LRCLIB synced lyrics lookup skipped:', lrcErr);
  }

  // Strategy 2: InnerTube getInfo & getLyrics (YouTube Music official plain lyrics)
  try {
    const yt = await getInnertube();
    const info = await yt.music.getInfo(videoId);
    let lyricsText: string | null = null;

    if (typeof (info as any).getLyrics === 'function') {
      try {
        const lyricsObj = await (info as any).getLyrics();
        lyricsText = lyricsObj?.description?.text || lyricsObj?.content || lyricsObj?.text || null;
      } catch {
        // fallback to tab
      }
    }

    if (!lyricsText && info.tabs) {
      const lyricsTab = info.tabs.find((t: any) => t.title === 'Lyrics' || t.endpoint?.payload?.browseId);
      const browseId = lyricsTab?.endpoint?.payload?.browseId || (info as any).lyrics?.id || (info as any).lyrics;
      if (browseId && typeof (yt.music as any).getLyrics === 'function') {
        try {
          const lyricsObj = await (yt.music as any).getLyrics(browseId);
          lyricsText = lyricsObj?.description?.text || lyricsObj?.content || null;
        } catch (err) {
          console.warn('yt.music.getLyrics(browseId) failed', err);
        }
      }
    }

    if (lyricsText) {
      // Split plain lyrics into lines
      const plainLines = lyricsText
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      return res.json({
        success: true,
        videoId,
        title: rawTitle,
        artist: rawArtist,
        isSynced: false,
        lines: plainLines.map((text, i) => ({ time: i * 4, text })),
        plainLyrics: lyricsText,
        source: 'YouTube Music InnerTube',
      });
    }
  } catch (ytErr) {
    console.warn('InnerTube lyrics lookup failed:', ytErr);
  }

  return res.json({
    success: false,
    videoId,
    title: rawTitle,
    isSynced: false,
    lines: [],
    plainLyrics: '',
    message: `No synced lyrics found for "${rawTitle}".`,
  });
});


// Real Song Download Endpoint (.m4a with metadata)
apiRouter.get('/music/download', (req: Request, res: Response) => {
  const videoId = (req.query.id as string || '').trim();
  const rawTitle = (req.query.title as string || 'track').trim();

  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return res.status(400).send('Invalid video ID');
  }

  const safeFilename = rawTitle.replace(/[^a-zA-Z0-9_ -]/g, '').trim() || videoId;
  const outputPath = path.join(getDownloadsDir(), `${safeFilename}-${videoId}.%(ext)s`);

  const args = [
    '--js-runtimes',
    'node:/usr/local/bin/node',
    '-f',
    'bestaudio[ext=m4a]/bestaudio',
    '--add-metadata',
    '-o',
    outputPath,
    `https://www.youtube.com/watch?v=${videoId}`,
  ];

  execFile(ytdlpPath, args, { timeout: 120000 }, (err) => {
    if (err) {
      console.error('yt-dlp download failed:', err);
      return res.status(500).send('Download failed: ' + err.message);
    }

    // Find created file
    const matchedFile = fs
      .readdirSync(getDownloadsDir())
      .find((f) => f.includes(videoId));

    if (!matchedFile) {
      return res.status(500).send('Downloaded file not found on disk');
    }

    const fullFilePath = path.join(getDownloadsDir(), matchedFile);
    res.download(fullFilePath, matchedFile, (downloadErr) => {
      if (downloadErr) {
        console.error('Error sending file:', downloadErr);
      }
    });
  });
});

// Tube Tunes - Full Raycast Extension Package Source
import { raycastExtension } from './raycastExtension.ts';


apiRouter.get('/raycast-files', (_req: Request, res: Response) => {
  res.json(raycastExtension);
});