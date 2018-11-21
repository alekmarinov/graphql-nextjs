# graphql-nextjs

Template for nextjs app using graphql with subscriptions

## Install 
```bash
npm install
npm run dev
# or
yarn
yarn dev
```

## Usage

Open a browser at http://localhost:3000 and create some items with "_New Item_" button.
Then you can change the colors to some of them with "_Change color_" button.

Open a new browser at the same url as above and you will see the same list with items. That is result of GraphQL query which fetches the existing items from the DB.
Now do some more changes on the list and check that the list is in sync with the first browser. That is result of GraphQL subscription which get fired on every created, updated or delete item.
