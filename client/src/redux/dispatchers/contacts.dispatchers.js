/*  This file always contains the dispatcher calls to redux store
    and can only be called from actions to separate the concerns from API calls.
 */
import * as ActionTypes from '../constants/constants'

export function showContacts (data) {
  return {
    type: ActionTypes.FETCH_CONTACTS_LIST,
    data
  }
}
