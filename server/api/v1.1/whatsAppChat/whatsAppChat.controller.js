const logger = require('../../../components/logger')
const logicLayer = require('./whatsAppChat.logiclayer')
const TAG = '/api/v1/whatsAppChat/whatsAppChat.controller.js'
const { callApi } = require('../utility')
const async = require('async')

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
        callApi(`whatsAppChat/query`, 'post', messagesCountData, '', 'kibochat')
          .then(data => {
            callback(null, data)
          })
          .catch(err => {
            callback(err)
          })
      },
      function (callback) {
        callApi(`whatsAppChat/query`, 'post', messagesData, '', 'kibochat')
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

exports.create = function (req, res) {
  callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email, populate: 'companyId' }, req.headers.authorization)
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      let MessageObject = logicLayer.prepareChat(req.body, companyUser)
      callApi(`whatsAppChat`, 'post', MessageObject, '', 'kibochat')
        .then(message => {
          let subscriberData = {
            query: {_id: req.body.contactId},
            newPayload: {last_activity_time: Date.now()},
            options: {}
          }
          callApi(`whatsAppContacts/update`, 'put', subscriberData, req.headers.authorization)
            .then(updated => {
              let accountSid = companyUser.companyId.twilioWhatsApp.accountSID
              let authToken = companyUser.companyId.twilioWhatsApp.authToken
              let client = require('twilio')(accountSid, authToken)
              let messageToSend = logicLayer.prepareSendMessagePayload(req.body, companyUser, message)
              client.messages
                .create(messageToSend)
                .then(response => {
                  logger.serverLog(TAG, `response from twilio ${JSON.stringify(response)}`)
                  return res.status(200)
                    .json({status: 'success', payload: message})
                })
                .catch(error => {
                  return res.status(500).json({
                    status: 'failed',
                    payload: `Failed to send message ${JSON.stringify(error)}`
                  })
                })
            })
            .catch(error => {
              return res.status(500).json({
                status: 'failed',
                payload: `Failed to update contact ${JSON.stringify(error)}`
              })
            })
        })
        .catch(error => {
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to create smsChat ${JSON.stringify(error)}`
          })
        })
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to fetch company user ${JSON.stringify(error)}`
      })
    })
}
exports.fetchSessions = function (req, res) {
  async.parallelLimit([
    function (callback) {
      let data = logicLayer.getCount(req)
      callApi('whatsAppContacts/aggregate', 'post', data, req.headers.authorization)
        .then(result => {
          callback(null, result)
        })
        .catch(err => {
          callback(err)
        })
    },
    function (callback) {
      let data = logicLayer.getSessions(req)
      callApi('whatsAppContacts/aggregate', 'post', data, req.headers.authorization)
        .then(result => {
          callback(null, result)
        })
        .catch(err => {
          callback(err)
        })
    },
    function (callback) {
      let unreadCountData = logicLayer.getQueryData('', 'aggregate', {companyId: req.user.companyId.toString(), status: 'unseen'}, undefined, undefined, undefined, {_id: '$contactId', count: {$sum: 1}})
      callApi('whatsAppChat/query', 'post', unreadCountData, '', 'kibochat')
        .then(data => {
          callback(null, data)
        })
        .catch(err => {
          callback(err)
        })
    },
    function (callback) {
      let lastMessageData = logicLayer.getQueryData('', 'aggregate', {companyId: req.user.companyId}, undefined, undefined, undefined, {_id: '$contactId', payload: { $last: '$payload' }, repliedBy: { $last: '$repliedBy' }, datetime: { $last: '$datetime' }})
      callApi(`whatsAppChat/query`, 'post', lastMessageData, '', 'kibochat')
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
      let countResopnse = results[0]
      let sessionsResponse = results[1]
      let chatCountResponse = results[2]
      let lastMessageResponse = results[3]
      let sessionsWithUnreadCount = logicLayer.putUnreadCount(chatCountResponse, sessionsResponse)
      let sessions = logicLayer.putLastMessage(lastMessageResponse, sessionsWithUnreadCount)
      return res.status(200).json({status: 'success', payload: {sessions: sessions, count: countResopnse.length > 0 ? countResopnse[0].count : 0}})
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
        return res.status(500).json({status: 'failed', payload: err})
      } else {
        return res.status(200).json({status: 'success', payload: 'Chat has been marked read successfully!'})
      }
    })
  } else {
    return res.status(400).json({status: 'failed', payload: 'Parameter subscriber_id is required!'})
  }
}

function markreadLocal (req, callback) {
  console.log('in markreadLocal of whatsAppChat')
  let updateData = logicLayer.getUpdateData('updateAll', {contactId: req.params.id}, {status: 'seen', seenDateTime: Date.now}, false, true)
  callApi('whatsAppChat', 'put', updateData, '', 'kibochat')
    .then(updated => {
      callback(null, updated)
    })
    .catch(err => {
      callback(err)
    })
}
