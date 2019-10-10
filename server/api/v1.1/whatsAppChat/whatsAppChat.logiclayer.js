let config = require('./../../../config/environment')

exports.prepareChat = (body, companyUser) => {
  let MessageObject = {
    senderNumber: body.recipientNumber,
    recipientNumber: companyUser.companyId.twilioWhatsApp.sandboxNumber,
    contactId: body.contactId,
    companyId: companyUser.companyId._id,
    payload: body.payload,
    repliedBy: body.repliedBy
  }
  return MessageObject
}
exports.prepareSendMessagePayload = (body, companyUser, message) => {
  let MessageObject = {
    from: `whatsapp:${companyUser.companyId.twilioWhatsApp.sandboxNumber}`,
    to: `whatsapp:${body.recipientNumber}`,
    // statusCallback: `http://${config.webhook_ip}/webhooks/twilio/trackStatusWhatsAppChat/${message._id}`,
    statusCallback: `https://kibopush-anisha.ngrok.io/webhooks/twilio/trackStatusWhatsAppChat/${message._id}`

  }
  if (body.payload.componentType !== 'text') {
    MessageObject.mediaUrl = body.payload.fileurl.url
  } else {
    MessageObject.body = body.payload.text
  }
  return MessageObject
}
exports.getCount = (req, status) => {
  let aggregateData = [
    { $match: {'companyId': req.user.companyId} },
    { $project: {
      name: 1,
      companyId: 1,
      isSubscribed: 1,
      status: 1,
      pendingResponse: 1,
      unreadCount: 1} },
    { $match: {
      'isSubscribed': true,
      'status': status,
      'name': {$regex: '.*' + req.body.filter_criteria.search_value + '.*', $options: 'i'},
      'pendingResponse': req.body.filter_criteria.pendingResponse ? req.body.filter_criteria.pendingResponse : {$exists: true},
      'unreadCount': req.body.filter_criteria.unreadCount ? { $gt: 0 } : {$exists: true}
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
      unreadCount: 1} },
    { $sort: {last_activity_time: req.body.filter_criteria.sort_value} },
    { $match: {
      'isSubscribed': true,
      'status': status,
      'name': {$regex: '.*' + req.body.filter_criteria.search_value + '.*', $options: 'i'},
      'last_activity_time': req.body.first_page ? {$exists: true} : req.body.filter_criteria.sort_value === -1 ? {$lt: req.body.last_id} : {$gt: req.body.last_id},
      'pendingResponse': req.body.filter_criteria.pendingResponse ? req.body.filter_criteria.pendingResponse : {$exists: true},
      'unreadCount': req.body.filter_criteria.unreadCount ? { $gt: 0 } : {$exists: true}
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
