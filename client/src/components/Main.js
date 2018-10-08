// import React, { Component } from 'react'
// import { Switch, Route, Redirect } from 'react-router-dom'
// import Dashboard from './../containers/dashboard/dashboard'
// import Groups from './../containers/groups/groups'
// import Contacts from './../containers/contacts/contacts'
// import GroupDetail from './../containers/groups/groupDetail'
// import Signup from './../containers/signup/signup'
// import Login from './../containers/login/login'
// import Chat from './../containers/chat/chat'
// import Settings from './../containers/settings/settings'
// import auth from './../utility/auth.service'

// class Main extends Component {
//   constructor (props) {
//     super(props)
//     this.state = {
//     }
//   }

//   userPropValidation = (WrappedComponent) => {
//     if (!auth.loggedIn()) {
//       return <Redirect to='/login' />
//     } else if (!this.props.user) {
//       return <Dashboard />
//     } else {
//       return <WrappedComponent />
//     }
//   }

//   render () {
//     return (
//       <Switch>
//         <Route exact path='/' render={() => this.userPropValidation(Dashboard)} />
//         <Route exact path='/groups' render={() => this.userPropValidation(Groups)} />
//         <Route exact path='/groups/:groupId' render={() => this.userPropValidation(GroupDetail)} />
//         <Route exact path='/contacts' render={() => this.userPropValidation(Contacts)} />
//         <Route exact path='/signup' render={() => (auth.loggedIn() ? (<Redirect to='/' />) : (<Signup />))} />
//         <Route exact path='/login' render={() => (auth.loggedIn() ? (<Redirect to='/' />) : (<Login />))} />
//         <Route exact path='/chat' render={() => this.userPropValidation(Chat)} />
//         <Route exact path='/settings' render={() => this.userPropValidation(Settings)} />
//       </Switch>

//     )
//   }
// }

// export default Main
