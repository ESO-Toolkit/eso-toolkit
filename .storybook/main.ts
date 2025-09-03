import type { StorybookConfig } from '@storybook/react-vite';
import path from 'path';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  staticDirs: ['./public'],

  addons: [
    'storybook-addon-remix-react-router',
    '@storybook/addon-links',
    '@storybook/addon-docs',
    'msw-storybook-addon',
  ],

  framework: {
    name: '@storybook/react-vite',
    options: {},
  },

  viteFinal: async (config) => {
    // Disable ESLint completely for Storybook builds
    process.env.DISABLE_ESLINT_PLUGIN = 'true';
    
    // Remove ESLint plugin from Storybook to avoid conflicts with mocker runtime template
    if (config.plugins) {
      config.plugins = config.plugins.filter((plugin) => {
        if (plugin && typeof plugin === 'object') {
          // Check for various ESLint plugin identifiers
          const pluginName = 'name' in plugin ? plugin.name : '';
          const isEslintPlugin = 
            pluginName === 'vite:eslint' ||
            pluginName === 'eslint' ||
            pluginName?.includes('eslint') ||
            ('__vitePlugin' in plugin && plugin.__vitePlugin === true && pluginName?.includes('eslint'));
          
          if (isEslintPlugin) {
            console.log('🚫 Removing ESLint plugin from Storybook:', pluginName);
            return false;
          }
        }
        return true;
      });
    }

    // Optimize build settings for memory usage
    if (config.build) {
      config.build.sourcemap = false; // Disable sourcemaps
      config.build.minify = 'esbuild'; // Use esbuild for faster minification
      config.build.rollupOptions = {
        ...config.build.rollupOptions,
        maxParallelFileOps: 2, // Limit parallel operations
      };
    }

    // Add alias support similar to main vite config
    if (config.resolve) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@': path.resolve(__dirname, '../src'),
        '@components': path.resolve(__dirname, '../src/components'),
        '@features': path.resolve(__dirname, '../src/features'),
        '@store': path.resolve(__dirname, '../src/store'),
        '@types': path.resolve(__dirname, '../src/types'),
        '@utils': path.resolve(__dirname, '../src/utils'),
        '@graphql': path.resolve(__dirname, '../src/graphql'),
      };
    }

    // Configure Vite base path for subdirectory deployment
    const basePath = process.env.STORYBOOK_BASE_PATH;
    if (basePath) {
      config.base = basePath;
      console.log('🔧 Setting Storybook base path to:', basePath);
    }

    return config;
  },

  docs: {},

  typescript: {
    check: false,
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: (prop) => (prop.parent ? !/node_modules/.test(prop.parent.fileName) : true),
    },
  },
};

// eslint-disable-next-line import/no-default-export
export default config;
