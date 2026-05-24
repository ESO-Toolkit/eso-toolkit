import { MockedProvider } from '@apollo/client/testing/react';
import type { MockedResponse } from '@apollo/client/testing';
import type { Decorator } from '@storybook/react';
import React from 'react';

export const withApollo: Decorator = (Story, _context) => {
  // Use MockedProvider for better GraphQL mocking
  const mocks = ((_context.parameters as Record<string, unknown>).apolloMocks ?? []) as readonly MockedResponse[];

  return (
    <MockedProvider mocks={mocks} showWarnings={true}>
      <Story />
    </MockedProvider>
  );
};
