import { ApolloClient, InMemoryCache } from "@apollo/client";

export const client = new ApolloClient({
  uri: "https://www.esologs.com/api/v2/client",
  cache: new InMemoryCache(),
});
