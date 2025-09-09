import type { Preview } from '@storybook/react';
import { withReactRouter } from './decorators/withReactRouter';
import { initialize, mswDecorator, mswLoader } from 'msw-storybook-addon';
import { withNoNetworkRequests } from '../src/test/decorators/withNoNetworkRequests';
import '../src/index.css';
import { withApollo } from './decorators/withApollo';

// Initialize MSW
initialize({
  onUnhandledRequest: 'error',
});

const preview: Preview = {
  decorators: [withNoNetworkRequests, withApollo, mswDecorator, withReactRouter],
  loaders: [mswLoader],
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
