const path = require('path');
const webpack = require('webpack');

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
    plugins: [
      // Add plugins for faster builds
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      }),
    ],
    configure: (webpackConfig, { env }) => {
      // ========== BUILD SPEED OPTIMIZATIONS ==========

      // 1. Simplified module resolution for speed
      webpackConfig.resolve.modules = [path.resolve(__dirname, 'src'), 'node_modules'];

      // 2. Cache configuration for faster rebuilds
      webpackConfig.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
        cacheDirectory: path.resolve(__dirname, 'node_modules/.cache/webpack'),
      };

      // 3. Use faster SWC loader for TypeScript/JavaScript compilation
      const oneOfRule = webpackConfig.module.rules.find((rule) => rule.oneOf);
      if (oneOfRule && oneOfRule.oneOf) {
        // Find and replace TypeScript rule with SWC
        const tsRuleIndex = oneOfRule.oneOf.findIndex(
          (rule) => rule.test && rule.test.toString().includes('tsx?')
        );

        if (tsRuleIndex !== -1) {
          oneOfRule.oneOf[tsRuleIndex] = {
            test: /\.(js|mjs|jsx|ts|tsx)$/,
            include: path.resolve(__dirname, 'src'),
            use: {
              loader: '@swc/loader',
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
                      development: env === 'development',
                      refresh: env === 'development',
                    },
                  },
                  target: 'es2018', // Faster target
                },
                sourceMaps: false, // Disable source maps for speed
                minify: env === 'production',
              },
            },
          };
        }
      }

      // 1. Faster module resolution
      webpackConfig.resolve = {
        ...webpackConfig.resolve,
        modules: [
          path.resolve(__dirname, 'src'),
          path.resolve(__dirname, 'node_modules'),
          'node_modules',
        ],
        extensions: ['.tsx', '.ts', '.js', '.jsx', '.json'], // Most common first
        mainFields: ['browser', 'module', 'main'],
        // Remove problematic aliases that can cause import issues
      };

      // 2. Cache configuration for faster rebuilds
      if (env === 'development') {
        webpackConfig.cache = {
          type: 'filesystem',
          buildDependencies: {
            config: [__filename],
          },
          cacheDirectory: path.resolve(__dirname, 'node_modules/.cache/webpack'),
        };
      }

      // 3. Parallel processing optimizations
      webpackConfig.parallelism = require('os').cpus().length;

      // 4. Stats configuration for faster terminal output
      webpackConfig.stats = {
        chunks: false,
        chunkModules: false,
        modules: false,
        colors: true,
        timings: true,
      };
      // 5. Replace TypeScript loader with SWC for faster compilation
      // SWC (Speedy Web Compiler) is a Rust-based JavaScript/TypeScript compiler
      // that provides significantly faster build times than the default tsc
      const oneOf = webpackConfig.module.rules.find((rule) => rule.oneOf);
      if (oneOf) {
        // Find and replace the TypeScript rule
        const tsRule = oneOf.oneOf.find(
          (rule) => rule.test && rule.test.toString().includes('tsx?')
        );
        if (tsRule) {
          // Replace with SWC loader with optimized configuration
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
                      importSource: 'react',
                      refresh: env === 'development',
                      development: env === 'development',
                    },
                  },
                  target: 'es2020',
                  loose: true, // Enable loose transformations for faster compilation
                  externalHelpers: false,
                  keepClassNames: env === 'development',
                  // Speed optimizations
                  preserveAllComments: false, // Faster parsing
                  ...(env === 'production' && {
                    minify: {
                      compress: {
                        drop_console: true,
                        drop_debugger: true,
                        pure_funcs: ['console.log', 'console.info', 'console.debug'],
                      },
                      mangle: true,
                    },
                  }),
                },
                module: {
                  type: 'es6',
                  strict: false,
                  strictMode: true,
                  lazy: false,
                  noInterop: false,
                },
                minify: env === 'production',
                isModule: true,
                sourceMaps: env === 'development', // Only in development for speed
                env: {
                  targets: {
                    chrome: '90', // More recent targets for better optimization
                    firefox: '88',
                    safari: '14',
                    edge: '90',
                  },
                  mode: 'entry',
                },
              },
            },
          ];
          // Remove the existing loaders
          delete tsRule.loader;
          delete tsRule.options;
        }

        // 6. Optimize other loaders for speed
        oneOf.oneOf.forEach((rule) => {
          // Speed up CSS processing
          if (rule.test && rule.test.toString().includes('css')) {
            if (rule.use && Array.isArray(rule.use)) {
              rule.use.forEach((loader) => {
                if (loader.loader && loader.loader.includes('css-loader')) {
                  loader.options = {
                    ...loader.options,
                    sourceMap: env === 'development', // Only in dev
                  };
                }
                if (loader.loader && loader.loader.includes('sass-loader')) {
                  loader.options = {
                    ...loader.options,
                    sourceMap: env === 'development',
                    sassOptions: {
                      ...loader.options?.sassOptions,
                      outputStyle: env === 'production' ? 'compressed' : 'expanded',
                    },
                  };
                }
              });
            }
          }
        });
      }

      // 7. Environment-specific optimizations
      if (env === 'development') {
        // Development optimizations for faster builds and HMR
        webpackConfig.optimization = {
          ...webpackConfig.optimization,
          removeAvailableModules: false,
          removeEmptyChunks: false,
          splitChunks: {
            chunks: 'all',
            cacheGroups: {
              vendor: {
                test: /[\\/]node_modules[\\/]/,
                name: 'vendors',
                chunks: 'all',
                priority: 10,
                enforce: true,
              },
            },
          },
        };

        // Faster development builds
        webpackConfig.devtool = 'eval-cheap-module-source-map';

        // Skip expensive optimizations in development
        webpackConfig.optimization.usedExports = false;
        webpackConfig.optimization.sideEffects = false;
        webpackConfig.optimization.concatenateModules = false;
      } else {
        // Production optimizations
        webpackConfig.devtool = false; // No source maps in production

        // Skip externals for now to avoid issues
        // webpackConfig.externals = {};
      }

      // Environment-specific optimizations
      if (env === 'development') {
        // Development optimizations for faster builds and HMR
        webpackConfig.optimization = {
          ...webpackConfig.optimization,
          removeAvailableModules: false,
          removeEmptyChunks: false,
          splitChunks: {
            chunks: 'all',
            cacheGroups: {
              vendor: {
                test: /[\\/]node_modules[\\/]/,
                name: 'vendors',
                chunks: 'all',
                priority: 10,
                enforce: true,
              },
            },
          },
        };

        // Faster development builds
        webpackConfig.devtool = 'eval-cheap-module-source-map';

        // Skip expensive optimizations in development
        webpackConfig.optimization.usedExports = false;
        webpackConfig.optimization.sideEffects = false;
        webpackConfig.optimization.concatenateModules = false;
      } else {
        // Production optimizations
        webpackConfig.devtool = false; // No source maps in production

        // Ignore source map warnings for faster builds
        webpackConfig.ignoreWarnings = [
          /Failed to parse source map/,
          /Critical dependency: the request of a dependency is an expression/,
        ];

        // Disable performance hints about large bundles (we handle this with splitting)
        webpackConfig.performance = {
          hints: false,
          maxAssetSize: 2000000,
          maxEntrypointSize: 2000000,
        };
      }

      // Simple but effective bundle splitting for production
      if (env === 'production') {
        webpackConfig.optimization.splitChunks = {
          chunks: 'all',
          minSize: 20000,
          maxSize: 200000,
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
            },
            monaco: {
              test: /[\\/]node_modules[\\/]monaco-/,
              name: 'monaco',
              chunks: 'all',
              priority: 20,
              maxSize: 300000,
            },
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
              name: 'react',
              chunks: 'all',
              priority: 30,
            },
          },
        };
      }

      return webpackConfig;
    },
  },
  devServer: {
    port: 3000,
    open: false,
    historyApiFallback: true,
    compress: true,
    hot: true,
  },
  eslint: {
    enable: false,
  },
  typescript: {
    enableTypeChecking: false,
  },
};
