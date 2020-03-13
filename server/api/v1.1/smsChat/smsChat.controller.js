const logger = require('../../../components/logger')
const logicLayer = require('./smsChat.logiclayer')
const TAG = '/api/v1/liveChat/liveChat.controller.js'
const { callApi } = require('../utility')
const async = require('async')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')
const { record } = require('../../global/messageStatistics')

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

exports.create = function (req, res) {
  callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email, populate: 'companyId' })
    .then(companyUser => {
      if (!companyUser) {
        sendErrorResponse(res, 500, '', 'The user account does not belong to any company. Please contact support')
      }
      let accountSid = companyUser.companyId.twilio.accountSID
      let authToken = companyUser.companyId.twilio.authToken
      let client = require('twilio')(accountSid, authToken)
      record('smsChatOutGoing')
      client.messages
        .create({
          body: req.body.payload.text,
          from: req.body.senderNumber,
          to: req.body.recipientNumber
        })
        .then(response => {
          logger.serverLog(TAG, `response from twilio ${JSON.stringify(response)}`)
          async.parallelLimit([
            function (callback) {
              let MessageObject = logicLayer.prepareChat(req.body, companyUser)
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
                newPayload: {$inc: { messagesCount: 1 }},
                options: {}
              }
              callApi(`contacts/update`, 'put', subscriberData)
                .then(updated => {
                })
                .catch(error => {
                  callback(error)
                })
            },
            function (callback) {
              let subscriberData = {
                query: {_id: req.body.contactId},
                newPayload: {last_activity_time: Date.now(), hasChat: true, pendingResponse: false},
                options: {}
              }
              callApi(`contacts/update`, 'put', subscriberData)
                .then(updated => {
                })
                .catch(error => {
                  callback(error)
                })
            }
          ], 10, function (err, results) {
            if (err) {
              sendErrorResponse(res, 500, `Failed to send message ${JSON.stringify(err)}`)
            } else {
              sendSuccessResponse(res, 200, results[0])
            }
          })
        })
        .catch(error => {
          sendErrorResponse(res, 500, `Failed to send message ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
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
      sendErrorResponse(res, 500, '', err)
    })
}
