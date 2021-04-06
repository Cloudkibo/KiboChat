const logger = require('../../../components/logger')
const TAG = '/api/v1/twilioEvents/controller.js'
const { callApi } = require('../utility')
const sessionLogicLayer = require('../smsSessions/smsSessions.logiclayer')
const { pushUnresolveAlertInStack, pushSessionPendingAlertInStack } = require('../../global/messageAlerts')
const { ActionTypes } = require('../../../smsMapper/constants')
const { smsMapper } = require('../../../smsMapper')
const chatbotResponder = require('../../../chatbotResponder')
const logicLayer = require('./logiclayer')
const { kiboengage } = require('../../global/constants').serverConstants
const { isPhoneNumber } = require('../../global/utility.js')
const commerceChatbot = require('../configureChatbot/commerceChatbot.controller')

exports.index = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })

  smsMapper('twilio', ActionTypes.GET_COMPANY, req.body)
    .then(company => {
      callApi(`user/query`, 'post', {_id: company.ownerId})
        .then(user => {
          callApi(`contacts/query`, 'post', {number: req.body.From, companyId: company._id})
            .then(contact => {
              if (contact[0]) {
                contact = contact[0]
                pushUnresolveAlertInStack(company, contact, 'sms')
                _handleMessageFromContact(contact, req.body, company, user)
              } else {
                if (isPhoneNumber(req.body.From)) {
                  let data = {
                    name: req.body.From,
                    number: req.body.From,
                    companyId: company._id
                  }
                  let payload = logicLayer.preparePayload(data)
                  callApi(`contacts`, 'post', payload)
                    .then(savedContact => {
                      let contact = savedContact
                      pushUnresolveAlertInStack(company, contact, 'sms')
                      pushSessionPendingAlertInStack(company, contact, 'sms')
                      _handleMessageFromContact(contact, req.body, company, user)
                    })
                    .catch(error => {
                      const message = error || 'Failed to save contact'
                      return logger.serverLog(message, `${TAG}: exports._saveContacts`, {}, {data}, 'error')
                    })
                } else {
                  return logger.serverLog('Invalid phone number', `${TAG}: exports._saveContacts`, {}, { body: req.body }, 'error')
                }
              }
            })
            .catch(error => {
              const message = error || 'Failed to fetch contact'
              logger.serverLog(message, `${TAG}: exports.index`, req.body, { user }, 'error')
            })
        })
        .catch(error => {
          const message = error || 'Failed to fetch user'
          logger.serverLog(message, `${TAG}: exports.index`, req.body, {company}, 'error')
        })
    })
    .catch(error => {
      const message = error || 'Failed to get company'
      logger.serverLog(message, `${TAG}: exports.index`, req.body, {}, 'error')
    })
}

function _handleMessageFromContact (contact, body, company, user) {
  if (contact.isSubscribed || body.Body.toLowerCase() === 'start') {
    let MessageObject = {
      senderNumber: body.From,
      recipientNumber: body.To,
      contactId: contact._id,
      companyId: contact.companyId,
      payload: {componentType: 'text', text: body.Body},
      status: 'unseen',
      format: 'twilio'
    }
    callApi(`smsChat`, 'post', MessageObject, 'kibochat')
      .then(message => {
        message.payload.format = 'twilio'
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
        saveBroadcastResponse(contact, MessageObject)
        chatbotResponder.respondUsingChatbot('sms', 'twilio', {...company, number: body.To}, body.Body, contact)
        commerceChatbot.handleCommerceChatbot({...company, number: body.To}, body.Body, contact)
        _sendNotification(contact, contact.companyId)
        updateContact(contact)
      })
      .catch(error => {
        const message = error || 'Failed to create sms'
        logger.serverLog(message, `${TAG}: exports.index`, body, {MessageObject}, 'error')
      })
    if (body.Body !== '' && (body.Body.toLowerCase() === 'unsubscribe' || body.Body.toLowerCase() === 'stop')) {
      handleUnsub(user, company, contact, body)
    } else if (body.Body !== '' && body.Body.toLowerCase() === 'start' && !contact.isSubscribed) {
      handleSub(user, company, contact, body)
    }
  }
}
function updateContact (contact) {
  let newPayload = {
    $inc: { unreadCount: 1, messagesCount: 1 },
    $set: {last_activity_time: Date.now(), lastMessagedAt: Date.now(), hasChat: true, pendingResponse: true, status: 'new'}
  }
  if (contact.waitingForBroadcastResponse) {
    newPayload.$unset = {waitingForBroadcastResponse: 1}
  }
  let subscriberData = {
    query: {_id: contact._id},
    newPayload: newPayload,
    options: {}
  }
  callApi(`contacts/update`, 'put', subscriberData)
    .then(updated => {
      logger.serverLog('contact updated', `${TAG}: exports.updateContact`, {}, {subscriberData}, 'info')
    })
    .catch(error => {
      const message = error || 'Failed to update contact'
      logger.serverLog(message, `${TAG}: exports.updateContact`, {}, {contactId: contact._id, newPayload}, 'error')
    })
}

function saveBroadcastResponse (contact, MessageObject) {
  if (contact.waitingForBroadcastResponse) {
    let data = {
      companyId: contact.companyId,
      broadcastId: contact.waitingForBroadcastResponse.broadcastId,
      customerId: contact._id,
      platform: 'sms',
      response: MessageObject.payload
    }
    callApi(`broadcasts/responses`, 'post', data, kiboengage)
      .then(response => {
        let body = {
          room_id: contact.companyId,
          body: {
            action: 'sms_broadcast_response',
            payload: {
              response: response,
              subscriber: contact
            }
          }
        }
        callApi(`receiveSocketEvent`, 'post', body, 'engage')
          .then(response => {
          }).catch(err => {
            const message = err || 'failed to send socket event'
            logger.serverLog(message, `${TAG}: saveBroadcastResponse`, {}, {contact, data}, 'error')
          })
      })
      .catch(error => {
        const message = error || 'Failed to save broadcast response'
        logger.serverLog(message, `${TAG}: saveBroadcastResponse`, {}, {contact, data}, 'error')
      })
  }
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
    })
    .catch(error => {
      const message = error || 'error at sending message'
      logger.serverLog(message, `${TAG}: exports.handleUnsub`, {}, {user, company, contact, body}, 'error')
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
          const message = error || 'Failed to update contact'
          logger.serverLog(message, `${TAG}: exports.handleUnsub`, {}, {user, company, contact, body}, 'error')
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
    })
    .catch(error => {
      const message = error || 'error at sending message'
      logger.serverLog(message, `${TAG}: exports.handleSub`, {}, {user, company, contact, body}, 'error')
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
          const message = error || 'Failed to update contact'
          logger.serverLog(message, `${TAG}: exports.handleSub`, {}, {user, company, contact, body, message}, 'error')
        })
    })
}
function _sendNotification (subscriber, companyId) {
  callApi(`companyUser/queryAll`, 'post', { companyId: companyId }, 'accounts')
    .then(companyUsers => {
      let lastMessageData = sessionLogicLayer.getQueryData('', 'aggregate', { companyId: companyId }, undefined, undefined, undefined, { _id: subscriber._id, payload: { $last: '$payload' }, replied_by: { $last: '$replied_by' }, datetime: { $last: '$datetime' } })
      callApi(`smsChat/query`, 'post', lastMessageData, 'kibochat')
        .then(gotLastMessage => {
          subscriber.lastPayload = gotLastMessage[0].payload
          subscriber.lastRepliedBy = gotLastMessage[0].replied_by
          subscriber.lastDateTime = gotLastMessage[0].datetime
          if (!subscriber.is_assigned) {
            saveNotifications(subscriber, companyUsers)
          } else {
            if (subscriber.assigned_to.type === 'agent') {
              companyUsers = companyUsers.filter(companyUser => companyUser.userId._id === subscriber.assigned_to.id)
              saveNotifications(subscriber, companyUsers)
            } else {
              callApi(`teams/agents/query`, 'post', { teamId: subscriber.assigned_to.id }, 'accounts')
                .then(teamagents => {
                  teamagents = teamagents.map(teamagent => teamagent.agentId._id)
                  companyUsers = companyUsers.filter(companyUser => {
                    if (teamagents.includes(companyUser.userId._id)) {
                      return companyUser
                    }
                  })
                  saveNotifications(subscriber, companyUsers)
                }).catch(error => {
                  const message = error || 'Error while fetching agents'
                  logger.serverLog(message, `${TAG}: exports._sendNotification`, {}, {subscriber, companyId}, 'error')
                })
            }
          }
        }).catch(error => {
          const message = error || 'Error while fetching Last Message'
          logger.serverLog(message, `${TAG}: exports._sendNotification`, {}, {subscriber, companyId}, 'error')
        })
    }).catch(error => {
      const message = error || 'Error while fetching companyUser'
      logger.serverLog(message, `${TAG}: exports._sendNotification`, {}, {subscriber, companyId}, 'error')
    })
}

function saveNotifications (contact, companyUsers) {
  companyUsers.forEach((companyUser, index) => {
    let notificationsData = {
      message: `${contact.name} has sent an sms to you`,
      category: { type: 'new_message', id: contact._id },
      agentId: companyUser.userId._id,
      companyId: companyUser.companyId,
      platform: 'sms'
    }
    callApi(`notifications`, 'post', notificationsData, 'kibochat')
      .then(savedNotification => {
        require('./../../../config/socketio').sendMessageToClient({
          room_id: companyUser.companyId,
          body: {
            action: 'new_notification',
            payload: notificationsData
          }
        })
      })
      .catch(error => {
        const message = error || 'Failed to save notification'
        logger.serverLog(message, `${TAG}: exports.saveNotifications`, {}, {notificationsData, contact, companyUsers}, 'error')
      })
  })
}
