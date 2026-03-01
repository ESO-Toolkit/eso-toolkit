import fs from 'fs';
import http from 'http';
import https from 'https';
import os from 'os';
import path from 'path';
import tls from 'tls';
import { fileURLToPath } from 'url';

import react from '@vitejs/plugin-react-swc';
import mkcert from 'vite-plugin-mkcert';
import { defineConfig, loadEnv } from 'vite';
import svgr from 'vite-plugin-svgr';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
// eslint-disable-next-line import/no-default-export
export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  const rawPort = env.PORT || process.env.PORT || '3000';
  const parsedPort = Number.parseInt(rawPort, 10);
  const serverPort = Number.isNaN(parsedPort) ? 3000 : parsedPort;
  const strictPortValue = (env.STRICT_PORT ?? process.env.STRICT_PORT ?? 'true')
    .toLowerCase()
    .trim();
  const strictPortConfig = strictPortValue !== 'false' && strictPortValue !== '0';

  const httpsEnabled = (env.VITE_HTTPS ?? process.env.VITE_HTTPS) === 'true';

  /** Resolve the mkcert CA root certificate path for the current platform */
  const getMkcertCaPath = () => {
    // vite-plugin-mkcert stores files in ~/.vite-plugin-mkcert/
    const vitePluginPath = path.join(os.homedir(), '.vite-plugin-mkcert', 'rootCA.pem');
    if (fs.existsSync(vitePluginPath)) return vitePluginPath;

    // Fallback: system mkcert install locations
    const platform = os.platform();
    if (platform === 'win32') {
      return path.join(process.env.LOCALAPPDATA || '', 'mkcert', 'rootCA.pem');
    }
    if (platform === 'darwin') {
      return path.join(os.homedir(), 'Library', 'Application Support', 'mkcert', 'rootCA.pem');
    }
    return path.join(os.homedir(), '.local', 'share', 'mkcert', 'rootCA.pem');
  };

  return {
    base: process.env.VITE_BASE_URL || '/',
    plugins: [
      ...( httpsEnabled ? [mkcert()] : []),
      ...( httpsEnabled ? [{
        name: 'serve-mkcert-ca',
        configureServer() {
          const caPort = serverPort; // HTTP proxy takes the user-facing port
          const httpsPort = serverPort + 1; // Vite HTTPS moves to port+1

          const buildHtml = (host) => {
            const httpsOrigin = `https://${host.replace(`:${caPort}`, `:${httpsPort}`)}`;
            const caPath = getMkcertCaPath();
            // Embed cert as a base64 data: URI so Chrome on Android can't block it as an "insecure download"
            let downloadBtn;
            if (fs.existsSync(caPath)) {
              const certB64 = fs.readFileSync(caPath).toString('base64');
              const dataUri = `data:application/x-x509-ca-cert;base64,${certB64}`;
              downloadBtn = `<a class="btn" href="${dataUri}" download="mkcert-rootCA.crt">⬇ Download Certificate</a>`;
            } else {
              downloadBtn = `<p style="color:red">CA file not found. Start the server once with <code>VITE_HTTPS=true</code> to generate it.</p>`;
            }
            return `<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Install Dev CA Certificate</title>
<style>body{font-family:sans-serif;max-width:520px;margin:2rem auto;padding:0 1rem;line-height:1.6}
h1{font-size:1.3rem}a.btn{display:inline-block;margin:1rem 0;padding:.75rem 1.5rem;background:#0ea5e9;color:#fff;border-radius:8px;text-decoration:none;font-weight:700}
ol{padding-left:1.2rem}code{background:#f1f5f9;padding:.1em .4em;border-radius:4px}</style>
</head><body>
<h1>Install Dev HTTPS Certificate</h1>
<p>Tap the button below to download the local CA certificate, then follow the steps for your device.</p>
${downloadBtn}
<h2>Android</h2><ol>
<li>Open the downloaded <code>.crt</code> file</li>
<li><b>Settings → Security → Install a certificate → CA certificate</b></li>
<li>Confirm the warning and install it</li>
</ol>
<h2>iOS / iPadOS</h2><ol>
<li>Open the downloaded <code>.pem</code> file — tap <b>Allow</b> when prompted</li>
<li><b>Settings → General → VPN &amp; Device Management</b> → install the profile</li>
<li><b>Settings → General → About → Certificate Trust Settings</b> → toggle full trust for <i>mkcert</i></li>
</ol>
<p>After installing, open <a href="${httpsOrigin}">${httpsOrigin}</a> — no cert warning and login will work.</p>
</body></html>`;
          };

          // Load the mkcert CA cert once — used for both TLS proxy validation and cert download
          const mkcertCaPath = getMkcertCaPath();
          if (!fs.existsSync(mkcertCaPath)) {
            throw new Error(
              `mkcert CA not found at ${mkcertCaPath}. ` +
                'Start the dev server once with VITE_HTTPS=true so mkcert can generate the local CA, then restart.',
            );
          }
          const mkcertCa = fs.readFileSync(mkcertCaPath);
          const trustOptions = { ca: mkcertCa };

          const httpServer = http.createServer((req, res) => {
            if (req.url === '/install-ca' || req.url === '/mkcert-ca.pem' || req.url === '/mkcert-ca.crt') {
              if (req.url === '/mkcert-ca.pem' || req.url === '/mkcert-ca.crt') {
                res.writeHead(200, {
                  'Content-Type': 'application/x-x509-ca-cert',
                  'Content-Disposition': 'attachment; filename="mkcert-rootCA.crt"',
                });
                res.end(mkcertCa);
                return;
              }
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(buildHtml(req.headers.host || `localhost:${caPort}`));
              return;
            }

            // Everything else: reverse-proxy to the HTTPS Vite server
            const proxyReq = https.request(
              {
                hostname: 'localhost',
                port: httpsPort,
                path: req.url,
                method: req.method,
                headers: { ...req.headers, host: `localhost:${httpsPort}` },
                ...trustOptions,
              },
              (proxyRes) => {
                res.writeHead(proxyRes.statusCode, proxyRes.headers);
                proxyRes.pipe(res);
              },
            );
            proxyReq.on('error', (err) => {
              res.writeHead(502, { 'Content-Type': 'text/plain' });
              res.end(`Proxy error: ${err.message}`);
            });
            req.pipe(proxyReq);
          });

          // Proxy WebSocket upgrades (Vite HMR) from ws:// to wss://
          httpServer.on('upgrade', (req, socket, head) => {
            const proxySocket = tls.connect(
              {
                host: 'localhost',
                port: httpsPort,
                ...trustOptions,
              },
              () => {
                const reqHeaders = [
                  `${req.method} ${req.url} HTTP/1.1`,
                  `Host: localhost:${httpsPort}`,
                  `Upgrade: websocket`,
                  `Connection: Upgrade`,
                  ...Object.entries(req.headers)
                    .filter(([k]) => !['host', 'connection', 'upgrade'].includes(k.toLowerCase()))
                    .map(([k, v]) => `${k}: ${v}`),
                  '\r\n',
                ].join('\r\n');
                proxySocket.write(reqHeaders);
                if (head && head.length) proxySocket.write(head);
                socket.pipe(proxySocket);
                proxySocket.pipe(socket);
              },
            );
            proxySocket.on('error', () => socket.destroy());
            socket.on('error', () => proxySocket.destroy());
          });

          httpServer.listen(caPort, '0.0.0.0', () => {
            console.info(`\n  \x1b[36m➜\x1b[0m  HTTP dev proxy  (desktop):  \x1b[1mhttp://localhost:${caPort}/\x1b[0m`);
            console.info(`  \x1b[36m➜\x1b[0m  CA install page (phone):    \x1b[1mhttp://192.x.x.x:${caPort}/install-ca\x1b[0m`);
            console.info(`  \x1b[36m➜\x1b[0m  HTTPS (phone, after cert):  \x1b[1mhttps://192.x.x.x:${httpsPort}/\x1b[0m`);
          });
        },
      }] : []),
      svgr({
        svgrOptions: {
          ref: true,
          svgo: false,
          titleProp: true,
        },
        include: '**/*.svg?react',
      }),
      react({
        // Exclude Web Workers from React Refresh to avoid "window is not defined" errors
        // Workers run in a separate context without window/document globals
        exclude: [
          /node_modules/,
          /\/workers\//,
          /\.worker\./,
          /SharedWorker/,
        ],
      }),
      // ESLint plugin disabled due to ESLint 9 compatibility issues
      // Use 'npm run lint' for linting during development
      // Custom plugin to inject Google Analytics script
      {
        name: 'html-transform',
        transformIndexHtml(html) {
          const measurementId = env.VITE_GA_MEASUREMENT_ID;
          if (measurementId) {
            // Inject Google Analytics script into the head
            return html.replace(
              '</head>',
              `  <!-- Google Analytics -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=${measurementId}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${measurementId}');
  </script>
</head>`,
            );
          }
          return html;
        },
      },
    ],

    // Path aliases (backup to tsconfigPaths plugin)
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@components': path.resolve(__dirname, 'src/components'),
        '@features': path.resolve(__dirname, 'src/features'),
        '@store': path.resolve(__dirname, 'src/store'),
        '@types': path.resolve(__dirname, 'src/types'),
        '@utils': path.resolve(__dirname, 'src/utils'),
        '@graphql': path.resolve(__dirname, 'src/graphql'),
      },
    },

    // Development server configuration
    server: {
      port: httpsEnabled ? serverPort + 1 : serverPort,
      open: false,
      host: true,
      strictPort: strictPortConfig,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    },

    // Preview server configuration (for production preview)
    preview: {
      port: 3000,
      host: true,
    },

    // Build configuration
    build: {
      outDir: 'build',
      sourcemap: env.GENERATE_SOURCEMAP === 'true' ? 'hidden' : false, // Enable hidden sourcemaps for error tracking, disable for normal builds
      target: 'es2020',
      minify: 'esbuild', // Use esbuild for faster, less memory-intensive minification
      rollupOptions: {
        output: {
          // Manual chunk splitting for better caching and reduced memory usage
          manualChunks: {
            vendor: ['react', 'react-dom'],
            mui: ['@mui/material', '@mui/icons-material'],
            apollo: ['@apollo/client'],
            redux: ['@reduxjs/toolkit', 'react-redux', 'redux-persist'],
            router: ['react-router-dom', 'history'],
            charts: ['chart.js', 'react-chartjs-2', 'chartjs-plugin-annotation'],
          },
          chunkFileNames: (chunkInfo) => {
            // Create a separate chunk for the large abilities.json data
            if (
              chunkInfo.name === 'abilities-data' ||
              (chunkInfo.moduleIds &&
                chunkInfo.moduleIds.some((id) => id.includes('abilities.json')))
            ) {
              return 'assets/abilities-data-[hash].js';
            }
            return 'assets/[name]-[hash].js';
          },
          assetFileNames: (assetInfo) => {
            // Optimize asset naming for better caching
            if (assetInfo.name && assetInfo.name.endsWith('.png')) {
              return 'assets/images/[name]-[hash][extname]';
            }
            return 'assets/[name]-[hash][extname]';
          },
        },
        // Reduce memory usage during bundling
        maxParallelFileOps: 2,
      },
      // Increase chunk size warning limit
      chunkSizeWarningLimit: 1000,
    },

    // Define global constants
    define: {
      // Required for some React libraries
      global: 'globalThis',
      // Environment variables
      'process.env.NODE_ENV': JSON.stringify(mode),
      'process.env.GENERATE_SOURCEMAP': JSON.stringify(env.GENERATE_SOURCEMAP || 'true'),
      'process.env.FAST_REFRESH': JSON.stringify(env.FAST_REFRESH || 'true'),
      // Build-time version information
      'import.meta.env.VITE_BUILD_TIME': JSON.stringify(new Date().toISOString()),
      'import.meta.env.VITE_BUILD_TIMESTAMP': JSON.stringify(Date.now()),
    },

    // Dependency optimization
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        '@apollo/client',
        '@reduxjs/toolkit',
        'react-redux',
        '@mui/material',
        '@mui/icons-material',
        'chart.js',
        'react-chartjs-2',
      ],
      exclude: [
        // Exclude the large abilities.json from being pre-bundled
        './data/abilities.json',
      ],
    },

    // CSS configuration
    css: {
      devSourcemap: true,
    },

    // Test configuration (if using Vitest)
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/setupTests.ts'],
      css: true,
    },
  };
});
