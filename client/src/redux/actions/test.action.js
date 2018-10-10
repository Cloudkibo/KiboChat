import * as ActionTypes from './../constants/constants'
import callApi from './../../utility/api.caller.service'

export function showTestMessage (data) {
  return {
    type: ActionTypes.TEST,
    message: data
  }
}

export function getTestMessage () {
  return (dispatch) => {
    callApi('v1/test').then(resp => {
      dispatch(showTestMessage(resp.payload))
    })
  }
}
