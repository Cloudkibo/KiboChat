const logger = require('../../../components/logger')
const TAG = '/api/v1/twilioEvents/controller.js'
const { callApi } = require('../utility')
const logicLayer = require('./logiclayer')
const { record } = require('../../global/messageStatistics')

exports.index = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  let messageData = logicLayer.getPayload(req.body.payload)
  if (messageData.length > 0) {
    let from = req.body.payload.From.substring(9)
    let to = req.body.payload.To.substring(9)
    callApi(`companyprofile/query`, 'post', {'twilioWhatsApp.accountSID': req.body.payload.AccountSid})
      .then(company => {
        callApi(`whatsAppContacts/query`, 'post', {number: from, companyId: company._id})
          .then(contact => {
            contact = contact[0]
            if (contact && (contact.isSubscribed || req.body.payload.Body.toLowerCase() === 'start')) {
              storeChat(from, to, contact, messageData)
            }
          })
          .catch(error => {
            const message = error || 'Failed to fetch contact'
            logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
          })
      })
      .catch(error => {
        const message = error || 'Failed to company profile'
        logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
      })
  }
}
function storeChat (from, to, contact, messageData) {
  // this function is not being called any more. See whatsappEvents folder
  record('whatsappChatInComing')
  for (let i = 0; i < messageData.length; i++) {
    logicLayer.prepareChat(from, to, contact, messageData[i]).then(chatPayload => {
      callApi(`whatsAppChat`, 'post', chatPayload, 'kibochat')
        .then(message => {
          message.payload.format = 'twilio'
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
}

// eslint-disable-next-line no-unused-vars
function handleUnsubscribe (contact, company, user) {
  let accountSid = company.twilioWhatsApp.accountSID
  let authToken = company.twilioWhatsApp.authToken
  let client = require('twilio')(accountSid, authToken)
  let unsubscribeMessage = 'You have unsubscribed from our broadcasts. Send "start" to subscribe again'
  client.messages
    .create({
      body: unsubscribeMessage,
      from: `whatsapp:${company.twilioWhatsApp.sandboxNumber}`,
      to: `whatsapp:${contact.number}`
    })
    .then(response => {
    })
    .catch(error => {
      const message = error || 'error at sending message'
      logger.serverLog(message, `${TAG}: exports.handleUnsubscribe`, {}, {contact, company, user}, 'error')
    })
  let message = {
    senderNumber: company.twilioWhatsApp.sandboxNumber,
    recipientNumber: company.twilioWhatsApp.sandboxNumber,
    contactId: contact._id,
    companyId: company._id,
    payload: {componentType: 'text', text: unsubscribeMessage},
    repliedBy: {
      id: user._id,
      name: user.name,
      type: 'agent'
    }
  }
  callApi(`whatsAppChat`, 'post', message, 'kibochat')
    .then(message => {
      let subscriberData = {
        query: {_id: contact._id},
        newPayload: {last_activity_time: Date.now(), isSubscribed: false},
        options: {}
      }
      callApi(`whatsAppContacts/update`, 'put', subscriberData)
        .then(updated => {
        })
        .catch(error => {
          const message = error || 'Failed to update contact'
          logger.serverLog(message, `${TAG}: exports.handleUnsubscribe`, {}, {contact, company, user}, 'error')
        })
    })
}

// eslint-disable-next-line no-unused-vars
function handleSubscribe (contact, company, user) {
  let accountSid = company.twilioWhatsApp.accountSID
  let authToken = company.twilioWhatsApp.authToken
  let client = require('twilio')(accountSid, authToken)
  let subscribeMessage = 'Thank you for subscribing again.'
  client.messages
    .create({
      body: subscribeMessage,
      from: `whatsapp:${company.twilioWhatsApp.sandboxNumber}`,
      to: `whatsapp:${contact.number}`
    })
    .then(response => {
    })
    .catch(error => {
      const message = error || 'error at sending message'
      logger.serverLog(message, `${TAG}: exports.handleSubscribe`, {}, {contact, company, user}, 'error')
    })
  let message = {
    senderNumber: company.twilioWhatsApp.sandboxNumber,
    recipientNumber: company.twilioWhatsApp.sandboxNumber,
    contactId: contact._id,
    companyId: company._id,
    payload: {componentType: 'text', text: subscribeMessage},
    repliedBy: {
      id: user._id,
      name: user.name,
      type: 'agent'
    }
  }
  callApi(`whatsAppChat`, 'post', message, 'kibochat')
    .then(message => {
      let subscriberData = {
        query: {_id: contact._id},
        newPayload: {last_activity_time: Date.now(), isSubscribed: true},
        options: {}
      }
      callApi(`whatsAppContacts/update`, 'put', subscriberData)
        .then(updated => {
        })
        .catch(error => {
          const message = error || 'Failed to update contact'
          logger.serverLog(message, `${TAG}: exports.handleSubscribe`, {}, {contact, company, user}, 'error')
        })
    })
}
function updateWhatsAppContact (query, bodyForUpdate, bodyForIncrement, options) {
  callApi(`whatsAppContacts/update`, 'put', {query: query, newPayload: bodyForUpdate, options: options})
    .then(updated => {
    })
    .catch(error => {
      const message = error || 'Failed to update contact'
      logger.serverLog(message, `${TAG}: exports.updateWhatsAppContact`, {}, {query, bodyForUpdate, bodyForIncrement, options}, 'error')
    })
  callApi(`whatsAppContacts/update`, 'put', {query: query, newPayload: bodyForIncrement, options: options})
    .then(updated => {
    })
    .catch(error => {
      const message = error || 'Failed to update contact'
      logger.serverLog(message, `${TAG}: exports.updateWhatsAppContact`, {}, {query, bodyForUpdate, bodyForIncrement, options}, 'error')
    })
}
exports.trackStatusWhatsAppChat = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  if (req.body.MessageStatus === 'read' && req.body.EventType && req.body.EventType === 'READ') {
    let query = {
      purpose: 'updateOne',
      match: {_id: req.params.id},
      updated: {$set: {status: 'seen', seenDateTime: Date.now()}}
    }
    callApi(`whatsAppChat`, 'put', query, 'kibochat')
      .then(updated => {
        let findQuery = {
          purpose: 'findOne',
          match: {_id: req.params.id}
        }
        callApi(`whatsAppChat/query`, 'post', findQuery, 'kibochat')
          .then(chat => {
            require('./../../../config/socketio').sendMessageToClient({
              room_id: chat.companyId,
              body: {
                action: 'whatsapp_message_seen',
                payload: chat
              }
            })
          })
      })
      .catch(err => {
        const message = err || 'Failed to update contact'
        logger.serverLog(message, `${TAG}: exports.trackStatusWhatsAppChat`, req.body, {user: req.user, params: req.params}, 'error')
      })
  }
}
