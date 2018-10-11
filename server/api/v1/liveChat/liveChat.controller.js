const logger = require('../../../components/logger')
const dataLayer = require('./liveChat.datalayer')
const sessionsDataLayer = require('../session/session.datalayer')
const botsDataLayer = require('../session/session.datalayer')
const logicLayer = require('./liveChat.logicLayer')
const automationQueueDataLayer = require('./smartReplies/smartReplies.datalayer')
const TAG = '/api/v1/liveChat/liveChat.controller.js'
const mongoose = require('mongoose')
const og = require('open-graph')
const callApi = '../utility'
const needle = require('needle')
const request = require('request')

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
      dataLayer.findAllFbMessageObjectsUsingQueryWithSortAndLimit(query, { datetime: -1 }, req.body.number)
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
  callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })
    .then(companyUser => {
      let fbMessageObject = logicLayer.prepareFbMessageObject(req.body)
      callApi(`webhooks/query/`, 'post', { pageId: req.body.sender_fb_id })
        .then(webhook => {
          if (webhook && webhook.isEnabled) {
            needle.get(webhook.webhook_url, (err, r) => {
              if (err) {
                return res.status(500).json({
                  status: 'failed',
                  description: `Internal Server Error in Finding Webhooks${JSON.stringify(err)}`
                })
              } else if (r.statusCode === 200) {
                logicLayer.webhookPost(needle, webhook, req, res)
              } else {
                // webhookUtility.saveNotification(webhook)
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
          sessionsDataLayer.findOneSessionObject(req.body.session_id)
            .then(session => {
              session.agent_activity_time = Date.now()
              sessionsDataLayer.updateSessionObject(session._id, session)
                .then(result => {
                  callApi(`subscribers/${req.body.recipient_id}`)
                    .then(subscriber => {
                      logger.serverLog(TAG, `Payload from the client ${JSON.stringify(req.body.payload)}`)
                      let messageData = logicLayer.prepareSendAPIPayload(
                        subscriber.senderId,
                        req.body.payload, subscriber.firstName, subscriber.lastName, true)
                      request(
                        {
                          'method': 'POST',
                          'json': true,
                          'formData': messageData,
                          'uri': 'https://graph.facebook.com/v2.6/me/messages?access_token=' +
                            session.page_id.accessToken
                        },
                        (err, res) => {
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
                      botsDataLayer.findOneBotsObjectUsingQuery({ 'pageId': session.page_id._id })
                        .then(bot => {
                          let arr = bot.blockedSubscribers
                          arr.push(session.subscriber_id)
                          bot.blockedSubscribers = arr
                          logger.serverLog(TAG, 'going to add sub-bot in queue')
                          botsDataLayer.updateBotsObject(bot._id, bot)
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
                              automationQueueDataLayer.createAutomationQueueObject(automationQueue)
                                .then(result => {
                                  logger.serverLog(TAG,
                                    `Automation Queue object saved`)
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
          return res.status(200).json({ status: 'success', payload: fbMessageObject })
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
