import { MockedProvider } from '@apollo/client/testing';
import type { Decorator } from '@storybook/react';
import React from 'react';

export const withApollo: Decorator = (Story, _context) => {
  // Use MockedProvider for better GraphQL mocking
  const mocks = _context.parameters.apolloMocks || [];

  return (
    <MockedProvider mocks={mocks} showWarnings={true}>
      <Story />
    </MockedProvider>
  );
};
