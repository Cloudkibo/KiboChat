const logger = require('../../../components/logger')
const logicLayer = require('./liveChat.logiclayer')
const TAG = '/api/v1/liveChat/liveChat.controller.js'
const og = require('open-graph')
const { callApi } = require('../utility')
const needle = require('needle')
const request = require('request')
const webhookUtility = require('../notifications/notifications.utility')
const util = require('util')

exports.index = function (req, res) {
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

  let messagesCountData = logicLayer.getQueryData('count', 'aggregate', { session_id: req.params.session_id })
  let messagesData = logicLayer.getQueryData('', 'aggregate', query, 0, { datetime: -1 }, req.body.number)

  let messagesCount = callApi(`livechat/query`, 'post', messagesCountData, '', 'kibochat')
  let messages = callApi(`livechat/query`, 'post', messagesData, '', 'kibochat')

  Promise.all([messagesCount, messages])
    .then(values => {
      let chatCount = values[0]
      let fbchats = values[1].reverse()
      fbchats = logicLayer.setChatProperties(fbchats)
      return res.status(200).json({ status: 'success',
        payload: { chat: fbchats, count: chatCount.length > 0 ? chatCount[0].count : 0 }
      })
    })
    .catch(err => {
      logger.serverLog(TAG, `Error at index ${util.inspect(err)}`)
      return res.status(500).json({status: 'failed', payload: err})
    })
}

exports.search = function (req, res) {
  let searchData = logicLayer.getQueryData('', 'findAll', { session_id: req.body.session_id, $text: { $search: req.body.text } })
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
  callApi(`livechat/update`, 'put', updateData, '', 'kibochat')
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
* 1. Find company user
* 2. Create Message Object and send webhook response
* 3. update session object
* 4. Find subscriber details.
* 5. Update Bot Block list
* 6. Create AutomationQueue Object
*/
exports.create = function (req, res) {
  let subscriberId = ''
  let fbMessageObject = {}
  let botId = ''

  let companyUserResponse = callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization)
  let webhookResponse = callApi(`webhooks/query/`, 'post', { pageId: req.body.sender_fb_id }, req.headers.authorization)
  let subscriberResponse = callApi(`subscribers/${req.body.recipient_id}`, 'get', {}, req.headers.authorization)

  companyUserResponse.then(companyUser => {
    logger.serverLog(TAG, `Company User ${util.inspect(companyUser)}`)
    fbMessageObject = logicLayer.prepareFbMessageObject(req.body)
    logger.serverLog(TAG, `FB Message Object ${util.inspect(fbMessageObject)}`)
    return callApi(`livechat`, 'post', fbMessageObject, '', 'kibochat')
  })
    .then(chatMessage => {
      logger.serverLog(TAG, `chatMessage ${util.inspect(chatMessage)}`)
      return webhookResponse
    })
    .then(webhook => {
      logger.serverLog(TAG, `webhook ${util.inspect(webhook)}`)
      webhook = webhook[0]
      if (webhook && webhook.isEnabled) {
        needle.get(webhook.webhook_url, (err, r) => {
          logger.serverLog(TAG, `webhook response ${util.inspect(r)}`)
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
      let sessionData = logicLayer.getUpdateData('updateOne', {_id: req.body.session_id}, {agent_activity_time: Date.now()})
      return callApi(`session/update`, 'put', sessionData, '', 'kibochat')
    })
    .then(session => {
      logger.serverLog(TAG, `updated session ${util.inspect(session)}`)
      if (session.is_assigned && session.assigned_to.type === 'team') {
        require('./../../../config/socketio').sendMessageToClient({
          room_id: req.user.companyId,
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
          room_id: req.user.companyId,
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
      return subscriberResponse
    })
    .then(subscriber => {
      logger.serverLog(TAG, `Subscriber ${util.inspect(subscriber)}`)
      logger.serverLog(TAG, `Payload from the client ${util.inspect(req.body.payload)}`)
      subscriberId = subscriber._id
      let messageData = logicLayer.prepareSendAPIPayload(
        subscriber.senderId,
        req.body.payload,
        subscriber.firstName,
        subscriber.lastName,
        true
      )
      logger.serverLog(TAG, `Message data ${util.inspect(messageData)}`)
      logger.serverLog(TAG, `Access_token ${util.inspect(subscriber.pageId.accessToken)}`)
      request(
        {
          'method': 'POST',
          'json': true,
          'formData': messageData,
          'uri': 'https://graph.facebook.com/v2.6/me/messages?access_token=' +
            subscriber.pageId.accessToken
        },
        (err, res) => {
          logger.serverLog(TAG, `send message live chat  ${util.inspect(res)}`)
          if (err) {
            return logger.serverLog(TAG, `At send message live chat ${JSON.stringify(err)}`)
          } else {
            if (res.statusCode !== 200) {
              logger.serverLog(TAG, `At send message live chat response ${JSON.stringify(res.body.error)}`)
            }
          }
        })
      let botsData = logicLayer.getQueryData('', 'findOne', { pageId: subscriber.pageId._id })
      return callApi(`smart_replies/query`, 'post', botsData, '', 'kibochat')
    })
    .then(bot => {
      if (bot) {
        logger.serverLog(TAG, `bot ${util.inspect(bot)}`)
        botId = bot._id
        let arr = bot.blockedSubscribers
        arr.push(subscriberId)
        logger.serverLog(TAG, 'going to add sub-bot in queue')
        let updateBotData = logicLayer.getUpdateData('updateOne', {_id: botId}, {blockedSubscribers: arr})
        return callApi(`smart_replies/update`, 'put', updateBotData, '', 'kibochat')
      } else {
        return res.status(200).json({ status: 'success', payload: fbMessageObject })
      }
    })
    .then(result => {
      logger.serverLog(TAG, `subscriber id added to blockedList bot`)
      let timeNow = new Date()
      let automationQueue = {
        automatedMessageId: botId,
        subscriberId: subscriberId,
        companyId: req.body.company_id,
        type: 'bot',
        scheduledTime: timeNow.setMinutes(timeNow.getMinutes() + 30)
      }
      return callApi(`automation_queue/create`, 'post', automationQueue, '', 'kiboengage')
    })
    .then(automationObject => {
      logger.serverLog(TAG, `Automation Queue object saved ${util.inspect(automationObject)}`)
      return res.status(200).json({ status: 'success', payload: fbMessageObject })
    })
    .catch(err => {
      return res.status(500).json({
        status: 'failed',
        description: `Internal Server Error ${JSON.stringify(err)}`
      })
    })
}
