import React from 'react'
import Head from '../components/head'
import gql from 'graphql-tag'
import { Query, Mutation } from 'react-apollo'

const SHAPES_QUERY = gql`
query {
  shapes {
    id
    color
    kind
  }
}
`
const SHAPE_CHANGED_SUBSCRIPTION = gql`
subscription {
  shapeChanged {
    shape {
      id
      kind
      color
    }
    operation
  }
}
`
const CREATE_SHAPE = gql`
  mutation CreateShape($kind: String!, $color: String!) {
    createShape(kind: $kind, color: $color) {
      id
      kind
      color
    }
  }
`

const UPDATE_SHAPE = gql`
  mutation UpdateShape($id: ID!, $kind: String!, $color: String!) {
    updateShape(id: $id, kind: $kind, color: $color) {
      id
      kind
      color
    }
  }
`

const DELETE_SHAPE = gql`
  mutation DeleteShape($id: ID!) {
    deleteShape(id: $id) 
  }
`

const colorChangeMap = {
  red: 'green',
  green: 'blue',
  blue: 'red'
}

const Shape = ({ id, color, kind, onDelete, onUpdate }) => <div>
  <font color={color}>{kind}</font>
  <input type="button" value="Delete" onClick={() => onDelete(id)} />
  <input type="button" value="Update" onClick={() => onUpdate(id, kind, colorChangeMap[color])} />
</div>

class ShapeList extends React.Component {

  componentDidMount() {
    this.props.subscribeToNewShape()
  }

  render() {
    const { shapes, ...otherProps } = this.props

    return <div className="row">
      {shapes.map(shape => <Shape key={shape.id} {...shape} {...otherProps} />)}
    </div>
  }
}

const Home = () => (
  <div>
    <Head title="Home" />

    <div>
      <Mutation mutation={DELETE_SHAPE}>
        {(deleteShape, { data, error }) => {
          if (data) {
            console.log("deleted shape: ", data.deleteShape)
          }
          return <Mutation mutation={UPDATE_SHAPE}>
            {(updateShape, { data, error }) => {
              if (data) {
                console.log("updated shape: ", data.updateShape)
              }

              return <div><Mutation mutation={CREATE_SHAPE}>
                {(createShape, { data, error }) => {
                  if (data) {
                    console.log("created shape: ", data.createShape)
                  }
                  return <div>
                    <select id="kind">
                      <option value="Rect">Rect</option>
                      <option value="Circle">Circle</option>
                      <option value="Square">Square</option>
                    </select>
                    <select id="color">
                      <option value="red">Red</option>
                      <option value="green">Green</option>
                      <option value="blue">Blue</option>
                    </select>
                    <input type="button" value="New Item"
                      onClick={() => {
                        const kind = document.getElementById("kind").value
                        const color = document.getElementById("color").value
                        createShape({ variables: { kind, color } })
                      }}
                    />
                  </div>
                }}
              </Mutation>
                <Query query={SHAPES_QUERY}>
                  {({ subscribeToMore, ...result }) => {
                    const { data, loading } = result
                    console.log("On subscribeToMore: data = ", data, ", loading = ", loading)
                    if (!loading)
                      return (
                        <ShapeList
                          onUpdate={ (id, kind, color) => {
                            updateShape({ variables: { id, kind, color } })
                          }}
                          onDelete={ id => {
                            deleteShape({ variables: { id } })
                          }}
                          shapes={data.shapes}
                          subscribeToNewShape={() => {
                            console.log("Calling subscribeToMore...")
                            subscribeToMore({
                              document: SHAPE_CHANGED_SUBSCRIPTION,
                              updateQuery: (prev, data) => {
                                console.log("updateQuery: prev = ", prev, ", data = ", data)
                                if (!data.subscriptionData.data) return prev
                                const payload = data.subscriptionData.data.shapeChanged
                                switch (payload.operation) {
                                  case "create":
                                    return Object.assign({}, prev, {
                                      shapes: [...prev.shapes, payload.shape]
                                    })
                                  case "update":
                                    const updatedShapes = []
                                    prev.shapes.forEach(shape => {
                                      if (shape.id !== payload.shape.id)
                                        updatedShapes.push(shape)
                                      else
                                        updatedShapes.push(Object.assign(shape, payload.shape))
                                    })
                                    return {
                                      shapes: updatedShapes
                                    }
                                  case "delete":
                                    return Object.assign({}, prev, {
                                      shapes: prev.shapes.filter(shape => shape.id !== payload.shape.id)
                                    })
                                  default: throw Error(`Operation ${payload.operation} is not supported`)
                                }
                              }
                            })
                          }}
                        />
                      )
                    else
                      return "Loading"
                  }}
                </Query>
              </div>
            }}
          </Mutation>
        }}
      </Mutation>
    </div>
  </div>
)

export default Home
