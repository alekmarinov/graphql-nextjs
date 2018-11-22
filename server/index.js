import express from 'express'
import bodyParser from 'body-parser'
import next from 'next'
import { createServer } from 'http'
import { makeExecutableSchema } from 'graphql-tools';
import { execute, subscribe } from 'graphql'
import { SubscriptionServer } from 'subscriptions-transport-ws'
import { graphqlExpress } from 'graphql-server-express'
import { PubSub } from 'graphql-subscriptions'
import ObservableStore from '@alekmarinov/observablestore'

const typeDefs = `
type Shape {
    id: ID!
    kind: String!
    color: String!
  }
  
  type Query {
    shapes: [Shape!]!
  }
  
  type Mutation {
    createShape(kind: String!, color: String!): Shape!
    updateShape(id: ID!, kind: String!, color: String!): Shape!
    deleteShape(id: ID!): Boolean!
  }
  
  type ShapeChangedPayload {
    shape: Shape
    operation: String!
  }
  
  type Subscription {
    shapeChanged: ShapeChangedPayload!
  }
`

const port = process.env.NODE_PORT || 3000
const host = process.env.NODE_HOST || "0.0.0.0"
const isDev = process.env.NODE_ENV !== 'production'
const nextApp = next({ dev: isDev })

const pubsub = new PubSub()
const DB_CHANGED_TOPIC = 'db_changed'
const db = ObservableStore()
db.subscribe(({ prev, item }) => {
    let shape = item || prev
    if (shape)
        shape.id = shape._index
    const payload = {
        shape
    }
    if (!item)
        payload.operation = "delete"
    else if (prev)
        payload.operation = "update"
    else
        payload.operation = "create"
    pubsub.publish(DB_CHANGED_TOPIC, payload)
})

const resolvers = {
    Query: {
        shapes() {
            const items = db.items().map(item => Object.assign({ id: item._index }, item))
            console.log("Query shapes: ", items)
            return items
        }
    },
    Mutation: {
        async createShape(root, { kind, color }, context) {
            console.log("createShape: ", kind, color)
            const item = db.createItem({ kind, color })
            return Object.assign({ id: item._index }, item)
        },

        async updateShape(root, { id, kind, color }, context) {
            console.log("updateShape: ", id, kind, color)
            return Object.assign({ id }, db.updateItem(parseInt(id), { kind, color }))
        },

        async deleteShape(root, { id }, context) {
            console.log("deleteShape: ", id)
            db.deleteItem(parseInt(id))
            return true
        }
    },
    Subscription: {
        shapeChanged: {
            subscribe: () => pubsub.asyncIterator(DB_CHANGED_TOPIC),
            resolve: (payload) => payload
        }
    }
}

const expressApp = express()
const schema = makeExecutableSchema({
    typeDefs,
    resolvers
})

expressApp.use(
    '/graphql',
    bodyParser.json(),
    graphqlExpress(request => ({
        schema,
        context: {
            request
        }
    }))
)

expressApp.get('*', nextApp.getRequestHandler())

const httpServer = createServer(expressApp)

nextApp.prepare().then(() => {
    httpServer.listen(port, host, () => {
        new SubscriptionServer(
            {
                execute,
                subscribe,
                schema,
            },
            {
                server: httpServer,
                path: '/subscriptions'
            }
        )
    })
    console.log(`Server is running on http://${host}:${port}`)
})
