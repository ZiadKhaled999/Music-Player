const { app, BrowserWindow, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const api = require('../server/api.cjs');

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

app.on('second-instance', () => {
  const wins = BrowserWindow.getAllWindows();
  if (wins.length) {
    const w = wins[0];
    if (w.isMinimized()) w.restore();
    w.focus();
  }
});

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    title: 'Music Player',
    icon: path.join(__dirname, '../public/assets/logo.png'),
    backgroundColor: '#000000',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      backgroundThrottling: false,
    },
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  let attempts = 0;
  const loadWithRetry = () => {
    if (isDev) {
      mainWindow.loadURL('http://localhost:3000').catch(() => {});
    } else {
      mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
  };

  mainWindow.webContents.on('did-fail-load', () => {
    if (isDev && attempts < 20) {
      attempts += 1;
      setTimeout(loadWithRetry, 500);
    }
  });

  loadWithRetry();

  if (process.env.ELECTRON_DEVTOOLS === '1') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });
}

ipcMain.handle('search', (_e, query) => api.searchMusic(query));
ipcMain.handle('stream-url', (_e, videoId) => api.getStreamUrl(videoId));

// downloads dir lives in userData for packaged builds
ipcMain.handle('downloads-dir', () => process.env.MUSIC_PLAYER_DATA_DIR || null);

app.whenReady().then(() => {
  try {
    process.env.MUSIC_PLAYER_DATA_DIR = app.getPath('userData');
  } catch (e) {}
  app.setAppUserModelId('com.musicplayer.app');

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
