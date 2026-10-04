import { gql } from '@apollo/client';
import { waitFor } from '@testing-library/react';

import { EsoLogsClient } from './esologsClient';
import {
  clearStoredTokens,
  getStoredAccessToken,
  getStoredRefreshToken,
  refreshAccessToken,
  setStoredToken,
} from './features/auth/auth';

jest.mock('./features/auth/auth', () => ({
  ...jest.requireActual<typeof import('./features/auth/auth')>('./features/auth/auth'),
  refreshAccessToken: jest.fn(),
}));

const query = gql`
  query getCurrentUser {
    userData {
      currentUser {
        id
      }
    }
  }
`;

describe('ESO Logs authentication error link', () => {
  const originalFetch = global.fetch;
  const fetchMock = jest.fn();

  beforeEach(() => {
    clearStoredTokens();
    setStoredToken('access_token', 'existing-access');
    setStoredToken('refresh_token', 'existing-refresh');
    jest.mocked(refreshAccessToken).mockReset().mockResolvedValue(null);
    fetchMock.mockReset().mockResolvedValue({
      status: 401,
      statusText: 'Unauthorized',
      headers: { get: () => 'application/json' },
      text: () => Promise.resolve(JSON.stringify({ errors: [{ message: 'Unauthorized' }] })),
    });
    global.fetch = fetchMock;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    clearStoredTokens();
  });

  it('preserves credentials when an HTTP 401 refresh attempt temporarily fails', async () => {
    const client = new EsoLogsClient('existing-access', '/graphql');
    await expect(client.getClient().query({ query })).rejects.toThrow(
      'Unable to refresh your ESO Logs session',
    );

    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(getStoredAccessToken()).toBe('existing-access');
    expect(getStoredRefreshToken()).toBe('existing-refresh');
    client.stop();
  });

  it('does not retry or mutate the client after the request is cancelled during refresh', async () => {
    let finishRefresh!: (token: string) => void;
    jest.mocked(refreshAccessToken).mockReturnValueOnce(
      new Promise((resolve) => {
        finishRefresh = resolve;
      }),
    );
    const client = new EsoLogsClient('existing-access', '/graphql');
    const subscription = client.watchQuery({ query }).subscribe({ error: jest.fn() });
    await waitFor(() => expect(refreshAccessToken).toHaveBeenCalledTimes(1));
    subscription.unsubscribe();
    // Apollo defers link teardown until its query subscription is disposed.
    await new Promise((resolve) => setTimeout(resolve, 0));
    setStoredToken('access_token', 'refreshed-access');
    finishRefresh('refreshed-access');
    await Promise.resolve();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(client.getAccessToken()).toBe('existing-access');
    client.stop();
  });
});
