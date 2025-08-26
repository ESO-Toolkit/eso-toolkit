import type { Preview } from '@storybook/react-webpack5';
import { withRouter } from 'storybook-addon-remix-react-router';

const preview: Preview = {
  decorators: [withRouter],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
