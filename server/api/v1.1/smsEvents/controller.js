const { callApi } = require('../utility')
const logger = require('../../../components/logger')
const TAG = '/api/v1/smsEvents/controller.js'
const { smsMapper } = require('../../../smsMapper')
const { ActionTypes } = require('../../../smsMapper/constants')
const { pushUnresolveAlertInStack, pushSessionPendingAlertInStack } = require('../../global/messageAlerts')
const chatbotResponder = require('../../../chatbotResponder')
const commerceChatbot = require('../configureChatbot/commerceChatbot.controller')
const logiclayer = require('./logiclayer')
const { isPhoneNumber } = require('../../global/utility.js')
const sessionLogicLayer = require('../smsSessions/smsSessions.logiclayer')

exports.handleOrderStatus = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })

  callApi(`companyprofile/update`, 'put', {
    query: {_id: req.body.payload.orderId},
    newPayload: {'sms.accountType': req.body.payload.status === 'COMPLETE' ? 'approved' : 'failed'},
    options: {}})
    .then(data => {
    })
    .catch(error => {
      const message = error || 'Failed to fetch company'
      logger.serverLog(message, `${TAG}: exports.handleOrderStatus`, req.body, {user: req.user}, 'error')
    })
}

exports.handleIncomingMessage = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })

  smsMapper(req.body.provider, ActionTypes.GET_COMPANY, req.body.payload)
    .then(company => {
      const userQuery = callApi(`user/query`, 'post', {_id: company.ownerId})
      const contactQuery = callApi(`contacts/query`, 'post', {number: req.body.payload.message.from, companyId: company._id})
      Promise.all([userQuery, contactQuery])
        .then(result => {
          const user = result[0]
          let contact = result[1]
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
              let payload = logiclayer.preparePayload(data)
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
          const message = error || 'Failed to handle incoming message'
          logger.serverLog(message, `${TAG}: exports.handleIncomingMessage`, req.body, {company}, 'error')
        })
    })
    .catch(error => {
      const message = error || 'Failed to get company'
      logger.serverLog(message, `${TAG}: exports.handleIncomingMessage`, req.body, {}, 'error')
    })
}

exports.handleMessageDelivery = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
}

function _handleMessageFromContact (contact, body, company, user) {
  const userText = body.payload.message.text
  if (contact.isSubscribed || userText.toLowerCase() === 'start') {
    let MessageObject = {
      senderNumber: body.payload.message.from,
      recipientNumber: body.to,
      contactId: contact._id,
      companyId: contact.companyId,
      payload: {componentType: 'text', text: userText},
      status: 'unseen',
      format: 'twilio'
    }
    callApi(`smsChat`, 'post', MessageObject, 'kibochat')
      .then(message => {
        message.payload.format = 'incoming'
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
        chatbotResponder.respondUsingChatbot('sms', company.sms.provider, {...company, number: body.to}, userText, contact)
        commerceChatbot.handleCommerceChatbot({...company, number: body.to}, userText, contact)
        _sendNotification(contact, contact.companyId)
        updateContact(contact)
      })
      .catch(error => {
        const message = error || 'Failed to create sms'
        logger.serverLog(message, `${TAG}: exports.index`, body, {MessageObject}, 'error')
      })
    if (userText !== '' && (userText.toLowerCase() === 'unsubscribe' || userText.toLowerCase() === 'stop')) {
      handleUnsub(user, company, contact)
    } else if (userText !== '' && userText.toLowerCase() === 'start' && !contact.isSubscribed) {
      handleSub(user, company, contact)
    }
  }
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
    callApi(`broadcasts/responses`, 'post', data, 'kiboengage')
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

function handleUnsub (user, company, contact) {
  const unsubscribeMessage = 'You have unsubscribed from our broadcasts. Send "start" to subscribe again'
  smsMapper(company.sms.provider, ActionTypes.SEND_TEXT_MESSAGE, {
    text: unsubscribeMessage,
    company: company._id,
    subscriber: contact
  })
    .catch(error => {
      const message = error || 'error at sending message'
      logger.serverLog(message, `${TAG}: exports.handleUnsub`, {}, {user, company, contact}, 'error')
    })
  let message = {
    senderNumber: company.sms.businessNumber,
    recipientNumber: contact.number,
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
          logger.serverLog(message, `${TAG}: exports.handleUnsub`, {}, {user, company, contact}, 'error')
        })
    })
}

function handleSub (user, company, contact) {
  const subscribeMessage = 'Thank you for subscribing again'
  smsMapper(company.sms.provider, ActionTypes.SEND_TEXT_MESSAGE, {
    text: subscribeMessage,
    company: company._id,
    subscriber: contact
  })
    .then(response => {
    })
    .catch(error => {
      const message = error || 'error at sending message'
      logger.serverLog(message, `${TAG}: exports.handleSub`, {}, {user, company, contact}, 'error')
    })
  let message = {
    senderNumber: company.sms.businessNumber,
    recipientNumber: contact.number,
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
          logger.serverLog(message, `${TAG}: exports.handleSub`, {}, {user, company, contact, message}, 'error')
        })
    })
}
