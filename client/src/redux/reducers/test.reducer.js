import * as ActionTypes from '../constants/constants'

export function testReducer (state = {}, action) {
  switch (action.type) {
    case ActionTypes.TEST:
      return Object.assign({}, state, {
        serverMessage: action.message
      })

    default:
      return state
  }
}
