const path = require('path');

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
      // Replace TypeScript loader with SWC for faster compilation
      // SWC (Speedy Web Compiler) is a Rust-based JavaScript/TypeScript compiler
      // that provides significantly faster build times than the default tsc
      const oneOf = webpackConfig.module.rules.find((rule) => rule.oneOf);
      if (oneOf) {
        // Find and replace the TypeScript rule
        const tsRule = oneOf.oneOf.find(
          (rule) => rule.test && rule.test.toString().includes('tsx?')
        );
        if (tsRule) {
          // Replace with SWC loader with environment-specific configuration
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
                  loose: false,
                  externalHelpers: false,
                  keepClassNames: env === 'development',
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
                sourceMaps: true,
                env: {
                  targets: {
                    chrome: '58',
                    firefox: '57',
                    safari: '11',
                    edge: '16',
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
      }

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
      }

      // Add performance hints - bypass recommended asset size limits
      if (env === 'production') {
        webpackConfig.performance = {
          ...webpackConfig.performance,
          maxAssetSize: 5000000, // 5MB - increased from 1MB
          maxEntrypointSize: 5000000, // 5MB - increased from 1MB
        };
      }

      return webpackConfig;
    },
  },
  devServer: {
    port: 3000,
    open: false, // Disable automatic browser opening to prevent multiple windows
    historyApiFallback: true,
    compress: true,
    hot: true,
  },
  eslint: {
    enable: false, // We handle ESLint separately
  },
  typescript: {
    enableTypeChecking: false, // We handle TypeScript checking separately
  },
};
