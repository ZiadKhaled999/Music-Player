const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isElectron: true,
});

contextBridge.exposeInMainWorld('api', {
  search: (q) => ipcRenderer.invoke('search', q),
  getStreamUrl: (id) => ipcRenderer.invoke('stream-url', id),
});
