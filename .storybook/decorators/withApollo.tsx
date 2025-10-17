import type { Decorator } from '@storybook/react';
import { MockedProvider } from '@apollo/client/testing/react';
import { defaultApolloMocks } from '../mocks/graphql';

export const withApollo: Decorator = (Story, context) => {
  // Use story-specific mocks if provided, otherwise fall back to default mocks
  const mocks = context.parameters.apolloMocks || defaultApolloMocks;

  return (
    <MockedProvider mocks={mocks} showWarnings={true}>
      <Story />
    </MockedProvider>
  );
};
