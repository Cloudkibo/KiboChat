const utility = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/v1/messengerEvents/sessions.controller'
const LiveChatDataLayer = require('../liveChat/liveChat.datalayer')
const botController = require('./bots.controller')
const needle = require('needle')
const logicLayer = require('./logiclayer')
const notificationsUtility = require('../notifications/notifications.utility')
const { record } = require('../../global/messageStatistics')

exports.index = function (req, res) {
  logger.serverLog(TAG, `payload received in page ${JSON.stringify(req.body.page)}`, 'debug')
  logger.serverLog(TAG, `payload received in subscriber ${JSON.stringify(req.body.subscriber)}`, 'debug')
  logger.serverLog(TAG, `payload received in event ${JSON.stringify(req.body.event)}`, 'debug')
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  let page = req.body.page
  let subscriber = req.body.subscriber
  let event = req.body.event
  utility.callApi(`companyprofile/query`, 'post', { _id: page.companyId })
    .then(company => {
      if (!(company.automated_options === 'DISABLE_CHAT')) {
        let updatePayload = { last_activity_time: Date.now() }
        if (subscriber.status === 'resolved') {
          updatePayload.status = 'new'
        }
        if (!event.message.is_echo) {
          updatePayload.pendingResponse = true
          updatePayload.lastMessagedAt = Date.now()
        }
        utility.callApi('subscribers/update', 'put', {query: {_id: subscriber._id}, newPayload: updatePayload, options: {}})
          .then(updated => {
            if (!event.message.is_echo) {
              utility.callApi('subscribers/update', 'put', {query: {_id: subscriber._id}, newPayload: {$inc: { unreadCount: 1, messagesCount: 1 }}, options: {}})
                .then(updated => {
                })
                .catch(error => {
                  logger.serverLog(TAG, `Failed to update session ${JSON.stringify(error)}`, 'error')
                })
            }
            logger.serverLog(TAG, `subscriber updated successfully`, 'debug')
            saveLiveChat(page, subscriber, event)
          })
          .catch(error => {
            logger.serverLog(TAG, `Failed to update session ${JSON.stringify(error)}`, 'error')
          })
      }
    })
    .catch(error => {
      logger.serverLog(TAG, `Failed to fetch company profile ${JSON.stringify(error)}`, 'error')
    })
}
function saveLiveChat (page, subscriber, event) {
  record('messengerChatInComing')
  if (subscriber && !event.message.is_echo) {
    botController.respondUsingBot(page, subscriber, event.message.text)
  }
  utility.callApi(`webhooks/query`, 'post', {pageId: page.pageId})
    .then(webhooks => {
      let webhook = webhooks[0]
      if (webhooks.length > 0 && webhook.isEnabled) {
        logger.serverLog(TAG, `webhook in live chat ${webhook}`, 'error')
        needle.get(webhook.webhook_url, (err, r) => {
          if (err) {
            logger.serverLog(TAG, err, 'error')
            logger.serverLog(TAG, `response ${r.statusCode}`, 'error')
          } else if (r.statusCode === 200) {
            if (webhook.optIn.LIVE_CHAT_ACTIONS) {
              var data = {
                subscription_type: 'LIVE_CHAT_ACTIONS',
                payload: JSON.stringify({
                  format: 'facebook',
                  subscriberId: subscriber.senderId,
                  pageId: page.pageId,
                  session_id: subscriber._id,
                  company_id: page.companyId,
                  payload: event.message
                })
              }
              needle.post(webhook.webhook_url, data,
                (error, response) => {
                  if (error) logger.serverLog(TAG, err, 'error')
                })
            }
          } else {
            notificationsUtility.saveNotification(webhook)
          }
        })
      }
    })
    .catch(error => {
      logger.serverLog(TAG, `Failed to fetch subscriber ${JSON.stringify(error)}`, 'error')
    })
  logicLayer.prepareLiveChatPayload(event.message, subscriber, page)
    .then(chatPayload => {
      if ((event.message && !event.message.is_echo) || (event.message && event.message.is_echo && event.message.metadata !== 'SENT_FROM_KIBOPUSH')) {
        saveChatInDb(page, chatPayload, subscriber, event)
      }
    })
}
function saveChatInDb (page, chatPayload, subscriber, event) {
  if (
    Object.keys(chatPayload.payload).length > 0 &&
    chatPayload.payload.constructor === Object &&
    !event.message.delivery &&
    !event.message.read
  ) {
    LiveChatDataLayer.createFbMessageObject(chatPayload)
      .then(chat => {
        if (!event.message.is_echo) {
          console.log('socket new_chat', subscriber)
          setTimeout(() => {
            utility.callApi('subscribers/query', 'post', {_id: subscriber._id})
              .then(sub => {
                console.log('socket new_chat sub', sub)
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
              })
          }, 5000)
          sendautomatedmsg(event, page)
        }
      })
      .catch(error => {
        logger.serverLog(TAG, `Failed to create live chate ${JSON.stringify(error)}`, 'error')
      })
  }
}
function sendautomatedmsg (req, page) {
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

    // user query matched with keywords, send response
    // sending response to sender
    needle.get(
      `https://graph.facebook.com/v2.10/${req.recipient.id}?fields=access_token&access_token=${page.userId.facebookInfo.fbToken}`,
      (err3, response) => {
        if (err3) {
          logger.serverLog(TAG,
            `Page token error from graph api ${JSON.stringify(err3)}`, 'error')
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
            }
          }
          unsubscribeResponse = true
        } else if (index === -111) {
          utility.callApi(`subscribers/query`, 'post', { senderId: req.sender.id, companyId: page.companyId, unSubscribedBy: 'subscriber', completeInfo: true })
            .then(subscribers => {
              if (subscribers.length > 0) {
                messageData = {
                  text: 'You have subscribed to our broadcasts. Send "stop" to unsubscribe'
                }
                utility.callApi(`subscribers`, 'put', {query: { senderId: req.sender.id }, newPayload: { isSubscribed: true }, options: {}})
                  .then(updated => {
                  })
                  .catch(error => {
                    logger.serverLog(TAG, `Failed to update subscriber ${JSON.stringify(error)}`, 'error')
                  })
                const data = {
                  messaging_type: 'RESPONSE',
                  recipient: JSON.stringify({ id: req.sender.id }), // this is the subscriber id
                  message: messageData
                }
                needle.post(
                  `https://graph.facebook.com/v2.6/me/messages?access_token=${response.body.access_token}`,
                  data, (err4, respp) => {
                  })
              }
            })
            .catch(error => {
              logger.serverLog(TAG, `Failed to fetch subscribers ${JSON.stringify(error)}`, 'error')
            })
        }

        const data = {
          messaging_type: 'RESPONSE',
          recipient: JSON.stringify({ id: req.sender.id }), // this is the subscriber id
          message: JSON.stringify(messageData)
        }
        if (messageData.text !== undefined || unsubscribeResponse) {
          needle.post(
            `https://graph.facebook.com/v2.6/me/messages?access_token=${response.body.access_token}`,
            data, (err4, respp) => {
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
                          logger.serverLog(TAG, `webhook in live chat ${webhooks}`, 'debug')
                          needle.get(webhooks.webhook_url, (err, r) => {
                            if (err) {
                              logger.serverLog(TAG, err, 'debug')
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
                                    if (error) logger.serverLog(TAG, err, 'debug')
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
                        logger.serverLog(TAG, `Failed to fetch webhook ${JSON.stringify(error)}`, 'debug')
                      })
                    LiveChatDataLayer.createFbMessageObject(chatMessage)
                      .then(chatMessageSaved => {
                        utility.callApi('subscribers/update', 'put', {query: {_id: subscribers[0]._id}, newPayload: {last_activity_time: Date.now()}, options: {}})
                          .then(updated => {
                            logger.serverLog(TAG, `subscriber updated successfully`, 'debug')
                          })
                          .catch(error => {
                            logger.serverLog(TAG, `Failed to update session ${JSON.stringify(error)}`, 'error')
                          })
                      })
                  })
                  .catch(error => {
                    logger.serverLog(TAG, `Failed to fetch subscribers ${JSON.stringify(error)}`, 'error')
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
