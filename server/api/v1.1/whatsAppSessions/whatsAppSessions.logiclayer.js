exports.getCount = (req, status) => {
  let aggregateData = [
    { $match: {'companyId': req.user.companyId} },
    { $project: {
      name: 1,
      number: 1,
      companyId: 1,
      isSubscribed: 1,
      status: 1,
      pendingResponse: 1,
      lastMessagedAt: 1,
      unreadCount: 1} },
    { $match: {
      'isSubscribed': true,
      'status': status,
      'name': {$regex: '.*' + req.body.filter_criteria.search_value + '.*', $options: 'i'},
      'pendingResponse': req.body.filter_criteria.pendingResponse ? req.body.filter_criteria.pendingResponse : {$exists: true},
      'unreadCount': req.body.filter_criteria.unreadMessages ? { $gt: 0 } : {$exists: true}
    } },
    { $group: {_id: null, count: { $sum: 1 }} }
  ]
  return aggregateData
}

exports.getSessions = (req, status) => {
  let aggregateData = [
    { $match: {'companyId': req.user.companyId} },
    { $project: {
      name: 1,
      number: 1,
      companyId: 1,
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
      pendingResponse: 1,
      lastMessagedAt: 1,
      whatsAppId: 1,
      chatbotPaused: 1,
      unreadCount: 1} },
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
exports.putLastMessage = (gotLastMessage, subscribers) => {
  let temp = []
  for (let i = 0; i < subscribers.length; i++) {
    temp.push(appendLastMessageData(gotLastMessage, subscribers[i]))
  }
  return temp
}

const appendLastMessageData = (gotLastMessage, subscriber) => {
  for (let a = 0; a < gotLastMessage.length; a++) {
    if (subscriber._id.toString() === gotLastMessage[a]._id.toString()) {
      subscriber.lastPayload = gotLastMessage[a].payload
      subscriber.lastPayload.format = gotLastMessage[a].format
      subscriber.lastRepliedBy = gotLastMessage[a].repliedBy
      subscriber.lastDateTime = gotLastMessage[a].datetime
    }
  }
  return subscriber
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
