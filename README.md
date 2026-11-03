# 🎵 Music Player

A powerful, responsive, and modern desktop music player built with **React**, **Vite**, **Tailwind CSS v4**, and **Electron**. Experience seamless YouTube streaming and local music playback with high-fidelity audio and synced lyrics.

![Music Player Logo](public/assets/logo.png)

## ✨ Features

-   **🔍 Global Search**: Search and stream millions of tracks directly from YouTube with high-quality audio.
-   **📂 Local Library**: Pick a folder on your PC to instantly index and play your local MP3/WAV/FLAC collection.
-   **📜 Synced Lyrics**: Real-time synced lyrics for both YouTube streams and local tracks (where available).
-   **💾 Smart Downloads**: Integrated settings to manage your download directory. Automatically updates to your music folder path once selected.
-   **📱 Fully Responsive**: Optimized for all desktop screen sizes with a sleek, modern UI.
-   **🎼 Visualizer**: Dynamic spectrum visualizer for an immersive local playback experience.
-   **📝 Playlists**: Create and manage custom playlists for your favorite tracks.
-   **🖥️ Desktop Native**: Built with Electron for a native experience on Windows.

## 🚀 Tech Stack

-   **Frontend**: React 19, Vite, Tailwind CSS v4, Lucide Icons, Motion.
-   **Backend**: Express (Proxy server for YouTube streaming).
-   **Desktop Engine**: Electron.
-   **API**: [YouTubei.js](https://github.com/LuanRT/YouTubejs) for seamless YouTube interaction.

## 🛠️ Getting Started

### Prerequisites

-   [Node.js](https://nodejs.org/) (v18 or higher recommended)
-   npm

### Installation

1.  Clone the repository:
    ```bash
    git clone <your-repo-url>
    cd music-player
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

### Running the App

#### Web Development
To run the web version in your browser:
```bash
npm run dev
```

#### Desktop Development
To run the app inside the Electron wrapper:
```bash
npm run electron:dev
```

### 📦 Building for Production

To generate a Windows `.exe` installer locally:
```bash
npm run electron:build
```
The output will be located in the `dist-electron` folder.

## 🛡️ Windows Notes

- The installer bundles `yt-dlp.exe` downloaded from the official yt-dlp GitHub releases. Some antivirus engines may flag it as PUA; if it is quarantined, install yt-dlp manually and ensure it is on your `PATH`.
- yt-dlp is updated frequently; rebuild/reinstall the app to pick up a newer binary when YouTube changes break extraction.

## 🟠 Raycast Extension

The project includes a fully built Raycast extension source (`Tube Tunes`).

### How to apply to Raycast:
1.  **Start the app**: Ensure the development server is running.
    ```bash
    npm run dev
    ```
2.  **Export the extension**: Run the export script to generate the extension folder.
    ```bash
    npm run raycast:export
    ```
3.  **Setup Raycast**:
    - Install Raycast CLI: `npm install -g @raycast/api`
    - Go to the exported folder: `cd music-player-raycast`
    - Install dependencies: `npm install`
    - Run locally: `npm run dev`
4.  **Publish**: When ready, run `npm run publish` from the extension folder.

## 🤖 GitHub Actions (CI/CD)

The project includes an automated workflow to build and release the Windows installer.

### How to trigger a build:
1.  **Tag Push**: Push a new tag starting with `v` (e.g., `v1.0.0`).
    ```bash
    git tag v1.0.0
    git push origin v1.0.0
    ```
2.  **Manual Trigger**: Go to the **Actions** tab in your GitHub repository and run the "Build Windows Installer" workflow manually.

### Code Signing
For open-source projects, you can use [SignPath.io](https://signpath.io/) for free code signing certificates to avoid Windows SmartScreen warnings.

## 📂 Project Structure

-   `src/`: React frontend components and logic.
-   `electron/`: Electron main process and configuration.
-   `server/`: Express proxy server for YouTube streaming.
-   `public/`: Static assets (logo, icons).

## 📄 License

This project is open-source. Feel free to contribute!
