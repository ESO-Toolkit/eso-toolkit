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
    open: true,
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
