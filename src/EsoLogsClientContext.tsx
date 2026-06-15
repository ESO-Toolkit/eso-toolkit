import { ApolloProvider } from '@apollo/client/react';
import React, { createContext, useContext, useMemo, ReactNode, useState, useCallback } from 'react';

import { useLogger } from './contexts/LoggerContext';
import { EsoLogsClient } from './esologsClient';
import { LOCAL_STORAGE_ACCESS_TOKEN_KEY } from './features/auth/auth';
import { getRosterHubBaseUrl } from './utils/envUtils';
import { addBreadcrumb } from './utils/errorTracking';

interface EsoLogsClientContextType {
  client: EsoLogsClient | null;
  isReady: boolean;
  isLoggedIn: boolean;
  setAuthToken: (token: string, loginStatus?: boolean) => void;
  clearAuthToken: () => void;
}

export const EsoLogsClientContext = createContext<EsoLogsClientContextType | undefined>(undefined);

// Read the initial token once at module level so the first render is already
// synchronised with AuthContext (which also reads from localStorage).  This
// eliminates the one-frame lag where AuthContext.isLoggedIn=true but
// EsoLogsClientContext.isLoggedIn=false, which caused visible layout shifts.
const initialToken = localStorage.getItem(LOCAL_STORAGE_ACCESS_TOKEN_KEY) || '';

// Proxy URL for public /api/v2/client queries — routes through the Cloudflare
// Worker so the server-side OAuth secret is never exposed to the browser.
// (Same-origin in dev via the Vite proxy; see getRosterHubBaseUrl.)
const CLIENT_API_PROXY_URL = `${getRosterHubBaseUrl()}/graphql`;

export const EsoLogsClientProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(!!initialToken);
  const logger = useLogger('EsoLogsClient');

  // We want a singleton here - create client once and update token via methods

  const client = useMemo(() => {
    logger.info('Creating new EsoLogsClient instance');
    return new EsoLogsClient(initialToken, CLIENT_API_PROXY_URL);
  }, [logger]);

  // Method to set auth token from AuthContext
  const setAuthToken = useCallback(
    (token: string, loginStatus?: boolean) => {
      // Use provided login status if available, otherwise fall back to !!token
      setIsLoggedIn(loginStatus !== undefined ? loginStatus : !!token);

      if (token) {
        // Only update if the token has actually changed
        if (client.getAccessToken() !== token) {
          logger.info('Updating EsoLogsClient access token');
          client.updateAccessToken(token);
          addBreadcrumb('Auth: EsoLogsClient token updated', 'auth', {
            tokenPresent: true,
          });
        }
      } else {
        addBreadcrumb('Auth: EsoLogsClient token cleared via setAuthToken', 'auth', {
          tokenPresent: false,
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [client], // logger intentionally omitted - it's a stable singleton, not a reactive dependency
  );

  // Method to clear auth token
  const clearAuthToken = useCallback(() => {
    logger.info('Clearing EsoLogsClient access token');
    setIsLoggedIn(false);
    client.updateAccessToken('');
    addBreadcrumb('Auth: EsoLogsClient token cleared', 'auth');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]); // logger intentionally omitted - it's a stable singleton, not a reactive dependency

  const contextValue = useMemo(() => {
    const value = {
      client: client,
      isReady: client !== null,
      isLoggedIn: isLoggedIn,
      setAuthToken,
      clearAuthToken,
    };

    logger.debug('EsoLogsClient context value updated', {
      isLoggedIn,
      isReady: value.isReady,
      hasClient: !!value.client,
    });

    return value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, isLoggedIn, setAuthToken, clearAuthToken]); // logger intentionally omitted - it's a stable singleton, not a reactive dependency

  return (
    <EsoLogsClientContext.Provider value={contextValue}>
      {client ? <ApolloProvider client={client.getClient()}> {children}</ApolloProvider> : children}
    </EsoLogsClientContext.Provider>
  );
};

export const useEsoLogsClientContext = (): EsoLogsClientContextType => {
  const context = useContext(EsoLogsClientContext);
  if (context === undefined) {
    throw new Error('useEsoLogsClient must be used within an EsoLogsClientProvider');
  }
  return context;
};

/**
 * Hook to get the EsoLogsClient instance directly.
 * Throws an error if the client is not ready.
 *
 * Note: Authentication is no longer required — the Cloudflare Worker GQL proxy
 * (ESO-765) injects tokens for public /api/v2/client queries. User-specific
 * hooks should check `isLoggedIn` from AuthContext before making user-scoped
 * requests.
 */
export const useEsoLogsClientInstance = (): EsoLogsClient => {
  const { client, isReady } = useEsoLogsClientContext();

  if (!isReady || !client) {
    throw new Error('EsoLogsClient is not ready.');
  }

  return client;
};
