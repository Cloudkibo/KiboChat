const utility = require('../utility')
const LogicLayer = require('./smsDashboard.logiclayer')

exports.index = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization) // fetch company user
    .then(companyuser => {
      let aggregateQuery = [
        { $match: { companyId: companyuser.companyId, isSubscribed: true } },
        { $group: { _id: null, count: { $sum: 1 } } }
      ]
      utility.callApi(`contacts/aggregate`, 'post', aggregateQuery, req.headers.authorization) // fetch subscribers count
        .then(contacts => {
          utility.callApi('smsChat/query', 'post', {purpose: 'aggregate', match: {companyId: companyuser.companyId, status: 'unseen', format: 'twilio'}, group: { _id: null, count: { $sum: 1 } }}, '', 'kibochat')
            .then(chats => {
              res.status(200).json({
                status: 'success',
                payload: {subscribers: contacts.length > 0 ? contacts[0].count : 0,
                  chats: chats.length > 0 ? chats[0].count : 0}
              })
            })
            .catch(error => {
              return res.status(500).json({
                status: 'failed',
                payload: `Failed to broadcast count ${JSON.stringify(error)}`
              })
            })
        })
        .catch(error => {
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to fetch subscriber count ${JSON.stringify(error)}`
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
exports.subscriberSummary = function (req, res) {
  utility.callApi('companyUser/query', 'post', {domain_email: req.user.domain_email}, req.headers.authorization)
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      utility.callApi('contacts/aggregate', 'post', LogicLayer.queryForSubscribers(req.body, companyUser, true), req.headers.authorization)
        .then(subscribers => {
          utility.callApi('contacts/aggregate', 'post', LogicLayer.queryForSubscribers(req.body, companyUser, false), req.headers.authorization)
            .then(unsubscribes => {
              utility.callApi('contacts/aggregate', 'post', LogicLayer.queryForSubscribersGraph(req.body, companyUser), req.headers.authorization)
                .then(graphdata => {
                  let data = {
                    subscribes: subscribers.length > 0 ? subscribers[0].count : 0,
                    unsubscribes: unsubscribes.length > 0 ? unsubscribes[0].count : 0,
                    graphdata: graphdata
                  }
                  return res.status(200).json({
                    status: 'success',
                    payload: data
                  })
                })
                .catch(err => {
                  return res.status(500).json({
                    status: 'failed',
                    description: `Error in getting graphdata ${JSON.stringify(err)}`
                  })
                })
            })
            .catch(err => {
              return res.status(500).json({
                status: 'failed',
                description: `Error in getting unsubscribers ${JSON.stringify(err)}`
              })
            })
        })
        .catch(err => {
          return res.status(500).json({
            status: 'failed',
            description: `Error in getting subscribers ${JSON.stringify(err)}`
          })
        })
    })
    .catch(err => {
      return res.status(500).json({
        status: 'failed',
        description: `Internal Server Error ${JSON.stringify(err)}`
      })
    })
}
exports.sentSeen = function (req, res) {
  utility.callApi('companyUser/query', 'post', {domain_email: req.user.domain_email}, req.headers.authorization)
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      utility.callApi('contacts/aggregate', 'post', LogicLayer.queryForSessions(req.body, companyUser, true), req.headers.authorization)
        .then(sessions => {
          utility.callApi('contacts/aggregate', 'post', LogicLayer.queryForSessionsGraph(req.body, companyUser), req.headers.authorization)
            .then(graphdata => {
              let data = {
                sessions: sessions.length > 0 ? sessions[0].count : 0,
                graphdata: graphdata
              }
              return res.status(200).json({
                status: 'success',
                payload: data
              })
            })
            .catch(err => {
              return res.status(500).json({
                status: 'failed',
                description: `Error in getting graphdata ${JSON.stringify(err)}`
              })
            })
        })
        .catch(err => {
          return res.status(500).json({
            status: 'failed',
            description: `Error in getting unsubscribers ${JSON.stringify(err)}`
          })
        })
    })
    .catch(err => {
      return res.status(500).json({
        status: 'failed',
        description: `Error in getting subscribers ${JSON.stringify(err)}`
      })
    })
    .catch(err => {
      return res.status(500).json({
        status: 'failed',
        description: `Internal Server Error ${JSON.stringify(err)}`
      })
    })
}
