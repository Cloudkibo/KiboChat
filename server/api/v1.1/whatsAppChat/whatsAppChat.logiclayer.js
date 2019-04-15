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
    statusCallback: config.webhook_ip + `/webhooks/twilio/trackStatusWhatsAppChat/${message._id}`
  }
  if (body.payload.componentType !== 'text') {
    MessageObject.mediaUrl = body.payload.fileurl.url
  } else {
    MessageObject.body = body.payload.text
  }
  return MessageObject
}
exports.getCount = (req) => {
  let aggregateData = [
    { $match: {
      'companyId': req.user.companyId,
      'hasChat': true,
      'number': {$regex: '.*' + req.body.filter_criteria.search_value + '.*', $options: 'i'}
    } },
    { $group: {_id: null, count: { $sum: 1 }} }
  ]
  return aggregateData
}
exports.getSessions = (req) => {
  let aggregateData = [
    { $match: {
      'companyId': req.user.companyId,
      'hasChat': true,
      'number': {$regex: '.*' + req.body.filter_criteria.search_value + '.*', $options: 'i'},
      '_id': req.body.first_page ? {$exists: true} : {$gt: req.body.last_id}
    } },
    { $sort: {last_activity_time: req.body.filter_criteria.sort_value} }
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
