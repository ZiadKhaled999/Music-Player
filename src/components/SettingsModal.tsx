import React from 'react';
import { Settings, Folder, FolderOpen, RotateCcw, X, Check, HardDrive } from 'lucide-react';

interface SettingsModalProps {
  downloadPath: string;
  onSetDownloadPath: (path: string) => void;
  onClose: () => void;
  onNotification?: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  downloadPath,
  onSetDownloadPath,
  onClose,
  onNotification,
}) => {
  const handleSelectFolder = async () => {
    if ('showDirectoryPicker' in window) {
      try {
        const dirHandle = await (window as any).showDirectoryPicker();
        if (dirHandle && dirHandle.name) {
          onSetDownloadPath(dirHandle.name);
          if (onNotification) {
            onNotification(`Download destination updated to "${dirHandle.name}"`, 'success');
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.warn('Folder selection error:', err);
      }
    } else {
      // Fallback prompt for browsers that don't support showDirectoryPicker
      const customPath = prompt('Enter default download folder name:', downloadPath);
      if (customPath && customPath.trim()) {
        onSetDownloadPath(customPath.trim());
        if (onNotification) {
          onNotification(`Download destination set to "${customPath.trim()}"`, 'success');
        }
      }
    }
  };

  const handleReset = () => {
    onSetDownloadPath('Downloads');
    if (onNotification) {
      onNotification('Download path reset to default Downloads folder', 'info');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl bg-neutral-950 border border-white/15 p-6 sm:p-8 shadow-2xl flex flex-col gap-6 text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <img
              src="./assets/logo.png"
              alt="Music Player Logo"
              className="w-10 h-10 rounded-2xl bg-white/5 p-1 border border-white/10 object-contain shadow-md"
            />
            <div>
              <h3 className="font-heading font-semibold text-lg sm:text-xl text-white">
                Settings
              </h3>
              <p className="text-xs font-mono text-white/50">
                Configure default music download path
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content: Active Download Path */}
        <div className="space-y-4">
          <label className="block text-xs font-mono text-white/70 uppercase tracking-wider">
            Default Download Location
          </label>

          <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
            <HardDrive className="w-6 h-6 text-white/70 shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="block text-xs font-mono text-white/40">Active Directory</span>
              <span className="block font-heading font-medium text-sm sm:text-base text-white truncate">
                {downloadPath}
              </span>
            </div>
            {downloadPath === 'Downloads' ? (
              <span className="px-2.5 py-1 rounded-full bg-white/10 text-[10px] font-mono text-white/70 border border-white/10 shrink-0">
                Default
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-[10px] font-mono text-emerald-300 border border-emerald-500/30 shrink-0 flex items-center gap-1">
                <Check className="w-3 h-3" /> Custom
              </span>
            )}
          </div>

          <p className="text-xs text-white/50 leading-relaxed font-sans">
            Songs downloaded via YouTube search or exported from your local library will target this folder. Selecting a local view directory automatically syncs this setting.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-white/10">
          <button
            onClick={handleSelectFolder}
            className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-white text-black font-heading font-semibold text-xs sm:text-sm hover:bg-white/90 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
          >
            <FolderOpen className="w-4 h-4" />
            <span>Select Local Folder</span>
          </button>

          {downloadPath !== 'Downloads' && (
            <button
              onClick={handleReset}
              className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs hover:border-white/20 border border-white/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              title="Reset to default Downloads folder"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
