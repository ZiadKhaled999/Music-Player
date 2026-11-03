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

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const apiCjs: any = require('./api.cjs');

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
    status.mpv.note = 'Optional: install mpv for local playback.';
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
  try {
    const data = await apiCjs.searchMusic(query);
    return res.json(data);
  } catch (error: any) {
    console.error('InnerTube song search error:', error);
    return res.status(500).json({
      error: error.message || 'InnerTube song search failed',
      results: [],
    });
  }
});

// Stream URL Extraction endpoint via yt-dlp
apiRouter.get('/music/stream', async (req: Request, res: Response) => {
  const videoId = (req.query.id as string || '').trim();
  try {
    const data = await apiCjs.getStreamUrl(videoId);
    return res.json(data);
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Stream extraction failed',
    });
  }
});

// Audio stream proxy endpoint for browsers with Range support
apiRouter.get('/music/proxy', async (req: Request, res: Response) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl || !targetUrl.startsWith('http')) {
    return res.status(400).send('Invalid audio URL');
  }
  try {
    const u = new URL(targetUrl);
    const ok = /(^|\.)googlevideo\.com$/i.test(u.hostname) || /(^|\.)googleusercontent\.com$/i.test(u.hostname) || /(^|\.)ggpht\.com$/i.test(u.hostname) || /ytimg\.com$/i.test(u.hostname);
    if (!ok) {
      return res.status(400).send('Disallowed proxy target');
    }
  } catch {
    return res.status(400).send('Invalid audio URL');
  }

  try {
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };
    if (req.headers.range) {
      headers['Range'] = req.headers.range;
    }

    const response = await fetch(targetUrl, { headers, signal: AbortSignal.timeout(30000) });
    
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
const match = items.find((i) => i.syncedLyrics && String(i.syncedLyrics).trim().length > 0);

        
        if (match && match.syncedLyrics) {
          const syncedLines: { time: number; text: string }[] = [];
          const regex = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\](.*)/;

          for (const line of match.syncedLyrics.split('\n')) {
            const m = line.match(regex);
            if (m) {
              const min = parseInt(m[1], 10);
              const sec = parseInt(m[2], 10);
              const msRaw = m[3] || '';
              let ms = 0;
              if (msRaw.length === 1) ms = parseInt(msRaw, 10) / 10;
              else if (msRaw.length === 2) ms = parseInt(msRaw, 10) / 100;
              else if (msRaw.length === 3) ms = parseInt(msRaw, 10) / 1000;
              const time = Math.round((min * 60 + sec + ms) * 1000) / 1000;
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

  const safeFilename = rawTitle.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '').trim().slice(0, 120) || videoId;
  const outputPath = path.join(getDownloadsDir(), `${safeFilename}-${videoId}.%(ext)s`);

  const args = [
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