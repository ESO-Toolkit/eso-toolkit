import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

export function createEsoLogsClient(accessToken: string) {
  const httpLink = createHttpLink({
    uri: 'https://www.esologs.com/api/v2/client',
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
    link: authLink.concat(httpLink),
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
