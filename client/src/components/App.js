import React, { Component } from 'react'
// import fetch from 'isomorphic-fetch'
import { getTestMessage } from './../redux/actions/test.action'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import Main from './Main'
import Header from './header.js'
import Sidebar from './sidebar.js'

class App extends Component {
  constructor (props) {
    super(props)
    this.state = {
    }
  }
  componentDidMount () {
    this.props.getTestMessage()
  }
  render () {
    return (
      <div className='App'>
        <h1>This is from server: ${this.props.message}</h1>
      </div>
    )
  }
}

function mapStateToProps (state) {
  return {
    message: state.testReducer.serverMessage,
  }
}

function mapDispatchToProps (dispatch) {
  return bindActionCreators({
    getTestMessage: getTestMessage
  }, dispatch)
}

export default connect(mapStateToProps, mapDispatchToProps)(App)
