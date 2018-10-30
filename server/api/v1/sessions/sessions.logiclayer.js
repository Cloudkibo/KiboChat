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
const getUnreadCountData = (gotUnreadCount, session) => {
  for (let i = 0; i < gotUnreadCount.length; i++) {
    if (session._id.toString() === gotUnreadCount[i].session_id.toString()) {
      session.set('unreadCount',
        gotUnreadCount[i].count,
        {strict: false})
    }
  }
  return session
}
const getLastMessage = (gotLastMessage, session) => {
  let sessions = session
  for (let a = 0; a < gotLastMessage.length; a++) {
    for (let b = 0; b < sessions.length; b++) {
      if (sessions[b]._id.toString() === gotLastMessage[a]._id.toString()) {
        console.log('condition matched')
        sessions[b].set('lastPayload',
          gotLastMessage[a].payload,
          {strict: false})
        sessions[b].set('lastRepliedBy',
          gotLastMessage[a].replied_by,
          {strict: false})
        sessions[b].set('lastDateTime',
          gotLastMessage[a].datetime,
          {strict: false})
        console.log('sessions after set', sessions)
      }
    }
  }
  console.log('sessions to return', sessions)
  return sessions
}
const getLastMessageData = (gotLastMessage, session) => {
  for (let a = 0; a < gotLastMessage.length; a++) {
    if (session._id.toString() === gotLastMessage[a]._id.toString()) {
      session.set('lastPayload',
        gotLastMessage[a].payload,
        {strict: false})
      session.set('lastRepliedBy',
        gotLastMessage[a].replied_by,
        {strict: false})
      session.set('lastDateTime',
        gotLastMessage[a].datetime,
        {strict: false})
    }
  }
  return session
}
const getNewSessionsCriteria = (companyUser, body) => {
  let countCriteria = {
    company_id: companyUser.companyId,
    status: 'new'
  }
  let fetchCriteria
  if (body.filter && body.filter_criteria.page_value !== '') {
    countCriteria = Object.assign(countCriteria, {page_id: body.filter_criteria.page_value})
  }
  if (!body.first_page) {
    countCriteria = Object.assign(countCriteria, {_id: {$gt: body.last_id}})
  }
  if (body.filter) {
    fetchCriteria = [
      { $match: countCriteria },
      { $sort: {last_activity_time: 1} },
      { $limit: body.number_of_records }
    ]
  } else {
    fetchCriteria = [
      { $match: countCriteria },
      { $sort: {last_activity_time: -1} },
      { $limit: body.number_of_records }
    ]
  }
  return {
    countCriteria,
    fetchCriteria
  }
}
const getResolvedSessionsCriteria = (companyUser, body) => {
  let countCriteria = {
    company_id: companyUser.companyId,
    status: 'resolved'
  }
  let fetchCriteria
  if (body.filter && body.filter_criteria.page_value !== '') {
    countCriteria = Object.assign(countCriteria, {page_id: body.filter_criteria.page_value})
  }
  if (!body.first_page) {
    countCriteria = Object.assign(countCriteria, {_id: {$gt: body.last_id}})
  }
  if (body.filter) {
    fetchCriteria = [
      { $match: countCriteria },
      { $sort: {request_time: 1} },
      { $limit: body.number_of_records }
    ]
  } else {
    fetchCriteria = [
      { $match: countCriteria },
      { $sort: {request_time: -1} },
      { $limit: body.number_of_records }
    ]
  }
  return {
    countCriteria,
    fetchCriteria
  }
}
const prepareSessionsData = (sessionsData, body) => {
  let tempSessionsData = []
  for (var a = 0; a < sessionsData.length; a++) {
    let fullName = ''
    if (sessionsData[a] && sessionsData[a].subscriber_id) {
      fullName = sessionsData[a].subscriber_id.firstName + ' ' + sessionsData[a].subscriber_id.lastName
    }
    if (sessionsData[a].page_id && sessionsData[a].page_id.connected && sessionsData[a].subscriber_id &&
      sessionsData[a].subscriber_id.isSubscribed && ((body.filter_criteria.search_value !== '' && fullName.toLowerCase().includes(body.filter_criteria.search_value)) || body.filter_criteria.search_value === '')) {
      tempSessionsData.push(sessionsData[a])
    }
  }
  return tempSessionsData
}
const unreadCountCriteria = (companyUser) => {
  return [
    {$match: {company_id: companyUser.companyId.toString(), status: 'unseen', format: 'facebook'}},
    {$sort: { datetime: 1 }}
  ]
}
const lastMessageCriteria = (subscriber, page) => {
  return [
    {$sort: { datetime: 1 }},
    {$group: {_id: '$session_id', payload: { $last: '$payload' }, replied_by: { $last: '$replied_by' }, datetime: { $last: '$datetime' }}}
  ]
}
exports.lastMessageCriteria = lastMessageCriteria
exports.unreadCountCriteria = unreadCountCriteria
exports.getLastMessageData = getLastMessageData
exports.getUnreadCountData = getUnreadCountData
exports.getResolvedSessionsCriteria = getResolvedSessionsCriteria
exports.prepareSessionsData = prepareSessionsData
exports.getNewSessionsCriteria = getNewSessionsCriteria
exports.getLastMessage = getLastMessage
exports.getUnreadCount = getUnreadCount
exports.getSessions = getSessions
exports.prepareSessionPayload = prepareSessionPayload
exports.prepareUpdateSessionPayload = prepareUpdateSessionPayload
