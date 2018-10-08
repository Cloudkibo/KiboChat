import * as groupDispatcher from '../dispatchers/groups.dispatchers'
import callApi from '../../utility/api.caller.service'
export const API_URL = '/api'

export function loadGroupsList () {
  return (dispatch) => {
    callApi('v1/groups').then(res => dispatch(groupDispatcher.showGroups(res.payload)))
  }
}

export function deleteAdmin (groupId, waIds) {
  return (dispatch) => {
    callApi(`v1/groups/${groupId}/admins`, 'delete', {wa_ids: waIds})
      .then(res => {
        console.log('Reponse From Action', res)
        if (res.status === 'success') {
          dispatch(groupDispatcher.demoteGroupAdmin({groupId, waIds}))
          console.log('Demoted from Admin Successfully')
        }
      })
  }
}

// These actions are called from socket controller.
export function addNewParticipant (dispatcher, data) {
  // dispatcher(groupDispatcher.newParticipant(data))
  // We need to update the participant array as well
}
