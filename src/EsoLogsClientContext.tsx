import { ApolloProvider } from '@apollo/client';
import React, { createContext, useContext, useMemo, useEffect, ReactNode } from 'react';

import { useAuth } from './AuthContext';
import { EsoLogsClient } from './esologsClient';

interface EsoLogsClientContextType {
  client: EsoLogsClient | null;
  isReady: boolean;
}

const EsoLogsClientContext = createContext<EsoLogsClientContextType | undefined>(undefined);

export const EsoLogsClientProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { accessToken, isLoggedIn } = useAuth();

  // We want a singleton here
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const client = useMemo(() => new EsoLogsClient(accessToken), []);

  // Update the client's access token when it changes
  useEffect(() => {
    if (accessToken && isLoggedIn) {
      // Only update if the token has actually changed
      if (client.getAccessToken() !== accessToken) {
        client.updateAccessToken(accessToken);
      }
    }
  }, [client, accessToken, isLoggedIn]);

  const contextValue = useMemo(
    () => ({
      client: isLoggedIn ? client : null,
      isReady: isLoggedIn && client !== null,
    }),
    [client, isLoggedIn]
  );

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
