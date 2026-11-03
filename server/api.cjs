const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const { Innertube, UniversalCache } = require('youtubei.js');

const projectRoot = path.resolve(__dirname, '..');

function resolveYtdlpPath() {
  const exe = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
  if (process.resourcesPath) {
    const packaged = path.join(process.resourcesPath, 'bin', exe);
    if (fs.existsSync(packaged)) return packaged;
  }
  return path.join(projectRoot, 'bin', exe);
}

const ytdlpPath = resolveYtdlpPath();

let ytPromise = null;
function getInnertube() {
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

async function searchMusic(query) {
  query = (query || '').trim();
  if (!query) {
    return { results: [], query: '' };
  }

  try {
    const yt = await getInnertube();
    const searchResult = await yt.music.search(query, { type: 'song' });
    const parsedItems = [];

    const getThumb = (item, videoId) => {
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
      for (const shelf of searchResult.contents) {
        const items = shelf.contents || [];
        for (const item of items) {
          if (!item) continue;

          const id = item.id || item.video_id || (item.endpoint?.payload?.videoId) || '';
          if (!id) continue;

          const title = (typeof item.title === 'string' ? item.title : item.title?.text) || 'Unknown Song';

          let artistName = '';
          if (Array.isArray(item.artists) && item.artists.length > 0) {
            artistName = item.artists.map((a) => a.name).filter(Boolean).join(', ');
          } else if (item.author) {
            artistName = typeof item.author === 'string' ? item.author : item.author?.name || '';
          } else if (Array.isArray(item.authors) && item.authors.length > 0) {
            artistName = item.authors.map((a) => a.name).filter(Boolean).join(', ');
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
            const yearMatch = subText.match(/\b(19\d\d|20\d\d)\b/);
            if (yearMatch) {
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

    return {
      query,
      results: parsedItems,
      count: parsedItems.length,
    };
  } catch (error) {
    console.error('InnerTube song search error:', error);
    return {
      error: error.message || 'InnerTube song search failed',
      results: [],
    };
  }
}

function getStreamUrl(videoId) {
  videoId = (videoId || '').trim();
  if (!videoId) {
    return Promise.resolve({ success: false, error: 'Missing video id parameter' });
  }
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return Promise.resolve({ success: false, error: 'Invalid YouTube video ID format' });
  }

  const startTime = Date.now();
  const args = [
    '-f',
    'bestaudio',
    '-g',
    `https://www.youtube.com/watch?v=${videoId}`,
  ];

  return new Promise((resolve) => {
    execFile(ytdlpPath, args, { timeout: 25000 }, (err, stdout, stderr) => {
      const durationMs = Date.now() - startTime;
      if (err) {
        console.error('yt-dlp stream error:', stderr || err.message);
        return resolve({
          success: false,
          error: stderr || err.message,
          durationMs,
          command: 'yt-dlp -f bestaudio -g https://www.youtube.com/watch?v=' + videoId,
        });
      }
      const streamUrl = stdout.trim();
      return resolve({
        success: true,
        url: streamUrl,
        proxyUrl: `/api/music/proxy?url=${encodeURIComponent(streamUrl)}`,
        videoId,
        durationMs,
        command: 'yt-dlp -f bestaudio -g https://www.youtube.com/watch?v=' + videoId,
      });
    });
  });
}

module.exports = { searchMusic, getStreamUrl, ytdlpPath };

async function getLyrics(videoId, rawTitle, rawArtist) {
  videoId = (videoId || '').trim();
  rawTitle = (rawTitle || '').trim();
  rawArtist = (rawArtist || '').trim();

  if (!videoId) {
    return { success: false, error: 'Missing video id parameter' };
  }
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return { success: false, error: 'Invalid YouTube video ID format' };
  }

  const cleanTitle = rawTitle
    .replace(/\s*(\(|\[)(official\s*(video|audio|music\s*video|lyric\s*video|visualizer|remaster|hd|4k)?).*?(\)|\])/gi, '')
    .replace(/\s*-\s*official\s*(video|audio|music\s*video)/gi, '')
    .replace(/\s*feat\.?.*$/i, '')
    .trim() || rawTitle;

  const cleanArtist = rawArtist.split(',')[0].replace(/\s*feat\.?.*$/i, '').trim();

  // Strategy 1: LRCLIB
  try {
    const lrcSearchQuery = `${cleanArtist} ${cleanTitle}`.trim();
    const lrcRes = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(lrcSearchQuery)}`, {
      headers: { 'User-Agent': 'TubeTunes/1.0 (https://tubetunes.app)' },
    });
    if (lrcRes.ok) {
      const items = await lrcRes.json();
      const match = Array.isArray(items) ? items.find((i) => i.syncedLyrics && String(i.syncedLyrics).trim().length > 0) : null;
      if (match && match.syncedLyrics) {
        const syncedLines = [];
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
            if (text) syncedLines.push({ time, text });
          }
        }
        if (syncedLines.length > 0) {
          return {
            success: true,
            videoId,
            title: rawTitle,
            artist: rawArtist,
            isSynced: true,
            lines: syncedLines,
            plainLyrics: match.plainLyrics || syncedLines.map((l) => l.text).join('\n'),
            source: 'LRCLIB Synced',
          };
        }
      }
    }
  } catch (lrcErr) {
    console.warn('LRCLIB synced lyrics lookup skipped:', lrcErr);
  }

  // Strategy 2: InnerTube
  try {
    const yt = await getInnertube();
    const info = await yt.music.getInfo(videoId);
    let lyricsText = null;

    if (typeof info?.getLyrics === 'function') {
      try {
        const lyricsObj = await info.getLyrics();
        lyricsText = lyricsObj?.description?.text || lyricsObj?.content || lyricsObj?.text || null;
      } catch {}
    }

    if (!lyricsText && info?.tabs) {
      const lyricsTab = info.tabs.find((t) => t.title === 'Lyrics' || t.endpoint?.payload?.browseId);
      const browseId = lyricsTab?.endpoint?.payload?.browseId || info?.lyrics?.id || info?.lyrics;
      if (browseId && typeof yt.music?.getLyrics === 'function') {
        try {
          const lyricsObj = await yt.music.getLyrics(browseId);
          lyricsText = lyricsObj?.description?.text || lyricsObj?.content || null;
        } catch (err) {
          console.warn('yt.music.getLyrics(browseId) failed', err);
        }
      }
    }

    if (lyricsText) {
      const plainLines = lyricsText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
      return {
        success: true,
        videoId,
        title: rawTitle,
        artist: rawArtist,
        isSynced: false,
        lines: plainLines.map((text, i) => ({ time: i * 4, text })),
        plainLyrics: lyricsText,
        source: 'YouTube Music InnerTube',
      };
    }
  } catch (ytErr) {
    console.warn('InnerTube lyrics lookup failed:', ytErr);
  }

  return {
    success: false,
    videoId,
    title: rawTitle,
    isSynced: false,
    lines: [],
    plainLyrics: '',
    message: `No synced lyrics found for "${rawTitle}".`,
  };
}

// getDownloadsDir + download
let downloadsDir = null;
function getDownloadsDir() {
  if (!downloadsDir) {
    const base = process.env.MUSIC_PLAYER_DATA_DIR || projectRoot;
    downloadsDir = path.join(base, 'downloads');
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
    }
  }
  return downloadsDir;
}

function downloadSong(videoId, rawTitle) {
  videoId = (videoId || '').trim();
  rawTitle = (rawTitle || 'track').trim();
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return Promise.resolve({ success: false, error: 'Invalid video ID' });
  }
  const safeFilename = rawTitle.replace(/[^a-zA-Z0-9_ -]/g, '').trim() || videoId;
  const outputPath = path.join(getDownloadsDir(), `${safeFilename}-${videoId}.%(ext)s`);
  const args = [
    '-f',
    'bestaudio[ext=m4a]/bestaudio',
    '--add-metadata',
    '-o',
    outputPath,
    `https://www.youtube.com/watch?v=${videoId}`,
  ];
  return new Promise((resolve) => {
    execFile(ytdlpPath, args, { timeout: 120000 }, (err) => {
      if (err) {
        console.error('yt-dlp download failed:', err);
        return resolve({ success: false, error: err.message });
      }
      const matchedFile = fs.readdirSync(getDownloadsDir()).find((f) => f.includes(videoId));
      if (!matchedFile) {
        return resolve({ success: false, error: 'Downloaded file not found on disk' });
      }
      const fullFilePath = path.join(getDownloadsDir(), matchedFile);
      return resolve({ success: true, filePath: fullFilePath, filename: matchedFile });
    });
  });
}

function checkSystem() {
  const status = {
    ytdlp: { installed: false, version: null, path: ytdlpPath },
    mpv: { installed: false, version: null },
    youtubei: { initialized: false, latencyMs: 0 },
    system: { platform: process.platform, arch: process.arch },
  };
  const exec = (cmd, args) => new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: 4000 }, (err, stdout) => {
      if (err) reject(err); else resolve(stdout);
    });
  });
  (async () => {})();
  return (async () => {
    try {
      if (fs.existsSync(ytdlpPath)) {
        const v = await exec(ytdlpPath, ['--version']);
        status.ytdlp.installed = true;
        status.ytdlp.version = v.trim();
      }
    } catch (err) { status.ytdlp.error = err.message; }
    try {
      const v = await exec('mpv', ['--version']);
      status.mpv.installed = true;
      status.mpv.version = v.trim().split('\n')[0];
    } catch (err) { status.mpv.installed = false; status.mpv.note = 'Optional: install mpv for local playback.'; }
    const t0 = Date.now();
    try {
      const yt = await getInnertube();
      status.youtubei.initialized = !!yt;
      status.youtubei.latencyMs = Date.now() - t0;
    } catch (err) { status.youtubei.error = err.message; }
    return status;
  })();
}

module.exports = { searchMusic, getStreamUrl, getLyrics, downloadSong, checkSystem, ytdlpPath, getDownloadsDir };
