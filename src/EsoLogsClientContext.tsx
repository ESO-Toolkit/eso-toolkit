import { ApolloProvider } from '@apollo/client';
import React, { createContext, useContext, useMemo, useEffect, ReactNode } from 'react';

import { useLogger } from './contexts/LoggerContext';
import { EsoLogsClient } from './esologsClient';
import { useAuth } from './features/auth/AuthContext';

interface EsoLogsClientContextType {
  client: EsoLogsClient | null;
  isReady: boolean;
}

export const EsoLogsClientContext = createContext<EsoLogsClientContextType | undefined>(undefined);

export const EsoLogsClientProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { accessToken, isLoggedIn } = useAuth();
  const logger = useLogger('EsoLogsClient');

  // We want a singleton here
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const client = useMemo(() => {
    logger.info('Creating new EsoLogsClient instance', { hasToken: !!accessToken });
    return new EsoLogsClient(accessToken);
  }, [logger, accessToken]);

  // Update the client's access token when it changes
  useEffect(() => {
    if (accessToken && isLoggedIn) {
      // Only update if the token has actually changed
      if (client.getAccessToken() !== accessToken) {
        logger.info('Updating EsoLogsClient access token');
        client.updateAccessToken(accessToken);
      }
    } else if (!isLoggedIn) {
      logger.info('User logged out, clearing client access');
    }
  }, [client, accessToken, isLoggedIn, logger]);

  const contextValue = useMemo(() => {
    const value = {
      client: isLoggedIn ? client : null,
      isReady: isLoggedIn && client !== null,
    };

    logger.debug('EsoLogsClient context value updated', {
      isLoggedIn,
      isReady: value.isReady,
      hasClient: !!value.client,
    });

    return value;
  }, [client, isLoggedIn, logger]);

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
