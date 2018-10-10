
import * as contactDispatcher from '../dispatchers/contacts.dispatchers'
import callApi from '../../utility/api.caller.service'
export const API_URL = '/api'

export function loadContactsList () {
  return (dispatch) => {
    callApi('v1/contacts')
      .then(res => dispatch(contactDispatcher.showContacts(res.payload)))
  }
}
