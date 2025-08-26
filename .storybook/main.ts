import type { StorybookConfig } from '@storybook/react-webpack5';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@storybook/preset-create-react-app',
    '@storybook/addon-docs',
    'storybook-addon-remix-react-router',
  ],
  framework: {
    name: '@storybook/react-webpack5',
    options: {},
  },
  staticDirs: ['../public'],
  typescript: {
    check: false, // Disable strict checking to avoid config conflicts
    checkOptions: {},
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      shouldRemoveUndefinedFromOptional: true,
      propFilter: (prop) => {
        if (prop.parent) {
          return !/@types\/react/.test(prop.parent.fileName);
        }
        return true;
      },
    },
  },
  webpackFinal: async (config) => {
    // Add support for absolute imports
    if (config.resolve) {
      config.resolve.modules = [...(config.resolve.modules || []), 'node_modules', 'src'];
    }

    return config;
  },
};
export default config;
