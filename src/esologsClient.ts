import { ApolloClient, InMemoryCache, createHttpLink, NormalizedCacheObject } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

export function createEsoLogsClient(accessToken: string): ApolloClient<NormalizedCacheObject> {
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
    return {
      headers: {
        ...headers,
        Authorization: accessToken ? `Bearer ${accessToken}` : undefined,
      },
    };
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
