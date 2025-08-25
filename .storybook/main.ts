import type { StorybookConfig } from '@storybook/react-webpack5';

const config: StorybookConfig = {
  stories: [
    '../src/**/*.mdx',
    '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'
  ],
  addons: [
    '@storybook/addon-docs'
  ],
  framework: {
    name: '@storybook/react-webpack5',
    options: {}
  },
  staticDirs: [
    '../public'
  ],
  webpackFinal: async (config) => {
    config.module = config.module || { rules: [] };
    config.module.rules = config.module.rules || [];

    // Ensure TS/TSX are transpiled (since we're not using the CRA preset)
    config.module.rules.push({
      test: /\.(ts|tsx)$/,
      exclude: /node_modules/,
      use: [
        {
          loader: require.resolve('babel-loader'),
          options: {
            presets: [
              require.resolve('@babel/preset-env'),
              [require.resolve('@babel/preset-react'), { runtime: 'automatic', development: true }],
              require.resolve('@babel/preset-typescript'),
            ],
          },
        },
      ],
    });

    config.resolve = config.resolve || {};
    config.resolve.extensions = config.resolve.extensions || ['.mjs', '.js', '.jsx', '.json'];
    if (!config.resolve.extensions.includes('.ts')) config.resolve.extensions.push('.ts');
    if (!config.resolve.extensions.includes('.tsx')) config.resolve.extensions.push('.tsx');

    return config;
  }
};
export default config;