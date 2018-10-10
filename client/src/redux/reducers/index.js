// Keeping this file just for the demonstration purposes
// Modify it according to your socket notification type
import { combineReducers } from 'redux'

// Import reducers files here
import { testReducer } from './test.reducer'
import { contactsReducer } from './contacts.reducer'

// Make a app reducer
const appReducer = combineReducers({
  testReducer,
  contactsReducer,
})

export default appReducer
