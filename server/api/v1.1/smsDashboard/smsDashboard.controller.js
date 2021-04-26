const utility = require('../utility')
const LogicLayer = require('./smsDashboard.logiclayer')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')
const logger = require('../../../components/logger')
const { callApi } = require('../../v1.1/utility')
const TAG = '/api/v1.1/smsDashboard/smsDashboard.controller.js'

exports.index = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }) // fetch company user
    .then(companyuser => {
      let aggregateQuery = [
        { $match: { companyId: companyuser.companyId, isSubscribed: true } },
        { $group: { _id: null, count: { $sum: 1 } } }
      ]
      utility.callApi(`contacts/aggregate`, 'post', aggregateQuery) // fetch subscribers count
        .then(contacts => {
          utility.callApi('smsChat/query', 'post', {purpose: 'aggregate', match: {companyId: companyuser.companyId, status: 'unseen', format: 'twilio'}, group: { _id: null, count: { $sum: 1 } }}, 'kibochat')
            .then(chats => {
              let payload = {
                subscribers: contacts.length > 0 ? contacts[0].count : 0,
                chats: chats.length > 0 ? chats[0].count : 0
              }
              sendSuccessResponse(res, 200, payload)
            })
            .catch(error => {
              const message = error || 'Failed to broadcast count'
              logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
              sendErrorResponse(res, 500, `Failed to broadcast count ${JSON.stringify(error)}`)
            })
        })
        .catch(error => {
          const message = error || 'Failed to fetch subscriber count'
          logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, `Failed to fetch subscriber count ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      const message = error || 'Failed to fetch company user'
      logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
    })
}
exports.subscriberSummary = function (req, res) {
  utility.callApi('companyUser/query', 'post', {domain_email: req.user.domain_email})
    .then(companyUser => {
      if (!companyUser) {
        sendErrorResponse(res, 404, '', 'The user account does not belong to any company. Please contact support')
      }
      utility.callApi('contacts/aggregate', 'post', LogicLayer.queryForSubscribers(req.body, companyUser, true))
        .then(subscribers => {
          utility.callApi('contacts/aggregate', 'post', LogicLayer.queryForSubscribers(req.body, companyUser, false))
            .then(unsubscribes => {
              utility.callApi('contacts/aggregate', 'post', LogicLayer.queryForSubscribersGraph(req.body, companyUser))
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
                  logger.serverLog(message, `${TAG}: exports.subscriberSummary`, req.body, {user: req.user}, 'error')
                  sendErrorResponse(res, 500, '', `Error in getting graphdata ${JSON.stringify(err)}`)
                })
            })
            .catch(err => {
              const message = err || 'Error in getting unsubscribers'
              logger.serverLog(message, `${TAG}: exports.subscriberSummary`, req.body, {user: req.user}, 'error')
              sendErrorResponse(res, 500, '', `Error in getting unsubscribers ${JSON.stringify(err)}`)
            })
        })
        .catch(err => {
          const message = err || 'Error in getting subscribers'
          logger.serverLog(message, `${TAG}: exports.subscriberSummary`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, '', `Error in getting subscribers ${JSON.stringify(err)}`)
        })
    })
    .catch(err => {
      const message = err || 'Error in getting company user'
      logger.serverLog(message, `${TAG}: exports.subscriberSummary`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, '', `Internal Server Error ${JSON.stringify(err)}`)
    })
}
exports.sentSeen = function (req, res) {
  utility.callApi('companyUser/query', 'post', {domain_email: req.user.domain_email})
    .then(companyUser => {
      if (!companyUser) {
        sendErrorResponse(res, 404, '', 'The user account does not belong to any company. Please contact support')
      }
      utility.callApi('contacts/aggregate', 'post', LogicLayer.queryForSessions(req.body, companyUser, true))
        .then(sessions => {
          utility.callApi('contacts/aggregate', 'post', LogicLayer.queryForSessionsGraph(req.body, companyUser))
            .then(graphdata => {
              let data = {
                sessions: sessions.length > 0 ? sessions[0].count : 0,
                graphdata: graphdata
              }
              sendSuccessResponse(res, 200, data)
            })
            .catch(err => {
              const message = err || 'Error in getting graphdata'
              logger.serverLog(message, `${TAG}: exports.sentSeen`, req.body, {user: req.user}, 'error')
              sendErrorResponse(res, 500, '', `Error in getting graphdata ${JSON.stringify(err)}`)
            })
        })
        .catch(err => {
          const message = err || 'Error in getting unsubscribers'
          logger.serverLog(message, `${TAG}: exports.sentSeen`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, '', `Error in getting unsubscribers ${JSON.stringify(err)}`)
        })
    })
    .catch(err => {
      const message = err || 'Error in getting subscribers'
      logger.serverLog(message, `${TAG}: exports.sentSeen`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, '', `Error in getting subscribers ${JSON.stringify(err)}`)
    })
}

exports.getDashboardData = function (req, res) {
  const days = req.params.days
  const companyId = req.user.companyId
  const endDate = new Date()
  const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000))
  console.log(startDate)

  const contactsQuery = callApi('contacts/aggregate', 'post', LogicLayer.getDashboardDataCriteria('contacts', startDate, endDate, companyId))
  const messagesSentQuery = callApi('smsChat/query', 'post', LogicLayer.getDashboardDataCriteria('messagesSent', startDate, endDate, companyId), 'kibochat')
  const messagesReceivedQuery = callApi('smsChat/query', 'post', LogicLayer.getDashboardDataCriteria('messagesReceived', startDate, endDate, companyId), 'kibochat')

  Promise.all([contactsQuery, messagesSentQuery, messagesReceivedQuery])
    .then(result => {
      const contacts = result[0].length > 0 ? result[0].map((item) => {
        return {
          contacts: item.count,
          date: `${item._id.day}-${item._id.month}-${item._id.year}`
        }
      }) : []
      const messagesSent = result[1].length > 0 ? result[1].map((item) => {
        return {
          messagesSent: item.count,
          date: `${item._id.day}-${item._id.month}-${item._id.year}`
        }
      }) : []
      const messagesReceived = result[2].length > 0 ? result[2].map((item) => {
        return {
          messagesReceived: item.count,
          date: `${item._id.day}-${item._id.month}-${item._id.year}`
        }
      }) : []
      const data = LogicLayer.transformData(contacts, messagesSent, messagesReceived)
      sendSuccessResponse(res, 200, data)
    })
    .catch(err => {
      const message = err || 'Error in getting sms dashboard data'
      logger.serverLog(message, `${TAG}: exports.getDashboardDate`, {days, startDate, endDate}, {user: req.user}, 'error')
      sendErrorResponse(res, 500, '', `Error in sms dashboard data ${JSON.stringify(err)}`)
    })
}
