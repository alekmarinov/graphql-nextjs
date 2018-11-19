import express from 'express'
import bodyParser from 'body-parser'
import next from 'next'
import { createServer } from 'http'
import { makeExecutableSchema } from 'graphql-tools';
import { execute, subscribe } from 'graphql'
import { SubscriptionServer } from 'subscriptions-transport-ws'
import { importSchema } from 'graphql-import'
import { graphqlExpress } from 'graphql-server-express'
import { PubSub } from 'graphql-subscriptions'
import ObservableStore from '@alekmarinov/observablestore'
const typeDefs = importSchema('./server/schema.graphql')

const port = 3000
const isDev = process.env.NODE_ENV !== 'production'
const nextApp = next({ dev: isDev })

const pubsub = new PubSub()
const DB_CHANGED_TOPIC = 'db_changed'
const db = ObservableStore()
db.subscribe(({ prev, item }) => {
    console.log("db: ", prev, item)
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
            return db.items
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
            resolve: (payload) => {
                console.log("resolve: ", payload)
                return payload
            }
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
    httpServer.listen(port, () => {
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
    console.log(`Server is running on http://localhost:${port}`)
})
