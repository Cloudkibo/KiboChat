import * as ActionTypes from '../constants/constants'

let initialState = {
  contactsList: []
}

export function contactsReducer (state = initialState, action) {
  switch (action.type) {
    case ActionTypes.FETCH_CONTACTS_LIST:
      return Object.assign({}, state, {
        contactsList: action.data
      })

    default:
      return state
  }
}
