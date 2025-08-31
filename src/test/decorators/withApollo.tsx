import { MockedProvider } from '@apollo/client/testing';
import type { Decorator } from '@storybook/react';
import React from 'react';

export const withApollo: Decorator = (Story, context) => {
  // Use MockedProvider for better GraphQL mocking
  const mocks = context.parameters.apolloMocks || [];

  return (
    <MockedProvider mocks={mocks} addTypename={false} showWarnings={true}>
      <Story />
    </MockedProvider>
  );
};
