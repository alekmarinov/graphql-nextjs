import ws from 'ws'
import { ApolloClient } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { ApolloLink, split } from 'apollo-link'
import { HttpLink } from 'apollo-link-http'
import { WebSocketLink } from 'apollo-link-ws'
import { SubscriptionClient } from 'subscriptions-transport-ws'
import { onError } from 'apollo-link-error'
import { getMainDefinition } from 'apollo-utilities'
import fetch from 'isomorphic-fetch'

const GRAPHQL_ENDPOINT = "http://localhost:3000/graphql"
const SUBSCRIPTIONS_ENDPOINT = "ws://localhost:3000/subscriptions"

let apolloClient = null

// Polyfill fetch() on the server (used by apollo-client)
if (!process.browser) {
  global.fetch = fetch
}

function create(initialState) {

  // Create an http link:
  const httpLink = new HttpLink({
    uri: GRAPHQL_ENDPOINT
  })

  // Create a WebSocket link
  const wsLink = new WebSocketLink(
    new SubscriptionClient(SUBSCRIPTIONS_ENDPOINT, {
      reconnect: true
    },
      process.browser ? null : ws))

  const link = split(
    // split based on operation type
    ({ query }) => {
      const { kind, operation } = getMainDefinition(query)
      return kind === 'OperationDefinition' && operation === 'subscription'
    },
    wsLink,
    httpLink,
  )

  const apolloClient = new ApolloClient({
    link: ApolloLink.from([
      onError(({ graphQLErrors, networkError }) => {
        if (graphQLErrors)
          graphQLErrors.map(({ message, locations, path }) =>
            console.log(`[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`)
          )
        if (networkError) console.log(`[Network error]: ${networkError}`)
      }),
      link
    ]),
    cache: new InMemoryCache().restore(initialState || {})
  })

  return apolloClient
}

export default function initApollo(initialState) {
  // Make sure to create a new client for every server-side request so that data
  // isn't shared between connections (which would be bad)
  if (!process.browser) {
    return create(initialState)
  }

  // Reuse client on the client-side
  if (!apolloClient) {
    apolloClient = create(initialState)
  }

  return apolloClient
}
