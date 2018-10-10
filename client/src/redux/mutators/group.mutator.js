/*  This file always receive the current state and new payload from reducer
    and will modify it according to requirement. Just keeping it for demonstratin purposes
 */
const _ = require('lodash')
export const makeAdmin = (currentState, payload) => {
  console.log('Payload', payload, currentState)
  const waIds = payload.waIds
  let newParticipants = JSON.parse(JSON.stringify(currentState.participants))
  newParticipants = _.map(newParticipants, (item) => {
    if (_.includes(waIds, item.wa_id)) { item.admin = true }
    return item
  })
  console.log('newParticipants', newParticipants)
  return newParticipants
}

export const deleteAdmin = (currentState, payload) => {
  console.log('Payload', payload, currentState)
  const waIds = payload.waIds
  let newParticipants = JSON.parse(JSON.stringify(currentState.participants))
  newParticipants = _.map(newParticipants, (item) => {
    if (_.includes(waIds, item.wa_id)) { item.admin = false }
    return item
  })
  console.log('newParticipants', newParticipants)
  return newParticipants
}
