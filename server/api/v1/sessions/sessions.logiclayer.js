const prepareSessionPayload = (subscriber, page) => {
  let payload = {
    subscriber_id: subscriber._id,
    page_id: page._id,
    company_id: page.companyId
  }

  return payload
}
const prepareUpdateSessionPayload = (lastActivityTime, status) => {
  let flag = true
  let temp = {}
  lastActivityTime ? temp.last_activity_time = lastActivityTime : flag = false
  status ? temp.status = status : flag = false
  return temp
}
const getSessions = (sessions) => {
  let tempSessions = []
  for (var i = 0; i < sessions.length; i++) {
    if (sessions[i].page_id && sessions[i].page_id.connected && sessions[i].subscriber_id && sessions[i].subscriber_id.isSubscribed) {
      tempSessions.push(sessions[i])
    }
  }
  return tempSessions
}
const getUnreadCount = (gotUnreadCount, session) => {
  let sessions = session
  for (let i = 0; i < gotUnreadCount.length; i++) {
    for (let j = 0; j < sessions.length; j++) {
      if (sessions[j]._id.toString() === gotUnreadCount[i]._id.toString()) {
        sessions[j].set('unreadCount',
          gotUnreadCount[i].count,
          {strict: false})
      }
    }
  }
  return sessions
}
const getLastMessage = (gotLastMessage, session) => {
  let sessions = session
  for (let a = 0; a < gotLastMessage.length; a++) {
    for (let b = 0; b < sessions.length; b++) {
      if (sessions[b]._id.toString() === gotLastMessage[a]._id.toString()) {
        sessions[b].set('lastPayload',
          gotLastMessage[a].payload,
          {strict: false})
        sessions[b].set('lastRepliedBy',
          gotLastMessage[a].replied_by,
          {strict: false})
        sessions[b].set('lastDateTime',
          gotLastMessage[a].datetime,
          {strict: false})
      }
    }
  }
  return sessions
}

exports.getLastMessage = getLastMessage
exports.getUnreadCount = getUnreadCount
exports.getSessions = getSessions
exports.prepareSessionPayload = prepareSessionPayload
exports.prepareUpdateSessionPayload = prepareUpdateSessionPayload
