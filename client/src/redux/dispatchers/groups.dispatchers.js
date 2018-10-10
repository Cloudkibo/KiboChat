import * as ActionTypes from '../constants/constants'

export function showGroups (data) {
  return {
    type: ActionTypes.FETCH_GROUPS_LIST,
    data
  }
}
export function showGroupsInfo (data) {
  return {
    type: ActionTypes.FETCH_GROUPS_INFO,
    data
  }
}
export function createdGroup (data) {
  return {
    type: ActionTypes.FETCH_CREATED_GROUP,
    data
  }
}
export function showParticipants (data) {
  console.log('Get Particpant Details From Ids', data)
  return {
    type: ActionTypes.FETCH_PARTICIPANTS_LIST,
    data
  }
}
export function setInviteLink (data) {
  return {
    type: ActionTypes.GROUP_INVITE_LINK,
    data
  }
}
export function updateGroupAdmin (data) {
  return {
    type: ActionTypes.UPDATE_GROUP_ADMIN,
    data
  }
}
export function demoteGroupAdmin (data) {
  return {
    type: ActionTypes.DEMOTE_GROUP_ADMIN,
    data
  }
}
export function deleteParticipants (data) {
  return {
    type: ActionTypes.DELETE_GROUP_PARTICIPANTS,
    data
  }
}
export function newParticipant (data) {
  return {
    type: ActionTypes.ADD_GROUP_PARTICIPANTS,
    data
  }
}
