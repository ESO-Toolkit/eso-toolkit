import { MockedProvider } from '@apollo/client/testing';
import { render } from '@testing-library/react';
import React from 'react';

import App from './App';

// Mock the AuthContext to avoid authentication issues
jest.mock('./AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({
    accessToken: 'mock-token',
    isAuthenticated: false,
    loading: false,
    error: null,
  }),
}));

// Mock the Apollo GraphQL client completely
jest.mock('./esologsClient', () => ({
  createEsoLogsClient: () => ({
    query: jest.fn().mockResolvedValue({ data: {} }),
    mutate: jest.fn().mockResolvedValue({ data: {} }),
    watchQuery: jest.fn().mockReturnValue({
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    }),
    cache: {
      readQuery: jest.fn(),
      writeQuery: jest.fn(),
    },
  }),
}));

const AppWithMocks: React.FC = () => {
  return (
    <MockedProvider mocks={[]}>
      <App />
    </MockedProvider>
  );
};

describe('App Storybook Snapshot', () => {
  it('matches the default story snapshot', () => {
    const { container } = render(<AppWithMocks />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
