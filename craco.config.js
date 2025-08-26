const path = require('path');
const os = require('os');
const CircularDependencyPlugin = require('circular-dependency-plugin');

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

      // 1. Filesystem caching for much faster rebuilds
      if (isDevelopment) {
        webpackConfig.cache = {
          type: 'filesystem',
          buildDependencies: {
            config: [__filename],
          },
          cacheDirectory: path.resolve(__dirname, 'node_modules/.cache/webpack'),
          version: `${process.env.NODE_ENV || 'development'}-${require('./package.json').version}`,
        };
      }

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
                  },
                  target: 'es2020',
                  loose: true,
                  keepClassNames: isDevelopment,
                },
                sourceMaps: isDevelopment,
                minify: !isDevelopment,
                env: {
                  targets: 'defaults',
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
        // Use fastest source map for development
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
        };
      }

      // Add circular dependency detection plugin
      webpackConfig.plugins = webpackConfig.plugins || [];
      webpackConfig.plugins.push(
        new CircularDependencyPlugin({
          // exclude detection of files based on a RegExp
          exclude: /node_modules/,
          // include specific files based on a RegExp
          include: /src/,
          // add errors to webpack instead of warnings
          failOnError: env === 'production',
          // allow import cycles that include an asyncronous import,
          // e.g. via import(/* webpackChunkName: "foo" */ './foo').
          allowAsyncCycles: false,
          // set the current working directory for displaying module paths
          cwd: process.cwd(),
          // log detected circular dependencies
          onDetected({ module: webpackModule, paths, compilation }) {
            if (env === 'development') {
              console.error('\n🔄 Circular dependency detected:');
              console.error(paths.join(' -> '));
              console.error('Module:', webpackModule);
              console.error(''); // Add spacing
            }
            compilation.warnings.push(
              new Error(`Circular dependency detected: ${paths.join(' -> ')}`)
            );
          },
        })
      );

      // Custom webpack configuration

      // Enable source maps in production for better debugging
      if (env === 'production') {
        webpackConfig.devtool = 'source-map';
      }

      // Optimize bundle splitting for better caching
      if (
        env === 'production' &&
        webpackConfig.optimization &&
        webpackConfig.optimization.splitChunks
      ) {
        webpackConfig.optimization.splitChunks.cacheGroups = {
          ...webpackConfig.optimization.splitChunks.cacheGroups,
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
        };

        // Parallel processing
        webpackConfig.parallelism = Math.max(1, os.cpus().length - 1);

        // Watch options for faster file watching
        webpackConfig.watchOptions = {
          ignored: /node_modules/,
          aggregateTimeout: 300,
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
        };
      } else {
        // Production optimizations
        webpackConfig.devtool = false;

        webpackConfig.optimization.splitChunks = {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
            },
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
              name: 'react',
              chunks: 'all',
              priority: 20,
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
    client: {
      logging: 'error', // Reduce console noise
      overlay: false, // Disable error overlay for faster development
    },
    devMiddleware: {
      stats: 'minimal', // Minimal logging
      writeToDisk: false,
    },
  },
  eslint: {
    enable: false, // Disable ESLint during development for faster builds
  },
  typescript: {
    enableTypeChecking: false, // Disable TypeScript checking for faster builds
  },
};
