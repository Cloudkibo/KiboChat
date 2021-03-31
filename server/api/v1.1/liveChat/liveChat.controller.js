const logger = require('../../../components/logger')
const logicLayer = require('./liveChat.logiclayer')
const TAG = '/api/v1/liveChat/liveChat.controller.js'
const og = require('open-graph')
const { callApi } = require('../utility')
const request = require('request')
// const util = require('util')
const async = require('async')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')
const { record } = require('../../global/messageStatistics')
const { deletePendingSessionFromStack } = require('../../global/messageAlerts')
const { sendWebhook } = require('../../global/sendWebhook')

exports.index = function (req, res) {
  if (req.params.subscriber_id) {
    let query = {
      subscriber_id: req.params.subscriber_id,
      company_id: req.user.companyId,
      _id: req.body.page === 'next' ? { $lt: req.body.last_id } : {$exists: true}
    }

    let messagesData = logicLayer.getQueryData('', 'aggregate', query, 0, { datetime: -1 }, req.body.number)

    callApi(`livechat/query`, 'post', messagesData, 'kibochat')
      .then(data => {
        let fbchats = data.reverse()
        fbchats = logicLayer.setChatProperties(fbchats)
        let payload = {
          chat: fbchats
        }
        sendSuccessResponse(res, 200, payload)
      })
      .catch(err => {
        const message = err || 'Error in fetching live chat'
        logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user, params: req.params}, 'error')
        sendErrorResponse(res, 500, err)
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
      const message = err || 'Error in searching live chat'
      logger.serverLog(message, `${TAG}: exports.search`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, '', err)
    })
}

exports.geturlmeta = function (req, res) {
  var url = req.body.url
  og(url, (err, meta) => {
    if (err) {
      const message = err || 'Error in getting url meta'
      logger.serverLog(message, `${TAG}: exports.geturlmeta`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 404, '', 'Meta data not found')
    } else {
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
    // increment messagesCount in subscribers table
    function (callback) {
      let subscriberData = {
        query: {_id: req.body.subscriber_id},
        newPayload: {$inc: { messagesCount: 1 }},
        options: {}
      }
      callApi(`subscribers/update`, 'put', subscriberData)
        .then(updated => {
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
          $set: {
            last_activity_time: Date.now(),
            agent_activity_time: Date.now(),
            pendingResponse: false,
            chatbotPaused: true
          },
          $unset: {pendingAt: 1}
        },
        options: {}
      }
      callApi(`subscribers/update`, 'put', subscriberData)
        .then(updated => {
          _removeSubsWaitingForUserInput(req.body.subscriber_id)
          fbMessageObject.datetime = new Date()
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
          console.log('subscriber', subscriber)
          let subscriberSenderId = JSON.stringify({
            'id': subscriber.senderId
          })
          if (subscriber.source === 'chat_plugin' && !subscriber.senderId) {
            subscriberSenderId = JSON.stringify({
              'user_ref': subscriber.user_ref
            })
          }
          callApi(`companyprofile/getAutomatedOptions`, 'get', {}, 'accounts', req.headers.authorization)
            .then(payload => {
              if (payload.showAgentName) {
                console.log('in if', payload)
                if (req.body.payload.componentType === 'text') {
                  req.body.payload.text = `${req.body.replied_by.name} sent:\r\n` + req.body.payload.text
                } else {
                  console.log('in else', payload)
                  request(
                    {
                      'method': 'POST',
                      'json': true,
                      'formData': {
                        'messaging_type': 'RESPONSE',
                        'recipient': subscriberSenderId,
                        'message': JSON.stringify({
                          'text': `${req.body.replied_by.name} sent:`,
                          'metadata': 'SENT_FROM_KIBOPUSH'
                        })
                      },
                      'uri': 'https://graph.facebook.com/v5.0/me/messages?access_token=' +
                        subscriber.pageId.accessToken
                    })
                }
              }
              let messageData = logicLayer.prepareSendAPIPayload(
                subscriberSenderId,
                req.body.payload,
                subscriber.firstName,
                subscriber.lastName,
                true
              )
              console.log('messageData', JSON.stringify(messageData))
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
                    let severity = 'error'
                    /* Error code 10 shows message is sent outside 24 hrs window. This error message shows on screen
                    hence logging this as info */
                    if (res.body.error.code && res.body.error.code === 10) {
                      severity = 'info'
                    }
                    let message = (res.body.error && res.body.error.message) || 'Error while sending message in live chat'
                    logger.serverLog(message, TAG, req.body, {messageData: messageData, subscriber: subscriber}, severity)
                  } else {
                    if (req.body.payload && req.body.payload.quickReplies) {
                      logicLayer.setSubscriberPayloadInfo(subscriber, req.body.payload)
                    }
                    callback(null, subscriber)
                  }
                })
            })
            .catch(err => {
              res.status(500).json({status: 'failed', payload: `Failed to fetch automated options ${err}`})
            })
        })
        .catch(err => {
          callback(err)
        })
    }, function (callback) {
      deletePendingSessionFromStack(req.body.subscriber_id)
      callback(null)
    }
  ], 10, function (err, results) {
    if (err) {
      const message = err || 'Error in callback function in async'
      logger.serverLog(message, `${TAG}: exports.create`, req.body, {user: req.user}, 'error')
      return res.status(500).json({status: 'failed', payload: err})
    } else {
      let fbMessageObject = results[0]
      let subscriber = results[3]
      sendWebhook('CHAT_MESSAGE', 'facebook', {
        from: 'kibopush',
        recipientId: subscriber.senderId,
        senderId: subscriber.pageId.pageId,
        timestamp: Date.now(),
        message: req.body.payload
      }, subscriber.pageId)
      let botId = ''
      async.parallelLimit([
        // Update Bot Block list
        function (callback) {
          let botsData = logicLayer.getQueryData('', 'findOne', { pageId: subscriber.pageId._id, companyId: subscriber.companyId })
          callApi(`smart_replies/query`, 'post', botsData, 'kibochat')
            .then(bot => {
              if (!bot) {
                callback(null, 'No bot found!')
                return null
              } else {
                // TODO This is crashing when agent has a bot and sending an attahment from livechat
                botId = bot._id
                let arr = bot.blockedSubscribers
                if (arr) {
                  arr.push(subscriber._id)
                  let updateBotData = logicLayer.getUpdateData('updateOne', {_id: botId}, {blockedSubscribers: arr})
                  return callApi(`smart_replies`, 'put', updateBotData, '', 'kibochat')
                }
              }
            })
            .then(result => {
              if (result) {
                let timeNow = new Date()
                let automationQueue = {
                  automatedMessageId: botId,
                  subscriberId: subscriber._id,
                  companyId: req.body.company_id,
                  type: 'bot',
                  scheduledTime: timeNow.setMinutes(timeNow.getMinutes() + 30)
                }
                return callApi(`automation_queue`, 'post', automationQueue, 'kiboengage')
              } else {
                return null
              }
            })
            .then(automationObject => {
              if (automationObject) {
                callback(null, automationObject)
              }
            })
            .catch(err => {
              callback(err)
            })
        }
      ], 10, function (err, values) {
        if (err) {
          const message = err || 'Meta data not found'
          logger.serverLog(message, `${TAG}: exports.create`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 400, 'Meta data not found')
        } else {
          fbMessageObject._id = req.body._id
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
    })
    .catch(err => {
      const message = err || 'Failed to update subscriber'
      logger.serverLog(message, `${TAG}: exports._removeSubsWaitingForUserInput`, {}, {waitingForUserInput, subscriberId}, 'error')
    })
}
