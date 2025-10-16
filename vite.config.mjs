import path from 'path';
import { fileURLToPath } from 'url';

import react from '@vitejs/plugin-react-swc';
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

  return {
    base: process.env.VITE_BASE_URL || '/',
    plugins: [
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
      port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
      open: false,
      host: true,
      strictPort: process.env.STRICT_PORT === 'true', // Only strict if explicitly set
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
      sourcemap: false, // Disable sourcemaps to reduce memory usage
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
