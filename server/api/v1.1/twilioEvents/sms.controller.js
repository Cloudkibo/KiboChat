const logger = require('../../../components/logger')
const TAG = '/api/v1/twilioEvents/controller.js'
const { callApi } = require('../utility')

exports.index = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  callApi(`companyprofile/query`, 'post', {'twilio.accountSID': req.body.AccountSid})
    .then(company => {
      callApi(`user/query`, 'post', {_id: company.ownerId})
        .then(user => {
          callApi(`contacts/query`, 'post', {number: req.body.From, companyId: company._id})
            .then(contact => {
              contact = contact[0]
              if (contact.isSubscribed || req.body.Body.toLowerCase() === 'start') {
                let MessageObject = {
                  senderNumber: req.body.From,
                  recipientNumber: req.body.To,
                  contactId: contact._id,
                  companyId: contact.companyId,
                  payload: {componentType: 'text', text: req.body.Body},
                  status: 'unseen',
                  format: 'twilio'
                }
                callApi(`smsChat`, 'post', MessageObject, 'kibochat')
                  .then(message => {
                    message.payload.format = 'twilio'
                    console.log('socket data', contact)
                    require('./../../../config/socketio').sendMessageToClient({
                      room_id: contact.companyId,
                      body: {
                        action: 'new_chat_sms',
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
                    updateContact(contact._id, {last_activity_time: Date.now(), lastMessagedAt: Date.now(), hasChat: true, pendingResponse: true, status: 'new'})
                    updateContact(contact._id, {$inc: { unreadCount: 1, messagesCount: 1 }})
                  })
                  .catch(error => {
                    logger.serverLog(TAG, `Failed to create sms ${error}`, 'error')
                  })
                if (req.body.Body !== '' && (req.body.Body.toLowerCase() === 'unsubscribe' || req.body.Body.toLowerCase() === 'stop')) {
                  handleUnsub(user, company, contact, req.body)
                } else if (req.body.Body !== '' && req.body.Body.toLowerCase() === 'start' && !contact.isSubscribed) {
                  handleSub(user, company, contact, req.body)
                }
              }
            })
            .catch(error => {
              logger.serverLog(TAG, `Failed to fetch contact ${error}`, 'error')
            })
        })
        .catch(error => {
          logger.serverLog(TAG, `Failed to fetch user ${JSON.stringify(error)}`, 'error')
        })
    })
    .catch(error => {
      logger.serverLog(TAG, `Failed to fetch company ${JSON.stringify(error)}`, 'error')
    })
}

function updateContact (contactId, newPayload) {
  let subscriberData = {
    query: {_id: contactId},
    newPayload: newPayload,
    options: {}
  }
  callApi(`contacts/update`, 'put', subscriberData)
    .then(updated => {
    })
    .catch(error => {
      logger.serverLog(TAG, `Failed to update contact ${JSON.stringify(error)}`, 'error')
    })
}

function handleUnsub (user, company, contact, body) {
  let accountSid = company.twilio.accountSID
  let authToken = company.twilio.authToken
  let client = require('twilio')(accountSid, authToken)
  let unsubscribeMessage = 'You have unsubscribed from our broadcasts. Send "start" to subscribe again'
  client.messages
    .create({
      body: unsubscribeMessage,
      from: body.To,
      to: contact.number
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
  callApi(`smsChat`, 'post', message, 'kibochat')
    .then(message => {
      let subscriberData = {
        query: {_id: contact._id},
        newPayload: {last_activity_time: Date.now(), isSubscribed: false},
        options: {}
      }
      callApi(`contacts/update`, 'put', subscriberData)
        .then(updated => {
        })
        .catch(error => {
          logger.serverLog(TAG, `Failed to update contact ${JSON.stringify(error)}`, 'error')
        })
    })
}
function handleSub (user, company, contact, body) {
  let accountSid = company.twilio.accountSID
  let authToken = company.twilio.authToken
  let client = require('twilio')(accountSid, authToken)
  let subscribeMessage = 'Thank you for subscribing again'
  client.messages
    .create({
      body: subscribeMessage,
      from: body.To,
      to: contact.number
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
  callApi(`smsChat`, 'post', message, 'kibochat')
    .then(message => {
      let subscriberData = {
        query: {_id: contact._id},
        newPayload: {last_activity_time: Date.now(), isSubscribed: true},
        options: {}
      }
      callApi(`contacts/update`, 'put', subscriberData)
        .then(updated => {
        })
        .catch(error => {
          logger.serverLog(TAG, `Failed to update contact ${JSON.stringify(error)}`, 'error')
        })
    })
}
