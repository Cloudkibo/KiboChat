// Import the Socket controller relevant to your module and pass the payload
import { handleGroupNotifications } from './group.controller'

export const init = (payload) => {
  handleGroupNotifications(payload)
  // handleMessageStatus(payload)
}
