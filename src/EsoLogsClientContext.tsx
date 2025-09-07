import { ApolloProvider } from '@apollo/client';
import React, { createContext, useContext, useMemo, ReactNode, useState, useCallback } from 'react';

import { useLogger } from './contexts/LoggerContext';
import { EsoLogsClient } from './esologsClient';

interface EsoLogsClientContextType {
  client: EsoLogsClient | null;
  isReady: boolean;
  setAuthToken: (token: string) => void;
  clearAuthToken: () => void;
}

export const EsoLogsClientContext = createContext<EsoLogsClientContextType | undefined>(undefined);

export const EsoLogsClientProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const logger = useLogger('EsoLogsClient');

  // We want a singleton here - create client once and update token via methods
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const client = useMemo(() => {
    logger.info('Creating new EsoLogsClient instance');
    return new EsoLogsClient(''); // Start with empty token
  }, [logger]);

  // Method to set auth token from AuthContext
  const setAuthToken = useCallback(
    (token: string) => {
      setIsLoggedIn(!!token);

      if (token) {
        // Only update if the token has actually changed
        if (client.getAccessToken() !== token) {
          logger.info('Updating EsoLogsClient access token');
          client.updateAccessToken(token);
        }
      }
    },
    [client, logger],
  );

  // Method to clear auth token
  const clearAuthToken = useCallback(() => {
    logger.info('Clearing EsoLogsClient access token');
    setIsLoggedIn(false);
    client.updateAccessToken('');
  }, [client, logger]);

  const contextValue = useMemo(() => {
    const value = {
      client: isLoggedIn ? client : null,
      isReady: isLoggedIn && client !== null,
      setAuthToken,
      clearAuthToken,
    };

    logger.debug('EsoLogsClient context value updated', {
      isLoggedIn,
      isReady: value.isReady,
      hasClient: !!value.client,
    });

    return value;
  }, [client, isLoggedIn, logger, setAuthToken, clearAuthToken]);

  return (
    <EsoLogsClientContext.Provider value={contextValue}>
      {client && isLoggedIn ? (
        <ApolloProvider client={client.getClient()}> {children}</ApolloProvider>
      ) : (
        children
      )}
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
 * Throws an error if called when not authenticated or client is not ready.
 */
export const useEsoLogsClientInstance = (): EsoLogsClient => {
  const { client, isReady } = useEsoLogsClientContext();

  if (!isReady || !client) {
    throw new Error('EsoLogsClient is not ready. User must be authenticated.');
  }

  return client;
};
