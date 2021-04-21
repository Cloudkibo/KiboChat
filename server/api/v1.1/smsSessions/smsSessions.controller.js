const logicLayer = require('./smsSessions.logiclayer')
const { callApi } = require('../utility')
const async = require('async')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')
const { pushUnresolveAlertInStack, deleteUnresolvedSessionFromStack } = require('../../global/messageAlerts')
const logger = require('../../../components/logger')
const TAG = 'api/v1.1/smsSessions/smsSessions.controller.js'

exports.fetchOpenSessions = function (req, res) {
  async.parallelLimit([
    function (callback) {
      let data = logicLayer.getCount(req, 'new')
      callApi('contacts/aggregate', 'post', data)
        .then(result => {
          callback(null, result)
        })
        .catch(err => {
          callback(err)
        })
    },
    function (callback) {
      let data = logicLayer.getSessions(req, 'new')
      callApi('contacts/aggregate', 'post', data)
        .then(result => {
          callback(null, result)
        })
        .catch(err => {
          callback(err)
        })
    },
    function (callback) {
      let lastMessageData = logicLayer.getQueryData('', 'aggregate', {companyId: req.user.companyId}, undefined, undefined, undefined, {_id: '$contactId', payload: { $last: '$payload' }, repliedBy: { $last: '$repliedBy' }, format: { $last: '$format' }, datetime: { $last: '$datetime' }})
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
      const message = err || 'Error in async calls'
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
      callApi('contacts/aggregate', 'post', data)
        .then(result => {
          callback(null, result)
        })
        .catch(err => {
          callback(err)
        })
    },
    function (callback) {
      let data = logicLayer.getSessions(req, 'resolved')
      callApi('contacts/aggregate', 'post', data)
        .then(result => {
          callback(null, result)
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
      const message = err || 'Error in async calls'
      logger.serverLog(message, `${TAG}: exports.fetchResolvedSessions`, {}, {user: req.user}, 'error')
      sendErrorResponse(res, 500, err)
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
        let updateData = logicLayer.getUpdateData('updateAll', {contactId: req.params.id}, {status: 'seen'}, false, true)
        callApi('smsChat', 'put', updateData, 'kibochat')
          .then(updated => {
            callback(null, updated)
          })
          .catch(err => {
            callback(err)
          })
      },
      function (callback) {
        callApi('contacts/update', 'put', {query: {_id: req.params.id}, newPayload: {unreadCount: 0}, options: {}}, 'accounts', req.headers.authorization)
          .then(updated => {
            callback(null, updated)
          })
          .catch(err => {
            callback(err)
          })
      }
    ], 10, function (err, results) {
      if (err) {
        const message = err || 'Error in async calls'
        logger.serverLog(message, `${TAG}: exports.markread`, {}, {user: req.use, params: req.params}, 'error')
        sendErrorResponse(res, 500, err)
      } else {
        sendSuccessResponse(res, 200, 'Chat has been marked read successfully!')
      }
    })
  } else {
    sendErrorResponse(res, 400, 'Parameter subscriber_id is required!')
  }
}

exports.updatePendingResponse = function (req, res) {
  callApi('contacts/update', 'put', {
    query: {_id: req.body.id},
    newPayload: {pendingResponse: req.body.pendingResponse},
    options: {}
  })
    .then(updated => {
      require('./../../../config/socketio').sendMessageToClient({
        room_id: req.user.companyId,
        body: {
          action: 'session_pending_response_sms',
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
      const message = err || 'Error in updating contact'
      logger.serverLog(message, `${TAG}: exports.updatePendingResponse`, req.body, {user: req.use}, 'error')
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
    'contacts/update',
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
          action: 'session_assign_sms',
          payload: {
            data: req.body,
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
      const message = err || 'Error in updating contact'
      logger.serverLog(message, `${TAG}: exports.assignAgent`, req.body, {user: req.use}, 'error')
      sendErrorResponse(res, 500, err)
    })
}

exports.changeStatus = function (req, res) {
  callApi('contacts/update', 'put', {query: {_id: req.body._id}, newPayload: {status: req.body.status}, options: {}})
    .then(updated => {
      callApi('contacts/query', 'post', {_id: req.body._id})
        .then(contact => {
          contact = contact[0]
          if (req.body.status === 'resolved') {
            deleteUnresolvedSessionFromStack(req.body._id)
          } else {
            callApi(`companyprofile/query`, 'post', { _id: req.user.companyId })
              .then(company => {
                pushUnresolveAlertInStack(company, contact, 'sms')
              })
              .catch(err => {
                const message = err || 'Unable to fetch company'
                return logger.serverLog(message, `${TAG}: exports.changeStatus`, req.body, {user: req.user}, 'error')
              })
          }
          let lastMessageData = logicLayer.getQueryData('', 'aggregate', {contactId: req.params.id, companyId: req.user.companyId}, undefined, {_id: -1}, 1, undefined)
          callApi(`smsChat/query`, 'post', lastMessageData, 'kibochat')
            .then(lastMessageResponse => {
              contact.lastPayload = lastMessageResponse.length > 0 && lastMessageResponse[0].payload
              contact.lastPayload.format = lastMessageResponse.length > 0 && lastMessageResponse[0].format
              contact.lastRepliedBy = lastMessageResponse.length > 0 && lastMessageResponse[0].repliedBy
              contact.lastDateTime = lastMessageResponse.length > 0 && lastMessageResponse[0].datetime
              require('./../../../config/socketio').sendMessageToClient({
                room_id: req.user.companyId,
                body: {
                  action: 'session_status_sms',
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
              const message = err || 'Unable to fetch sms chat'
              logger.serverLog(message, `${TAG}: exports.changeStatus`, req.body, {user: req.user}, 'error')
              sendErrorResponse(res, 500, err)
            })
        })
        .catch(err => {
          const message = err || 'Unable to fetch query'
          logger.serverLog(message, `${TAG}: exports.changeStatus`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, err)
        })
    })
    .catch(err => {
      const message = err || 'Unable to contacts update'
      logger.serverLog(message, `${TAG}: exports.changeStatus`, req.body, {user: req.user}, 'error')
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
    'contacts/update',
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
          action: 'session_assign_sms',
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
      const message = err || 'Unable to contacts update'
      logger.serverLog(message, `${TAG}: exports.assignTeam`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, err)
    })
}
exports.getTwilioNumbers = function (req, res) {
  let numbers = []
  callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email, populate: 'companyId' }) // fetch company user
    .then(companyuser => {
      let accountSid = companyuser.companyId.sms.accountSID
      let authToken = companyuser.companyId.sms.authToken
      let client = require('twilio')(accountSid, authToken)
      client.incomingPhoneNumbers
        .list().then((incomingPhoneNumbers) => {
          for (let i = 0; i < incomingPhoneNumbers.length; i++) {
            numbers.push(incomingPhoneNumbers[i].phoneNumber)
            if (i === incomingPhoneNumbers.length - 1) {
              sendSuccessResponse(res, 200, numbers)
            }
          }
        })
    })
    .catch(error => {
      const message = error || 'Failed to fetch company user'
      logger.serverLog(message, `${TAG}: exports.getTwilioNumbers`, {}, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
    })
}
