import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client'

export const client = new ApolloClient({
  link: new HttpLink({ uri: '/graphql' }),
  // Policies are normalised by id, so a payInstalment result updates every screen showing that policy.
  cache: new InMemoryCache(),
})
