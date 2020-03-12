exports.prepareChat = (body, companyUser) => {
  let MessageObject = {
    senderNumber: body.senderNumber,
    recipientNumber: body.recipientNumber,
    contactId: body.contactId,
    companyId: companyUser.companyId._id,
    payload: body.payload,
    repliedBy: body.repliedBy,
    status: 'seen'
  }
  return MessageObject
}
exports.getCount = (req, status) => {
  let aggregateData = [
    { $match: {
      'companyId': req.user.companyId,
      'hasChat': true,
      'isSubscribed': true,
      'name': {$regex: '.*' + req.body.filter_criteria.search_value + '.*', $options: 'i'},
      'status': status,
      'pendingResponse': req.body.filter_criteria && req.body.filter_criteria.pendingResponse ? req.body.filter_criteria.pendingResponse : {$exists: true},
      'unreadCount': req.body.filter_criteria && req.body.filter_criteria.unreadMessages ? { $gt: 0 } : {$exists: true}
    } },
    { $group: {_id: null, count: { $sum: 1 }} }
  ]
  return aggregateData
}
exports.getSessions = (req, status) => {
  let aggregateData = [
    { $match: {'companyId': req.user.companyId} },
    { $sort: {last_activity_time: req.body.filter_criteria.sort_value} },
    { $match: {
      'isSubscribed': true,
      'status': status,
      'name': {$regex: '.*' + req.body.filter_criteria.search_value + '.*', $options: 'i'},
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
    }
  }
  return subscriber
}
const appendLastMessageData = (gotLastMessage, subscriber) => {
  for (let a = 0; a < gotLastMessage.length; a++) {
    if (subscriber._id.toString() === gotLastMessage[a]._id.toString()) {
      subscriber.lastPayload = gotLastMessage[a].payload
      subscriber.lastRepliedBy = gotLastMessage[a].repliedBy
      subscriber.lastDateTime = gotLastMessage[a].datetime
    }
  }
  return subscriber
}
exports.setChatProperties = (fbchats) => {
  for (var i = 0; i < fbchats.length; i++) {
    fbchats[i].lastPayload = fbchats[fbchats.length - 1].payload
    fbchats[i].lastRepliedBy = fbchats[fbchats.length - 1].repliedBy
    fbchats[i].lastDateTime = fbchats[fbchats.length - 1].datetime
  }
  return fbchats
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
