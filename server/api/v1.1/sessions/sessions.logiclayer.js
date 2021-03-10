// const util = require('util')

exports.getCount = (req, status, company) => {
  let matchBody = {'companyId': req.user.companyId, completeInfo: true}
  if (company.hideChatSessions) {
    matchBody.messagesCount = { $gt: 0 }
  }
  let aggregateData = [
    { $match: matchBody },
    { $lookup: {from: 'pages', localField: 'pageId', foreignField: '_id', as: 'pageId'} },
    { $unwind: '$pageId' },
    { $project: {
      name: {$concat: ['$firstName', ' ', '$lastName']},
      companyId: 1,
      pageId: 1,
      isSubscribed: 1,
      status: 1,
      pendingResponse: 1,
      unreadCount: 1} },
    { $match: {
      'isSubscribed': true,
      'status': status,
      'name': {$regex: '.*' + req.body.filter_criteria.search_value + '.*', $options: 'i'},
      'pageId._id': req.body.filter_criteria.page_value !== '' ? req.body.filter_criteria.page_value : {$exists: true},
      'pageId.connected': true,
      'pendingResponse': req.body.filter_criteria.pendingResponse ? req.body.filter_criteria.pendingResponse : {$exists: true},
      'unreadCount': req.body.filter_criteria.unreadMessages ? { $gt: 0 } : {$exists: true}
    } },
    { $group: {_id: null, count: { $sum: 1 }} }
  ]
  return aggregateData
}

exports.getSessions = (req, status, company) => {
  let matchBody = {'companyId': req.user.companyId, completeInfo: true}
  if (company.hideChatSessions) {
    matchBody.messagesCount = { $gt: 0 }
  }
  let aggregateData = [
    { $match: matchBody },
    { $lookup: {from: 'pages', localField: 'pageId', foreignField: '_id', as: 'pageId'} },
    { $unwind: '$pageId' },
    { $project: {
      name: {$concat: ['$firstName', ' ', '$lastName']},
      companyId: 1,
      pageId: 1,
      isSubscribed: 1,
      status: 1,
      chatbotPaused: 1,
      last_activity_time: 1,
      _id: 1,
      profilePic: 1,
      senderId: 1,
      gender: 1,
      locale: 1,
      is_assigned: 1,
      assigned_to: 1,
      lastMessagedAt: 1,
      pendingResponse: 1,
      waitingForUserInput: 1,
      messagesCount: 1,
      unreadCount: 1} },
    { $sort: {last_activity_time: req.body.filter_criteria.sort_value} },
    { $match: {
      'isSubscribed': true,
      'status': status,
      'name': {$regex: '.*' + req.body.filter_criteria.search_value + '.*', $options: 'i'},
      'pageId._id': req.body.filter_criteria.page_value !== '' ? req.body.filter_criteria.page_value : {$exists: true},
      'pageId.connected': true,
      'last_activity_time': req.body.first_page ? {$exists: true} : req.body.filter_criteria.sort_value === -1 ? {$lt: req.body.last_id} : {$gt: req.body.last_id},
      'pendingResponse': req.body.filter_criteria.pendingResponse ? req.body.filter_criteria.pendingResponse : {$exists: true},
      'unreadCount': req.body.filter_criteria.unreadMessages ? { $gt: 0 } : {$exists: true}
    } },
    { $limit: req.body.number_of_records }
  ]
  return aggregateData
}

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
// exports.getSessions = (sessions) => {
//   let tempSessions = []
//   for (var i = 0; i < sessions.length; i++) {
//     if (sessions[i].page_id && sessions[i].page_id.connected && sessions[i].subscriber_id && sessions[i].subscriber_id.isSubscribed) {
//       tempSessions.push(sessions[i])
//     }
//   }
//   return tempSessions
// }
exports.putUnreadCount = (gotUnreadCount, subscribers) => {
  let temp = []
  for (let i = 0; i < subscribers.length; i++) {
    temp.push(appendUnreadCountData(gotUnreadCount, subscribers[i]))
  }
  return temp
}
exports.putLastMessage = (gotLastMessage, subscribers) => {
  let temp = []
  for (let i = 0; i < subscribers.length; i++) {
    temp.push(appendLastMessageData(gotLastMessage, subscribers[i]))
  }
  return temp
}
const appendUnreadCountData = (gotUnreadCount, subscriber) => {
  for (let i = 0; i < gotUnreadCount.length; i++) {
    if (subscriber._id.toString() === gotUnreadCount[i]._id.toString()) {
      subscriber.unreadCount = gotUnreadCount[i].count
      break
    }
  }
  return subscriber
}
const appendLastMessageData = (gotLastMessage, subscriber) => {
  for (let a = 0; a < gotLastMessage.length; a++) {
    if (subscriber._id.toString() === gotLastMessage[a]._id.toString()) {
      subscriber.lastPayload = gotLastMessage[a].payload
      subscriber.lastRepliedBy = gotLastMessage[a].replied_by
      subscriber.lastDateTime = gotLastMessage[a].datetime
      break
    }
  }
  return subscriber
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

exports.payloadForSingleSession = (req, status) => {
  let aggregateData = [
    { $match: {'companyId': req.user.companyId, 'completeInfo': true, 'senderId': req.body.psid} },
    { $lookup: {from: 'pages', localField: 'pageId', foreignField: '_id', as: 'pageId'} },
    { $unwind: '$pageId' },
    { $project: {
      name: {$concat: ['$firstName', ' ', '$lastName']},
      firstName: 1,
      lastName: 1,
      companyId: 1,
      pageId: 1,
      isSubscribed: 1,
      status: 1,
      last_activity_time: 1,
      _id: 1,
      profilePic: 1,
      senderId: 1,
      gender: 1,
      locale: 1,
      is_assigned: 1,
      assigned_to: 1,
      lastMessagedAt: 1,
      pendingResponse: 1,
      waitingForUserInput: 1,
      messagesCount: 1,
      unreadCount: 1} },
    { $match: {'isSubscribed': true, 'pageId.connected': true} }
  ]
  return aggregateData
}

exports.appendUnreadCountData = appendUnreadCountData
exports.appendLastMessageData = appendLastMessageData
