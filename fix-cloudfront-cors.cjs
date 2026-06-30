/**
 * fix-cloudfront-cors.cjs
 *
 * Analyses every CloudFront-related console error visible when playing a video on localhost,
 * then patches vite.config.ts and CustomVideoPlayer.tsx so that ALL CloudFront traffic
 * (HLS master + segments, captions, encryption keys) is routed through the Vite dev-server
 * proxy in development, eliminating every CORS error.
 *
 * Run with:  node fix-cloudfront-cors.cjs
 */

'use strict';

const fs   = require('fs');
const path = require('path');

/* paths */
const ROOT        = __dirname;
const PLAYER_FILE = path.join(ROOT, 'src', 'pages', 'videodetails', 'CustomVideoPlayer.tsx');
const VITE_CFG    = path.join(ROOT, 'vite.config.ts');

const CF_DOMAIN   = 'd2bqjjgpbetcsa.cloudfront.net';
const PROXY_PATH  = '/__cf__';

/* tiny logger */
const lines = [];
function log(...args) { const m = args.join(' '); console.log(m); lines.push(m); }
function hr()  { log('\n' + '-'.repeat(64) + '\n'); }

/* helpers */
function readFile(p)      { return fs.readFileSync(p, 'utf8'); }
function writeFile(p, c)  { fs.writeFileSync(p, c, 'utf8'); }

function patch(label, original, needle, replacement) {
  if (!original.includes(needle)) {
    log('  [SKIP] "' + label + '" – marker not found (already patched?)');
    return original;
  }
  log('  [PATCH] ' + label);
  return original.replace(needle, replacement);
}

/* ANALYSIS */
log('');
log('=== AVR Cinema – CloudFront CORS Diagnostic & Fix Script ===');
log('Timestamp : ' + new Date().toISOString());
log('Root      : ' + ROOT);
hr();

log('IDENTIFIED ISSUES:');
log('');
log('1. [CRITICAL] HLS video stream CORS-blocked by CloudFront');
log('     URL   : https://' + CF_DOMAIN + '/videos/**/*.m3u8');
log('     Via   : HLS.js XHR (not fetch)');
log('');
log('2. [CRITICAL] Caption VTT files CORS-blocked');
log('     URL   : https://' + CF_DOMAIN + '/captions/*.vtt');
log('     Via   : fetch() + <track src>');
log('');
log('3. [ROOT CAUSE] CloudFront allows avr-cinema-mobile-app.pages.dev only.');
log('   localhost is rejected with Access-Control-Allow-Origin error.\n');
log('FIX: Expand Vite proxy to cover ALL CloudFront paths,');
log('     then rewrite every CloudFront URL in dev mode.\n');

/* PATCH vite.config.ts */
hr();
log('PATCHING vite.config.ts ...');

const NEW_VITE = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"
import tailwindcss from "@tailwindcss/vite"

// CloudFront origin hosting ALL media (videos, captions, keys).
// In development, the Vite proxy tunnels /__cf__/* requests through so
// the browser never makes a cross-origin request (eliminates CORS errors).
const CLOUDFRONT_ORIGIN = 'https://${CF_DOMAIN}';

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
      // /__cf__/** -> https://${CF_DOMAIN}/**
      // Covers: HLS m3u8, segments, captions, encryption keys
      '${PROXY_PATH}': {
        target: CLOUDFRONT_ORIGIN,
        changeOrigin: true,
        rewrite: (reqPath) => reqPath.replace(/^\\/__cf__/, ''),
        secure: true,
      },
    },
  },
})
`;

writeFile(VITE_CFG, NEW_VITE);
log('  [OK] vite.config.ts rewritten – proxy covers ALL CloudFront paths');

/* PATCH CustomVideoPlayer.tsx */
hr();
log('PATCHING CustomVideoPlayer.tsx ...\n');

let player = readFile(PLAYER_FILE);

/* 3-A: Add getDevSafeUrl() helper before the VTTCue interface */
const HELPER_ANCHOR = 'interface VTTCue {';
const HELPER_CODE = `// Rewrites any CloudFront URL to go through the Vite proxy in development,
// preventing cross-origin requests (and CORS errors) on localhost.
// In production the URL is returned unchanged.
const _CF_ORIGIN = 'https://${CF_DOMAIN}';
const _CF_PROXY  = '${PROXY_PATH}';
function getDevSafeUrl(url: string): string {
  if (!url) return url;
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV && url.startsWith(_CF_ORIGIN)) {
    return url.replace(_CF_ORIGIN, _CF_PROXY);
  }
  return url;
}

interface VTTCue {`;

player = patch('add getDevSafeUrl() helper', player, HELPER_ANCHOR, HELPER_CODE);

/* 3-B: HLS loadSource – proxy the m3u8 URL */
player = patch(
  'HLS loadSource() – use proxy URL',
  player,
  '        hlsInstance.loadSource(currentSourceUrl);\n        hlsInstance.attachMedia(video);',
  '        hlsInstance.loadSource(getDevSafeUrl(currentSourceUrl));\n        hlsInstance.attachMedia(video);'
);

/* 3-C: xhrSetup – intercept ALL HLS XHRs (segments, keys, playlists) */
const OLD_XHR = `          hlsInstance = new HlsClass({
          xhrSetup: (xhr: any, url: string) => {
            if (url.includes("/getVideoKey") && token) {
              const delimiter = url.includes("?") ? "&" : "?";
              xhr.open("GET", \`\${url}\${delimiter}token=\${token}\`, true);
            }
          }
        });`;

const NEW_XHR = `          hlsInstance = new HlsClass({
          xhrSetup: (xhr: any, url: string) => {
            // In development route every CloudFront XHR through the Vite proxy.
            let finalUrl = getDevSafeUrl(url);

            // Append auth token for video-decryption-key requests.
            if (finalUrl.includes("/getVideoKey") && token) {
              const delimiter = finalUrl.includes("?") ? "&" : "?";
              finalUrl = \`\${finalUrl}\${delimiter}token=\${token}\`;
            }

            // Only re-open when the URL actually changed.
            if (finalUrl !== url) {
              xhr.open("GET", finalUrl, true);
            }
          }
        });`;

player = patch('xhrSetup – proxy ALL CloudFront XHRs', player, OLD_XHR, NEW_XHR);

/* 3-D: Non-HLS (plain mp4) video.src */
player = patch(
  'non-HLS video.src – proxy URL',
  player,
  '        video.src = currentSourceUrl;',
  '        video.src = getDevSafeUrl(currentSourceUrl);'
);

/* 3-E: Caption fetch – remove old inline rewrite, use helper */
const OLD_FETCH = `    // In development, rewrite the CloudFront URL to go through the Vite proxy
    // (/__cf_captions__/...) so the browser never makes a cross-origin request.
    // In production the URL is used as-is because CloudFront has the correct CORS headers.
    const CLOUDFRONT_ORIGIN = 'https://d2bqjjgpbetcsa.cloudfront.net';
    const fetchUrl =
      import.meta.env.DEV && url.startsWith(CLOUDFRONT_ORIGIN)
        ? url.replace(CLOUDFRONT_ORIGIN, '/__cf_captions__')
        : url;

    fetch(fetchUrl, { mode: 'cors', credentials: 'omit' })`;

const NEW_FETCH = `    // Route through Vite proxy in dev to avoid CORS on CloudFront caption files.
    const fetchUrl = getDevSafeUrl(url);

    fetch(fetchUrl, { mode: 'cors', credentials: 'omit' })`;

player = patch('caption fetch – use getDevSafeUrl()', player, OLD_FETCH, NEW_FETCH);

/* 3-F: <track> src – browser-native caption loading */
const OLD_TRACK = `            {getDbCaptions().map((sub: any, idx: number) => (
              <track
                key={\`\${idx}_\${sub.url || sub.caption_file || sub.src}\`}
                src={sub.url || sub.caption_file || sub.src}
                label={sub.language || sub.label || sub.name}
                srcLang={sub.languageCode || sub.language?.substring(0, 2).toLowerCase() || sub.lang || "en"}
                kind="subtitles"
              />
            ))}`;

const NEW_TRACK = `            {getDbCaptions().map((sub: any, idx: number) => {
              const rawSrc  = sub.url || sub.caption_file || sub.src;
              const trackSrc = getDevSafeUrl(rawSrc);
              return (
                <track
                  key={\`\${idx}_\${rawSrc}\`}
                  src={trackSrc}
                  label={sub.language || sub.label || sub.name}
                  srcLang={sub.languageCode || sub.language?.substring(0, 2).toLowerCase() || sub.lang || "en"}
                  kind="subtitles"
                />
              );
            })}`;

player = patch('<track> src – use getDevSafeUrl()', player, OLD_TRACK, NEW_TRACK);

writeFile(PLAYER_FILE, player);
log('\n  [OK] CustomVideoPlayer.tsx patched');

/* VERIFICATION */
hr();
log('VERIFICATION:');

const vPlayer = readFile(PLAYER_FILE);
const vVite   = readFile(VITE_CFG);

function check(label, file, needle) {
  log('  ' + (file.includes(needle) ? '[OK]  ' : '[FAIL]') + ' ' + label);
}

check('getDevSafeUrl() defined',             vPlayer, 'function getDevSafeUrl(');
check('HLS loadSource uses proxy',           vPlayer, 'hlsInstance.loadSource(getDevSafeUrl(');
check('xhrSetup uses getDevSafeUrl()',       vPlayer, 'let finalUrl = getDevSafeUrl(url)');
check('video.src uses proxy',               vPlayer, 'video.src = getDevSafeUrl(');
check('caption fetch uses proxy',           vPlayer, 'const fetchUrl = getDevSafeUrl(url)');
check('<track> src uses proxy',             vPlayer, 'const trackSrc = getDevSafeUrl(');
check('Vite proxy target = CloudFront',     vVite,   CF_DOMAIN);
check('Vite proxy path = /__cf__',          vVite,   PROXY_PATH);

hr();
log('DONE. Next steps:');
log('  1. Kill the running dev server (Ctrl+C)');
log('  2. Run:  npm run dev');
log('  3. Navigate to localhost:5173 and play a video.');
log('  4. The console should be free of CORS / ERR_FAILED errors.');
log('');

const reportPath = path.join(ROOT, 'cors-fix-report.txt');
fs.writeFileSync(reportPath, lines.join('\n'), 'utf8');
console.log('Report saved to: ' + reportPath);
