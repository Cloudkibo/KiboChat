const logicLayer = require('./whatsAppSessions.logiclayer')
const { callApi } = require('../utility')
const async = require('async')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')

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
        let updateData = logicLayer.getUpdateData('updateAll', {contactId: req.params.id, format: 'twilio'}, {status: 'seen', seenDateTime: Date.now}, false, true)
        callApi('whatsAppChat', 'put', updateData, 'kibochat')
          .then(updated => {
            sendSuccessResponse(res, 200, 'Chat has been marked read successfully!')
          })
          .catch(err => {
            sendErrorResponse(res, 500, err)
          })
      })
      .catch(err => {
        sendErrorResponse(res, 500, err)
      })
  } else {
    sendErrorResponse(res, 400, 'Parameter subscriber_id is required!')
  }
}

exports.changeStatus = function (req, res) {
  callApi('whatsAppContacts/update', 'put', {query: {_id: req.body._id}, newPayload: {status: req.body.status}, options: {}})
    .then(updated => {
      callApi('whatsAppContacts/query', 'post', {_id: req.body._id})
        .then(contact => {
          contact = contact[0]
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
              sendErrorResponse(res, 500, err)
            })
        })
        .catch(err => {
          sendErrorResponse(res, 500, err)
        })
    })
    .catch(err => {
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
      sendErrorResponse(res, 500, err)
    })
}
