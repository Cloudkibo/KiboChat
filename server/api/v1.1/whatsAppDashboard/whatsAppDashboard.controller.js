const utility = require('../utility')
// const contactsDataLayer = require('../whatsAppContacts/whatsAppBroadcasts.datalayer')
const LogicLayer = require('./whatsAppDashboard.logiclayer')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')
const async = require('async')
const logger = require('../../../components/logger')
const TAG = 'api/v1.1/whatsAppDashboard/whatsAppDashboard.controller.js'

exports.index = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }) // fetch company user
    .then(companyuser => {
      let aggregateQuery = [
        { $match: { companyId: companyuser.companyId, isSubscribed: true } },
        { $group: {
          _id: null,
          subscribers: { $sum: 1 },
          unreadMessages: {$sum: '$unreadCount'}
        } }
      ]
      utility.callApi(`whatsAppContacts/aggregate`, 'post', aggregateQuery)
        .then(contacts => {
          sendSuccessResponse(res, 200, {subscribers: contacts.length > 0 ? contacts[0].subscribers : 0, chats: contacts.length > 0 ? contacts[0].unreadMessages : 0})
        })
        .catch(error => {
          const message = error || 'Failed to fetch subscriber count'
          logger.serverLog(message, `${TAG}: exports.index`, {}, { user: req.user }, 'error')
          sendErrorResponse(res, 500, `Failed to fetch subscriber count ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      const message = error || 'Failed to fetch company user'
      logger.serverLog(message, `${TAG}: exports.index`, {}, { user: req.user }, 'error')
      sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
    })
}
exports.subscriberSummary = function (req, res) {
  utility.callApi('companyUser/query', 'post', {domain_email: req.user.domain_email})
    .then(companyUser => {
      if (!companyUser) {
        sendErrorResponse(res, 404, '', 'The user account does not belong to any company. Please contact support')
      }
      utility.callApi('whatsAppContacts/aggregate', 'post', LogicLayer.queryForSubscribers(req.body, companyUser, true))
        .then(subscribers => {
          utility.callApi('whatsAppContacts/aggregate', 'post', LogicLayer.queryForSubscribers(req.body, companyUser, false))
            .then(unsubscribes => {
              utility.callApi('whatsAppContacts/aggregate', 'post', LogicLayer.queryForSubscribersGraph(req.body, companyUser))
                .then(graphdata => {
                  let data = {
                    subscribes: subscribers.length > 0 ? subscribers[0].count : 0,
                    unsubscribes: unsubscribes.length > 0 ? unsubscribes[0].count : 0,
                    graphdata: graphdata
                  }
                  sendSuccessResponse(res, 200, data)
                })
                .catch(err => {
                  const message = err || 'Error in getting graphdata'
                  logger.serverLog(message, `${TAG}: exports.subscriberSummary`, req.body, { user: req.user }, 'error')
                  sendErrorResponse(res, 500, '', `Error in getting graphdata ${JSON.stringify(err)}`)
                })
            })
            .catch(err => {
              const message = err || 'Error in getting unsubscribers'
              logger.serverLog(message, `${TAG}: exports.subscriberSummary`, req.body, { user: req.user }, 'error')
              sendErrorResponse(res, 500, '', `Error in getting unsubscribers ${JSON.stringify(err)}`)
            })
        })
        .catch(err => {
          const message = err || 'Error in getting subscribers'
          logger.serverLog(message, `${TAG}: exports.subscriberSummary`, req.body, { user: req.user }, 'error')
          sendErrorResponse(res, 500, '', `Error in getting subscribers ${JSON.stringify(err)}`)
        })
    })
    .catch(err => {
      const message = err || 'Error in getting company user'
      logger.serverLog(message, `${TAG}: exports.subscriberSummary`, req.body, { user: req.user }, 'error')
      sendErrorResponse(res, 500, '', `Internal Server Error ${JSON.stringify(err)}`)
    })
}
exports.sentSeen = function (req, res) {
  utility.callApi('companyUser/query', 'post', {domain_email: req.user.domain_email})
    .then(companyUser => {
      if (!companyUser) {
        sendErrorResponse(res, 404, '', 'The user account does not belong to any company. Please contact support')
      }
      utility.callApi('whatsAppContacts/aggregate', 'post', LogicLayer.queryForSessions(req.body, companyUser, true))
        .then(sessions => {
          utility.callApi('whatsAppContacts/aggregate', 'post', LogicLayer.queryForSessionsGraph(req.body, companyUser))
            .then(graphdata => {
              let data = {
                sessions: sessions.length > 0 ? sessions[0].count : 0,
                graphdata: graphdata
              }
              sendSuccessResponse(res, 200, data)
            })
            .catch(err => {
              const message = err || 'Error in getting graphdata'
              logger.serverLog(message, `${TAG}: exports.sentSeen`, req.body, { user: req.user }, 'error')
              sendErrorResponse(res, 500, '', `Error in getting graphdata ${JSON.stringify(err)}`)
            })
        })
        .catch(err => {
          const message = err || 'Error in getting unsubscribers'
          logger.serverLog(message, `${TAG}: exports.sentSeen`, req.body, { user: req.user }, 'error')
          sendErrorResponse(res, 500, '', `Error in getting unsubscribers ${JSON.stringify(err)}`)
        })
    })
    .catch(err => {
      const message = err || 'Error in getting subscribers'
      logger.serverLog(message, `${TAG}: exports.sentSeen`, req.body, { user: req.user }, 'error')
      sendErrorResponse(res, 500, '', `Error in getting subscribers ${JSON.stringify(err)}`)
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.sentSeen`, req.body, { user: req.user }, 'error')
      sendErrorResponse(res, 500, '', `Internal Server Error ${JSON.stringify(err)}`)
    })
}
exports.metrics = function (req, res) {
  let messagesSentQuery = LogicLayer.queryForMessages(req.body, req.user.companyId, 'convos', 'sent')
  let templateMessagesSentQuery = LogicLayer.queryForMessages(req.body, req.user.companyId, 'convos', 'template')
  let messagesReceivedQuery = LogicLayer.queryForMessages(req.body, req.user.companyId, 'whatsApp')
  let zoomMeetingsQuery = LogicLayer.queryForZoomMeetings(req.body, req.user.companyId)
  let activeSubscribersQuery = LogicLayer.queryForActiveSubscribers(req.body, req.user.companyId)

  async.parallelLimit([
    _getMessagesSent.bind(null, messagesSentQuery),
    _getMessagesSent.bind(null, templateMessagesSentQuery),
    _getMessagesSent.bind(null, messagesReceivedQuery),
    _getZoomMeetings.bind(null, zoomMeetingsQuery),
    _getActiveSubscribers.bind(null, activeSubscribersQuery)
  ], 10, function (err, results) {
    if (err) {
      const message = err || 'Error in async calls'
      logger.serverLog(message, `${TAG}: exports.metrics`, req.body, { user: req.user }, 'error')
      sendErrorResponse(res, 500, err)
    } else {
      let activeSubscribers = []
      if (results[2].length > 0) {
        activeSubscribers = results[2].map(r => {
          return {_id: r._id, count: r.uniqueValues.length}
        }
        )
      }
      let graphDatas = {
        messagesSent: results[0],
        templateMessagesSent: results[1],
        messagesReceived: results[2],
        zoomMeetings: results[3],
        activeSubscribers: activeSubscribers
      }
      let data = {
        messagesSentCount: results[0].length > 0 ? sum(results[0], 'count') : 0,
        templateMessagesSentCount: results[1].length > 0 ? sum(results[1], 'count') : 0,
        messagesReceivedCount: results[2].length > 0 ? sum(results[2], 'count') : 0,
        zoomMeetingsCount: results[3].length > 0 ? sum(results[3], 'count') : 0,
        activeSubscribersCount: results[4].length > 0 ? results[4][0].count : 0,
        graphDatas
      }
      sendSuccessResponse(res, 200, data)
    }
  })
}

const _getMessagesSent = (criteria, callback) => {
  utility.callApi(`whatsAppChat/query`, 'post', criteria, 'kibochat')
    .then(data => {
      callback(null, data)
    })
    .catch(err => {
      callback(err)
    })
}

const _getZoomMeetings = (criteria, callback) => {
  utility.callApi(`zoomMeetings/query`, 'post', criteria)
    .then(data => {
      callback(null, data)
    })
    .catch(err => {
      callback(err)
    })
}

const _getActiveSubscribers = (criteria, callback) => {
  utility.callApi(`whatsAppContacts/aggregate`, 'post', criteria)
    .then(data => {
      callback(null, data)
    })
    .catch(err => {
      callback(err)
    })
}

const sum = (items, prop) => {
  return items.reduce(function (a, b) {
    return a + b[prop]
  }, 0)
}
