import { Router, Request, Response } from 'express';
import { execFile } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { Innertube, UniversalCache } from 'youtubei.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const ytdlpPath = path.join(projectRoot, 'bin', 'yt-dlp');
const downloadsDir = path.join(projectRoot, 'downloads');

if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

export const apiRouter = Router();

let ytPromise: Promise<Innertube> | null = null;
async function getInnertube(): Promise<Innertube> {
  if (!ytPromise) {
    ytPromise = Innertube.create({
      cache: new UniversalCache(false),
      retrieve_player: true,
      generate_session_locally: true,
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
  const outputPath = path.join(downloadsDir, `${safeFilename}-${videoId}.%(ext)s`);

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
      .readdirSync(downloadsDir)
      .find((f) => f.includes(videoId));

    if (!matchedFile) {
      return res.status(500).send('Downloaded file not found on disk');
    }

    const fullFilePath = path.join(downloadsDir, matchedFile);
    res.download(fullFilePath, matchedFile, (downloadErr) => {
      if (downloadErr) {
        console.error('Error sending file:', downloadErr);
      }
    });
  });
});

// Tube Tunes - Full Raycast Extension Package Source
apiRouter.get('/raycast-files', (req: Request, res: Response) => {
  res.json({
    name: "Music Player",
    files: {
      'package.json': JSON.stringify(
        {
          "$schema": "https://www.raycast.com/schemas/extension.json",
          "name": "music-player",
          "title": "Music Player",
          "description": "Search, stream, download, and read lyrics for music from YouTube.",
          "icon": "extension-icon.png",
          "author": "your-github-username",
          "categories": ["Music", "Media"],
          "license": "MIT",
          "commands": [
            {
              "name": "index",
              "title": "Search Music",
              "description": "Search YouTube Music, play, download, view lyrics",
              "mode": "view"
            }
          ],
          "preferences": [
            {
              "name": "downloadPath",
              "type": "textfield",
              "required": false,
              "title": "Download Folder",
              "default": "~/Music/MusicPlayer",
              "description": "Where downloaded songs are saved"
            }
          ],
          "dependencies": {
            "youtubei.js": "^13.0.0"
          },
          "devDependencies": {
            "@raycast/api": "^1.90.0",
            "@raycast/eslint-config": "^1.0.8",
            "@types/react": "^18.3.0",
            "eslint": "^8.57.0",
            "prettier": "^3.3.0",
            "typescript": "^5.5.0"
          },
          "scripts": {
            "build": "ray build -e dist",
            "dev": "ray develop",
            "lint": "ray lint",
            "fix-lint": "ray lint --fix",
            "publish": "npx @raycast/api@latest publish"
          }
        },
        null,
        2
      ),

      'src/lib/client.ts': `import { Innertube, UniversalCache } from "youtubei.js";

let client: Awaited<ReturnType<typeof Innertube.create>> | null = null;

export async function getClient() {
  client ??= await Innertube.create({ cache: new UniversalCache(false) });
  return client;
}
`,

      'src/lib/deps.ts': `import { execFile } from "child_process";
import { existsSync, mkdirSync } from "fs";
import { homedir } from "os";
import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  downloadPath: string;
}

function which(bin: string): Promise<boolean> {
  return new Promise((resolve) => {
    execFile("which", [bin], (err) => resolve(!err));
  });
}

export async function checkDeps(): Promise<string[]> {
  const missing: string[] = [];
  if (!(await which("mpv"))) missing.push("mpv");
  if (!(await which("yt-dlp"))) missing.push("yt-dlp");
  return missing;
}

export function getDownloadDir(): string {
  const { downloadPath } = getPreferenceValues<Preferences>();
  const dir = (downloadPath || "~/Music/MusicPlayer").replace("~", homedir());
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}
`,

      'src/lib/player.ts': `import { spawn, ChildProcess } from "child_process";
import { showToast, Toast } from "@raycast/api";

let current: ChildProcess | null = null;
let currentTitle = "";

export function play(url: string, title: string) {
  stop();
  currentTitle = title;
  current = spawn("mpv", ["--no-video", "--really-quiet", url]);
  current.on("error", () =>
    showToast({
      style: Toast.Style.Failure,
      title: "mpv not found",
      message: "Run: brew install mpv",
    })
  );
}

export function stop() {
  current?.kill();
  current = null;
  currentTitle = "";
}

export function getCurrentTitle(): string {
  return currentTitle;
}
`,

      'src/lib/stream.ts': `import { execFile } from "child_process";

export function getStreamUrl(videoId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      "yt-dlp",
      ["-f", "bestaudio", "-g", \`https://www.youtube.com/watch?v=\${videoId}\`],
      { timeout: 20000 },
      (err, stdout) => (err ? reject(err) : resolve(stdout.trim()))
    );
  });
}
`,

      'src/lib/download.ts': `import { execFile } from "child_process";
import { showToast, Toast } from "@raycast/api";
import { getDownloadDir } from "./deps";

export async function downloadSong(videoId: string, title: string): Promise<void> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: \`Downloading "\${title}"…\`,
  });

  await new Promise<void>((resolve, reject) => {
    execFile(
      "yt-dlp",
      [
        "-f",
        "bestaudio[ext=m4a]/bestaudio",
        "--add-metadata",
        "-o",
        \`\${getDownloadDir()}/%(title)s.%(ext)s\`,
        \`https://www.youtube.com/watch?v=\${videoId}\`,
      ],
      { timeout: 120000 },
      (err) => (err ? reject(err) : resolve())
    );
  });

  toast.style = Toast.Style.Success;
  toast.title = \`Saved "\${title}" to your music folder\`;
}
`,

      'src/lib/lyrics.ts': `import { getClient } from "./client";

export async function getLyrics(videoId: string): Promise<string | null> {
  const client = await getClient();
  const info = await client.music.getInfo(videoId);

  // Strategy 1: Check info.getLyrics()
  if (typeof (info as any).getLyrics === "function") {
    try {
      const res = await (info as any).getLyrics();
      const text = res?.description?.text ?? res?.content ?? res?.text;
      if (text) return text;
    } catch {
      // fallback
    }
  }

  // Strategy 2: Check lyrics browseId
  const lyricsField = (info as any).lyrics;
  const browseId = typeof lyricsField === "string" ? lyricsField : lyricsField?.id;
  if (!browseId) {
    if (info.tabs) {
      const tab = info.tabs.find((t: any) => t.title === "Lyrics" || t.endpoint?.payload?.browseId);
      const tabBrowseId = tab?.endpoint?.payload?.browseId;
      if (tabBrowseId && typeof (client.music as any).getLyrics === "function") {
        const lyrics = await (client.music as any).getLyrics(tabBrowseId);
        return lyrics?.description?.text ?? lyrics?.content ?? null;
      }
    }
    return null;
  }

  const lyrics = await (client.music as any).getLyrics(browseId);
  return lyrics?.description?.text ?? lyrics?.content ?? null;
}
`,

      'src/lyrics.tsx': `import { useEffect, useState } from "react";
import { Detail } from "@raycast/api";
import { getLyrics } from "./lib/lyrics";

export function LyricsView({ videoId, title }: { videoId: string; title: string }) {
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    getLyrics(videoId)
      .then((l) => (l ? setLyrics(l) : setNotFound(true)))
      .catch(() => setNotFound(true));
  }, [videoId]);

  if (notFound) return <Detail markdown={\`**No lyrics found for "\${title}"**\`} />;
  return (
    <Detail
      isLoading={!lyrics}
      markdown={lyrics ? \`# \${title}\\n\\n---\\n\\n\${lyrics}\` : undefined}
    />
  );
}
`,

      'src/index.tsx': `import { useState, useEffect } from "react";
import {
  List,
  Detail,
  ActionPanel,
  Action,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { getClient } from "./lib/client";
import { checkDeps } from "./lib/deps";
import { getStreamUrl } from "./lib/stream";
import { play, stop } from "./lib/player";
import { downloadSong } from "./lib/download";
import { LyricsView } from "./lyrics";

const SETUP_MD = \`# Setup required

This extension needs two tools installed on your Mac. Run these in a terminal:

\\\`\\\`\\\`
brew install mpv
brew install yt-dlp
\\\`\\\`\\\`

Then come back and press **↵** — or just quit and reopen the command.
\`;

export default function Command() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [missingDeps, setMissingDeps] = useState<string[] | null>(null);
  const { push } = useNavigation();

  // Dependency check on launch
  useEffect(() => {
    checkDeps().then(setMissingDeps);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const client = await getClient();
        const search = await client.music.search(query);
        setResults((search as any).videos ?? []);
      } catch (e) {
        showToast({
          style: Toast.Style.Failure,
          title: "Search failed",
          message: String(e),
        });
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  if (missingDeps === null) {
    return <Detail isLoading markdown="" />;
  }

  if (missingDeps.length > 0) {
    return (
      <Detail
        markdown={SETUP_MD}
        actions={
          <ActionPanel>
            <Action title="Check Again" onAction={() => checkDeps().then(setMissingDeps)} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={loading}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search YouTube Music…"
      throttle
    >
      {results.map((v) => {
        const title = v.title?.text ?? "Unknown";
        const artist = v.author?.name ?? "";
        return (
          <List.Item
            key={v.id}
            title={title}
            subtitle={artist}
            accessories={[{ text: v.duration?.text ?? "" }]}
            actions={
              <ActionPanel>
                <Action
                  title="Play"
                  onAction={async () => {
                    try {
                      const url = await getStreamUrl(v.id);
                      play(url, title);
                    } catch {
                      showToast({
                        style: Toast.Style.Failure,
                        title: "Couldn't get stream",
                        message: "Check yt-dlp: brew upgrade yt-dlp",
                      });
                    }
                  }}
                />
                <Action
                  title="Download"
                  onAction={() =>
                    downloadSong(v.id, title).catch(() =>
                      showToast({
                        style: Toast.Style.Failure,
                        title: "Download failed",
                        message: "Check yt-dlp: brew upgrade yt-dlp",
                      })
                    )
                  }
                />
                <Action
                  title="Show Lyrics"
                  onAction={() => push(<LyricsView videoId={v.id} title={title} />)}
                />
                <Action.OpenInBrowser
                  title="Open in Browser"
                  url={\`https://music.youtube.com/watch?v=\${v.id}\`}
                />
                <Action title="Stop Playback" onAction={stop} shortcut={{ modifiers: ["cmd"], key: "." }} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
`,

      'tsconfig.json': JSON.stringify(
        {
          "compilerOptions": {
            "lib": ["ES2023"],
            "module": "commonjs",
            "target": "ES2022",
            "strict": true,
            "esModuleInterop": true,
            "skipLibCheck": true,
            "forceConsistentCasingInFileNames": true,
            "jsx": "react-jsx"
          },
          "include": ["src/**/*"]
        },
        null,
        2
      ),

      '.eslintrc.json': JSON.stringify(
        {
          "root": true,
          "extends": ["@raycast"]
        },
        null,
        2
      ),

      'README.md': `# Music Player

Search, stream, download, and read lyrics for music from YouTube directly inside Raycast.

## The Architecture
- **Search & Lyrics**: \`youtubei.js\` — Direct InnerTube protocol communication. No API keys, no Google account needed.
- **Stream & Download**: \`yt-dlp\` — Audio stream extraction and lossless \`.m4a\` downloads with metadata tags.
- **Playback**: \`mpv --no-video\` — Lightweight headless child process. Instant stop on kill.

## System Requirements
Run in terminal on macOS:
\`\`\`bash
brew install mpv yt-dlp
\`\`\`

## Getting Started
\`\`\`bash
npm install
npm run dev
\`\`\`

## Commands
- **Search Music**: Search YouTube Music, play, download songs, and view synced lyrics.
`,

      'CHANGELOG.md': `# Music Player Changelog

## [Initial Version] - 2026-11-03
- Added YouTube Music search via InnerTube protocol (\`youtubei.js\`)
- Added lossless background streaming via \`yt-dlp\` and \`mpv\`
- Added offline song downloading (\`.m4a\`) with automatic metadata tagging
- Added synced lyrics reader view (\`LyricsView\`)
- Added system prerequisite detector for \`mpv\` and \`yt-dlp\`
`
    }
  });
});
