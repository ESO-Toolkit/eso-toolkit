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
    // Remove ESLint plugin from Storybook to avoid conflicts with mocker runtime template
    if (config.plugins) {
      config.plugins = config.plugins.filter((plugin) => {
        if (plugin && typeof plugin === 'object' && 'name' in plugin) {
          return plugin.name !== 'vite:eslint';
        }
        return true;
      });
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
