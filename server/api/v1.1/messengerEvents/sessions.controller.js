const utility = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/v1/messengerEvents/sessions.controller'
const SessionsDataLayer = require('../sessions/sessions.datalayer')
const LiveChatDataLayer = require('../liveChat/liveChat.datalayer')
const BotsDataLayer = require('../smartReplies/bots.datalayer')
const botController = require('../smartReplies/smartReplies.controller')
const needle = require('needle')
const og = require('open-graph')
const notificationsUtility = require('../notifications/notifications.utility')
const util = require('util')

exports.index = function (req, res) {
  logger.serverLog(TAG, `payload received in page ${JSON.stringify(req.body.page)}`)
  logger.serverLog(TAG, `payload received in subscriber ${JSON.stringify(req.body.subscriber)}`)
  logger.serverLog(TAG, `payload received in event ${JSON.stringify(req.body.event)}`)
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
        SessionsDataLayer.findOneSessionUsingQuery({ page_id: page._id, subscriber_id: subscriber._id })
          .then(session => {
            if (session === null) {
              utility.callApi(`featureUsage/planQuery`, 'post', {planId: company.planId})
                .then(planUsage => {
                  planUsage = planUsage[0]
                  utility.callApi(`featureUsage/companyQuery`, 'post', {companyId: page.companyId})
                    .then(companyUsage => {
                      companyUsage = companyUsage[0]
                      if (planUsage.sessions !== -1 && companyUsage.sessions >= planUsage.sessions) {
                        notificationsUtility.limitReachedNotification('sessions', company)
                        logger.serverLog(TAG, `Sessions limit reached`)
                      } else {
                        SessionsDataLayer.createSessionObject({
                          subscriber_id: subscriber._id,
                          page_id: page._id,
                          company_id: page.companyId
                        })
                          .then(sessionSaved => {
                            utility.callApi(`featureUsage/updateCompany`, 'put', {query: {companyId: page.companyId}, newPayload: { $inc: { sessions: 1 } }, options: {}})
                              .then(updated => {
                              })
                              .catch(error => {
                                logger.serverLog(TAG, `Failed to update company usage ${JSON.stringify(error)}`)
                              })
                            saveLiveChat(page, subscriber, sessionSaved, event)
                          })
                          .catch(error => {
                            logger.serverLog(TAG, `Failed to create new session ${JSON.stringify(error)}`)
                          })
                      }
                    })
                    .catch(error => {
                      logger.serverLog(TAG, `Failed to fetch company usage ${JSON.stringify(error)}`)
                    })
                })
                .catch(error => {
                  logger.serverLog(TAG, `Failed to fetch plan usage ${JSON.stringify(error)}`)
                })
            } else {
              let updatePayload = { last_activity_time: Date.now() }
              if (session.status === 'resolved') {
                updatePayload.status = 'new'
              }
              SessionsDataLayer.updateSessionObject(session._id, updatePayload)
                .then(updated => {
                  logger.serverLog(TAG, `Session updated successfully`)
                  saveLiveChat(page, subscriber, session, event)
                })
                .catch(error => {
                  logger.serverLog(TAG, `Failed to update session ${JSON.stringify(error)}`)
                })
            }
          })
          .catch(error => {
            logger.serverLog(TAG, `Failed to fetch session ${JSON.stringify(error)}`)
          })
      }
    })
    .catch(error => {
      logger.serverLog(TAG, `Failed to fetch company profile ${JSON.stringify(error)}`)
    })
}
function saveLiveChat (page, subscriber, session, event) {
  let chatPayload = {
    format: 'facebook',
    sender_id: subscriber._id,
    recipient_id: page.userId._id,
    sender_fb_id: subscriber.senderId,
    recipient_fb_id: page.pageId,
    session_id: session && session._id ? session._id : '',
    company_id: page.companyId,
    status: 'unseen', // seen or unseen
    payload: event.message
  }
  console.log('subscriber: ', util.inspect(subscriber))
  if (subscriber) {
    BotsDataLayer.findOneBotObjectUsingQuery({ pageId: subscriber.pageId._id.toString() })
      .then(bot => {
        console.log('bot: ', util.inspect(bot))
        if (bot) {
          if (bot.blockedSubscribers.indexOf(subscriber._id) === -1) {
            console.log(TAG, 'going to send bot reply')
            botController.respond(subscriber.pageId._id.toString(), subscriber.senderId, event.message.text)
          }
        }
      })
      .catch(error => {
        logger.serverLog(TAG, `Failed to fetch bot ${JSON.stringify(error)}`)
      })
  }
  utility.callApi(`webhooks/query`, 'post', {pageId: page.pageId})
    .then(webhooks => {
      let webhook = webhooks[0]
      if (webhooks.length > 0 && webhook.isEnabled) {
        logger.serverLog(TAG, `webhook in live chat ${webhook}`)
        needle.get(webhook.webhook_url, (err, r) => {
          if (err) {
            logger.serverLog(TAG, err)
            logger.serverLog(TAG, `response ${r.statusCode}`)
          } else if (r.statusCode === 200) {
            if (webhook.optIn.LIVE_CHAT_ACTIONS) {
              var data = {
                subscription_type: 'LIVE_CHAT_ACTIONS',
                payload: JSON.stringify({
                  format: 'facebook',
                  subscriberId: subscriber.senderId,
                  pageId: page.pageId,
                  session_id: session._id,
                  company_id: page.companyId,
                  payload: event.message
                })
              }
              needle.post(webhook.webhook_url, data,
                (error, response) => {
                  if (error) logger.serverLog(TAG, err)
                })
            }
          } else {
            notificationsUtility.saveNotification(webhook)
          }
        })
      }
    })
    .catch(error => {
      logger.serverLog(TAG, `Failed to fetch subscriber ${JSON.stringify(error)}`)
    })
  if (event.message) {
    let urlInText = parseUrl(event.message.text)
    if (urlInText !== null && urlInText !== '') {
      og(urlInText, function (err, meta) {
        if (err) return logger.serverLog(TAG, err)
        chatPayload.url_meta = meta
        saveChatInDb(page, session, chatPayload, subscriber, event)
      })
    } else {
      saveChatInDb(page, session, chatPayload, subscriber, event)
    }
  }
}
function saveChatInDb (page, session, chatPayload, subscriber, event) {
  LiveChatDataLayer.createFbMessageObject(chatPayload)
    .then(chat => {
      require('./../../../config/socketio').sendMessageToClient({
        room_id: page.companyId,
        body: {
          action: 'new_chat',
          payload: {
            session_id: session._id,
            chat_id: chat._id,
            text: chatPayload.payload.text,
            name: subscriber.firstName + ' ' + subscriber.lastName,
            subscriber: subscriber,
            message: chat
          }
        }
      })
      sendautomatedmsg(event, page)
    })
    .catch(error => {
      logger.serverLog(TAG, `Failed to create live chate ${JSON.stringify(error)}`)
    })
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
    console.log('indexValue', index)
    needle.get(
      `https://graph.facebook.com/v2.10/${req.recipient.id}?fields=access_token&access_token=${page.userId.facebookInfo.fbToken}`,
      (err3, response) => {
        if (err3) {
          logger.serverLog(TAG,
            `Page token error from graph api ${JSON.stringify(err3)}`)
        }
        console.log('response from get', response.body)
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
          utility.callApi(`subscribers/query`, 'post', { senderId: req.sender.id, unSubscribedBy: 'subscriber' })
            .then(subscribers => {
              if (subscribers.length > 0) {
                messageData = {
                  text: 'You have subscribed to our broadcasts. Send "stop" to unsubscribe'
                }
                utility.callApi(`subscribers`, 'put', {query: { senderId: req.sender.id }, newPayload: { isSubscribed: true }, options: {}})
                  .then(updated => {
                  })
                  .catch(error => {
                    logger.serverLog(TAG, `Failed to update subscriber ${JSON.stringify(error)}`)
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
              logger.serverLog(TAG, `Failed to fetch subscribers ${JSON.stringify(error)}`)
            })
        }

        const data = {
          messaging_type: 'RESPONSE',
          recipient: JSON.stringify({ id: req.sender.id }), // this is the subscriber id
          message: JSON.stringify(messageData)
        }
        console.log('messageData', data)
        console.log('unsubscribeResponse', unsubscribeResponse)
        if (messageData.text !== undefined || unsubscribeResponse) {
          needle.post(
            `https://graph.facebook.com/v2.6/me/messages?access_token=${response.body.access_token}`,
            data, (err4, respp) => {
              console.log('respp.body', respp.body)
              if (!unsubscribeResponse) {
                utility.callApi(`subscribers/query`, 'post', { senderId: req.sender.id })
                  .then(subscribers => {
                    SessionsDataLayer.findOneSessionUsingQuery({subscriber_id: subscribers[0]._id, page_id: page._id, company_id: page.companyId})
                      .then(session => {
                        if (!session) {
                          return logger.serverLog(TAG,
                            `No chat session was found for workflow`)
                        }
                        const chatMessage = {
                          sender_id: page._id, // this is the page id: _id of Pageid
                          recipient_id: subscribers[0]._id, // this is the subscriber id: _id of subscriberId
                          sender_fb_id: page.pageId, // this is the (facebook) :page id of pageId
                          recipient_fb_id: subscribers[0].senderId, // this is the (facebook) subscriber id : pageid of subscriber id
                          session_id: session._id,
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
                              logger.serverLog(TAG, `webhook in live chat ${webhooks}`)
                              needle.get(webhooks.webhook_url, (err, r) => {
                                if (err) {
                                  logger.serverLog(TAG, err)
                                } else if (r.statusCode === 200) {
                                  if (webhooks.optIn.LIVE_CHAT_ACTIONS) {
                                    var data = {
                                      subscription_type: 'LIVE_CHAT_ACTIONS',
                                      payload: JSON.stringify({
                                        pageId: page.pageId, // this is the (facebook) :page id of pageId
                                        subscriberId: subscribers[0].senderId, // this is the (facebook) subscriber id : pageid of subscriber id
                                        session_id: session._id,
                                        company_id: page.companyId, // this is admin id till we have companies
                                        payload: {
                                          componentType: 'text',
                                          text: messageData.text
                                        }
                                      })
                                    }
                                    needle.post(webhooks[0].webhook_url, data,
                                      (error, response) => {
                                        if (error) logger.serverLog(TAG, err)
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
                            logger.serverLog(TAG, `Failed to fetch webhook ${JSON.stringify(error)}`)
                          })
                        LiveChatDataLayer.createFbMessageObject(chatMessage)
                          .then(chatMessageSaved => {
                            SessionsDataLayer.updateSessionObject(session._id, {last_activity_time: Date.now()})
                              .then(updated => {
                                logger.serverLog(TAG, `Session updated successfully`)
                              })
                              .catch(error => {
                                logger.serverLog(TAG, `Failed to update session ${JSON.stringify(error)}`)
                              })
                          })
                      })
                      .catch(error => {
                        logger.serverLog(TAG, `Failed to fetch session ${JSON.stringify(error)}`)
                      })
                  })
                  .catch(error => {
                    logger.serverLog(TAG, `Failed to fetch subscribers ${JSON.stringify(error)}`)
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
function parseUrl (text) {
  // eslint-disable-next-line no-useless-escape
  let urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig
  let onlyUrl = ''
  if (text) {
    let testUrl = text.match(urlRegex)
    onlyUrl = testUrl && testUrl[0]
  }
  return onlyUrl
}
