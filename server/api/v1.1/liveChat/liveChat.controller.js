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

exports.index = function (req, res) {
  if (req.params.subscriber_id) {
    let query = {
      subscriber_id: req.params.subscriber_id,
      company_id: req.user.companyId,
      _id: req.body.page === 'next' ? { $lt: req.body.last_id } : {$exists: true}
    }

    let messagesCountData = logicLayer.getQueryData('count', 'aggregate', { subscriber_id: req.params.subscriber_id, company_id: req.user.companyId })
    let messagesData = logicLayer.getQueryData('', 'aggregate', query, 0, { datetime: -1 }, req.body.number)

    async.parallelLimit([
      function (callback) {
        callApi(`livechat/query`, 'post', messagesCountData, '', 'kibochat')
          .then(data => {
            callback(null, data)
          })
          .catch(err => {
            callback(err)
          })
      },
      function (callback) {
        callApi(`livechat/query`, 'post', messagesData, '', 'kibochat')
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
        return res.status(200).json({ status: 'success',
          payload: { chat: fbchats, count: chatCount.length > 0 ? chatCount[0].count : 0 }
        })
      }
    })
  } else {
    return res.status(400).json({status: 'failed', payload: 'Parameter session_id is required!'})
  }
}

exports.search = function (req, res) {
  let searchData = logicLayer.getQueryData('', 'findAll', { subscriber_id: req.body.subscriber_id, company_id: req.user.companyId, $text: { $search: req.body.text } })
  callApi(`livechat/query`, 'post', searchData, '', 'kibochat')
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
  let updateData = logicLayer.getUpdateData('updateOne', { _id: req.body.id }, { $set: { urlmeta: req.body.urlmeta } }, false, false, true)
  callApi(`livechat`, 'put', updateData, '', 'kibochat')
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
* 1. Create Message Object
* 2. Send webhook response
* 3. Update subscriber object
* 4. Find subscriber details.
* 5. Update Bot Block list
* 6. Create AutomationQueue Object
*/
exports.create = function (req, res) {
  async.parallerLimit([
    // Create Message Object
    function (callback) {
      let fbMessageObject = logicLayer.prepareFbMessageObject(req.body)
      callApi(`livechat`, 'post', fbMessageObject, '', 'kibochat')
        .then(message => {
          callback(null, message)
        })
        .catch(err => {
          callback(err)
        })
    },
    // Send webhook response
    function (callback) {
      callApi(`webhooks/query/`, 'post', { pageId: req.body.sender_fb_id }, req.headers.authorization)
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
          }
        })
        .catch(err => {
          callback(err)
        })
    },
    // Update subscriber object
    function (callback) {
      let subscriberData = {
        query: {_id: req.body.subscriber_id},
        newPayload: {last_activity_time: Date.now(), agent_activity_time: Date.now()},
        options: {}
      }
      callApi(`subscribers/update`, 'put', subscriberData, req.headers.authorization)
        .then(updated => {
          require('./../../../config/socketio').sendMessageToClient({
            room_id: req.user.companyId,
            body: {
              action: 'agent_replied',
              payload: {
                session_id: req.body.subscriber_id,
                user_id: req.user._id,
                user_name: req.user.name
              }
            }
          })
        })
        .catch(err => {
          callback(err)
        })
    },
    // Find subscriber details.
    function (callback) {
      callApi(`subscribers/${req.body.subscriber_id}`, 'get', {}, req.headers.authorization)
        .then(subscriber => {
          let messageData = logicLayer.prepareSendAPIPayload(
            subscriber.senderId,
            req.body.payload,
            subscriber.firstName,
            subscriber.lastName,
            true
          )
          request(
            {
              'method': 'POST',
              'json': true,
              'formData': messageData,
              'uri': 'https://graph.facebook.com/v2.6/me/messages?access_token=' +
                subscriber.pageId.accessToken
            },
            (err, res) => {
              if (err) {
                callback(err)
              } else if (res.statusCode !== 200) {
                callback(res.error)
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
      let subscriber = results[3]
      let botId = ''
      async.parallerLimit([
        // Update Bot Block list
        function (callback) {
          let botsData = logicLayer.getQueryData('', 'findOne', { pageId: subscriber.pageId._id, companyId: subscriber.companyId })
          callApi(`smart_replies/query`, 'post', botsData, '', 'kibochat')
            .then(bot => {
              if (!bot) {
                callback(null, 'No bot found!')
              } else {
                botId = bot._id
                let arr = bot.blockedSubscribers
                arr.push(subscriber._id)
                let updateBotData = logicLayer.getUpdateData('updateOne', {_id: botId}, {blockedSubscribers: arr})
                return callApi(`smart_replies`, 'put', updateBotData, '', 'kibochat')
              }
            })
            .then(result => {
              let timeNow = new Date()
              let automationQueue = {
                automatedMessageId: botId,
                subscriberId: subscriber._id,
                companyId: req.body.company_id,
                type: 'bot',
                scheduledTime: timeNow.setMinutes(timeNow.getMinutes() + 30)
              }
              return callApi(`automation_queue/create`, 'post', automationQueue, '', 'kiboengage')
            })
            .then(automationObject => {
              callback(null, automationObject)
            })
            .catch(err => {
              callback(err)
            })
        }
      ], 10, function (err, values) {
        if (err) {
          return res.status(500).json({status: 'failed', payload: err})
        } else {
          return res.status(200).json({ status: 'success', payload: fbMessageObject })
        }
      })
    }
  })
}
