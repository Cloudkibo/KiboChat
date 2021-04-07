const utility = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/v1/messengerEvents/sessions.controller'
const LiveChatDataLayer = require('../liveChat/liveChat.datalayer')
const botController = require('./bots.controller')
const needle = require('needle')
// const moment = require('moment')
const sessionLogicLayer = require('../sessions/sessions.logiclayer')
const logicLayer = require('./logiclayer')
const { captureUserEmailAndPhone, unSetAwaitingUserInfoPayload } = require('./capturePhoneEmail.logiclayer')
const notificationsUtility = require('../notifications/notifications.utility')
const { record } = require('../../global/messageStatistics')
const { updateCompanyUsage } = require('../../global/billingPricing')
const { sendNotifications } = require('../../global/sendNotification')
const { sendWebhook } = require('../../global/sendWebhook')
const { handleMessageAlertsSubscription } = require('../messageAlerts/utility')
const { pushSessionPendingAlertInStack, pushUnresolveAlertInStack } = require('../../global/messageAlerts')
const { handleTriggerMessage, handleCommerceChatbot, isTriggerMessage } = require('./chatbotAutomation.controller')

exports.index = function (req, res) {
  // logger.serverLog(TAG, `payload received in page ${JSON.stringify(req.body.page)}`, 'debug')
  // logger.serverLog(TAG, `payload received in subscriber ${JSON.stringify(req.body.subscriber)}`, 'debug')
  // logger.serverLog(TAG, `payload received in event ${JSON.stringify(req.body.event)}`, 'debug')
  // logger.serverLog(TAG, `payload received in pushPendingSession ${JSON.stringify(req.body.pushPendingSessionInfo)}`, 'debug')
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  let page = req.body.page
  let subscriber = req.body.subscriber
  let event = req.body.event
  let newSubscriber = req.body.newSubscriber

  if (event.message) {
    logicLayer.prepareLiveChatPayload(event.message, subscriber, page)
      .then(chatPayload => {
        if (chatPayload.payload && chatPayload.payload.constructor === Object && Object.keys(chatPayload.payload).length > 0) {
          let from
          if (!event.message.is_echo) {
            from = 'subscriber'
          } else {
            if (!event.message.metadata) from = 'facebook_page'
            else from = 'kibopush'
          }
          from && sendWebhook('CHAT_MESSAGE', 'facebook', {
            from: from,
            recipientId: event.message.is_echo ? subscriber.senderId : page.pageId,
            senderId: event.message.is_echo ? page.pageId : subscriber.senderId,
            timestamp: Date.now(),
            message: chatPayload.payload
          }, page)
        }
        utility.callApi(`companyprofile/query`, 'post', { _id: page.companyId })
          .then(company => {
            if (!(company.automated_options === 'DISABLE_CHAT')) {
              if (subscriber.unSubscribedBy !== 'agent') {
                if (newSubscriber) {
                  let subscriberEvent = JSON.parse(JSON.stringify(subscriber))
                  subscriberEvent.pageId = page
                  require('./../../../config/socketio').sendMessageToClient({
                    room_id: page.companyId,
                    body: {
                      action: 'Messenger_new_subscriber',
                      payload: {
                        subscriber: subscriberEvent
                      }
                    }
                  })
                }
                if (req.body.pushPendingSessionInfo && JSON.stringify(req.body.pushPendingSessionInfo) === 'true') {
                  let subscriberEvent = JSON.parse(JSON.stringify(subscriber))
                  subscriberEvent.pageId = page
                  pushSessionPendingAlertInStack(company, subscriberEvent, 'messenger')
                }
                if (!event.message.is_echo && subscriber.awaitingQuickReplyPayload && subscriber.awaitingQuickReplyPayload.action) {
                  isTriggerMessage(event, page)
                    .then(isTrigger => {
                      if (!isTrigger) {
                        var query = subscriber.awaitingQuickReplyPayload.action.find((ac) => { return ac.query === 'email' || ac.query === 'phone' })
                        if (query.keyboardInputAllowed) {
                          captureUserEmailAndPhone(event, subscriber, page)
                        }
                      } else {
                        unSetAwaitingUserInfoPayload(subscriber)
                      }
                    })
                    .catch(err => {
                      const message = err || 'Failed to check trigger message'
                      return logger.serverLog(message, `${TAG}: exports.index`, req.body, {}, 'error')
                    })
                }
                utility.callApi('subscribers/update', 'put', { query: { _id: subscriber._id }, newPayload: _prepareSubscriberUpdatePayload(event, subscriber, company), options: {} })
                  .then(updated => {
                    if (event.message) {
                      if (!event.message.is_echo || (event.message.is_echo && company.saveAutomationMessages)) {
                        saveLiveChat(page, subscriber, event)
                        if (event.type !== 'get_started') {
                          handleCommerceChatbot(event, page, subscriber)
                          if (event.message.text && (!event.message.is_echo || (event.message.is_echo && event.message.metadata !== 'SENT_FROM_KIBOPUSH'))) {
                            handleTriggerMessage(event, page, subscriber)
                          }
                        }
                        if (!event.message.is_echo) {
                          let subscriberEvent = JSON.parse(JSON.stringify(subscriber))
                          subscriberEvent.pageId = page
                          pushUnresolveAlertInStack(company, subscriberEvent, 'messenger')
                        }
                      }
                    }
                  })
                  .catch(error => {
                    const message = error || 'Failed to update session'
                    return logger.serverLog(message, `${TAG}: exports.index`, req.body, {}, 'error')
                  })
              }
            }
          })
          .catch(error => {
            const message = error || 'Failed to fetch company profile'
            return logger.serverLog(message, `${TAG}: exports.index`, req.body, {}, 'error')
          })
      })
  }
}

function saveLiveChat (page, subscriber, event, chatPayload) {
  record('messengerChatInComing')
  if (subscriber && !event.message.is_echo) {
    botController.respondUsingBot(page, subscriber, event.message.text)
  }
  if ((event.message && !event.message.is_echo) || (event.message && event.message.is_echo && event.message.metadata !== 'SENT_FROM_KIBOPUSH')) {
    if (chatPayload) {
      saveChatInDb(page, chatPayload, subscriber, event)
    } else {
      logicLayer.prepareLiveChatPayload(event.message, subscriber, page)
        .then(chatPayload => {
          saveChatInDb(page, chatPayload, subscriber, event)
        })
    }
  }
}
function saveChatInDb (page, chatPayload, subscriber, event) {
  if (
    chatPayload.payload &&
    chatPayload.payload.constructor === Object &&
    Object.keys(chatPayload.payload).length > 0 &&
    !event.message.delivery &&
    !event.message.read
  ) {
    LiveChatDataLayer.createFbMessageObject(chatPayload)
      .then(chat => {
        updateCompanyUsage(page.companyId, 'chat_messages', 1)
        if (!event.message.is_echo) {
          setTimeout(() => {
            utility.callApi('subscribers/query', 'post', { _id: subscriber._id })
              .then(sub => {
                let payload = {
                  subscriber_id: sub[0]._id,
                  chat_id: chat._id,
                  text: chatPayload.payload.text,
                  name: sub[0].firstName + ' ' + sub[0].lastName,
                  subscriber: sub[0],
                  message: chat
                }
                sendNotification(sub[0], payload, page)
                require('./../../../config/socketio').sendMessageToClient({
                  room_id: page.companyId,
                  body: {
                    action: 'new_chat',
                    payload: payload
                  }
                })
              })
          }, 500)
          sendautomatedmsg(event, page, subscriber)
        } else {
          require('./../../../config/socketio').sendMessageToClient({
            room_id: page.companyId,
            body: {
              action: 'new_chat',
              payload: {
                subscriber_id: subscriber._id,
                chat_id: chat._id,
                text: chatPayload.payload.text,
                name: subscriber.firstName + ' ' + subscriber.lastName,
                subscriber: subscriber,
                message: chat
              }
            }
          })
        }
      })
      .catch(error => {
        const message = error || 'Failed to create live chate'
        return logger.serverLog(message, `${TAG}: exports.saveChatInDb`, {}, { page, chatPayload, subscriber, event }, 'error')
      })
  }
}

// function __sendNotification (title, payload, companyUsers) {
//   for (let i = 0; i < companyUsers.length; i++) {
//     let expoListToken = companyUsers[i].expoListToken
//     if (expoListToken.length > 0) {
//       let text = payload.text
//       if (!text) {
//         text = 'sent an Attachment'
//       }
//       sendNotifications(expoListToken, title, text, payload, companyUsers[i].userId)
//     }
//   }
// }

function sendNotification (subscriber, payload, page) {
  let pageName = page.pageName
  let companyId = page.companyId
  let title = '[' + pageName + ']: ' + subscriber.firstName + ' ' + subscriber.lastName
  let body = payload.text
  let newPayload = {
    action: 'chat_messenger',
    subscriber: subscriber
  }
  utility.callApi(`companyUser/queryAll`, 'post', { companyId: companyId }, 'accounts')
    .then(companyUsers => {
      let lastMessageData = sessionLogicLayer.getQueryData('', 'aggregate', { company_id: companyId }, undefined, undefined, undefined, { _id: subscriber._id, payload: { $last: '$payload' }, replied_by: { $last: '$replied_by' }, datetime: { $last: '$datetime' } })
      utility.callApi(`livechat/query`, 'post', lastMessageData, 'kibochat')
        .then(gotLastMessage => {
          subscriber.lastPayload = gotLastMessage[0].payload
          subscriber.lastRepliedBy = gotLastMessage[0].replied_by
          subscriber.lastDateTime = gotLastMessage[0].datetime
          if (!subscriber.is_assigned) {
            sendNotifications(title, body, newPayload, companyUsers)
            saveNotifications(subscriber, companyUsers, page)
          } else {
            if (subscriber.assigned_to.type === 'agent') {
              companyUsers = companyUsers.filter(companyUser => companyUser.userId._id === subscriber.assigned_to.id)
              sendNotifications(title, body, newPayload, companyUsers)
              saveNotifications(subscriber, companyUsers, page)
            } else {
              utility.callApi(`teams/agents/query`, 'post', { teamId: subscriber.assigned_to.id }, 'accounts')
                .then(teamagents => {
                  teamagents = teamagents.map(teamagent => teamagent.agentId._id)
                  companyUsers = companyUsers.filter(companyUser => {
                    if (teamagents.includes(companyUser.userId._id)) {
                      return companyUser
                    }
                  })
                  sendNotifications(title, body, newPayload, companyUsers)
                  saveNotifications(subscriber, companyUsers, pageName)
                }).catch(error => {
                  const message = error || 'Error while fetching agents'
                  return logger.serverLog(message, `${TAG}: exports.sendNotification`, {}, { subscriber, payload, page }, 'error')
                })
            }
          }
        }).catch(error => {
          const message = error || 'Error while fetching Last Message'
          return logger.serverLog(message, `${TAG}: exports.sendNotification`, {}, { subscriber, payload, page }, 'error')
        })
    }).catch(error => {
      const message = error || 'Error while fetching companyUser'
      return logger.serverLog(message, `${TAG}: exports.sendNotification`, {}, { subscriber, payload, page }, 'error')
    })
}

function saveNotifications (subscriber, companyUsers, page) {
  companyUsers.forEach((companyUser, index) => {
    let notificationsData = {
      message: `${subscriber.firstName} ${subscriber.lastName} sent a message to page ${page.pageName}`,
      category: { type: 'new_message', id: subscriber._id },
      agentId: companyUser.userId._id,
      companyId: companyUser.companyId,
      platform: 'messenger'
    }
    utility.callApi(`notifications`, 'post', notificationsData, 'kibochat')
      .then(savedNotification => {
        utility.callApi(`permissions/query`, 'post', { companyId: companyUser.companyId, userId: companyUser.userId._id })
          .then(userPermission => {
            if (userPermission.length > 0) {
              userPermission = userPermission[0]
            }
            if (userPermission.muteNotifications && userPermission.muteNotifications.includes(page._id)) {
              notificationsData.muteNotification = true
            } else {
              notificationsData.muteNotification = false
            }
            notificationsData.subscriber = subscriber
            require('./../../../config/socketio').sendMessageToClient({
              room_id: companyUser.companyId,
              body: {
                action: 'new_notification',
                payload: notificationsData
              }
            })
          })
          .catch(err => {
            const message = err || 'Failed to fetch user permissions'
            return logger.serverLog(message, `${TAG}: exports.saveNotification`, {}, { subscriber, companyUsers, page }, 'error')
          })
      })
      .catch(error => {
        const message = error || 'Failed to save notification'
        return logger.serverLog(message, `${TAG}: exports.saveNotification`, {}, { subscriber, companyUsers, page }, 'error')
      })
  })
}

function sendautomatedmsg (req, page, subscriber) {
  if (req.message && req.message.text) {
    let index = -3
    if (req.message.text.toLowerCase() === 'stop' ||
      req.message.text.toLowerCase() === 'unsubscribe') {
      index = -101
    }
    if (req.message.text.toLowerCase() === 'start' ||
      req.message.text.toLowerCase() === 'subscribe') {
      index = -111
    }
    if (req.message.text.toLowerCase() === 'notify-me') {
      handleMessageAlertsSubscription('messenger', 'subscribe', subscriber, page)
    }
    if (req.message.text.toLowerCase() === 'cancel-notify') {
      handleMessageAlertsSubscription('messenger', 'unsubscribe', subscriber, page)
    }

    // user query matched with keywords, send response
    // sending response to sender
    needle.get(
      `https://graph.facebook.com/v6.0/${req.recipient.id}?fields=access_token&access_token=${page.userId.facebookInfo.fbToken}`,
      (err3, response) => {
        if (err3) {
          const message = err3 || 'Page token error from graph api'
          return logger.serverLog(message, `${TAG}: exports.sendautomatedmsg`, {}, {req}, 'error')
        }
        let messageData = {}
        const Yes = 'yes'
        const No = 'no'
        let unsubscribeResponse = false
        if (index === -101) {
          let buttonsInPayload = []
          buttonsInPayload.push({
            type: 'postback',
            title: 'Yes',
            payload: JSON.stringify({
              unsubscribe: Yes,
              action: Yes,
              userToken: page.userId.facebookInfo.fbToken
            })
          })
          buttonsInPayload.push({
            type: 'postback',
            title: 'No',
            payload: JSON.stringify({
              unsubscribe: Yes,
              action: No,
              userToken: page.userId.facebookInfo.fbToken
            })
          })

          messageData = {
            attachment: {
              type: 'template',
              payload: {
                template_type: 'button',
                text: 'Are you sure you want to unsubscribe?',
                buttons: buttonsInPayload
              }
            },
            'metadata': 'This is a meta data'
          }
          unsubscribeResponse = true
        } else if (index === -111) {
          utility.callApi(`subscribers/query`, 'post', { senderId: req.sender.id, companyId: page.companyId, unSubscribedBy: 'subscriber', completeInfo: true })
            .then(subscribers => {
              if (subscribers.length > 0) {
                messageData = {
                  text: 'You have subscribed to our broadcasts. Send "stop" to unsubscribe',
                  'metadata': 'This is a meta data'
                }
                utility.callApi(`subscribers/update`, 'put', { query: { senderId: req.sender.id }, newPayload: { isSubscribed: true }, options: {} })
                  .then(updated => {
                    require('./../../../config/socketio').sendMessageToClient({
                      room_id: page.companyId,
                      body: {
                        action: 'Messenger_subscribe_subscriber',
                        payload: {
                          subscriber_id: subscribers[0]._id
                        }
                      }
                    })
                    logger.serverLog('Subscriber isSubscribed Updated', `${TAG}: exports.sendautomatedmsg`, {}, {req: JSON.stringify(req)}, 'debug')
                  })
                  .catch(error => {
                    const message = error || 'Failed to update subscriber'
                    return logger.serverLog(message, `${TAG}: exports.sendautomatedmsg`, {}, {req: JSON.stringify(req)}, 'error')
                  })
                const data = {
                  messaging_type: 'RESPONSE',
                  recipient: JSON.stringify({ id: req.sender.id }), // this is the subscriber id
                  message: messageData
                }
                needle.post(
                  `https://graph.facebook.com/v6.0/me/messages?access_token=${response.body.access_token}`,
                  data, (err4, respp) => {
                    if (err4) {
                      const message = err4 || 'Failed to call fb'
                      return logger.serverLog(message, `${TAG}: exports.sendautomatedmsg`, {}, {req}, 'error')
                    }
                  })
              }
            })
            .catch(error => {
              const message = error || 'Failed to fetch subscriber'
              return logger.serverLog(message, `${TAG}: exports.sendautomatedmsg`, {}, {req}, 'error')
            })
        }

        const data = {
          messaging_type: 'RESPONSE',
          recipient: JSON.stringify({ id: req.sender.id }), // this is the subscriber id
          message: JSON.stringify(messageData)
        }
        if (messageData.text !== undefined || unsubscribeResponse) {
          needle.post(
            `https://graph.facebook.com/v6.0/me/messages?access_token=${response.body.access_token}`,
            data, (err4, respp) => {
              if (err4) {
                const message = err4 || 'Failed to call fb'
                return logger.serverLog(message, `${TAG}: exports.sendautomatedmsg`, {}, {req}, 'error')
              }
              if (!unsubscribeResponse) {
                utility.callApi(`subscribers/query`, 'post', { senderId: req.sender.id, companyId: page.companyId, completeInfo: true })
                  .then(subscribers => {
                    const chatMessage = {
                      sender_id: page._id, // this is the page id: _id of Pageid
                      recipient_id: subscribers[0]._id, // this is the subscriber id: _id of subscriberId
                      sender_fb_id: page.pageId, // this is the (facebook) :page id of pageId
                      recipient_fb_id: subscribers[0].senderId, // this is the (facebook) subscriber id : pageid of subscriber id
                      session_id: subscribers[0]._id,
                      company_id: page.companyId, // this is admin id till we have companies
                      payload: {
                        componentType: 'text',
                        text: messageData.text
                      }, // this where message content will go
                      status: 'unseen' // seen or unseen
                    }
                    utility.callApi(`webhooks/query`, 'post', { pageId: page.pageId })
                      .then(webhookss => {
                        let webhooks = webhookss[0]
                        if (webhookss.length > 0 && webhooks.isEnabled) {
                          needle.get(webhooks.webhook_url, (err, r) => {
                            if (err) {
                              const message = err || 'error in sending webhooks'
                              return logger.serverLog(message, `${TAG}: exports.sendautomatedmsg`, {}, req, 'error')
                            } else if (r.statusCode === 200) {
                              if (webhooks.optIn.LIVE_CHAT_ACTIONS) {
                                var data = {
                                  subscription_type: 'LIVE_CHAT_ACTIONS',
                                  payload: JSON.stringify({
                                    pageId: page.pageId, // this is the (facebook) :page id of pageId
                                    subscriberId: subscribers[0].senderId, // this is the (facebook) subscriber id : pageid of subscriber id
                                    session_id: subscribers[0]._id,
                                    company_id: page.companyId, // this is admin id till we have companies
                                    payload: {
                                      componentType: 'text',
                                      text: messageData.text
                                    }
                                  })
                                }
                                needle.post(webhooks[0].webhook_url, data,
                                  (error, response) => {
                                    if (error) {
                                      const message = error || 'Failed to send webhook'
                                      logger.serverLog(message, `${TAG}: exports.sendautomatedmsg`, {}, {req}, 'error')
                                    }
                                  })
                              }
                            } else {
                              /* do webhook work here */
                              var webhook = null
                              notificationsUtility.saveNotification(webhook)
                            }
                          })
                        }
                      })
                      .catch(error => {
                        const message = error || 'Failed to fetch webhook'
                        return logger.serverLog(message, `${TAG}: exports.sendautomatedmsg`, {}, {req}, 'error')
                      })
                    LiveChatDataLayer.createFbMessageObject(chatMessage)
                      .then(chatMessageSaved => {
                        utility.callApi('subscribers/update', 'put', { query: { _id: subscribers[0]._id }, newPayload: { last_activity_time: Date.now() }, options: {} })
                          .then(updated => {
                          })
                          .catch(error => {
                            const message = error || 'Failed to update session'
                            return logger.serverLog(message, `${TAG}: exports.sendautomatedmsg`, {}, {req}, 'error')
                          })
                      })
                  })
                  .catch(error => {
                    const message = error || 'Failed to fetch subscribers'
                    return logger.serverLog(message, `${TAG}: exports.sendautomatedmsg`, {}, {req}, 'error')
                  })
              }
            })
          // require('./../../../config/socketio').sendMessageToClient({
          //   room_id: page.companyId,
          //   body: {
          //     action: 'dashboard_updated',
          //     payload: {
          //       company_id: page.companyId
          //     }
          //   }
          // })
        }
      })
  }
}

const _prepareSubscriberUpdatePayload = (event, subscriber, company) => {
  let updated = {}
  if (event.message && event.message.is_echo) {
    if (company.saveAutomationMessages) {
      if (['SENT_FROM_KIBOPUSH', 'SENT_FROM_CHATBOT'].indexOf(event.message.metadata) === -1) {
        updated = { $inc: { messagesCount: 1 }, $set: {unreadCount: 0, last_activity_time: Date.now()} }
      } else {
        updated = { $inc: { messagesCount: 1 }, $set: {last_activity_time: Date.now()} }
      }
    }
  } else if (event.message) {
    updated = {
      $inc: { unreadCount: 1, messagesCount: 1 },
      $set: {
        last_activity_time: Date.now(),
        pendingResponse: true,
        pendingAt: new Date(),
        lastMessagedAt: Date.now()
      }
    }
    if (subscriber.status === 'resolved') {
      updated['$set'] = {...updated.$set, status: 'new', openedAt: new Date()}
    }
  }
  return updated
}

exports.saveLiveChat = saveLiveChat
exports.saveChatInDb = saveChatInDb
