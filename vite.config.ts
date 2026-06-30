import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"
import tailwindcss from "@tailwindcss/vite"

// CloudFront origin hosting ALL media (videos, captions, keys).
// In development, the Vite proxy tunnels /__cf__/* requests through so
// the browser never makes a cross-origin request (eliminates CORS errors).
const CLOUDFRONT_ORIGIN = 'https://d2bqjjgpbetcsa.cloudfront.net';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      // /__cf__/** -> https://d2bqjjgpbetcsa.cloudfront.net/**
      // Covers: HLS m3u8, segments, captions, encryption keys
      '/__cf__': {
        target: CLOUDFRONT_ORIGIN,
        changeOrigin: true,
        rewrite: (reqPath) => reqPath.replace(/^\/__cf__/, ''),
        secure: true,
      },
    },
  },
})
