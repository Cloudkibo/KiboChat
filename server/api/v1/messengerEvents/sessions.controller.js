const utility = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/v1/messengerEvents/sessions.controller'
const SessionsDataLayer = require('../sessions/sessions.datalayer')
const LiveChatDataLayer = require('../liveChat/liveChat.datalayer')
const BotsDataLayer = require('../smartReplies/bots.datalayer')
const needle = require('needle')
const og = require('open-graph')
const notificationsUtility = require('../notifications/notifications.utility')
exports.index = function (req, res) {
  // logger.serverLog(TAG, `payload received in sessions ${JSON.stringify(req.body)}`)
  // res.status(200).json({
  //   status: 'success',
  //   description: `received the payload`
  // })
  // const event = req.body.entry[0].messaging[0]
  // const sender = event.sender.id
  // const pageId = event.recipient.id
  // utility.callApi(`pages/query`, 'post', {pageId: pageId, connected: true})
  //   .then(page => {
  //     page = page[0]
  //     utility.callApi(`subscribers/query`, 'post', {senderId: sender, pageId: page._id})
  //       .then(subscriber => {
  //         createSession(page[0], subscriber[0], event, req)
  //       })
  //       .catch(error => {
  //         logger.serverLog(TAG, `Failed to fetch subscriber ${JSON.stringify(error)}`)
  //       })
  //   })
  //   .catch(error => {
  //     logger.serverLog(TAG, `Failed to fetch page ${JSON.stringify(error)}`)
  //   })
}
exports.index = function (req, res) {
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
                      // add paid plan check later
                      // if (planUsage.sessions !== -1 && companyUsage.sessions >= planUsage.sessions) {
                      //   notificationsUtility.limitReachedNotification('sessions', company)
                      //   logger.serverLog(TAG, `Sessions limit reached`)
                      // } else {
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
                              const message = error || 'Failed to update company usage'
                              logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
                            })
                          saveLiveChat(page, subscriber, sessionSaved, event)
                        })
                        .catch(error => {
                          const message = error || 'Failed to create new session'
                          logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
                        })
                    })
                    .catch(error => {
                      const message = error || 'Failed to fetch company usage'
                      logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
                    })
                })
                .catch(error => {
                  const message = error || 'Failed to fetch plan usage'
                  logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
                })
            } else {
              let updatePayload = { last_activity_time: Date.now() }
              if (session.status === 'resolved') {
                updatePayload.status = 'new'
              }
              SessionsDataLayer.updateSessionObject(session._id, updatePayload)
                .then(updated => {
                  saveLiveChat(page, subscriber, session, event)
                })
                .catch(error => {
                  const message = error || 'Failed to update session'
                  logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
                })
            }
          })
          .catch(error => {
            const message = error || 'Failed to fetch session'
            logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
          })
      }
    })
    .catch(error => {
      const message = error || 'Failed to fetch company profile'
      logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
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
  if (subscriber) {
    BotsDataLayer.findOneBotObjectUsingQuery({ pageId: subscriber.pageId.toString() })
      .then(bot => {
        if (bot) {
          if (bot.blockedSubscribers.indexOf(subscriber._id) === -1) {
            //  botController.respond(page.pageId, subscriber.senderId, event.message.text)
          }
        }
      })
      .catch(error => {
        const message = error || 'Failed to fetch bot'
        logger.serverLog(message, `${TAG}: exports.saveLiveChat`, {}, {page, subscriber, session, event}, 'error')
      })
  }
  utility.callApi(`webhooks/query`, 'post', {pageId: page.pageId})
    .then(webhooks => {
      let webhook = webhooks[0]
      if (webhooks.length > 0 && webhook.isEnabled) {
        needle.get(webhook.webhook_url, (err, r) => {
          if (err) {
            const message = err || 'Failed to call webhook'
            logger.serverLog(message, `${TAG}: exports.saveLiveChat`, {}, {page, subscriber, session, event}, 'error')
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
                  if (error) {
                    const message = error || 'Failed to call webhook'
                    logger.serverLog(message, `${TAG}: exports.saveLiveChat`, {}, {page, subscriber, session, event}, 'error')
                  }
                })
            }
          } else {
            notificationsUtility.saveNotification(webhook)
          }
        })
      }
    })
    .catch(error => {
      const message = error || 'Failed to fetch subscriber'
      logger.serverLog(message, `${TAG}: exports.saveLiveChat`, {}, {page, subscriber, session, event}, 'error')
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
      const message = error || 'Failed to create live chat'
      logger.serverLog(message, `${TAG}: exports.saveChatInDb`, {}, {page, session, chatPayload, subscriber, event}, 'error')
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
    needle.get(
      `https://graph.facebook.com/v6.0/${req.recipient.id}?fields=access_token&access_token=${page.userId.facebookInfo.fbToken}`,
      (err3, response) => {
        if (err3) {
          const message = err3 || 'Page token error from graph api'
          logger.serverLog(message, `${TAG}: exports.sendautomatedmsg`, {}, {message: req.message, page}, 'error')
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
          utility.callApi(`subscribers/query`, 'post', { senderId: req.sender.id, unSubscribedBy: 'subscriber', companyId: page.companyId, completeInfo: true })
            .then(subscribers => {
              if (subscribers.length > 0) {
                messageData = {
                  text: 'You have subscribed to our broadcasts. Send "stop" to unsubscribe'
                }
                utility.callApi(`subscribers`, 'put', {query: { senderId: req.sender.id }, newPayload: { isSubscribed: true }, options: {}})
                  .then(updated => {
                  })
                  .catch(error => {
                    const message = error || 'Failed to update subscriber'
                    logger.serverLog(message, `${TAG}: exports.sendautomatedmsg`, {}, {message: req.message, page}, 'error')
                  })
                const data = {
                  messaging_type: 'RESPONSE',
                  recipient: { id: req.sender.id }, // this is the subscriber id
                  message: messageData
                }
                needle.post(
                  `https://graph.facebook.com/v6.0/me/messages?access_token=${response.body.access_token}`,
                  data, (err4, respp) => {
                    if (err4) {
                      const message = err4 || 'Failed to send message'
                      logger.serverLog(message, `${TAG}: exports.sendautomatedmsg`, {}, {message: req.message, page}, 'error')
                    }
                  })
              }
            })
            .catch(error => {
              const message = error || 'Failed to fetch subscribers'
              logger.serverLog(message, `${TAG}: exports.sendautomatedmsg`, {}, {}, 'error')
            })
        }

        const data = {
          messaging_type: 'RESPONSE',
          recipient: { id: req.sender.id }, // this is the subscriber id
          message: messageData
        }
        if (messageData.text !== undefined || unsubscribeResponse) {
          needle.post(
            `https://graph.facebook.com/v6.0/me/messages?access_token=${response.body.access_token}`,
            data, (err4, respp) => {
              if (err4) {
                const message = err4 || 'Failed to send message'
                logger.serverLog(message, `${TAG}: exports.sendautomatedmsg`, {}, {message: req.message, page}, 'error')
              }
              if (!unsubscribeResponse) {
                utility.callApi(`subscribers/query`, 'post', { senderId: req.sender.id, companyId: page.companyId, completeInfo: true })
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
                              needle.get(webhooks.webhook_url, (err, r) => {
                                if (err) {
                                  const message = err || 'error in sending webhook'
                                  logger.serverLog(message, `${TAG}: exports.sendautomatedmsg`, {}, {}, 'error')
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
                            const message = error || 'Failed to fetch webhook'
                            logger.serverLog(message, `${TAG}: exports.sendautomatedmsg`, {}, {message: req.message, page}, 'error')
                          })
                        LiveChatDataLayer.createFbMessageObject(chatMessage)
                          .then(chatMessageSaved => {
                            SessionsDataLayer.updateSessionObject(session._id, {last_activity_time: Date.now()})
                              .then(updated => {
                              })
                              .catch(error => {
                                const message = error || 'Failed to update session'
                                logger.serverLog(message, `${TAG}: exports.sendautomatedmsg`, {}, {message: req.message, page}, 'error')
                              })
                          })
                      })
                      .catch(error => {
                        const message = error || 'Failed to fetch session'
                        logger.serverLog(message, `${TAG}: exports.sendautomatedmsg`, {}, {message: req.message, page}, 'error')
                      })
                  })
                  .catch(error => {
                    const message = error || 'Failed to fetch subscribers'
                    logger.serverLog(message, `${TAG}: exports.sendautomatedmsg`, {}, {message: req.message, page}, 'error')
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
