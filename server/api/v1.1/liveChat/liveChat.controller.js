const logger = require('../../../components/logger')
const logicLayer = require('./liveChat.logiclayer')
const TAG = '/api/v1/liveChat/liveChat.controller.js'
const og = require('open-graph')
const { callApi } = require('../utility')
const needle = require('needle')
const request = require('request')
const webhookUtility = require('../notifications/notifications.utility')
// const util = require('util')
const async = require('async')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')
const { record } = require('../../global/messageStatistics')
const { sendOpAlert } = require('../../global/operationalAlert')
const { updateCompanyUsage } = require('../../global/billingPricing')

exports.index = function (req, res) {
  if (req.params.subscriber_id) {
    let query = {
      subscriber_id: req.params.subscriber_id,
      company_id: req.user.companyId,
      _id: req.body.page === 'next' ? { $lt: req.body.last_id } : {$exists: true}
    }

    let messagesData = logicLayer.getQueryData('', 'aggregate', query, 0, { datetime: -1 }, req.body.number)

    async.parallelLimit([
      function (callback) {
        callApi(`subscribers/query`, 'post', {_id: req.params.subscriber_id})
          .then(data => {
            data = data[0]
            callback(null, data)
          })
          .catch(err => {
            callback(err)
          })
      },
      function (callback) {
        callApi(`livechat/query`, 'post', messagesData, 'kibochat')
          .then(data => {
            callback(null, data)
          })
          .catch(err => {
            callback(err)
          })
      }
    ], 10, function (err, results) {
      if (err) {
        return res.status(500).json({status: 'failed', payload: err})
      } else {
        let chatCount = results[0]
        let fbchats = results[1].reverse()
        fbchats = logicLayer.setChatProperties(fbchats)
        let payload = {
          chat: fbchats,
          count: chatCount.messagesCount
        }
        sendSuccessResponse(res, 200, payload)
      }
    })
  } else {
    sendErrorResponse(res, 400, 'Parameter session_id is required!')
  }
}

exports.SMPStatus = function (req, res) {
  return res.status(200).json({status: 'success', payload: req.user.SMPStatus})
}

exports.search = function (req, res) {
  let searchData = {
    subscriber_id: req.body.subscriber_id,
    company_id: req.user.companyId,
    $text: { $search: req.body.text }
  }
  if (req.body.datetime) {
    searchData.datetime = {$lt: new Date(req.body.datetime)}
  }
  callApi(`livechat/search`, 'post', searchData, 'kibochat')
    .then(chats => {
      sendSuccessResponse(res, 200, chats)
    })
    .catch(err => {
      sendErrorResponse(res, 500, '', err)
    })
}

exports.geturlmeta = function (req, res) {
  var url = req.body.url
  logger.serverLog(TAG, `Url for Meta: ${url}`, 'error')
  og(url, (err, meta) => {
    if (err) {
      sendErrorResponse(res, 404, '', 'Meta data not found')
    } else {
      logger.serverLog(TAG, `Url Meta: ${meta}`, 'error')
      sendSuccessResponse(res, 200, meta)
    }
  })
}

/*
*  Create function has the following steps:
* 1. Create Message Object
* 2. Send webhook response
* 3. Update subscriber object
* 4. Find subscriber details.
* 5. Update Bot Block list
* 6. Create AutomationQueue Object
*/
exports.create = function (req, res) {
  let fbMessageObject = logicLayer.prepareFbMessageObject(req.body)
  async.parallelLimit([
    // Create Message Object
    function (callback) {
      callApi(`livechat`, 'post', fbMessageObject, 'kibochat')
        .then(message => {
          callback(null, message)
        })
        .catch(err => {
          callback(err)
        })
    },
    // Send webhook response
    function (callback) {
      callApi(`webhooks/query/`, 'post', { pageId: req.body.sender_fb_id })
        .then(webhook => {
          webhook = webhook[0]
          if (webhook && webhook.isEnabled) {
            needle('get', webhook.webhook_url)
              .then(r => {
                if (r.statusCode === 200) {
                  logicLayer.webhookPost(needle, webhook, req, res)
                  callback(null, webhook)
                } else {
                  webhookUtility.saveNotification(webhook)
                  callback(null, webhook)
                }
              })
              .catch(err => {
                callback(err)
              })
          } else {
            callback(null, webhook)
          }
        })
        .catch(err => {
          callback(err)
        })
    },
    // increment messagesCount in subscribers table
    function (callback) {
      let subscriberData = {
        query: {_id: req.body.subscriber_id},
        newPayload: {$inc: { messagesCount: 1 }},
        options: {}
      }
      callApi(`subscribers/update`, 'put', subscriberData)
        .then(updated => {
          logger.serverLog(TAG, `updated subscriber ${updated}`)
          callback(null, updated)
        })
        .catch(err => {
          callback(err)
        })
    },
    // Update subscriber object
    function (callback) {
      let subscriberData = {
        query: {_id: req.body.subscriber_id},
        newPayload: {
          last_activity_time: Date.now(), agent_activity_time: Date.now(), pendingResponse: false},
        options: {}
      }
      callApi(`subscribers/update`, 'put', subscriberData)
        .then(updated => {
          updateCompanyUsage(req.user.companyId, 'chat_messages', 1)
          _removeSubsWaitingForUserInput(req.body.subscriber_id)
          logger.serverLog(TAG, `updated subscriber again ${updated}`)
          fbMessageObject.datetime = new Date()
          require('./../../../config/socketio').sendMessageToClient({
            room_id: req.user.companyId,
            body: {
              action: 'agent_replied',
              payload: {
                subscriber_id: req.body.subscriber_id,
                message: fbMessageObject,
                action: 'agent_replied',
                user_id: req.user._id,
                user_name: req.user.name
              }
            }
          })
          callback(null, updated)
        })
        .catch(err => {
          callback(err)
        })
    },
    // Find subscriber details.
    function (callback) {
      callApi(`subscribers/${req.body.subscriber_id}`, 'get', {}, 'accounts', req.headers.authorization)
        .then(subscriber => {
          let messageData = logicLayer.prepareSendAPIPayload(
            subscriber.senderId,
            req.body.payload,
            subscriber.firstName,
            subscriber.lastName,
            true
          )
          logger.serverLog(TAG, `got subscriber ${subscriber}`)
          record('messengerChatOutGoing')
          request(
            {
              'method': 'POST',
              'json': true,
              'formData': messageData,
              'uri': 'https://graph.facebook.com/v5.0/me/messages?access_token=' +
                subscriber.pageId.accessToken
            },
            (err, res) => {
              if (err) {
                callback(err)
              } else if (res.statusCode !== 200) {
                callback(res.body.error)
                if (res.body.error) {
                  sendOpAlert(res.body.error, 'comment controller in kiboengage', req.body.sender_id, req.user._id, req.user.companyId)
                }
              } else {
                callback(null, subscriber)
              }
            })
        })
        .catch(err => {
          callback(err)
        })
    }
  ], 10, function (err, results) {
    if (err) {
      return res.status(500).json({status: 'failed', payload: err})
    } else {
      let fbMessageObject = results[0]
      let subscriber = results[4]
      let botId = ''
      async.parallelLimit([
        // Update Bot Block list
        function (callback) {
          let botsData = logicLayer.getQueryData('', 'findOne', { pageId: subscriber.pageId._id, companyId: subscriber.companyId })
          logger.serverLog(TAG, `botsData ${botsData}`)
          callApi(`smart_replies/query`, 'post', botsData, 'kibochat')
            .then(bot => {
              logger.serverLog(TAG, `bot found ${bot}`)
              if (!bot) {
                callback(null, 'No bot found!')
              } else {
                // TODO This is crashing when agent has a bot and sending an attahment from livechat
                botId = bot._id
                let arr = bot.blockedSubscribers
                arr.push(subscriber._id)
                let updateBotData = logicLayer.getUpdateData('updateOne', {_id: botId}, {blockedSubscribers: arr})
                return callApi(`smart_replies`, 'put', updateBotData, '', 'kibochat')
              }
            })
            .then(result => {
              logger.serverLog(TAG, `result ${result}`)
              let timeNow = new Date()
              let automationQueue = {
                automatedMessageId: botId,
                subscriberId: subscriber._id,
                companyId: req.body.company_id,
                type: 'bot',
                scheduledTime: timeNow.setMinutes(timeNow.getMinutes() + 30)
              }
              return callApi(`automation_queue/create`, 'post', automationQueue, 'kiboengage')
            })
            .then(automationObject => {
              callback(null, automationObject)
            })
            .catch(err => {
              logger.serverLog(TAG, `in catch1 ${err}`)
              callback(err)
            })
        }
      ], 10, function (err, values) {
        if (err) {
          logger.serverLog(TAG, `error found ${err}`)
          sendErrorResponse(res, 400, 'Meta data not found')
        } else {
          sendSuccessResponse(res, 200, fbMessageObject)
        }
      })
    }
  })
}

const _removeSubsWaitingForUserInput = (subscriberId) => {
  let waitingForUserInput = {
    componentIndex: -1
  }
  callApi(`subscribers/update`, 'put', {query: {_id: subscriberId, waitingForUserInput: { '$ne': null }}, newPayload: {waitingForUserInput: waitingForUserInput}, options: {}})
    .then(updated => {
      logger.serverLog(TAG, `Succesfully updated subscriber _removeSubsWaitingForUserInput`)
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to update subscriber ${JSON.stringify(err)}`)
    })
}
