const logger = require('../../../components/logger')
const logicLayer = require('./smsChat.logiclayer')
const TAG = '/api/v1/liveChat/liveChat.controller.js'
const { callApi } = require('../utility')
const async = require('async')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')
const { record } = require('../../global/messageStatistics')
const { sendOpAlert } = require('../../global/operationalAlert')

exports.index = function (req, res) {
  if (req.params.contactId) {
    let query = {
      contactId: req.params.contactId,
      companyId: req.user.companyId,
      _id: req.body.page === 'next' ? { $lt: req.body.last_id } : {$exists: true}
    }

    let messagesCountData = logicLayer.getQueryData('count', 'aggregate', { contactId: req.params.contactId, companyId: req.user.companyId })
    let messagesData = logicLayer.getQueryData('', 'aggregate', query, 0, { datetime: -1 }, req.body.number)

    async.parallelLimit([
      function (callback) {
        callApi(`smsChat/query`, 'post', messagesCountData, 'kibochat')
          .then(data => {
            callback(null, data)
          })
          .catch(err => {
            callback(err)
          })
      },
      function (callback) {
        callApi(`smsChat/query`, 'post', messagesData, 'kibochat')
          .then(data => {
            callback(null, data)
          })
          .catch(err => {
            callback(err)
          })
      }
    ], 10, function (err, results) {
      if (err) {
        const message = err || 'Error in async calls'
        logger.serverLog(message, `${TAG}: exports.index`, req.body, {params: req.params, user: req.user}, 'error')
        sendErrorResponse(res, 500, err)
      } else {
        let chatCount = results[0]
        let fbchats = results[1].reverse()
        fbchats = logicLayer.setChatProperties(fbchats)
        sendSuccessResponse(res, 200, { chat: fbchats, count: chatCount.length > 0 ? chatCount[0].count : 0 })
      }
    })
  } else {
    sendErrorResponse(res, 400, 'Parameter session_id is required!')
  }
}

const isUnverfiedTwilioNumber = function (err) {
  if (err && err.message && err.message.includes('unverified')) {
    return true
  } else {
    return false
  }
}

exports.create = function (req, res) {
  callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email, populate: 'companyId' })
    .then(companyUser => {
      if (!companyUser) {
        sendErrorResponse(res, 500, '', 'The user account does not belong to any company. Please contact support')
      }
      let accountSid = companyUser.companyId.sms.accountSID
      let authToken = companyUser.companyId.sms.authToken
      let client = require('twilio')(accountSid, authToken)
      record('smsChatOutGoing')
      client.messages
        .create({
          body: req.body.payload.text,
          from: req.body.senderNumber,
          to: req.body.recipientNumber
        })
        .then(response => {
          let MessageObject = logicLayer.prepareChat(req.body, companyUser)
          async.parallelLimit([
            function (callback) {
              callApi(`smsChat`, 'post', MessageObject, 'kibochat')
                .then(message => {
                  callback(null)
                })
                .catch(error => {
                  callback(error)
                })
            },
            function (callback) {
              let subscriberData = {
                query: {_id: req.body.contactId},
                newPayload: {
                  $inc: { messagesCount: 1 },
                  $set: {last_activity_time: Date.now(), hasChat: true, pendingResponse: false},
                  $unset: {waitingForBroadcastResponse: 1}
                },
                options: {}
              }
              callApi(`contacts/update`, 'put', subscriberData)
                .then(updated => {
                  MessageObject.datetime = new Date()
                  require('./../../../config/socketio').sendMessageToClient({
                    room_id: req.user.companyId,
                    body: {
                      action: 'agent_replied_sms',
                      payload: {
                        subscriber_id: req.body.contactId,
                        message: MessageObject,
                        action: 'agent_replied_sms',
                        user_id: req.user._id,
                        user_name: req.user.name
                      }
                    }
                  })
                  callback(null)
                })
                .catch(error => {
                  callback(error)
                })
            }
          ], 10, function (err, results) {
            if (err) {
              const message = err || 'Error in async calls while sending message'
              logger.serverLog(message, `${TAG}: exports.create`, req.body, {params: req.params, user: req.user}, 'error')
              sendErrorResponse(res, 500, `Failed to send message ${JSON.stringify(err)}`)
            } else {
              sendSuccessResponse(res, 200, results[0])
            }
          })
        })
        .catch(err => {
          const message = err || 'Failed to send twilio message'
          if (!isUnverfiedTwilioNumber(err)) {
            logger.serverLog(message, `${TAG}: exports.create`, req.body, {params: req.params, user: req.user}, 'error')
            sendErrorResponse(res, 500, `Failed to send message ${JSON.stringify(err)}`)
          } else {
            sendErrorResponse(res, 500, 'Please verify your number on Twilio Trail account before sending messages.')
          }
        })
    })
    .catch(error => {
      const message = error || 'Failed to fetch company user'
      logger.serverLog(message, `${TAG}: exports.create`, req.body, {params: req.params, user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
    })
}

exports.search = function (req, res) {
  let searchData = {
    contactId: req.body.subscriber_id,
    companyId: req.user.companyId,
    $text: { $search: req.body.text }
  }
  if (req.body.datetime) {
    searchData.datetime = {$lt: new Date(req.body.datetime)}
  }
  callApi(`smsChat/search`, 'post', searchData, 'kibochat')
    .then(chats => {
      sendSuccessResponse(res, 200, chats)
    })
    .catch(err => {
      const message = err || 'Failed to search in sms'
      logger.serverLog(message, `${TAG}: exports.create`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, '', err)
    })
}
