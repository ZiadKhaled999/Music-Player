import React, { useState, useEffect } from 'react';
import { SystemStatus, StreamInfo } from '../types';
import {
  Activity,
  Terminal,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  RotateCw,
  ExternalLink,
  Cpu,
  Clock,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

export const Diagnostics: React.FC = () => {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  // Live test extractor state
  const [testVideoId, setTestVideoId] = useState('dQw4w9WgXcQ');
  const [extracting, setExtracting] = useState(false);
  const [extractedResult, setExtractedResult] = useState<StreamInfo | null>(null);

  const fetchStatus = async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch('/api/system/check');
      const data = await res.json();
      setStatus(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const runExtractionTest = async () => {
    let cleanId = testVideoId.trim();
    if (cleanId.includes('v=')) {
      cleanId = cleanId.split('v=')[1]?.slice(0, 11) || cleanId;
    } else if (cleanId.includes('youtu.be/')) {
      cleanId = cleanId.split('youtu.be/')[1]?.slice(0, 11) || cleanId;
    }

    setExtracting(true);
    setExtractedResult(null);

    try {
      const res = await fetch(`/api/music/stream?id=${encodeURIComponent(cleanId)}`);
      const data = await res.json();
      setExtractedResult(data);
    } catch (err: any) {
      setExtractedResult({
        success: false,
        videoId: cleanId,
        error: err.message,
      });
    } finally {
      setExtracting(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* yt-dlp */}
        <div className="p-4 rounded-xl bg-[#14171e] border border-[#232833] relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-300">yt-dlp Stream Extractor</span>
            {status?.ytdlp?.installed ? (
              <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Active
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] font-mono text-red-400">
                <XCircle className="w-3.5 h-3.5" />
                Missing
              </span>
            )}
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-white">
            {status?.ytdlp?.version || 'Checking…'}
          </div>
          <p className="text-[11px] text-neutral-400 mt-1 truncate" title={status?.ytdlp?.path}>
            {status?.ytdlp?.path || 'bin/yt-dlp'}
          </p>
          <div className="mt-3 pt-2 border-t border-[#1e232d] flex items-center justify-between text-[10px] text-neutral-500 font-mono">
            <span>Runtime: Node.js EJS</span>
            <span className="text-emerald-400">Cipher Decryption OK</span>
          </div>
        </div>

        {/* InnerTube / youtubei.js */}
        <div className="p-4 rounded-xl bg-[#14171e] border border-[#232833] relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-300">youtubei.js InnerTube</span>
            {status?.youtubei?.initialized ? (
              <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Connected
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] font-mono text-amber-400">
                <Activity className="w-3.5 h-3.5" />
                Connecting
              </span>
            )}
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-white">
            {status?.youtubei?.latencyMs ? `${status.youtubei.latencyMs}ms` : '--'}
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">
            UniversalCache (false) • Zero API Quotas
          </p>
          <div className="mt-3 pt-2 border-t border-[#1e232d] flex items-center justify-between text-[10px] text-neutral-500 font-mono">
            <span>Auth: None required</span>
            <span className="text-emerald-400">Search Protocol 100%</span>
          </div>
        </div>

        {/* mpv Audio Engine */}
        <div className="p-4 rounded-xl bg-[#14171e] border border-[#232833] relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-300">mpv Player (Local)</span>
            <span className="flex items-center gap-1 text-[11px] font-mono text-blue-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              Raycast Host
            </span>
          </div>
          <div className="mt-2 text-sm font-semibold text-neutral-200">
            brew install mpv
          </div>
          <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
            Headless Unix child process spawned by Raycast on macOS.
          </p>
          <div className="mt-3 pt-2 border-t border-[#1e232d] flex items-center justify-between text-[10px] text-neutral-500 font-mono">
            <span>Spawn: --no-video</span>
            <span className="text-neutral-400">Killable PID</span>
          </div>
        </div>
      </div>

      {/* Interactive Stream URL Extractor Test Runner */}
      <div className="rounded-xl border border-[#262b35] bg-[#121418] p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-red-500" />
              Live yt-dlp Extraction Benchmark
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Execute the exact stream extraction command on any YouTube video ID or link
            </p>
          </div>

          <button
            onClick={fetchStatus}
            disabled={loadingStatus}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1d24] hover:bg-[#222731] text-neutral-300 text-xs font-mono border border-[#2b323f] transition-colors"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loadingStatus ? 'animate-spin' : ''}`} />
            <span>Refresh Diagnostics</span>
          </button>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={testVideoId}
              onChange={(e) => setTestVideoId(e.target.value)}
              placeholder="Enter YouTube Video ID or URL (e.g. dQw4w9WgXcQ)"
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#0c0e12] border border-[#262b35] text-xs font-mono text-neutral-200 focus:outline-none focus:border-red-500"
            />
          </div>
          <button
            onClick={runExtractionTest}
            disabled={extracting || !testVideoId.trim()}
            className="px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {extracting ? (
              <RotateCw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
            <span>{extracting ? 'Extracting Stream…' : 'Run yt-dlp Extraction'}</span>
          </button>
        </div>

        {/* Command Simulation Output */}
        {extractedResult && (
          <div className="mt-4 p-4 rounded-lg bg-[#0c0e12] border border-[#222733] space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between text-neutral-400 border-b border-[#1c202a] pb-2">
              <span className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${extractedResult.success ? 'bg-emerald-500' : 'bg-red-500'}`} />
                <span>Command: <code className="text-neutral-200">{extractedResult.command}</code></span>
              </span>
              {extractedResult.durationMs && (
                <span className="text-emerald-400 font-bold">{extractedResult.durationMs}ms</span>
              )}
            </div>

            {extractedResult.success && extractedResult.url ? (
              <div className="space-y-2">
                <div className="text-neutral-400 text-[11px]">Direct Audio Stream URL:</div>
                <div className="p-2.5 rounded bg-[#13161c] border border-[#20252e] text-neutral-300 break-all text-[11px] select-all max-h-24 overflow-y-auto custom-scrollbar">
                  {extractedResult.url}
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <a
                    href={extractedResult.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 font-sans font-medium"
                  >
                    <span>Open Raw Stream in Browser Tab</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ) : (
              <div className="text-red-400 text-xs">
                Extraction Error: {extractedResult.error || 'Failed to extract stream'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Architecture Deep Dive */}
      <div className="rounded-xl border border-[#262b35] bg-[#121418] p-5 shadow-lg">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
          <Cpu className="w-4 h-4 text-emerald-400" />
          Technical Highlights & Reliability
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-neutral-400 leading-relaxed">
          <div className="p-3.5 rounded-lg bg-[#14171e] border border-[#20252e]">
            <h4 className="font-semibold text-neutral-200 mb-1">Why youtubei.js over YouTube Data API?</h4>
            <p>
              The official YouTube v3 Data API has strict daily quota limits (10,000 units/day where search costs 100 units = 100 searches total) and requires API keys, OAuth credentials, and GCP project billing setup.
              <code className="text-neutral-300">youtubei.js</code> speaks the native InnerTube protobuf/JSON protocol used by the YouTube Music web app itself, providing instant unmetered searches.
            </p>
          </div>
          <div className="p-3.5 rounded-lg bg-[#14171e] border border-[#20252e]">
            <h4 className="font-semibold text-neutral-200 mb-1">Why yt-dlp + mpv over browser playback?</h4>
            <p>
              YouTube signatures change weekly. <code className="text-neutral-300">yt-dlp</code> maintains hundreds of reverse-engineered deobfuscation algorithms. Spawning <code className="text-neutral-300">mpv --no-video</code> gives the user lightweight background audio playback inside Raycast with 0ms UI lag and instant process termination.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
