const { callApi } = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/v1/sessions/sessions.controller'
const logicLayer = require('./sessions.logiclayer')
const needle = require('needle')
// const util = require('util')
const async = require('async')
const { sendNotifications } = require('../../global/sendNotification')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')

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
      let lastMessageResponse = results[2]
      let sessions = logicLayer.putLastMessage(lastMessageResponse, sessionsResponse)
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
      let lastMessageResponse = results[2]
      let sessions = logicLayer.putLastMessage(lastMessageResponse, sessionsResponse)
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
  callApi('subscribers/update', 'put', {query: {_id: req.params.id}, newPayload: {unreadCount: 0}, options: {}}, 'accounts', req.headers.authorization)
    .then(subscriber => {
      callApi('livechat', 'put', updateData, 'kibochat')
        .then(updated => {
          callback(null, updated)
        })
        .catch(err => {
          callback(err)
        })
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
      return needle('post', `https://graph.facebook.com/v6.0/me/messages?access_token=${subscriber.pageId.accessToken}`, data)
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
  console.log('params', req.param)
  if (req.params.id) {
    async.parallelLimit([
      function (callback) {
        callApi(`subscribers/${req.params.id}`, 'get', {}, 'accounts', req.headers.authorization)
          .then(subscriber => {
            console.log('subscriber', subscriber)
            callback(null, subscriber)
          })
          .catch(err => {
            callback(err)
          })
      },
      function (callback) {
        let lastMessageData = logicLayer.getQueryData('', 'aggregate', {subscriber_id: req.params.id, company_id: req.user.companyId}, undefined, {_id: -1}, 1, undefined)
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
        let lastMessageResponse = results[1]
        subscriber.lastPayload = lastMessageResponse.length > 0 && lastMessageResponse[0].payload
        subscriber.lastRepliedBy = lastMessageResponse.length > 0 && lastMessageResponse[0].replied_by
        subscriber.lastDateTime = lastMessageResponse.length > 0 && lastMessageResponse[0].datetime
        sendSuccessResponse(res, 200, subscriber)
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

  let payload = {
    data: req.body,
    session_id: req.body.subscriberId,
    user_id: req.user._id,
    user_name: req.user.name,
    assigned_to: assignedTo
  } 

  callApi('subscribers/query', 'post', {_id: req.body.subscriberId})
    .then(gotSubscriber => {
      let subscriber = gotSubscriber[0]
      let title = '[' + subscriber.pageId.pageName + ']: ' + subscriber.firstName + ' ' + subscriber.lastName
      let body =  'You have been assigned a session as a agent'
      callApi(`companyUser/queryAll`, 'post', {userId: req.body.agentId}, 'accounts', req.headers.authorization)
        .then(companyUsers => {
          sendNotifications(title, body, payload, companyUsers)
        }).catch(error => {
          logger.serverLog(TAG, `Error while fetching companyUser details ${(error)}`, 'error')
          sendErrorResponse(res, 500, `Failed to fetching companyUser details ${JSON.stringify(error)}`)
        })
    }).catch(err => {
      sendErrorResponse(res, 500, err)
    })
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
          payload: payload
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
            data: req.body,
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
