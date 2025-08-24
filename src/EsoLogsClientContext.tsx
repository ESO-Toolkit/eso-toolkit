import { ApolloProvider } from '@apollo/client';
import React, { createContext, useContext, useMemo, useEffect, useRef, ReactNode } from 'react';

import { useAuth } from './AuthContext';
import { EsoLogsClient } from './esologsClient';

interface EsoLogsClientContextType {
  client: EsoLogsClient | null;
  isReady: boolean;
}

const EsoLogsClientContext = createContext<EsoLogsClientContextType | undefined>(undefined);

export const EsoLogsClientProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { accessToken, isLoggedIn } = useAuth();
  const clientRef = useRef<EsoLogsClient | null>(null);

  // Create and manage the EsoLogsClient instance
  const client = useMemo(() => {
    if (!isLoggedIn || !accessToken) {
      clientRef.current = null;
      return null;
    }

    // Create new client only if we don't have one or if we were logged out
    if (!clientRef.current) {
      clientRef.current = new EsoLogsClient(accessToken);
    }

    return clientRef.current;
  }, [accessToken, isLoggedIn]);

  // Update the client's access token when it changes
  useEffect(() => {
    if (client && accessToken && isLoggedIn) {
      // Only update if the token has actually changed
      if (client.getAccessToken() !== accessToken) {
        client.updateAccessToken(accessToken);
      }
    }
  }, [client, accessToken, isLoggedIn]);

  const contextValue = useMemo(
    () => ({
      client,
      isReady: isLoggedIn && client !== null,
    }),
    [client, isLoggedIn]
  );

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
 * Throws an error if called when not authenticated or client is not ready.
 */
export const useEsoLogsClientInstance = (): EsoLogsClient => {
  const { client, isReady } = useEsoLogsClientContext();

  if (!isReady || !client) {
    throw new Error('EsoLogsClient is not ready. User must be authenticated.');
  }

  return client;
};
