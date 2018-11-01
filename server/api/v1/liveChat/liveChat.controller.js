const logger = require('../../../components/logger')
const dataLayer = require('./liveChat.datalayer')
const sessionsDataLayer = require('../sessions/sessions.datalayer')
const botsDataLayer = require('../smartReplies/bots.datalayer')
const logicLayer = require('./liveChat.logiclayer')
const TAG = '/api/v1/liveChat/liveChat.controller.js'
const mongoose = require('mongoose')
const og = require('open-graph')
const utility = require('../utility')
const needle = require('needle')
const request = require('request')
const webhookUtility = require('../notifications/notifications.utility')

const util = require('util')

exports.index = function (req, res) {
  dataLayer.findFbMessageObjectUsingAggregate([
    { $match: { session_id: mongoose.Types.ObjectId(req.params.session_id) } },
    { $group: { _id: null, count: { $sum: 1 } } }
  ])
    .then(chatCount => {
      let query = {}
      if (req.body.page === 'next') {
        query = {
          session_id: req.params.session_id,
          _id: { $lt: req.body.last_id }
        }
      } else {
        query = {
          session_id: req.params.session_id
        }
      }
      dataLayer.findAllFbMessageObjectsUsingQueryWithSortAndLimit(query, { datetime: -1 }, parseInt(req.body.number, 10))
        .then(chats => {
          let fbchats = chats.reverse()
          fbchats = logicLayer.setChatProperties(fbchats)
          return res.status(500).json({ status: 'success',
            payload: { chat: fbchats, count: chatCount.length > 0 ? chatCount[0].count : 0 }
          })
        })
        .catch(err => {
          logger.serverLog(TAG, `Error at Finding All Message Objects With Query and Sort ${util.inspect(err)}`)
          return res.status(500).json({status: 'failed', payload: err})
        })
    })
    .catch(err => {
      logger.serverLog(TAG, `Error at index ${util.inspect(err)}`)
      return res.status(500).json({status: 'failed', payload: err})
    })
}

exports.search = function (req, res) {
  dataLayer.findAllFbMessageObjectsUsingQuery({ session_id: req.body.session_id, $text: { $search: req.body.text } })
    .then(chats => {
      return res.status(200).json({
        status: 'success',
        payload: chats
      })
    })
    .catch(err => {
      return res.status(500).json({status: 'failed', payload: err})
    })
}

exports.update = function (req, res) {
  dataLayer.genericFindByIdAndUpdate({ _id: req.body.id }, { $set: { urlmeta: req.body.urlmeta } })
    .then(updated => {
      return res.status(201).json({
        status: 'success',
        payload: updated
      })
    })
    .catch(err => {
      return res.status(500)
        .json({ status: 'failed', description: `Internal Server Error ${err}` })
    })
}

exports.geturlmeta = function (req, res) {
  var url = req.body.url
  logger.serverLog(TAG, `Url for Meta: ${url}`)
  og(url, (err, meta) => {
    if (err) {
      return res.status(404)
        .json({ status: 'failed', description: 'Meta data not found' })
    }
    logger.serverLog(TAG, `Url Meta: ${meta}`)
    res.status(200).json({ status: 'success', payload: meta })
  })
}

/*
*  Create function has the following steps:
* 1. Finds company user
* 2. Creates Message Object and send webhook response
* 3. Finds and update session object
* 4. Finds subscriber details.
* 5. Update Bot Block list
* 6. Create AutomationQueue Object
*/
exports.create = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization)
    .then(companyUser => {
      console.log('Company User', companyUser)
      let fbMessageObject = logicLayer.prepareFbMessageObject(req.body)
      console.log('FB Message Object', fbMessageObject)
      utility.callApi(`webhooks/query/`, 'post', { pageId: req.body.sender_fb_id }, req.headers.authorization)
        .then(webhook => {
          console.log('webhook', webhook)
          webhook = webhook[0]
          if (webhook && webhook.isEnabled) {
            needle.get(webhook.webhook_url, (err, r) => {
              console.log('webhook response', r)
              if (err) {
                return res.status(500).json({
                  status: 'failed',
                  description: `Internal Server Error in Finding Webhooks${JSON.stringify(err)}`
                })
              } else if (r.statusCode === 200) {
                logicLayer.webhookPost(needle, webhook, req, res)
              } else {
                webhookUtility.saveNotification(webhook)
              }
            })
          }
        })
        .catch(err => {
          return res.status(500).json({
            status: 'failed',
            description: `Internal Server Error ${JSON.stringify(err)}`
          })
        }) // webhook call ends
      dataLayer.createFbMessageObject(fbMessageObject)
        .then(chatMessage => {
          console.log('chatMessage', chatMessage)
          sessionsDataLayer.findOneSessionUsingQuery({_id: req.body.session_id})
            .then(session => {
              console.log('session', session)
              session.agent_activity_time = Date.now()
              sessionsDataLayer.updateSessionObject(session._id, session)
                .then(result => {
                  console.log('result', result)
                  utility.callApi(`pages/query/`, 'post', {_id: session.page_id}, req.headers.authorization)
                    .then(page => {
                      console.log(TAG, `Page ${JSON.stringify(page)}`)
                      utility.callApi(`subscribers/${req.body.recipient_id}`, 'get', {}, req.headers.authorization)
                        .then(subscriber => {
                          console.log('Subscriber', subscriber)
                          console.log(TAG, `Payload from the client ${JSON.stringify(req.body.payload)}`)
                          let messageData = logicLayer.prepareSendAPIPayload(
                            subscriber.senderId,
                            req.body.payload, subscriber.firstName, subscriber.lastName, true)
                          console.log(TAG, `Message data ${JSON.stringify(messageData)}`)
                          console.log(TAG, `Access_token ${JSON.stringify(subscriber.pageId.accessToken)}`)
                          request(
                            {
                              'method': 'POST',
                              'json': true,
                              'formData': messageData,
                              'uri': 'https://graph.facebook.com/v2.6/me/messages?access_token=' +
                                subscriber.pageId.accessToken
                            },
                            (err, res) => {
                              console.log(TAG, `send message live chat${JSON.stringify(res)}`)
                              if (err) {
                                return logger.serverLog(TAG,
                                  `At send message live chat ${JSON.stringify(err)}`)
                              } else {
                                if (res.statusCode !== 200) {
                                  logger.serverLog(TAG,
                                    `At send message live chat response ${JSON.stringify(
                                      res.body.error)}`)
                                }
                              }
                            })
                          botsDataLayer.findOneBotObjectUsingQuery({ 'pageId': subscriber.pageId._id })
                            .then(bot => {
                              if (bot) {
                                console.log(TAG, `bot ${JSON.stringify(bot)}`)
                                let arr = bot.blockedSubscribers
                                arr.push(session.subscriber_id)
                                bot.blockedSubscribers = arr
                                console.log(TAG, 'going to add sub-bot in queue')
                                botsDataLayer.updateBotObject(bot._id, bot)
                                  .then(result => {
                                    logger.serverLog(TAG,
                                      `subscriber id added to blockedList bot`)
                                    let timeNow = new Date()
                                    let automationQueue = {
                                      automatedMessageId: bot._id,
                                      subscriberId: subscriber._id,
                                      companyId: req.body.company_id,
                                      type: 'bot',
                                      scheduledTime: timeNow.setMinutes(timeNow.getMinutes() + 30)
                                    }
                                    utility.callApi(`automationQueue/create/`, 'post', automationQueue, req.headers.authorization, 'kiboengage')
                                      .then(result => {
                                        console.log(TAG,
                                          `Automation Queue object saved`)
                                        return res.status(200).json({ status: 'success', payload: fbMessageObject })
                                      })
                                      .catch(err => {
                                        return res.status(500).json({
                                          status: 'failed',
                                          description: `Internal Server Error ${JSON.stringify(err)}`
                                        })
                                      }) // create automationQueue call ends
                                  })
                                  .catch(err => {
                                    return res.status(500).json({
                                      status: 'failed',
                                      description: `Internal Server Error at Updating Bot ${JSON.stringify(err)}`
                                    })
                                  }) // update Bot call ends
                              } else {
                                return res.status(200).json({ status: 'success', payload: fbMessageObject })
                              }
                            })
                            .catch(err => {
                              return res.status(500).json({
                                status: 'failed',
                                description: `Internal Server Error at Finding Bot ${JSON.stringify(err)}`
                              })
                            }) // find Bot call ends
                        })
                        .catch(err => {
                          return res.status(500).json({
                            status: 'failed',
                            description: `Internal Server Error at Finding Subscriber ${JSON.stringify(err)}`
                          })
                        }) // find subscriber call ends
                    })
                    .catch(err => {
                      return res.status(500).json({
                        status: 'failed',
                        description: `Internal Server Error at fetching page ${JSON.stringify(err)}`
                      })
                    }) // page call ends
                  if (session.is_assigned && session.assigned_to.type === 'team') {
                    require('./../../../config/socketio').sendMessageToClient({
                      room_id: companyUser.companyId,
                      body: {
                        action: 'agent_replied',
                        payload: {
                          session_id: req.body.session_id,
                          user_id: req.user._id,
                          user_name: req.user.name
                        }
                      }
                    })
                  } else if (!session.is_assigned) {
                    require('./../../../config/socketio').sendMessageToClient({
                      room_id: companyUser.companyId,
                      body: {
                        action: 'agent_replied',
                        payload: {
                          session_id: req.body.session_id,
                          user_id: req.user._id,
                          user_name: req.user.name
                        }
                      }
                    })
                  }
                })
                .catch(err => {
                  return res.status(500).json({
                    status: 'failed',
                    description: `Internal Server Error at Updating Session${JSON.stringify(err)}`
                  })
                }) // update session call ends
            })
            .catch(err => {
              return res.status(500).json({
                status: 'failed',
                description: `Internal Server Error ${JSON.stringify(err)}`
              })
            }) // find session call ends
        })
        .catch(err => {
          return res.status(500).json({
            status: 'failed',
            description: `Internal Server Error in creating fbMessage object${JSON.stringify(err)}`
          })
        }) // create fbMessageObject call ends
    })
    .catch(err => {
      return res.status(500).json({status: 'failed', payload: err})
    }) // companyUser call ends
}
