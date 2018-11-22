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

const SHAPE_KINDS = ['Square', 'Circle', 'Rectangle']

const COLORS = [
  'Green',
  'Blue',
  'Orange',
  'Cyan',
  'Brown',
  'Magenta',
  'Red'
]

const colorChangeMap = [...COLORS.keys()].reduce((colMap, idx) => Object.assign(colMap, { [COLORS[idx]]: idx < COLORS.length - 1 ? COLORS[idx + 1] : COLORS[0] }), {})

const Shape = ({ id, color, kind }) => <li>
  <span className='column'><font color={color}>{kind}</font></span>
  <Mutation mutation={DELETE_SHAPE}>
    {(deleteShape, { data, error }) => {
      return <span className='column'><input type="button" value="Delete" onClick={() => deleteShape({ variables: { id } })} /></span>
    }}
  </Mutation>
  <Mutation mutation={UPDATE_SHAPE}>
    {(updateShape, { data, error }) => {
      return <span className='column'><input type="button" value="Change color" onClick={() => updateShape({ variables: { id, kind, color: colorChangeMap[color] } })} /></span>
    }}
  </Mutation>
  < style jsx > {`
    .row {
      float: left;
      width: 100%;        
    }

    .column {
      float: left;
      width: 30%;        
    }
    `}
  </style >
</li>

class ShapeList extends React.Component {

  componentDidMount() {
    this.props.subscribeToNewShape()
  }

  render() {
    const { shapes, ...otherProps } = this.props

    return <ul className="list">
      {shapes.map(shape => <Shape key={shape.id} {...shape} {...otherProps} />)}
      <style jsx>{`
          .list {
            padding: 0pt 0 20pt 10pt;
            max-width: 300pt;
            list-style-type: none;
            text-align: left;
          }
        `}
      </style>
    </ul>
  }
}

const Home = () => (
  <div>
    <Head title="Home" />

    <div>
      <div><div className='list'>
        <select className='column' id="kind">
          {SHAPE_KINDS.map((shape, idx) => <option key={idx} value={shape}>{shape}</option>)}
        </select>
        <select className='column' id="color">
          {COLORS.map((color, idx) => <option key={idx} value={color}>{color}</option>)}
        </select><Mutation mutation={CREATE_SHAPE}>
          {createShape => {
            return <input className='column' type="button" value="New Item"
              onClick={() => {
                const kind = document.getElementById("kind").value
                const color = document.getElementById("color").value
                createShape({ variables: { kind, color } })
              }}
            />
          }}
        </Mutation>
      </div>
        < style jsx > {`
          .list {
            padding: 20pt 0 20pt 10pt;
            max-width: 300pt;
            list-style-type: none;
            text-align: left;
          }
    .column {
      float: left;
      width: 30%;
    }
    `}
        </style >
        <Query query={SHAPES_QUERY}>
          {({ subscribeToMore, ...result }) => {
            const { data, loading } = result
            if (!loading)
              return (
                <ShapeList
                  shapes={data.shapes}
                  subscribeToNewShape={() => {
                    subscribeToMore({
                      document: SHAPE_CHANGED_SUBSCRIPTION,
                      updateQuery: (prev, data) => {
                        if (!data.subscriptionData.data) return prev
                        const payload = data.subscriptionData.data.shapeChanged
                        switch (payload.operation) {
                          case "create":
                            return Object.assign({}, prev, {
                              shapes: [...prev.shapes, payload.shape]
                            })
                          case "update":
                            prev.shapes.forEach(shape => {
                              if (shape.id === payload.shape.id)
                                Object.assign(shape, payload.shape)
                            })
                            return {
                              shapes: prev.shapes
                            }
                          case "delete":
                            return Object.assign({}, prev, {
                              shapes: payload.shape ? prev.shapes.filter(shape => shape.id !== payload.shape.id) : prev.shapes
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
    </div>
  </div>
)

export default Home
