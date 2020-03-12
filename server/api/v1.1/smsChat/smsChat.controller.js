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
      let MessageObject = logicLayer.prepareChat(req.body, companyUser)
      callApi(`smsChat`, 'post', MessageObject, 'kibochat')
        .then(message => {
          let subscriberData = {
            query: {_id: req.body.contactId},
            newPayload: {last_activity_time: Date.now(), hasChat: true},
            options: {}
          }
          callApi(`contacts/update`, 'put', subscriberData)
            .then(updated => {
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
                  sendSuccessResponse(res, 200, message)
                })
                .catch(error => {
                  sendErrorResponse(res, 500, `Failed to send message ${JSON.stringify(error)}`)
                })
            })
            .catch(error => {
              sendErrorResponse(res, 500, `Failed to update contact ${JSON.stringify(error)}`)
            })
        })
        .catch(error => {
          sendErrorResponse(res, 500, `Failed to create smsChat ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
    })
}
exports.fetchSessions = function (req, res) {
  async.parallelLimit([
    function (callback) {
      let data = logicLayer.getCount(req)
      callApi('contacts/aggregate', 'post', data)
        .then(result => {
          callback(null, result)
        })
        .catch(err => {
          callback(err)
        })
    },
    function (callback) {
      let data = logicLayer.getSessions(req)
      callApi('contacts/aggregate', 'post', data)
        .then(result => {
          callback(null, result)
        })
        .catch(err => {
          callback(err)
        })
    },
    function (callback) {
      let unreadCountData = logicLayer.getQueryData('', 'aggregate', {companyId: req.user.companyId.toString(), status: 'unseen'}, undefined, undefined, undefined, {_id: '$contactId', count: {$sum: 1}})
      callApi('smsChat/query', 'post', unreadCountData, 'kibochat')
        .then(data => {
          callback(null, data)
        })
        .catch(err => {
          callback(err)
        })
    },
    function (callback) {
      let lastMessageData = logicLayer.getQueryData('', 'aggregate', {companyId: req.user.companyId}, undefined, undefined, undefined, {_id: '$contactId', payload: { $last: '$payload' }, repliedBy: { $last: '$repliedBy' }, datetime: { $last: '$datetime' }})
      callApi(`smsChat/query`, 'post', lastMessageData, 'kibochat')
        .then(data => {
          callback(null, data)
        })
        .catch(err => {
          callback(err)
        })
    }
  ], 10, function (err, results) {
    if (err) {
      sendErrorResponse(res, 50, err)
    } else {
      let countResopnse = results[0]
      let sessionsResponse = results[1]
      let chatCountResponse = results[2]
      let lastMessageResponse = results[3]
      let sessionsWithUnreadCount = logicLayer.putUnreadCount(chatCountResponse, sessionsResponse)
      let sessions = logicLayer.putLastMessage(lastMessageResponse, sessionsWithUnreadCount)
      sendSuccessResponse(res, 200, {sessions: sessions, count: countResopnse.length > 0 ? countResopnse[0].count : 0})
    }
  })
}
exports.markread = function (req, res) {
  if (req.params.id) {
    async.parallelLimit([
      function (callback) {
        markreadLocal(req, callback)
      }
    ], 10, function (err, results) {
      if (err) {
        sendErrorResponse(res, 500, err)
      } else {
        sendSuccessResponse(res, 200, 'Chat has been marked read successfully!')
      }
    })
  } else {
    sendErrorResponse(res, 400, 'Parameter subscriber_id is required!')
  }
}

function markreadLocal (req, callback) {
  let updateData = logicLayer.getUpdateData('updateAll', {contactId: req.params.id}, {status: 'seen'}, false, true)
  callApi('smsChat', 'put', updateData, 'kibochat')
    .then(updated => {
      callback(null, updated)
    })
    .catch(err => {
      callback(err)
    })
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
  callApi(`smsChat/search`, 'post', searchData, 'kibochat')
    .then(chats => {
      sendSuccessResponse(res, 200, chats)
    })
    .catch(err => {
      sendErrorResponse(res, 500, '', err)
    })
}
