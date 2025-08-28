import type { StorybookConfig } from '@storybook/react-webpack5';
import path from 'path';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],

  addons: [
    'storybook-addon-remix-react-router',
    '@storybook/addon-links',
    '@storybook/preset-create-react-app',
    '@storybook/addon-docs',
    'msw-storybook-addon',
  ],

  staticDirs: ['./public'],

  framework: {
    name: '@storybook/react-webpack5',
    options: {},
  },

  webpackFinal: async (config) => {
    // Add alias support similar to craco
    if (config.resolve) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@': path.resolve(__dirname, '../src'),
      };
    }

    return config;
  },
};

export default config;
