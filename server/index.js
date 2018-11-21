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
    const payload = {
        shape: item || prev,
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
            console.log("Query shapes: ", db.items)
            return db.items.filter(item => item)
        }
    },
    Mutation: {
        async createShape(root, { kind, color }, context) {
            console.log("createShape: ", kind, color)
            const shape = { kind, color, id: db.items.length }
            db.createItem(shape)
            return shape
        },

        async updateShape(root, { id, kind, color }, context) {
            console.log("updateShape: ", kind, color)
            db.updateItem({ id, kind, color })
            return db.items[id]
        },

        async deleteShape(root, { id }, context) {
            console.log("deleteShape: ", id)
            db.deleteItem(id)
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
