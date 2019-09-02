const { callApi } = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/v1/sessions/sessions.controller'
const logicLayer = require('./sessions.logiclayer')
const needle = require('needle')
// const util = require('util')
const async = require('async')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')

exports.index = function (req, res) {
  let sessions = []

  const companyUserResponse = callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })

  let messagesData = logicLayer.getQueryData('', 'aggregate', {status: 'unseen', format: 'facebook'}, 0, { datetime: 1 })
  const messagesResponse = callApi(`sessions/query`, 'post', messagesData, 'kibochat')

  let lastMessageData = logicLayer.getQueryData('', 'aggregate', {}, 0, { datetime: 1 }, undefined, {_id: '$session_id', payload: { $last: '$payload' }, replied_by: { $last: '$replied_by' }, datetime: { $last: '$datetime' }})
  const lastMessageResponse = callApi(`sessions/query`, 'post', lastMessageData, 'kibochat')

  companyUserResponse.then(companyuser => {
    let sessionsData = logicLayer.getQueryData('', 'findAll', {company_id: companyuser.companyId})
    return callApi(`sessions/query`, 'post', sessionsData, 'kibochat')
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
        sendSuccessResponse(res, 200, sessions)
      } else {
        sendSuccessResponse(res, 200, sessions)
      }
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Internal server error ${JSON.stringify(error)}`)
    })
}

exports.fetchOpenSessions = function (req, res) {
  async.parallelLimit([
    function (callback) {
      let data = logicLayer.getCount(req, 'new')
      callApi('subscribers/aggregate', 'post', data)
        .then(result => {
          callback(null, result)
        })
        .catch(err => {
          callback(err)
        })
    },
    function (callback) {
      let data = logicLayer.getSessions(req, 'new')
      callApi('subscribers/aggregate', 'post', data)
        .then(result => {
          callback(null, result)
        })
        .catch(err => {
          callback(err)
        })
    },
    function (callback) {
      let unreadCountData = logicLayer.getQueryData('', 'aggregate', {company_id: req.user.companyId.toString(), status: 'unseen', format: 'facebook'}, undefined, undefined, undefined, {_id: '$subscriber_id', count: {$sum: 1}})
      callApi('livechat/query', 'post', unreadCountData, 'kibochat')
        .then(data => {
          callback(null, data)
        })
        .catch(err => {
          callback(err)
        })
    },
    function (callback) {
      let lastMessageData = logicLayer.getQueryData('', 'aggregate', {company_id: req.user.companyId}, undefined, undefined, undefined, {_id: '$subscriber_id', payload: { $last: '$payload' }, replied_by: { $last: '$replied_by' }, datetime: { $last: '$datetime' }})
      callApi(`livechat/query`, 'post', lastMessageData, 'kibochat')
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
      let countResopnse = results[0]
      let sessionsResponse = results[1]
      let unreadCountResponse = results[2]
      let lastMessageResponse = results[3]
      let sessionsWithUnreadCount = logicLayer.putUnreadCount(unreadCountResponse, sessionsResponse)
      let sessions = logicLayer.putLastMessage(lastMessageResponse, sessionsWithUnreadCount)
      if (req.body.filter_criteria.unreadMessages && req.body.filter_criteria.unreadMessages !== '') {
        sessions = sessions.filter(session => session.unreadCount !== undefined)
        if (countResopnse && countResopnse.length > 0) {
          countResopnse[0].count = sessions.length
        }
      }
      sendSuccessResponse(res, 200, {openSessions: sessions, count: countResopnse.length > 0 ? countResopnse[0].count : 0})
    }
  })
}

exports.fetchResolvedSessions = function (req, res) {
  async.parallelLimit([
    function (callback) {
      let data = logicLayer.getCount(req, 'resolved')
      callApi('subscribers/aggregate', 'post', data)
        .then(result => {
          callback(null, result)
        })
        .catch(err => {
          callback(err)
        })
    },
    function (callback) {
      let data = logicLayer.getSessions(req, 'resolved')
      callApi('subscribers/aggregate', 'post', data)
        .then(result => {
          callback(null, result)
        })
        .catch(err => {
          callback(err)
        })
    },
    function (callback) {
      let unreadCountData = logicLayer.getQueryData('', 'aggregate', {company_id: req.user.companyId.toString(), status: 'unseen', format: 'facebook'}, undefined, undefined, undefined, {_id: '$subscriber_id', count: {$sum: 1}})
      callApi('livechat/query', 'post', unreadCountData, 'kibochat')
        .then(data => {
          callback(null, data)
        })
        .catch(err => {
          callback(err)
        })
    },
    function (callback) {
      let lastMessageData = logicLayer.getQueryData('', 'aggregate', {company_id: req.user.companyId}, undefined, undefined, undefined, {_id: '$subscriber_id', payload: { $last: '$payload' }, replied_by: { $last: '$replied_by' }, datetime: { $last: '$datetime' }})
      callApi(`livechat/query`, 'post', lastMessageData, 'kibochat')
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
      let unreadCountResponse = results[2]
      let lastMessageResponse = results[3]
      let sessionsWithUnreadCount = logicLayer.putUnreadCount(unreadCountResponse, sessionsResponse)
      let sessions = logicLayer.putLastMessage(lastMessageResponse, sessionsWithUnreadCount)
      if (req.body.filter_criteria.unreadMessages && req.body.filter_criteria.unreadMessages !== '') {
        sessions = sessions.filter(session => session.unreadCount !== undefined)
        if (countResopnse && countResopnse.length > 0) {
          countResopnse[0].count = sessions.length
        }
      }
      sendSuccessResponse(res, 200, {closedSessions: sessions, count: countResopnse.length > 0 ? countResopnse[0].count : 0})
    }
  })
}

exports.markread = function (req, res) {
  if (req.params.id) {
    async.parallelLimit([
      function (callback) {
        markreadFacebook(req, callback)
      },
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
    sendErrorResponse(res, 500, 'Parameter subscriber_id is required!')
  }
}

function markreadLocal (req, callback) {
  let updateData = logicLayer.getUpdateData('updateAll', {subscriber_id: req.params.id}, {status: 'seen'}, false, true)
  callApi('livechat', 'put', updateData, 'kibochat')
    .then(updated => {
      callback(null, updated)
    })
    .catch(err => {
      callback(err)
    })
}

function markreadFacebook (req, callback) {
  callApi(`subscribers/${req.params.id}`, 'get', {}, 'accounts', req.headers.authorization)
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
        logger.serverLog(TAG, `marked read on Facebook error ${JSON.stringify(resp.error)}`, 'error')
        callback(resp.error)
      } else {
        logger.serverLog(TAG, `marked read on Facebook response ${JSON.stringify(resp.body)}`, 'error')
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
        callApi(`subscribers/${req.params.id}`, 'get', {}, 'accounts', req.headers.authorization)
          .then(subscriber => {
            callback(null, subscriber)
          })
          .catch(err => {
            callback(err)
          })
      },
      function (callback) {
        let unreadCountData = logicLayer.getQueryData('', 'aggregate', {company_id: req.user.companyId.toString(), status: 'unseen', format: 'facebook'}, undefined, undefined, undefined, {_id: '$subscriber_id', count: {$sum: 1}})
        callApi('livechat/query', 'post', unreadCountData, 'kibochat')
          .then(data => {
            callback(null, data)
          })
          .catch(err => {
            callback(err)
          })
      },
      function (callback) {
        let lastMessageData = logicLayer.getQueryData('', 'aggregate', {company_id: req.user.companyId}, undefined, undefined, undefined, {_id: '$subscriber_id', payload: { $last: '$payload' }, replied_by: { $last: '$replied_by' }, datetime: { $last: '$datetime' }})
        callApi(`livechat/query`, 'post', lastMessageData, 'kibochat')
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
        let subscriber = results[0]
        let unreadCountResponse = results[1]
        let lastMessageResponse = results[2]
        let subscriberWithUnreadCount = logicLayer.appendUnreadCountData(unreadCountResponse, subscriber)
        let finalSubscriber = logicLayer.appendLastMessageData(lastMessageResponse, subscriberWithUnreadCount)
        sendSuccessResponse(res, 200, finalSubscriber)
      }
    })
  } else {
    sendErrorResponse(res, 400, 'Parameter subscriber_id is required!')
  }
}

exports.changeStatus = function (req, res) {
  callApi('subscribers/update', 'put', {query: {_id: req.body._id}, newPayload: {status: req.body.status}, options: {}})
    .then(updated => {
      require('./../../../config/socketio').sendMessageToClient({
        room_id: req.user.companyId,
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
      sendSuccessResponse(res, 200, 'Status has been updated successfully!')
    })
    .catch(err => {
      sendErrorResponse(res, 500, err)
    })
}

exports.assignAgent = function (req, res) {
  let assignedTo = {
    type: 'agent',
    id: req.body.agentId,
    name: req.body.agentName
  }
  callApi(
    'subscribers/update',
    'put',
    {
      query: {_id: req.body.subscriberId},
      newPayload: {assigned_to: assignedTo, is_assigned: req.body.isAssigned},
      options: {}
    }
  )
    .then(updated => {
      require('./../../../config/socketio').sendMessageToClient({
        room_id: req.user.companyId,
        body: {
          action: 'session_assign',
          payload: {
            session_id: req.body.subscriberId,
            user_id: req.user._id,
            user_name: req.user.name,
            assigned_to: assignedTo
          }
        }
      })
      sendSuccessResponse(res, 200, 'Agent has been assigned successfully!')
    })
    .catch(err => {
      sendErrorResponse(res, 500, err)
    })
}

exports.assignTeam = function (req, res) {
  let assignedTo = {
    type: 'team',
    id: req.body.teamId,
    name: req.body.teamName
  }
  callApi(
    'subscribers/update',
    'put',
    {
      query: {_id: req.body.subscriberId},
      newPayload: {assigned_to: assignedTo, is_assigned: req.body.isAssigned},
      options: {}
    }
  )
    .then(updated => {
      require('./../../../config/socketio').sendMessageToClient({
        room_id: req.user.companyId,
        body: {
          action: 'session_assign',
          payload: {
            session_id: req.body.subscriberId,
            user_id: req.user._id,
            user_name: req.user.name,
            assigned_to: assignedTo
          }
        }
      })
      sendSuccessResponse(res, 200, 'Team has been assigned successfully!')
    })
    .catch(err => {
      sendErrorResponse(res, 500, err)
    })
}

exports.updatePendingResponse = function (req, res) {
  callApi('subscribers/update', 'put', {
    query: {_id: req.body.id},
    newPayload: {pendingResponse: req.body.pendingResponse},
    options: {}
  })
    .then(updated => {
      require('./../../../config/socketio').sendMessageToClient({
        room_id: req.user.companyId,
        body: {
          action: 'session_pending_response',
          payload: {
            session_id: req.body.id,
            user_id: req.user._id,
            user_name: req.user.name,
            pendingResponse: req.body.pendingResponse
          }
        }
      })
      sendSuccessResponse(res, 200, 'Pending Response updates successfully')
    })
    .catch(err => {
      sendErrorResponse(res, 500, err)
    })
}

exports.genericFind = function (req, res) {
  let messagesData = logicLayer.getQueryData('', 'findAll', req.body)
  callApi('livechat/query', 'post', messagesData, 'kibochat')
    .then(session => {
      sendSuccessResponse(res, 200, session)
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch sessions ${JSON.stringify(error)}`)
    })
}
