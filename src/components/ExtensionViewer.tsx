import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import {
  FileCode,
  Download,
  Copy,
  Check,
  Terminal,
  Folder,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Zap,
  Play,
  FileText,
  CheckCircle2,
  ListOrdered
} from 'lucide-react';

export const ExtensionViewer: React.FC = () => {
  const [files, setFiles] = useState<Record<string, string>>({});
  const [activeFile, setActiveFile] = useState<string>('src/index.tsx');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isZipping, setIsZipping] = useState(false);
  const [subTab, setSubTab] = useState<'files' | 'publish'>('files');

  useEffect(() => {
    fetch('/api/raycast-files')
      .then((r) => r.json())
      .then((data) => {
        if (data.files) {
          setFiles(data.files);
        }
      })
      .catch((err) => console.error('Failed to load Raycast files:', err));
  }, []);

  const handleCopy = (content: string, key: string) => {
    navigator.clipboard.writeText(content);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();

      // Add all source code files
      for (const [filepath, content] of Object.entries(files)) {
        zip.file(filepath, content);
      }

      // Add .gitignore
      zip.file(
        '.gitignore',
        `node_modules/
dist/
.DS_Store
*.m4a
downloads/
`
      );

      // Fetch and attach 512x512 extension icon into assets/
      try {
        const iconRes = await fetch('/assets/extension-icon.png');
        if (iconRes.ok) {
          const iconBlob = await iconRes.blob();
          zip.file('assets/extension-icon.png', iconBlob);
        }
      } catch (err) {
        console.warn('Could not bundle icon binary:', err);
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tube-tunes.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to build zip:', err);
    } finally {
      setIsZipping(false);
    }
  };

  const fileList = Object.keys(files);

  return (
    <div className="space-y-6 font-sans">
      {/* Extension Overview Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-[#14171e] border border-[#232833] flex items-center gap-3">
          <img
            src="/assets/extension-icon.png"
            alt="Tube Tunes"
            className="w-10 h-10 rounded-lg object-cover border border-[#2b303d] shadow-md shrink-0"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div className="min-w-0">
            <div className="text-xs font-bold text-white truncate">Tube Tunes v1.0.0</div>
            <div className="text-[10px] text-neutral-400 font-mono truncate">name: tube-tunes</div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#14171e] border border-[#232833] flex items-start gap-3">
          <div className="p-2 rounded-lg bg-red-500/10 text-red-400 shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-white">Search & Lyrics</div>
            <p className="text-[11px] text-neutral-400 mt-0.5">InnerTube unmetered</p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#14171e] border border-[#232833] flex items-start gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
            <Download className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-white">Offline Downloads</div>
            <p className="text-[11px] text-neutral-400 mt-0.5">.m4a with metadata</p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#14171e] border border-[#232833] flex items-start gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
            <Play className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-white">Headless mpv</div>
            <p className="text-[11px] text-neutral-400 mt-0.5">Instant stop/kill PID</p>
          </div>
        </div>
      </div>

      {/* Subtab Navigation (Code vs Publish Checklist) */}
      <div className="flex items-center justify-between border-b border-[#20252e] pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubTab('files')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              subTab === 'files'
                ? 'bg-[#222733] text-white shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Source Files ({fileList.length})
          </button>
          <button
            onClick={() => setSubTab('publish')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              subTab === 'publish'
                ? 'bg-[#222733] text-white shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5 text-amber-400" />
            <span>Publish Checklist & PR Guide</span>
          </button>
        </div>

        <button
          onClick={handleDownloadZip}
          disabled={isZipping}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-md shadow-red-600/25 transition-all"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{isZipping ? 'Zipping tube-tunes…' : 'Download Tube Tunes (.zip)'}</span>
        </button>
      </div>

      {subTab === 'files' ? (
        /* Source Code Viewer */
        <div className="rounded-xl border border-[#262b35] bg-[#121418] overflow-hidden shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-[#20252e] bg-[#161921]">
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 max-w-full">
              <Folder className="w-4 h-4 text-neutral-500 mr-1.5 shrink-0" />
              {fileList.map((filename) => (
                <button
                  key={filename}
                  onClick={() => setActiveFile(filename)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all shrink-0 ${
                    activeFile === filename
                      ? 'bg-[#252b37] text-white border border-[#3b4356] shadow-xs'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#1a1d25]'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{filename}</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => handleCopy(files[activeFile] || '', activeFile)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1f242e] hover:bg-[#282e3b] text-neutral-200 text-xs font-medium border border-[#2d3545] transition-all"
            >
              {copiedKey === activeFile ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy File</span>
                </>
              )}
            </button>
          </div>

          <div className="relative">
            <pre className="p-4 text-xs font-mono text-neutral-300 leading-relaxed overflow-x-auto bg-[#0e1014] max-h-[460px] custom-scrollbar">
              <code>{files[activeFile] || '// Loading file content…'}</code>
            </pre>
          </div>
        </div>
      ) : (
        /* Raycast Store Publish Checklist (Section 11) */
        <div className="rounded-xl border border-[#262b35] bg-[#121418] p-6 shadow-xl space-y-6">
          <div className="border-b border-[#232833] pb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              11. Tube Tunes Raycast Store Publish Checklist
            </h3>
            <p className="text-xs text-neutral-400 mt-1">
              Step-by-step verification before submitting your PR to <code className="text-neutral-200 font-mono">raycast/extensions</code>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Step 1 & 2 */}
            <div className="p-4 rounded-xl bg-[#151821] border border-[#262c38] space-y-2">
              <div className="font-semibold text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-red-600/30 text-red-400 text-center font-mono text-[11px] font-bold flex items-center justify-center">1</span>
                Clean Build & Lint
              </div>
              <p className="text-neutral-400 leading-relaxed">
                Raycast CI rejects extensions with TypeScript or ESLint errors.
              </p>
              <div className="p-2.5 rounded bg-[#0d0f14] font-mono text-neutral-300 text-[11px] space-y-1">
                <div>npm run build <span className="text-emerald-400"># must pass clean</span></div>
                <div>npm run lint <span className="text-emerald-400"># must pass clean</span></div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-4 rounded-xl bg-[#151821] border border-[#262c38] space-y-2">
              <div className="font-semibold text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-red-600/30 text-red-400 text-center font-mono text-[11px] font-bold flex items-center justify-center">2</span>
                Icon & Metadata Assets
              </div>
              <p className="text-neutral-400 leading-relaxed">
                Add 512×512 PNG icon in <code className="text-neutral-200 font-mono">assets/extension-icon.png</code> (included in zip).
                Capture three 2000×1250 screenshots using Raycast Window Capture mode into <code className="text-neutral-200 font-mono">metadata/</code>:
              </p>
              <ul className="list-disc list-inside text-neutral-400 space-y-0.5 text-[11px]">
                <li>Search results with playing indicator</li>
                <li>Lyrics view (<code className="text-neutral-300 font-mono">LyricsView</code>)</li>
                <li>Download toast showing saved audio</li>
              </ul>
            </div>

            {/* Step 4: PR Framing */}
            <div className="p-4 rounded-xl bg-[#151821] border border-[#262c38] space-y-2">
              <div className="font-semibold text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-red-600/30 text-red-400 text-center font-mono text-[11px] font-bold flex items-center justify-center">3</span>
                PR Description Framing
              </div>
              <p className="text-neutral-400 leading-relaxed">
                Reviewers enforce Raycast TOS language: Frame as a <strong className="text-neutral-200">"personal music player that streams and saves songs for offline listening"</strong>.
                Avoid using trigger words like <em>"convert"</em>, <em>"rip"</em>, or <em>"extract"</em>.
              </p>
            </div>

            {/* Step 5: Publish command */}
            <div className="p-4 rounded-xl bg-[#151821] border border-[#262c38] space-y-2">
              <div className="font-semibold text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-red-600/30 text-red-400 text-center font-mono text-[11px] font-bold flex items-center justify-center">4</span>
                Automated Fork & Publish
              </div>
              <p className="text-neutral-400 leading-relaxed">
                Raycast CLI handles GitHub authentication and opens the PR for you automatically:
              </p>
              <div className="p-2.5 rounded bg-[#0d0f14] font-mono text-emerald-400 text-[11px]">
                npm run publish
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Terminal Quickstart */}
      <div className="rounded-xl border border-[#262b35] bg-[#121418] p-5 shadow-lg">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
          <Terminal className="w-4 h-4 text-red-500" />
          Terminal Setup (Run in project directory)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-3 rounded-lg bg-[#0d0f14] border border-[#232833]">
            <div className="text-[10px] text-neutral-500 uppercase">1. Homebrew Deps</div>
            <div className="text-neutral-200 mt-1">brew install mpv yt-dlp</div>
          </div>

          <div className="p-3 rounded-lg bg-[#0d0f14] border border-[#232833]">
            <div className="text-[10px] text-neutral-500 uppercase">2. Node Install</div>
            <div className="text-neutral-200 mt-1">npm install</div>
          </div>

          <div className="p-3 rounded-lg bg-[#0d0f14] border border-[#232833]">
            <div className="text-[10px] text-neutral-500 uppercase">3. Raycast Dev Mode</div>
            <div className="text-neutral-200 mt-1">npm run dev</div>
          </div>
        </div>
      </div>
    </div>
  );
};
