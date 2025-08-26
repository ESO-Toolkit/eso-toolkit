const path = require('path');
const os = require('os');

module.exports = {
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@features': path.resolve(__dirname, 'src/features'),
      '@store': path.resolve(__dirname, 'src/store'),
      '@types': path.resolve(__dirname, 'src/types'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@graphql': path.resolve(__dirname, 'src/graphql'),
    },
    configure: (webpackConfig, { env }) => {
      const isDevelopment = env === 'development';

      // 2. Optimized module resolution
      webpackConfig.resolve = {
        ...webpackConfig.resolve,
        modules: [path.resolve(__dirname, 'src'), 'node_modules'],
        extensions: ['.tsx', '.ts', '.js', '.jsx', '.json'],
        mainFields: ['browser', 'module', 'main'],
        symlinks: false, // Faster resolution
      };

      // 3. Use SWC for faster TypeScript/JavaScript compilation
      const oneOfRule = webpackConfig.module.rules.find((rule) => rule.oneOf);
      if (oneOfRule?.oneOf) {
        const tsRule = oneOfRule.oneOf.find(
          (rule) => rule.test && rule.test.toString().includes('tsx?')
        );

        if (tsRule) {
          tsRule.use = [
            {
              loader: require.resolve('swc-loader'),
              options: {
                jsc: {
                  parser: {
                    syntax: 'typescript',
                    tsx: true,
                    decorators: false,
                    dynamicImport: true,
                  },
                  transform: {
                    react: {
                      runtime: 'automatic',
                      refresh: isDevelopment,
                      development: isDevelopment,
                    },
                    optimizer: isDevelopment
                      ? undefined
                      : {
                          globals: {
                            vars: {
                              'process.env.NODE_ENV': isDevelopment
                                ? '"development"'
                                : '"production"',
                            },
                          },
                        },
                  },
                  target: 'es2020',
                  loose: true,
                  keepClassNames: isDevelopment,
                  experimental: {
                    keepImportAttributes: true,
                  },
                },
                sourceMaps: true, // Always generate source maps
                minify: !isDevelopment,
                env: {
                  targets: isDevelopment ? 'last 1 chrome version' : 'defaults',
                },
              },
            },
          ];
          delete tsRule.loader;
          delete tsRule.options;
        }
      }

      // 4. Development-specific optimizations
      if (isDevelopment) {
        // Use fastest source map for development while preserving debugging capability
        webpackConfig.devtool = 'eval-cheap-module-source-map';

        // Skip expensive optimizations
        webpackConfig.optimization = {
          ...webpackConfig.optimization,
          removeAvailableModules: false,
          removeEmptyChunks: false,
          splitChunks: false, // Disable for faster dev builds
          usedExports: false,
          sideEffects: false,
          concatenateModules: false,
          providedExports: false,
          innerGraph: false,
          mangleExports: false,
          flagIncludedChunks: false,
          mergeDuplicateChunks: false,
          realContentHash: false,
        };

        // Enhanced caching for faster rebuilds
        webpackConfig.cache = {
          type: 'filesystem',
          cacheDirectory: path.resolve(__dirname, 'node_modules/.cache/webpack'),
          buildDependencies: {
            config: [__filename],
          },
          name: 'development',
          version: '1.0.0',
        };

        // Parallel processing - use more cores for faster compilation
        webpackConfig.parallelism = os.cpus().length;

        // Enhanced watch options for faster file watching
        webpackConfig.watchOptions = {
          ignored: ['**/node_modules/**', '**/build/**', '**/.git/**'],
          aggregateTimeout: 200, // Reduced from 300ms for faster rebuilds
          poll: false,
        };

        // Minimal stats for faster terminal output
        webpackConfig.stats = {
          preset: 'minimal',
          colors: true,
          timings: true,
          chunks: false,
          chunkModules: false,
          modules: false,
          assets: false,
          warnings: false,
          builtAt: false,
          env: false,
          hash: false,
          version: false,
          entrypoints: false,
        };

        // Faster module resolution
        webpackConfig.resolve.unsafeCache = true;

        // Faster build performance options
        webpackConfig.snapshot = {
          module: {
            timestamp: true,
            hash: false,
          },
          resolve: {
            timestamp: true,
            hash: false,
          },
        };
      } else {
        // Production optimizations
        webpackConfig.devtool = 'source-map'; // Source maps in production for debugging

        // Add circular dependency detection in production only
        const CircularDependencyPlugin = require('circular-dependency-plugin');
        webpackConfig.plugins = webpackConfig.plugins || [];
        webpackConfig.plugins.push(
          new CircularDependencyPlugin({
            exclude: /node_modules/,
            include: /src/,
            failOnError: true,
            allowAsyncCycles: false,
            cwd: process.cwd(),
          })
        );

        // Production bundle splitting
        webpackConfig.optimization.splitChunks = {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              enforce: true,
              priority: 20,
            },
            mui: {
              test: /[\\/]node_modules[\\/]@mui[\\/]/,
              name: 'mui',
              chunks: 'all',
              priority: 30,
            },
            apollo: {
              test: /[\\/]node_modules[\\/]@apollo[\\/]/,
              name: 'apollo',
              chunks: 'all',
              priority: 30,
            },
            redux: {
              test: /[\\/]node_modules[\\/](redux|@reduxjs)[\\/]/,
              name: 'redux',
              chunks: 'all',
              priority: 30,
            },
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
              name: 'react',
              chunks: 'all',
              priority: 40,
            },
          },
        };
      }

      return webpackConfig;
    },
  },
  devServer: {
    port: 3000,
    open: false, // Don't auto-open browser (faster startup)
    historyApiFallback: true,
    compress: false, // Disable compression for faster dev builds
    hot: true,
    liveReload: false, // Use HMR instead of full page reloads
    client: {
      logging: 'error', // Reduce console noise
      overlay: false, // Disable error overlay for faster development
      progress: false, // Disable progress reporting for faster startup
    },
    devMiddleware: {
      stats: 'errors-warnings', // Even more minimal logging
      writeToDisk: false,
      publicPath: '/',
    },
    static: {
      directory: path.resolve(__dirname, 'public'),
      publicPath: '/',
      watch: {
        ignored: ['**/node_modules/**', '**/build/**'],
      },
    },
    // Faster startup by reducing file system operations
    setupExitSignals: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
  eslint: {
    enable: false, // Disable ESLint during development for faster builds
  },
  typescript: {
    enableTypeChecking: false, // Disable TypeScript checking for faster builds
  },
};
