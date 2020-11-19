const { callApi } = require('../utility')
const logicLayer = require('./logiclayer')
const logger = require('../../../components/logger')
const TAG = '/api/v1.1/flockSendEvents/controller.js'

exports.index = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  let messageData = logicLayer.getPayload(req.body)
  let number = `+${req.body.phone_number}`
  if (messageData.constructor === Object && Object.keys(messageData).length > 0) {
    let query = [
      {$match: {'flockSendWhatsApp.accessToken': req.body.user_id}}
    ]
    callApi(`companyprofile/aggregate`, 'post', query)
      .then(companies => {
        companies.forEach((company) => {
          callApi(`whatsAppContacts/query`, 'post', {number: number, companyId: company._id})
            .then(contact => {
              contact = contact[0]
              if (contact && contact.isSubscribed) {
                storeChat(number, company.flockSendWhatsApp.number, contact, messageData)
              }
            })
            .catch(error => {
              const message = error || 'Failed to fetch contact'
              return logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
            })
        })
      })
      .catch(error => {
        const message = error || 'Failed to fetch company profile'
        return logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
      })
  }
}
function storeChat (from, to, contact, messageData) {
  logicLayer.prepareChat(from, to, contact, messageData).then(chatPayload => {
    callApi(`whatsAppChat`, 'post', chatPayload, 'kibochat')
      .then(message => {
        message.payload.format = 'whatsApp'
        require('./../../../config/socketio').sendMessageToClient({
          room_id: contact.companyId,
          body: {
            action: 'new_chat_whatsapp',
            payload: {
              subscriber_id: contact._id,
              chat_id: message._id,
              text: message.payload.text,
              name: contact.name,
              subscriber: contact,
              message: message
            }
          }
        })
        let query = {_id: contact._id}
        let updatePayload = {last_activity_time: Date.now(), status: 'new', pendingResponse: true, lastMessagedAt: Date.now()}
        let incrementPayload = {$inc: { unreadCount: 1, messagesCount: 1 }}
        updateWhatsAppContact(query, updatePayload, incrementPayload, {})
      })
  })
}
function updateWhatsAppContact (query, bodyForUpdate, bodyForIncrement, options) {
  callApi(`whatsAppContacts/update`, 'put', {query: query, newPayload: bodyForUpdate, options: options})
    .then(updated => {
    })
    .catch(error => {
      const message = error || 'Failed to update contact'
      return logger.serverLog(message, `${TAG}: exports.updateWhatsAppContact`, {}, {query, bodyForUpdate, bodyForIncrement, options}, 'error')
    })
  callApi(`whatsAppContacts/update`, 'put', {query: query, newPayload: bodyForIncrement, options: options})
    .then(updated => {
    })
    .catch(error => {
      const message = error || 'Failed to update contact'
      return logger.serverLog(message, `${TAG}: exports.updateWhatsAppContact`, {}, {query, bodyForUpdate, bodyForIncrement, options}, 'error')
    })
}
exports.messageStatus = function (req, res) {
  console.log('messageStatus', req.body)
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  if (req.body.status === 'delivered' || req.body.status === 'seen') {
    let query = {
      purpose: 'findOne',
      match: {messageId: req.body.id}
    }
    callApi(`whatsAppChat/query`, 'post', query, 'kibochat')
      .then(message => {
        if (message) {
          updateChat(message, req.body)
        }
      })
      .catch((err) => {
        const message = err || 'Failed to fetch whatsAppBroadcastMessages data'
        return logger.serverLog(message, `${TAG}: exports.messageStatus`, req.body, {user: req.user}, 'error')
      })
  }
}
function updateChat (message, body) {
  let dateTime = Date.now()
  let matchQuery = {
    $or: [
      {_id: message._id},
      {_id: {$lt: message._id}}
    ],
    format: 'convos',
    contactId: message.contactId
  }
  if (body.status === 'delivered') {
    matchQuery.$or = [
      {delivered: false},
      {delivered: {$exists: false}}
    ]
  } else {
    matchQuery.$or = [
      {seen: false},
      {seen: {$exists: false}}
    ]
  }
  let updated = body.status === 'delivered'
    ? {delivered: true, deliveryDateTime: dateTime}
    : {seen: true, seenDateTime: dateTime}
  let dataToSend = {
    action: body.status === 'delivered' ? 'message_delivered_whatsApp' : 'message_seen_whatsApp',
    payload: {
      message: message
    }
  }
  if (body.status === 'delivered') {
    dataToSend.payload.message.delivered = true
    dataToSend.payload.message.deliveredDateTime = dateTime
    dataToSend.payload.message.action = 'message_delivered_whatsApp'
  } else {
    dataToSend.payload.message.seen = true
    dataToSend.payload.message.seenDateTime = dateTime
    dataToSend.payload.message.action = 'message_seen_whatsApp'
  }
  updateChatInDB(matchQuery, updated, dataToSend)
}

function updateChatInDB (match, updated, dataToSend) {
  let updateData = {
    purpose: 'updateAll',
    match: match,
    updated: updated
  }
  callApi(`whatsAppChat`, 'put', updateData, 'kibochat')
    .then(updated => {
      require('./../../../config/socketio').sendMessageToClient({
        room_id: dataToSend.payload.message.companyId,
        body: dataToSend
      })
    })
    .catch((err) => {
      const message = err || 'Failed to update message'
      return logger.serverLog(message, `${TAG}: exports.updateChatInDB`, {}, {match, updated, dataToSend}, 'error')
    })
}
