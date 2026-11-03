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
