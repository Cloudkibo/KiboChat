const logicLayer = require('./whatsAppSessions.logiclayer')
const { callApi } = require('../utility')
const async = require('async')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')
const { sendNotifications } = require('../../global/sendNotification')
const logger = require('../../../components/logger')
const TAG = 'api/v1/whatsAppSessions/whatsAppSessions.controller'
const { pushUnresolveAlertInStack, deleteUnresolvedSessionFromStack } = require('../../global/messageAlerts')

exports.fetchOpenSessions = function (req, res) {
  async.parallelLimit([
    function (callback) {
      let data = logicLayer.getCount(req, 'new')
      callApi('whatsAppContacts/aggregate', 'post', data)
        .then(result => {
          callback(null, result)
        })
        .catch(err => {
          callback(err)
        })
    },
    function (callback) {
      let data = logicLayer.getSessions(req, 'new')
      callApi('whatsAppContacts/aggregate', 'post', data)
        .then(result => {
          callback(null, result)
        })
        .catch(err => {
          callback(err)
        })
    },
    function (callback) {
      let lastMessageData = logicLayer.getQueryData('', 'aggregate', {companyId: req.user.companyId}, undefined, undefined, undefined,
        {
          _id: '$contactId',
          format: { $last: '$format' },
          payload: { $last: '$payload' },
          repliedBy: { $last: '$repliedBy' },
          datetime: { $last: '$datetime' }
        }
      )
      callApi(`whatsAppChat/query`, 'post', lastMessageData, 'kibochat')
        .then(data => {
          callback(null, data)
        })
        .catch(err => {
          callback(err)
        })
    }
  ], 10, function (err, results) {
    if (err) {
      const message = err || 'Error while async calls'
      logger.serverLog(message, `${TAG}: exports.fetchOpenSessions`, {}, {user: req.user}, 'error')
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
      callApi('whatsAppContacts/aggregate', 'post', data)
        .then(result => {
          callback(null, result)
        })
        .catch(err => {
          callback(err)
        })
    },
    function (callback) {
      let data = logicLayer.getSessions(req, 'resolved')
      callApi('whatsAppContacts/aggregate', 'post', data)
        .then(result => {
          callback(null, result)
        })
        .catch(err => {
          callback(err)
        })
    },
    function (callback) {
      let lastMessageData = logicLayer.getQueryData('', 'aggregate', {companyId: req.user.companyId}, undefined, undefined, undefined, {_id: '$contactId', payload: { $last: '$payload' }, repliedBy: { $last: '$repliedBy' }, datetime: { $last: '$datetime' }})
      callApi(`whatsAppChat/query`, 'post', lastMessageData, 'kibochat')
        .then(data => {
          callback(null, data)
        })
        .catch(err => {
          callback(err)
        })
    }
  ], 10, function (err, results) {
    if (err) {
      const message = err || 'Error while async calls'
      logger.serverLog(message, `${TAG}: exports.fetchResolvedSessions`, {}, {user: req.user}, 'error')
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
    callApi('whatsAppContacts/update', 'put', {query: {_id: req.params.id}, newPayload: {unreadCount: 0}, options: {}}, 'accounts', req.headers.authorization)
      .then(subscriber => {
        let updateData = logicLayer.getUpdateData('updateAll', {contactId: req.params.id, format: 'whatsApp'}, {status: 'seen', seenDateTime: Date.now}, false, true)
        callApi('whatsAppChat', 'put', updateData, 'kibochat')
          .then(updated => {
            require('./../../../config/socketio').sendMessageToClient({
              room_id: req.user.companyId,
              body: {
                action: 'mark_read_whatsapp',
                payload: {
                  session_id: req.params.id,
                  read_count: updated.nModified
                }
              }
            })
            sendSuccessResponse(res, 200, 'Chat has been marked read successfully!')
          })
          .catch(err => {
            const message = err || 'Error while whatsapp update'
            logger.serverLog(message, `${TAG}: exports.markread`, {}, {user: req.user, params: req.params}, 'error')
            sendErrorResponse(res, 500, err)
          })
      })
      .catch(err => {
        const message = err || 'Error while whatsapp update'
        logger.serverLog(message, `${TAG}: exports.markread`, {}, {user: req.user, params: req.params}, 'error')
        sendErrorResponse(res, 500, err)
      })
  } else {
    sendErrorResponse(res, 400, 'Parameter subscriber_id is required!')
  }
}

function _sendStatusNotification (subscriberId, status, companyId, userName) {
  callApi('whatsAppContacts/query', 'post', {_id: subscriberId})
    .then(gotSubscriber => {
      let subscriber = gotSubscriber[0]
      let newPayload = {
        action: 'chat_whatsapp',
        subscriber: subscriber
      }
      if (subscriber.is_assigned) {
        let lastMessageData = logicLayer.getQueryData('', 'aggregate', {companyId: companyId}, undefined, undefined, undefined, {_id: subscriberId, payload: { $last: '$payload' }, replied_by: { $last: '$replied_by' }, datetime: { $last: '$datetime' }})
        callApi(`whatsAppChat/query`, 'post', lastMessageData, 'kibochat')
          .then(gotLastMessage => {
            console.log('data in assignAgent', gotLastMessage)
            subscriber.lastPayload = gotLastMessage[0].payload
            subscriber.lastRepliedBy = gotLastMessage[0].replied_by
            subscriber.lastDateTime = gotLastMessage[0].datetime
            let title = subscriber.name
            let body = `This session has been ${status === 'new' ? 'opened' : 'resolved'} by ${userName}`
            callApi(`companyUser/queryAll`, 'post', {companyId: companyId}, 'accounts')
              .then(companyUsers => {
                if (subscriber.assigned_to.type === 'agent') {
                  companyUsers = companyUsers.filter(companyUser => companyUser.userId._id === subscriber.assigned_to.id)
                  sendNotifications(title, body, newPayload, companyUsers)
                } else if (subscriber.assigned_to.type === 'team') {
                  callApi(`teams/agents/query`, 'post', {teamId: subscriber.assigned_to.id}, 'accounts')
                    .then(teamagents => {
                      teamagents = teamagents.map(teamagent => teamagent.agentId._id)
                      companyUsers = companyUsers.filter(companyUser => {
                        if (teamagents.includes(companyUser.userId._id)) {
                          return companyUser
                        }
                      })
                      sendNotifications(title, body, newPayload, companyUsers)
                    }).catch(error => {
                      const message = error || 'Error while fetching agents'
                      logger.serverLog(message, `${TAG}: exports._sendStatusNotification`, {}, {subscriberId, status, companyId, userName}, 'error')
                    })
                } else {
                  sendNotifications(title, body, newPayload, companyUsers)
                }
              }).catch(error => {
                const message = error || 'Error while fetching companyUsers'
                logger.serverLog(message, `${TAG}: exports._sendStatusNotification`, {}, {subscriberId, status, companyId, userName}, 'error')
              })
          })
      }
    }).catch(error => {
      const message = error || 'Error while fetching subscribers'
      logger.serverLog(message, `${TAG}: exports._sendStatusNotification`, {}, {subscriberId, status, companyId, userName}, 'error')
    })
}
exports.changeStatus = function (req, res) {
  _sendStatusNotification(req.body._id, req.body.status, req.user.companyId, req.user.name)
  callApi('whatsAppContacts/update', 'put', {query: {_id: req.body._id}, newPayload: {status: req.body.status}, options: {}})
    .then(updated => {
      callApi('whatsAppContacts/query', 'post', {_id: req.body._id})
        .then(contact => {
          contact = contact[0]
          if (req.body.status === 'resolved') {
            deleteUnresolvedSessionFromStack(req.body._id)
          } else {
            callApi(`companyprofile/query`, 'post', { _id: req.user.companyId })
              .then(company => {
                pushUnresolveAlertInStack(company, contact, 'whatsApp')
              })
              .catch(err => {
                const message = err || 'Unable to fetch company'
                logger.serverLog(message, `${TAG}: exports.changeStatus`, req.body, {user: req.user}, 'error')
              })
          }
          let lastMessageData = logicLayer.getQueryData('', 'aggregate', {contactId: req.body._id, companyId: req.user.companyId}, undefined, {_id: -1}, 1, undefined)
          callApi(`whatsAppChat/query`, 'post', lastMessageData, 'kibochat')
            .then(lastMessageResponse => {
              contact.lastPayload = lastMessageResponse.length > 0 && lastMessageResponse[0].payload
              contact.lastPayload.format = lastMessageResponse.length > 0 && lastMessageResponse[0].format
              contact.lastRepliedBy = lastMessageResponse.length > 0 && lastMessageResponse[0].repliedBy
              contact.lastDateTime = lastMessageResponse.length > 0 && lastMessageResponse[0].datetime
              require('./../../../config/socketio').sendMessageToClient({
                room_id: req.user.companyId,
                body: {
                  action: 'session_status_whatsapp',
                  payload: {
                    session_id: req.body._id,
                    user_id: req.user._id,
                    user_name: req.user.name,
                    status: req.body.status,
                    session: contact
                  }
                }
              })
              sendSuccessResponse(res, 200, 'Status has been updated successfully!')
            })
            .catch(err => {
              const message = err || 'Unable to whatsapp chat query'
              logger.serverLog(message, `${TAG}: exports.changeStatus`, req.body, {user: req.user}, 'error')
              sendErrorResponse(res, 500, err)
            })
        })
        .catch(err => {
          const message = err || 'Unable to whatsapp contact query'
          logger.serverLog(message, `${TAG}: exports.changeStatus`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, err)
        })
    })
    .catch(err => {
      const message = err || 'Unable to whatsapp contact update'
      logger.serverLog(message, `${TAG}: exports.changeStatus`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, err)
    })
}

exports.updatePendingResponse = function (req, res) {
  callApi('whatsAppContacts/update', 'put', {
    query: {_id: req.body.id},
    newPayload: {pendingResponse: req.body.pendingResponse},
    options: {}
  })
    .then(updated => {
      require('./../../../config/socketio').sendMessageToClient({
        room_id: req.user.companyId,
        body: {
          action: 'session_pending_response_whatsapp',
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
      const message = err || 'Unable to whatsapp contact update'
      logger.serverLog(message, `${TAG}: exports.updatePendingResponse`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, err)
    })
}

exports.updatePauseChatbot = function (req, res) {
  callApi('whatsAppContacts/update', 'put', {
    query: {_id: req.body.subscriberId},
    newPayload: {chatbotPaused: req.body.chatbotPaused},
    options: {}
  })
    .then(updated => {
      sendSuccessResponse(res, 200, 'chatbot paused value changes successfully')
    })
    .catch(err => {
      const message = err || 'Unable to whatsapp contact update'
      logger.serverLog(message, `${TAG}: exports.updatePauseChatbot`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, err)
    })
}

function _sendNotification (title, body, subscriber, companyUsers, lastMessageData) {
  callApi(`whatsAppChat/query`, 'post', lastMessageData, 'kibochat')
    .then(gotLastMessage => {
      console.log('data in assignAgent', gotLastMessage)
      subscriber.lastPayload = gotLastMessage[0].payload
      subscriber.lastRepliedBy = gotLastMessage[0].replied_by
      subscriber.lastDateTime = gotLastMessage[0].datetime
      let newPayload = {
        action: 'chat_whatsapp',
        subscriber: subscriber
      }
      sendNotifications(title, body, newPayload, companyUsers)
    }).catch(error => {
      const message = error || 'Error while fetching lastMessageData details'
      logger.serverLog(message, `${TAG}: exports._sendNotification`, {}, { title, body, subscriber, companyUsers, lastMessageData }, 'error')
    })
}

exports.assignAgent = function (req, res) {
  let assignedTo = {
    type: 'agent',
    id: req.body.agentId,
    name: req.body.agentName
  }
  if (req.body.isAssigned) {
    callApi('whatsAppContacts/query', 'post', {_id: req.body.subscriberId})
      .then(gotSubscriber => {
        let subscriber = gotSubscriber[0]
        let title = subscriber.name
        let body = 'You have been assigned a session as a agent'
        callApi(`companyUser/queryAll`, 'post', {userId: req.body.agentId}, 'accounts', req.headers.authorization)
          .then(companyUsers => {
            let lastMessageData = logicLayer.getQueryData('', 'aggregate', {companyId: req.user.companyId}, undefined, undefined, undefined, {_id: req.body.subscriberId, payload: { $last: '$payload' }, replied_by: { $last: '$replied_by' }, datetime: { $last: '$datetime' }})
            _sendNotification(title, body, subscriber, companyUsers, lastMessageData)
          }).catch(error => {
            const message = error || 'Error while fetching companyUser details'
            logger.serverLog(message, `${TAG}: exports.assignAgent`, req.body, {user: req.user}, 'error')
            sendErrorResponse(res, 500, `Failed to fetching companyUser details ${JSON.stringify(error)}`)
          })
      }).catch(err => {
        const message = err || 'Error while fetching whatsapp contacts query'
        logger.serverLog(message, `${TAG}: exports.assignAgent`, req.body, {user: req.user}, 'error')
        sendErrorResponse(res, 500, err)
      })
  }
  callApi(
    'whatsAppContacts/update',
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
          action: 'session_assign_whatsapp',
          payload: {
            session_id: req.body.subscriberId,
            user_id: req.user._id,
            user_name: req.user.name,
            assigned_to: assignedTo,
            data: req.body
          }
        }
      })
      sendSuccessResponse(res, 200, 'Agent has been assigned successfully!')
    })
    .catch(err => {
      const message = err || 'Error while fetching whatsapp contacts update'
      logger.serverLog(message, `${TAG}: exports.assignAgent`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, err)
    })
}

exports.assignTeam = function (req, res) {
  let assignedTo = {
    type: 'team',
    id: req.body.teamId,
    name: req.body.teamName
  }

  if (req.body.isAssigned) {
    callApi(`companyUser/queryAll`, 'post', {companyId: req.user.companyId}, 'accounts')
      .then(companyUsers => {
        callApi(`teams/agents/query`, 'post', {teamId: req.body.teamId}, 'accounts')
          .then(teamagents => {
            teamagents = teamagents.map(teamagent => teamagent.agentId._id)
            companyUsers = companyUsers.filter(companyUser => {
              if (teamagents.includes(companyUser.userId._id)) {
                return companyUser
              }
            })
            callApi('whatsAppContacts/query', 'post', {_id: req.body.subscriberId})
              .then(gotSubscriber => {
                let subscriber = gotSubscriber[0]
                let title = subscriber.name
                let lastMessageData = logicLayer.getQueryData('', 'aggregate', {companyId: req.user.companyId}, undefined, undefined, undefined, {_id: req.body.subscriberId, payload: { $last: '$payload' }, replied_by: { $last: '$replied_by' }, datetime: { $last: '$datetime' }})
                let body = `You have been assigned a session as a agent in a ${req.body.teamName} team`
                _sendNotification(title, body, subscriber, companyUsers, lastMessageData)
              }).catch(err => {
                const message = err || 'Error while fetching agents'
                logger.serverLog(message, `${TAG}: exports.assignTeam`, req.body, {user: req.user}, 'error')
                sendErrorResponse(res, 500, err)
              })
          }).catch(error => {
            const message = error || 'Error while fetching agents'
            logger.serverLog(message, `${TAG}: exports.assignTeam`, req.body, {user: req.user}, 'error')
          })
      }).catch(error => {
        const message = error || 'Error while fetching companyUser'
        logger.serverLog(message, `${TAG}: exports.assignTeam`, req.body, {user: req.user}, 'error')
      })
  }
  callApi(
    'whatsAppContacts/update',
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
          action: 'session_assign_whatsapp',
          payload: {
            session_id: req.body.subscriberId,
            user_id: req.user._id,
            user_name: req.user.name,
            assigned_to: assignedTo,
            data: req.body
          }
        }
      })
      sendSuccessResponse(res, 200, 'Team has been assigned successfully!')
    })
    .catch(err => {
      const message = err || 'Error while whatsapp contacts update'
      logger.serverLog(message, `${TAG}: exports.assignTeam`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, err)
    })
}
