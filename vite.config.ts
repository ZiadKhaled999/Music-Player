import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import express from 'express';
import { apiRouter } from './server/api.ts';

const apiApp = express();
apiApp.use(express.json());
apiApp.use('/api', apiRouter);

export default defineConfig(({ command }) => {
  const isBuild = command === 'build';
  const tightCsp = "default-src 'self'; script-src 'self' https://www.youtube.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; media-src 'self' data: blob: https:; connect-src 'self' https:; frame-src https://www.youtube.com https://www.youtube-nocookie.com; font-src 'self' https://fonts.gstatic.com data:;";
  const devCsp = "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https: http://localhost:*; img-src 'self' data: blob: https:; media-src 'self' data: blob: https:; connect-src 'self' https: http://localhost:* ws://localhost:*;";
  const csp = isBuild ? tightCsp : devCsp;
  return {
    base: './',
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'csp-meta',
        transformIndexHtml(html) {
          const before = html;
          let next = html.replace(/<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/i, `<meta http-equiv="Content-Security-Policy" content="${csp}" />`);
          if (next === before) {
            if (/Content-Security-Policy/i.test(html)) {
              console.warn('[csp-meta] CSP meta tag present but not replaced; check attribute order.');
            } else {
              next = html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />`);
            }
          }
          return next;
        },
      },
      {
        name: 'raycast-ytmusic-api',
        configureServer(server) {
          server.middlewares.use(apiApp);
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '127.0.0.1',
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
