const logger = require('../../../components/logger')
const TAG = '/api/v1/twilioEvents/controller.js'
const { callApi } = require('../utility')
const logicLayer = require('./logiclayer')

exports.index = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  let from = req.body.From.substring(9)
  let to = req.body.To.substring(9)
  callApi(`companyprofile/query`, 'post', {'twilioWhatsApp.accountSID': req.body.AccountSid})
    .then(company => {
      callApi(`whatsAppContacts/query`, 'post', {number: from, companyId: company._id})
        .then(contact => {
          if (contact.length > 0) {
            contact = contact[0]
            if (contact.isSubscribed || req.body.Body.toLowerCase() === 'start') {
              storeChat(from, to, req.body, contact, company)
            }
          } else {
            callApi(`whatsAppContacts`, 'post', {
              name: from,
              number: from,
              companyId: company._id})
              .then(contact => {
                storeChat(from, to, req.body, contact, company)
              })
          }
        })
        .catch(error => {
          logger.serverLog(TAG, `Failed to fetch contact ${JSON.stringify(error)}`, 'error')
        })
    })
    .catch(error => {
      logger.serverLog(TAG, `Failed to company profile ${JSON.stringify(error)}`, 'error')
    })
}
function storeChat (from, to, body, contact, company) {
  callApi(`user/query`, 'post', {_id: company.ownerId})
    .then(user => {
      user = user[0]
      let messageData = logicLayer.prepareChat(from, to, body, contact)
      callApi(`whatsAppChat`, 'post', messageData.messageObject, 'kibochat')
        .then(message => {
          require('./../../../config/socketio').sendMessageToClient({
            room_id: contact.companyId,
            body: {
              action: 'new_chat_whatsapp',
              payload: message
            }
          })
          let query = {_id: contact._id}
          let updatePayload = {last_activity_time: Date.now(), status: 'new', pendingResponse: true}
          let incrementPayload = {$inc: { unreadCount: 1, messagesCount: 1 }}
          updateWhatsAppContact(query, updatePayload, incrementPayload, {})
        })
      if (messageData.otherPayload) {
        callApi(`whatsAppChat`, 'post', messageData.otherPayload, 'kibochat')
          .then(message => {
            let subscriberData = {
              query: {_id: contact._id},
              newPayload: {last_activity_time: Date.now(), hasChat: true},
              options: {}
            }
            callApi(`whatsAppContacts/update`, 'put', subscriberData)
              .then(updated => {
              })
              .catch(error => {
                logger.serverLog(TAG, `Failed to update contact ${JSON.stringify(error)}`, 'error')
              })
          })
      }
      if (body.Body !== '' && (body.Body.toLowerCase() === 'unsubscribe' || body.Body.toLowerCase() === 'stop')) {
        handleUnsubscribe(contact, company, user)
      } else if (body.Body !== '' && body.Body.toLowerCase() === 'start' && !contact.isSubscribed) {
        handleSubscribe(contact, company, user)
      }
    })
    .catch(error => {
      logger.serverLog(TAG, `Failed to fetch user ${error}`, 'error')
    })
}

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
      logger.serverLog(TAG, `response from twilio ${JSON.stringify(response)}`)
    })
    .catch(error => {
      logger.serverLog(TAG, `error at sending message ${error}`, 'error')
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
          logger.serverLog(TAG, `Failed to update contact ${JSON.stringify(error)}`, 'error')
        })
    })
}

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
      logger.serverLog(TAG, `response from twilio ${JSON.stringify(response)}`)
    })
    .catch(error => {
      logger.serverLog(TAG, `error at sending message ${error}`, 'error')
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
          logger.serverLog(TAG, `Failed to update contact ${JSON.stringify(error)}`, 'error')
        })
    })
}
function updateWhatsAppContact (query, bodyForUpdate, bodyForIncrement, options) {
  callApi(`whatsAppContacts/update`, 'put', {query: query, newPayload: bodyForUpdate, options: options})
    .then(updated => {
    })
    .catch(error => {
      logger.serverLog(TAG, `Failed to update contact ${JSON.stringify(error)}`, 'error')
    })
  callApi(`whatsAppContacts/update`, 'put', {query: query, newPayload: bodyForIncrement, options: options})
    .then(updated => {
    })
    .catch(error => {
      logger.serverLog(TAG, `Failed to update contact ${JSON.stringify(error)}`, 'error')
    })
}
