import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

import { CLIENT_ID } from './auth';

export function createEsoLogsClient(accessToken: string) {
  // Custom link to append query name to URL
  const customHttpLink = createHttpLink({
    uri: (operation) => {
      const baseUrl = 'https://www.esologs.com/api/v2/client';
      const queryName = operation.operationName;
      if (queryName) {
        return `${baseUrl}?query=${encodeURIComponent(queryName)}`;
      }
      return baseUrl;
    },
  });

  const authLink = setContext((_, { headers }) => {
    // ESO Logs API v2 "client" endpoint requires either a bearer token or a client-id header.
    // Always send client-id; include Authorization only when we have a token.
    const mergedHeaders: Record<string, string> = {
      ...(headers as Record<string, string>),
      // HTTP header names are case-insensitive, but send both to be safe
      'Client-ID': CLIENT_ID,
      'client-id': CLIENT_ID,
      Accept: 'application/json',
    };

    if (accessToken) {
      mergedHeaders.Authorization = `Bearer ${accessToken}`;
    }

    return { headers: mergedHeaders };
  });

  return new ApolloClient({
    link: authLink.concat(customHttpLink),
    cache: new InMemoryCache({
      typePolicies: {
        Query: {
          fields: {
            gameData: {
              merge(_existing, incoming) {
                // Always return incoming, never cache gameData
                return incoming;
              },
            },
          },
        },
      },
    }),
  });
}
