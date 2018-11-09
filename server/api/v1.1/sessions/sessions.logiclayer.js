exports.getQueryData = (type, purpose, match, skip, sort, limit, group) => {
  if (type === 'count') {
    return {
      purpose,
      match,
      group: { _id: null, count: { $sum: 1 } }
    }
  } else {
    return {
      purpose,
      match,
      group,
      skip,
      sort,
      limit
    }
  }
}

exports.getUpdateData = (purpose, match, updated, upsert, multi, neww) => {
  return {
    purpose,
    match,
    updated,
    upsert: upsert || false,
    multi: multi || false,
    new: neww || false
  }
}

exports.prepareSessionPayload = (subscriber, page) => {
  let payload = {
    subscriber_id: subscriber._id,
    page_id: page._id,
    company_id: page.companyId
  }

  return payload
}
exports.prepareUpdateSessionPayload = (lastActivityTime, status) => {
  let flag = true
  let temp = {}
  lastActivityTime ? temp.last_activity_time = lastActivityTime : flag = false
  status ? temp.status = status : flag = false
  return temp
}
exports.getSessions = (sessions) => {
  let tempSessions = []
  for (var i = 0; i < sessions.length; i++) {
    if (sessions[i].page_id && sessions[i].page_id.connected && sessions[i].subscriber_id && sessions[i].subscriber_id.isSubscribed) {
      tempSessions.push(sessions[i])
    }
  }
  return tempSessions
}
exports.getUnreadCount = (gotUnreadCount, session) => {
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
exports.getUnreadCountData = (gotUnreadCount, session) => {
  for (let i = 0; i < gotUnreadCount.length; i++) {
    if (session._id.toString() === gotUnreadCount[i].session_id.toString()) {
      session.set('unreadCount',
        gotUnreadCount[i].count,
        {strict: false})
    }
  }
  return session
}
exports.getLastMessage = (gotLastMessage, session) => {
  let sessions = session
  for (let a = 0; a < gotLastMessage.length; a++) {
    for (let b = 0; b < sessions.length; b++) {
      if (sessions[b]._id.toString() === gotLastMessage[a]._id.toString()) {
        console.log('condition matched')
        sessions[b].lastPayload = gotLastMessage[a].payload
        sessions[b].lastRepliedBy = gotLastMessage[a].replied_by
        sessions[b].lastDateTime = gotLastMessage[a].datetime
        console.log('sessions after set', sessions)
      }
    }
  }
  console.log('sessions to return', sessions)
  return sessions
}
exports.getLastMessageData = (gotLastMessage, session) => {
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
exports.getNewSessionsCriteria = (companyUser, body) => {
  let countCriteria = {
    company_id: companyUser.companyId,
    status: 'new'
  }

  let fetchCriteria = []

  let sortCriteria = {
    last_activity_time: -1
  }

  if (body.filter && body.filter_criteria.page_value !== '') {
    countCriteria = Object.assign(countCriteria, {page_id: body.filter_criteria.page_value})
  }

  if (body.filter) {
    sortCriteria = {
      last_activity_time: body.filter_criteria.sort_value
    }
  }

  if (!body.first_page) {
    countCriteria = Object.assign(countCriteria, {_id: {$gt: body.last_id}})
  }

  fetchCriteria = [
    { $match: countCriteria },
    { $sort: sortCriteria },
    { $limit: body.number_of_records }
  ]
  return {
    countCriteria,
    fetchCriteria
  }
}
exports.getResolvedSessionsCriteria = (companyUser, body) => {
  let countCriteria = {
    company_id: companyUser.companyId,
    status: 'resolved'
  }

  let fetchCriteria = []

  let sortCriteria = {
    request_time: 1
  }

  if (body.filter && body.filter_criteria.page_value !== '') {
    countCriteria = Object.assign(countCriteria, {page_id: body.filter_criteria.page_value})
  }

  if (body.filter) {
    sortCriteria = {
      request_time: body.filter_criteria.sort_value
    }
  }

  if (!body.first_page) {
    countCriteria = Object.assign(countCriteria, {_id: {$gt: body.last_id}})
  }

  fetchCriteria = [
    { $match: countCriteria },
    { $sort: sortCriteria },
    { $limit: body.number_of_records }
  ]

  return {
    countCriteria,
    fetchCriteria
  }
}
exports.prepareSessionsData = (sessionsData, body) => {
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
