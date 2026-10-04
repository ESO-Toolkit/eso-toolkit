import { gql } from '@apollo/client';
import { useApolloClient } from '@apollo/client/react';
import { act, renderHook } from '@testing-library/react';
import React from 'react';

import { LoggerProvider } from './contexts/LoggerContext';
import { EsoLogsClientProvider, useEsoLogsClientContext } from './EsoLogsClientContext';
import { clearStoredTokens, setStoredToken } from './features/auth/auth';

const wrapper = ({ children }: { children: React.ReactNode }): React.ReactElement => (
  <LoggerProvider>
    <EsoLogsClientProvider>{children}</EsoLogsClientProvider>
  </LoggerProvider>
);

const useClients = () => ({ context: useEsoLogsClientContext(), apollo: useApolloClient() });

describe('ESO Logs session client integration', () => {
  beforeEach(() => clearStoredTokens());
  afterEach(() => clearStoredTokens());

  it('updates Apollo consumers when a token changes while the user stays logged in', () => {
    setStoredToken('access_token', 'first-session');
    const { result } = renderHook(useClients, { wrapper });
    const previous = result.current.apollo;
    const stop = jest.spyOn(previous, 'stop');
    const query = gql`
      query PrivateSession {
        privateName
      }
    `;
    previous.writeQuery({ query, data: { privateName: 'old-user' } });

    act(() => result.current.context.setAuthToken('second-session'));

    expect(result.current.context.isLoggedIn).toBe(true);
    expect(result.current.apollo).toBe(result.current.context.client?.getClient());
    expect(result.current.apollo).not.toBe(previous);
    expect(stop).toHaveBeenCalledTimes(1);
    expect(result.current.apollo.readQuery({ query })).toBeNull();
    previous.writeQuery({ query, data: { privateName: 'late-old-user' } });
    expect(result.current.apollo.readQuery({ query })).toBeNull();
  });

  it('rebinds Apollo even when credentials are cleared while already signed out', async () => {
    const { result } = renderHook(useClients, { wrapper });
    const previous = result.current.apollo;

    await act(async () => result.current.context.clearAuthToken());

    expect(result.current.context.isLoggedIn).toBe(false);
    expect(result.current.apollo).not.toBe(previous);
    expect(result.current.apollo).toBe(result.current.context.client?.getClient());
  });

  it('reads current credentials again when the provider is remounted', () => {
    setStoredToken('access_token', 'first-session');
    const first = renderHook(useClients, { wrapper });
    expect(first.result.current.context.client?.getAccessToken()).toBe('first-session');
    first.unmount();
    clearStoredTokens();
    const second = renderHook(useClients, { wrapper });
    expect(second.result.current.context.client?.getAccessToken()).toBe('');
    expect(second.result.current.context.isLoggedIn).toBe(false);
  });
});
