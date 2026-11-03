export const raycastExtension = {
    name: "Music Player",
    files: {
      'package.json': JSON.stringify(
        {
          "$schema": "https://www.raycast.com/schemas/extension.json",
          "name": "music-player",
          "title": "Music Player",
          "description": "Search, stream, download, and read lyrics for music from YouTube.",
          "icon": "extension-icon.png",
          "author": "ziad_khaled",
          "categories": ["Media"],
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
            "@raycast/api": "^1.90.0",
            "youtubei.js": "^13.0.0"
          },
          "devDependencies": {
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
          "extends": ["@raycast"],
          "rules": {
            "@typescript-eslint/no-explicit-any": "off"
          }
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
};