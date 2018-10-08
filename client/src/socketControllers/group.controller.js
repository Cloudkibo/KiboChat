import * as GroupActions from './../redux/actions/groups.actions'
import { storeDispatcher } from './../utility/socketio'

export const handleGroupNotifications = (payload) => {
  // if (payload.type === 'system') { handleSystemMessage(payload) }
}

const handleSystemMessage = (payload) => {
  console.log('New System Message Received', payload)
  // GroupActions.addNewParticipant(storeDispatcher(), payload)
}
