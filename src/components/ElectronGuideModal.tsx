import React, { useState } from 'react';
import { X, Monitor, Copy, Check, Terminal, Cpu, ShieldCheck, Download, Code2 } from 'lucide-react';

interface ElectronGuideModalProps {
  onClose: () => void;
}

export const ElectronGuideModal: React.FC<ElectronGuideModalProps> = ({ onClose }) => {
  const [copiedStep, setCopiedStep] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'quickstart' | 'package' | 'structure'>('quickstart');

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(label);
    setTimeout(() => setCopiedStep(null), 2500);
  };

  const installCmd = `npm install -D electron electron-builder concurrently`;

  const packageJsonScripts = `"main": "electron/main.js",
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "electron:dev": "concurrently \\"npm run dev\\" \\"electron .\\"",
  "electron:build": "npm run build && electron-builder"
},
"build": {
  "appId": "com.musicplayer.app",
  "productName": "Music Player",
  "directories": {
    "output": "dist-electron"
  },
  "files": [
    "dist/**/*",
    "electron/**/*",
    "public/**/*"
  ],
  "mac": { "category": "public.app-category.music", "icon": "public/assets/logo.png" },
  "win": { "target": ["nsis"], "icon": "public/assets/logo.png" }
}`;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[85vh] bg-neutral-950 border border-white/10 rounded-3xl shadow-2xl overflow-hidden font-sans flex flex-col select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 bg-neutral-900/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/10 border border-white/10">
              <Monitor className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-white">
                Convert to Desktop App (Electron)
              </h3>
              <p className="text-xs font-mono text-white/50">
                Package this app for macOS, Windows (.exe), and Linux
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-white/10 bg-neutral-900/40 px-6 gap-4">
          <button
            onClick={() => setActiveTab('quickstart')}
            className={`py-3 text-xs font-heading font-semibold transition-colors border-b-2 cursor-pointer ${
              activeTab === 'quickstart'
                ? 'border-white text-white'
                : 'border-transparent text-white/50 hover:text-white/80'
            }`}
          >
            1. Quick Start Commands
          </button>
          <button
            onClick={() => setActiveTab('package')}
            className={`py-3 text-xs font-heading font-semibold transition-colors border-b-2 cursor-pointer ${
              activeTab === 'package'
                ? 'border-white text-white'
                : 'border-transparent text-white/50 hover:text-white/80'
            }`}
          >
            2. package.json Config
          </button>
          <button
            onClick={() => setActiveTab('structure')}
            className={`py-3 text-xs font-heading font-semibold transition-colors border-b-2 cursor-pointer ${
              activeTab === 'structure'
                ? 'border-white text-white'
                : 'border-transparent text-white/50 hover:text-white/80'
            }`}
          >
            3. Desktop Main File
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {activeTab === 'quickstart' && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
                <div className="flex items-center gap-2 text-xs font-heading font-semibold text-white">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span>Step 1: Install Electron Dependencies</span>
                </div>
                <p className="text-xs font-mono text-white/60">
                  Run this terminal command in your project directory:
                </p>
                <div className="relative mt-2 p-3 rounded-xl bg-black border border-white/10 font-mono text-xs text-emerald-400 flex items-center justify-between">
                  <code>{installCmd}</code>
                  <button
                    onClick={() => copyToClipboard(installCmd, 'cmd')}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                    title="Copy command"
                  >
                    {copiedStep === 'cmd' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-heading font-semibold text-white">
                  <Cpu className="w-4 h-4 text-sky-400" />
                  <span>Step 2: Pre-configured Files included in repository</span>
                </div>
                <p className="text-xs font-mono text-white/60 leading-relaxed">
                  We have already created <code className="text-white font-bold">/electron/main.js</code> and <code className="text-white font-bold">/electron/preload.js</code> in this codebase! They set up a native frameless dark-themed desktop window with IPC bridges.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
                <div className="flex items-center gap-2 text-xs font-heading font-semibold text-white">
                  <Download className="w-4 h-4 text-purple-400" />
                  <span>Step 3: Run & Package Executable</span>
                </div>
                <div className="space-y-2 pt-1 font-mono text-xs">
                  <div className="p-3 rounded-xl bg-black border border-white/10">
                    <span className="text-white/40">// Run Desktop App locally:</span>
                    <div className="text-white font-semibold mt-0.5">npm run electron:dev</div>
                  </div>
                  <div className="p-3 rounded-xl bg-black border border-white/10">
                    <span className="text-white/40">// Build production executable (.dmg / .exe / .AppImage):</span>
                    <div className="text-white font-semibold mt-0.5">npm run electron:build</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'package' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-mono text-white/60">
                  Add the following <code className="text-white">"main"</code> and <code className="text-white">"build"</code> entries to your <code className="text-white">package.json</code>:
                </p>
                <button
                  onClick={() => copyToClipboard(packageJsonScripts, 'pkg')}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedStep === 'pkg' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedStep === 'pkg' ? 'Copied!' : 'Copy snippet'}</span>
                </button>
              </div>

              <pre className="p-4 rounded-2xl bg-black border border-white/10 font-mono text-xs text-white/80 overflow-x-auto leading-relaxed custom-scrollbar">
                {packageJsonScripts}
              </pre>
            </div>
          )}

          {activeTab === 'structure' && (
            <div className="space-y-4">
              <p className="text-xs font-mono text-white/60">
                Main process file: <code className="text-white font-bold">electron/main.js</code> (Already created in codebase):
              </p>
              <pre className="p-4 rounded-2xl bg-black border border-white/10 font-mono text-xs text-emerald-400/90 overflow-x-auto leading-relaxed custom-scrollbar max-h-72">
{`const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    title: 'AudioSpot Studio',
    backgroundColor: '#000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);`}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-neutral-900/80 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono text-white/50">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Ready for macOS, Windows & Linux deployment</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white hover:bg-neutral-200 text-black font-heading font-semibold text-xs transition-colors cursor-pointer"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
