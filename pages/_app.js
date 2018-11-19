import React from 'react'
import App, { Container } from 'next/app'
import withApolloClient from '../src/withApolloClient'
import { ApolloProvider } from 'react-apollo'

class MyApp extends App {
  render() {
    const { Component, pageProps, store, apolloClient } = this.props
    return (
      <Container>
        <ApolloProvider client={apolloClient}>
          <Component pageContext={this.pageContext} {...pageProps} />
        </ApolloProvider>
      </Container>
    )
  }
}

export default withApolloClient(MyApp)
