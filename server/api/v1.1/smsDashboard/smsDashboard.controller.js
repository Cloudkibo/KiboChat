const utility = require('../utility')
const LogicLayer = require('./smsDashboard.logiclayer')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')

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
              sendErrorResponse(res, 500, `Failed to broadcast count ${JSON.stringify(error)}`)
            })
        })
        .catch(error => {
          sendErrorResponse(res, 500, `Failed to fetch subscriber count ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
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
                  sendErrorResponse(res, 500, '', `Error in getting graphdata ${JSON.stringify(err)}`)
                })
            })
            .catch(err => {
              sendErrorResponse(res, 500, '', `Error in getting unsubscribers ${JSON.stringify(err)}`)
            })
        })
        .catch(err => {
          sendErrorResponse(res, 500, '', `Error in getting subscribers ${JSON.stringify(err)}`)
        })
    })
    .catch(err => {
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
              sendErrorResponse(res, 500, '', `Error in getting graphdata ${JSON.stringify(err)}`)
            })
        })
        .catch(err => {
          sendErrorResponse(res, 500, '', `Error in getting unsubscribers ${JSON.stringify(err)}`)
        })
    })
    .catch(err => {
      sendErrorResponse(res, 500, '', `Error in getting subscribers ${JSON.stringify(err)}`)
    })
    .catch(err => {
      sendErrorResponse(res, 500, '', `Internal Server Error ${JSON.stringify(err)}`)
    })
}
