const { callApi } = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/v1/sessions/sessions.controller'
const logicLayer = require('./sessions.logiclayer')
const needle = require('needle')
// const util = require('util')
const async = require('async')

exports.index = function (req, res) {
  let sessions = []

  const companyUserResponse = callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization)

  let messagesData = logicLayer.getQueryData('', 'aggregate', {status: 'unseen', format: 'facebook'}, 0, { datetime: 1 })
  const messagesResponse = callApi(`sessions/query`, 'post', messagesData, '', 'kibochat')

  let lastMessageData = logicLayer.getQueryData('', 'aggregate', {}, 0, { datetime: 1 }, undefined, {_id: '$session_id', payload: { $last: '$payload' }, replied_by: { $last: '$replied_by' }, datetime: { $last: '$datetime' }})
  const lastMessageResponse = callApi(`sessions/query`, 'post', lastMessageData, '', 'kibochat')

  companyUserResponse.then(companyuser => {
    let sessionsData = logicLayer.getQueryData('', 'findAll', {company_id: companyuser.companyId})
    return callApi(`sessions/query`, 'post', sessionsData, '', 'kibochat')
  })
    .then(session => {
      sessions = logicLayer.getSessions(session)
      if (sessions.length > 0) {
        return messagesResponse
      } else {
        return ''
      }
    })
    .then(gotUnreadCount => {
      if (gotUnreadCount !== '') {
        sessions = logicLayer.getUnreadCount(gotUnreadCount, sessions)
        return lastMessageResponse
      } else {
        return ''
      }
    })
    .then(gotLastMessage => {
      if (gotLastMessage !== '') {
        sessions = logicLayer.getLastMessage(gotLastMessage, sessions)
        return res.status(200).json({
          status: 'success',
          payload: sessions
        })
      } else {
        return res.status(200).json({
          status: 'success',
          payload: sessions
        })
      }
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Internal server error ${JSON.stringify(error)}`})
    })
}

exports.fetchOpenSessions = function (req, res) {
  async.parallelLimit([
    function (callback) {
      let data = logicLayer.getCount(req, 'new', callback)
      callApi('subscribers/aggregate', 'post', data, req.headers.authorization)
        .then(result => {
          callback(null, result)
        })
        .catch(err => {
          callback(err)
        })
    },
    function (callback) {
      let data = logicLayer.getSessions(req, 'new', callback)
      callApi('subscribers/aggregate', 'post', data, req.headers.authorization)
        .then(result => {
          callback(null, result)
        })
        .catch(err => {
          callback(err)
        })
    }
  ], 10, function (err, results) {
    if (err) {
      res.status(500).json({status: 'failed', payload: err})
    } else {
      res.status(200).json({status: 'success', payload: {openSessions: results[1], count: results[0].length > 0 ? results[0].count : 0}})
    }
  })
}

exports.fetchResolvedSessions = function (req, res) {
  async.parallelLimit([
    function (callback) {
      let data = logicLayer.getCount(req, 'resolved', callback)
      callApi('subscribers/aggregate', 'post', data, req.headers.authorization)
        .then(result => {
          callback(null, result)
        })
        .catch(err => {
          callback(err)
        })
    },
    function (callback) {
      let data = logicLayer.getSessions(req, 'resolved', callback)
      callApi('subscribers/aggregate', 'post', data, req.headers.authorization)
        .then(result => {
          callback(null, result)
        })
        .catch(err => {
          callback(err)
        })
    }
  ], 10, function (err, results) {
    if (err) {
      res.status(500).json({status: 'failed', payload: err})
    } else {
      res.status(200).json({status: 'success', payload: {closedSessions: results[1], count: results[0].length > 0 ? results[0].count : 0}})
    }
  })
}

// exports.getNewSessions = function (req, res) {
//   let criteria = {}
//   let companyUser = {}
//
//   const companyUserResponse = callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization)
//
//   companyUserResponse
//     .then(companyuser => {
//       companyUser = companyuser
//       let pageData = [
//         {
//           $match: {
//             _id: req.body.filter && req.body.filter_criteria && req.body.filter_criteria.page_value !== '' ? req.body.filter_criteria.page_value : {$exists: true},
//             companyId: companyUser.companyId,
//             connected: true
//           }
//         }
//       ]
//       return callApi(`pages/aggregate`, 'post', pageData, req.headers.authorization)
//     })
//     .then(pages => {
//       let pageIds = pages.map((p) => p._id.toString())
//       logger.serverLog(TAG, `page Ids: ${util.inspect(pageIds)}`)
//       let subscriberData = []
//       if (req.body.filter && req.body.filter_criteria && req.body.filter_criteria.search_value !== '') {
//         subscriberData = [
//           {$project: {name: {$concat: ['$firstName', ' ', '$lastName']}, companyId: 1, pageId: 1, isSubscribed: 1}},
//           {$match: {companyId: companyUser.companyId, pageId: {$in: pageIds}, name: {$regex: '.*' + req.body.filter_criteria.search_value + '.*', $options: 'i'}, isSubscribed: true}}
//         ]
//       } else {
//         subscriberData = [
//           {$match: {companyId: companyUser.companyId, pageId: {$in: pageIds}, isSubscribed: true}}
//         ]
//       }
//       return callApi(`subscribers/aggregate`, 'post', subscriberData, req.headers.authorization)
//     })
//     .then(subscribers => {
//       let subscriberIds = subscribers.map((s) => s._id.toString())
//       logger.serverLog(TAG, `subscriber Ids: ${util.inspect(subscriberIds)}`)
//       criteria = logicLayer.getNewSessionsCriteria(companyUser, req.body, subscriberIds)
//       let countData = logicLayer.getQueryData('count', 'aggregate', criteria.match)
//       logger.serverLog(TAG, `count Data: ${util.inspect(countData)}`)
//       return callApi(`sessions/query`, 'post', countData, '', 'kibochat')
//     })
//     .then(sessionsCount => {
//       logger.serverLog(TAG, `criteria: ${util.inspect(criteria)}`)
//       logger.serverLog(TAG, `sessions count: ${util.inspect(sessionsCount)}`)
//       if (sessionsCount.length > 0 && sessionsCount[0].count > 0) {
//         return sessionsWithUnreadCountAndLastMessage(sessionsCount[0].count, req, criteria, companyUser)
//       } else {
//         return res.status(200).json({status: 'success', payload: {openSessions: [], count: 0}})
//       }
//     })
//     .then(result => {
//       return res.status(200).json({status: 'success', payload: {openSessions: result.sessions, count: result.count}})
//     })
//     .catch(error => {
//       return res.status(500).json({status: 'failed', payload: `Internal server error ${JSON.stringify(error)}`})
//     })
// }
//
// exports.getResolvedSessions = function (req, res) {
//   let companyUser = {}
//   let criteria = {}
//
//   let companyUserResponse = callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization)
//
//   companyUserResponse
//     .then(companyuser => {
//       companyUser = companyuser
//       let pageData = [
//         {
//           $match: {
//             _id: req.body.filter && req.body.filter_criteria && req.body.filter_criteria.page_value !== '' ? req.body.filter_criteria.page_value : {$exists: true},
//             companyId: companyUser.companyId,
//             connected: true
//           }
//         }
//       ]
//       return callApi(`pages/aggregate`, 'post', pageData, req.headers.authorization)
//     })
//     .then(pages => {
//       let pageIds = pages.map((p) => p._id.toString())
//       let subscriberData = []
//       if (req.body.filter && req.body.filter_criteria && req.body.filter_criteria.search_value !== '') {
//         subscriberData = [
//           {$project: {name: {$concat: ['$firstName', ' ', '$lastName']}, companyId: 1, pageId: 1}},
//           {$match: {companyId: companyUser.companyId, pageId: {$in: pageIds}, name: {$regex: '.*imran.*', $options: 'i'}, isSubscribed: true}}
//         ]
//       } else {
//         subscriberData = [
//           {$match: {companyId: companyUser.companyId, pageId: {$in: pageIds}, isSubscribed: true}}
//         ]
//       }
//       return callApi(`subscribers/aggregate`, 'post', subscriberData, req.headers.authorization)
//     })
//     .then(subscribers => {
//       let subscriberIds = subscribers.map((s) => s._id.toString())
//       criteria = logicLayer.getResolvedSessionsCriteria(companyUser, req.body, subscriberIds)
//       let countData = logicLayer.getQueryData('count', 'aggregate', criteria.match)
//       return callApi(`sessions/query`, 'post', countData, '', 'kibochat')
//     })
//     .then(sessionsCount => {
//       if (sessionsCount.length > 0 && sessionsCount[0].count > 0) {
//         return sessionsWithUnreadCountAndLastMessage(sessionsCount[0].count, req, criteria, companyUser)
//       } else {
//         return res.status(200).json({status: 'success', payload: {closedSessions: [], count: 0}})
//       }
//     })
//     .then(result => {
//       return res.status(200).json({status: 'success', payload: {closedSessions: result.sessions, count: result.count}})
//     })
//     .catch(error => {
//       return res.status(500).json({status: 'failed', payload: `Internal server error ${JSON.stringify(error)}`})
//     })
// }

exports.markread = function (req, res) {
  if (req.params.id) {
    async.parallelLimit([
      function (callback) {
        markreadFacebook(req.user, callback)
      },
      function (callback) {
        markreadLocal(req, callback)
      }
    ], 10, function (err, results) {
      if (err) {
        res.status(500).json({status: 'failed', payload: err})
      } else {
        res.status(200).json({status: 'success', payload: 'Chat has been marked read successfully!'})
      }
    })
  } else {
    return res.status(400).json({status: 'failed', payload: 'Parameter subscriber_id is required!'})
  }
}

function markreadLocal (req, callback) {
  let updateData = logicLayer.getUpdateData('updateAll', {subscriber_id: req.params.id}, {status: 'seen'}, false, true)
  callApi('livechat', 'put', updateData, '', 'kibochat')
    .then(updated => {
      callback(null, updated)
    })
    .catch(err => {
      callback(err)
    })
}

function markreadFacebook (req, callback) {
  callApi(`subscribers/${req.params.id}`, 'get', {}, req.headers.authorization)
    .then(subscriber => {
      const data = {
        messaging_type: 'UPDATE',
        recipient: {id: subscriber.senderId}, // this is the subscriber id
        sender_action: 'mark_seen'
      }
      return needle('post', `https://graph.facebook.com/v2.6/me/messages?access_token=${subscriber.pageId.accessToken}`, data)
    })
    .then(resp => {
      if (resp.error) {
        logger.serverLog(TAG, `marked read on Facebook error ${JSON.stringify(resp.error)}`)
        callback(resp.error)
      } else {
        logger.serverLog(TAG, `marked read on Facebook response ${JSON.stringify(resp.body)}`)
        callback(null, resp.body)
      }
    })
    .catch(err => {
      callback(err)
    })
}

exports.show = function (req, res) {
  if (req.params.id) {
    async.parallelLimit([
      function (callback) {
        callApi(`subscribers/${req.params.id}`, 'get', {}, req.headers.authorization)
          .then(subscriber => {
            callback(null, subscriber)
          })
          .catch(err => {
            callback(err)
          })
      },
      function (callback) {
        let unreadCountData = logicLayer.getQueryData('', 'aggregate', {company_id: req.user.companyId.toString(), status: 'unseen', format: 'facebook'}, undefined, undefined, undefined, {_id: '$subscriber_id', count: {$sum: 1}})
        callApi('livechat/query', 'post', unreadCountData, '', 'kibochat')
          .then(data => {
            callback(null, data)
          })
          .catch(err => {
            callback(err)
          })
      },
      function (callback) {
        let lastMessageData = logicLayer.getQueryData('', 'aggregate', undefined, undefined, undefined, undefined, {_id: '$subscriber_id', payload: { $last: '$payload' }, replied_by: { $last: '$replied_by' }, datetime: { $last: '$datetime' }})
        callApi(`sessions/query`, 'post', lastMessageData, '', 'kibochat')
          .then(data => {
            callback(null, data)
          })
          .catch(err => {
            callback(err)
          })
      }
    ], 10, function (err, results) {
      if (err) {
        res.status(500).json({status: 'failed', payload: err})
      } else {
        let subscriber = results[0]
        let unreadCountResponse = results[1]
        let lastMessageResponse = results[2]
        let subscriberWithUnreadCount = logicLayer.appendUnreadCountData(unreadCountResponse, subscriber)
        let finalSubscriber = logicLayer.appendLastMessageData(lastMessageResponse, subscriberWithUnreadCount)
        res.status(200).json({status: 'success', payload: finalSubscriber})
      }
    })
  }
}

exports.changeStatus = function (req, res) {
  let companyUser = {}

  let companyUserResponse = callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization)

  let updateData = logicLayer.getUpdateData('updateOne', {_id: req.body._id}, {status: req.body.status})
  let updateSessionResponse = callApi('sessions', 'put', updateData, '', 'kibochat')

  companyUserResponse.then(company => {
    companyUser = company
    return updateSessionResponse
  })
    .then(updated => {
      require('./../../../config/socketio').sendMessageToClient({
        room_id: companyUser.companyId,
        body: {
          action: 'session_status',
          payload: {
            session_id: req.body._id,
            user_id: req.user._id,
            user_name: req.user.name,
            status: req.body.status
          }
        }
      })
      res.status(200).json({status: 'success', payload: updated})
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to update session status ${JSON.stringify(error)}`})
    })
}

exports.assignAgent = function (req, res) {
  let companyUser = {}
  let assignedTo = {
    type: 'agent',
    id: req.body.agentId,
    name: req.body.agentName
  }

  let companyUserResponse = callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization)

  companyUserResponse.then(company => {
    companyUser = company
    let updateData = logicLayer.getUpdateData('updateOne', {_id: req.body.sessionId}, {assigned_to: assignedTo, is_assigned: req.body.isAssigned})
    return callApi('sessions', 'put', updateData, '', 'kibochat')
  })
    .then(updated => {
      require('./../../../config/socketio').sendMessageToClient({
        room_id: companyUser.companyId,
        body: {
          action: 'session_assign',
          payload: {
            session_id: req.body.sessionId,
            user_id: req.user._id,
            user_name: req.user.name,
            assigned_to: assignedTo
          }
        }
      })
      res.status(200).json({status: 'success', payload: updated})
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to update session ${JSON.stringify(error)}`})
    })
}

exports.assignTeam = function (req, res) {
  let companyUser = {}
  let assignedTo = {
    type: 'team',
    id: req.body.teamId,
    name: req.body.teamName
  }

  let companyUserResponse = callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization)

  companyUserResponse.then(company => {
    companyUser = company
    let updateData = logicLayer.getUpdateData('updateOne', {_id: req.body.sessionId}, {assigned_to: assignedTo, is_assigned: req.body.isAssigned})
    return callApi('sessions', 'put', updateData, '', 'kibochat')
  })
    .then(updated => {
      require('./../../../config/socketio').sendMessageToClient({
        room_id: companyUser.companyId,
        body: {
          action: 'session_assign',
          payload: {
            session_id: req.body.sessionId,
            user_id: req.user._id,
            user_name: req.user.name,
            assigned_to: assignedTo
          }
        }
      })
      res.status(200).json({status: 'success', payload: updated})
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to update session ${JSON.stringify(error)}`})
    })
}

// function sessionsWithUnreadCountAndLastMessage (count, req, criteria, companyUser) {
//   return new Promise(function (resolve, reject) {
//     let data = logicLayer.getQueryData('', 'aggregate', criteria.match, 0, criteria.sort, criteria.limit)
//     let sessionsResponse = callApi('sessions/query', 'post', data, '', 'kibochat')
//
//     sessionsResponse.then(sessions => {
//       sessions.forEach((session, index) => {
//         callApi(`subscribers/${session.subscriber_id}`, 'get', {}, req.headers.authorization)
//           .then(subscriber => {
//             session.subscriber_id = subscriber
//             return callApi(`pages/${session.page_id}`, 'get', {}, req.headers.authorization)
//           })
//           .then(page => {
//             session.page_id = page
//             if (index === sessions.length - 1) {
//               let messagesData = logicLayer.getQueryData('', 'aggregate', {company_id: companyUser.companyId.toString(), status: 'unseen', format: 'facebook'}, 0, { datetime: 1 })
//               return callApi('livechat/query', 'post', messagesData, '', 'kibochat')
//             } else {
//               return 'next'
//             }
//           })
//           .then(gotUnreadCount => {
//             if (index === sessions.length - 1) {
//               sessions = logicLayer.getUnreadCount(gotUnreadCount, sessions)
//               let lastMessageData = logicLayer.getQueryData('', 'aggregate', {}, 0, { datetime: 1 }, undefined, {_id: '$session_id', payload: { $last: '$payload' }, replied_by: { $last: '$replied_by' }, datetime: { $last: '$datetime' }})
//               return callApi(`livechat/query`, 'post', lastMessageData, '', 'kibochat')
//             } else {
//               return 'next'
//             }
//           })
//           .then(gotLastMessage => {
//             if (index === sessions.length - 1) {
//               sessions = logicLayer.getLastMessage(gotLastMessage, sessions)
//               logger.serverLog(TAG, `sessions: ${sessions}`)
//               resolve({sessions, count})
//             }
//           })
//           .catch(err => {
//             reject(err)
//           })
//       })
//     })
//       .catch(err => {
//         reject(err)
//       })
//   })
// }

exports.genericFind = function (req, res) {
  let messagesData = logicLayer.getQueryData('', 'findAll', req.body)
  callApi('livechat/query', 'post', messagesData, '', 'kibochat')
    .then(session => {
      return res.status(200).json({status: 'success', payload: session})
    })
    .catch(error => {
      return {status: 'failed', payload: `Failed to fetch sessions ${JSON.stringify(error)}`}
    })
}
