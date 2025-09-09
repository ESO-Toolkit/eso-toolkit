import { MockedResponse } from '@apollo/client/testing';
import type { Meta, StoryObj } from '@storybook/react';

import {
  mockExchangeOAuthToken,
  mockExchangeOAuthTokenError,
  successfulOAuthMocks,
  failedOAuthMocks,
} from '../.storybook/mocks/graphql';

import { OAuthRedirect } from './OAuthRedirect';
import { withAuth, withApollo } from './test/decorators';
import { withReduxProvider } from './test/decorators/storybookDecorators';

const meta = {
  title: 'Pages/OAuthRedirect',
  component: OAuthRedirect,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [withApollo, withAuth, withReduxProvider],
} satisfies Meta<typeof OAuthRedirect>;

export default meta;
type Story = StoryObj<typeof meta>;

// Helper function to create mock scenarios for different OAuth states
const createOAuthMockScenario = (
  scenario: 'success' | 'error' | 'loading' | 'state-mismatch',
): MockedResponse[] => {
  switch (scenario) {
    case 'success':
      return successfulOAuthMocks;
    case 'error':
      return failedOAuthMocks;
    case 'loading':
      return [{ ...mockExchangeOAuthToken(), delay: 2000 }];
    case 'state-mismatch':
      return [mockExchangeOAuthTokenError('auth_code_123', 'invalid_state')];
    default:
      return [];
  }
};

// Story for successful OAuth redirect with authorization code
export const SuccessfulRedirect: Story = {
  parameters: {
    router: {
      location: '/?code=auth_code_123&state=xyz',
    },
    apolloMocks: createOAuthMockScenario('success'),
    docs: {
      description: {
        story: 'Shows the OAuth redirect handling when a valid authorization code is received.',
      },
    },
  },
};

// Story for OAuth error scenario
export const ErrorRedirect: Story = {
  parameters: {
    router: {
      location: '/?error=access_denied&error_description=User%20denied%20access',
    },
    apolloMocks: createOAuthMockScenario('error'),
    docs: {
      description: {
        story: 'Shows the OAuth redirect handling when an error occurs during authorization.',
      },
    },
  },
};

// Story for missing parameters
export const MissingParameters: Story = {
  parameters: {
    router: {
      location: '/',
    },
    docs: {
      description: {
        story: 'Shows the OAuth redirect handling when no authorization parameters are present.',
      },
    },
  },
};

// Story for loading state
export const LoadingState: Story = {
  parameters: {
    router: {
      location: '/?code=auth_code_123&state=xyz',
    },
    apolloMocks: createOAuthMockScenario('loading'),
    docs: {
      description: {
        story: 'Shows the loading state while processing the OAuth redirect.',
      },
    },
  },
};

// Story for state mismatch error
export const StateMismatch: Story = {
  parameters: {
    router: {
      location: '/?code=auth_code_123&state=invalid_state',
    },
    apolloMocks: createOAuthMockScenario('state-mismatch'),
    docs: {
      description: {
        story:
          'Shows the OAuth redirect handling when the state parameter does not match the expected value.',
      },
    },
  },
};
