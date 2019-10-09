const logger = require('../../../components/logger')
const logicLayer = require('./whatsAppChat.logiclayer')
const TAG = '/api/v1/whatsAppChat/whatsAppChat.controller.js'
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
      let lastMessageData = logicLayer.getQueryData('', 'aggregate', {companyId: req.user.companyId}, undefined, undefined, undefined, {_id: '$contactId', payload: { $last: '$payload' }, replied_by: { $last: '$replied_by' }, datetime: { $last: '$datetime' }})
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
      let lastMessageData = logicLayer.getQueryData('', 'aggregate', {companyId: req.user.companyId}, undefined, undefined, undefined, {_id: '$contactId', payload: { $last: '$payload' }, replied_by: { $last: '$replied_by' }, datetime: { $last: '$datetime' }})
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

exports.index = function (req, res) {
  if (req.params.contactId) {
    let query = {
      contactId: req.params.contactId,
      companyId: req.user.companyId,
      _id: req.body.page === 'next' ? { $lt: req.body.last_id } : {$exists: true}
    }

    let messagesCountData = logicLayer.getQueryData('count', 'aggregate', { contactId: req.params.contactId, companyId: req.user.companyId })
    let messagesData = logicLayer.getQueryData('', 'aggregate', query, 0, { datetime: -1 }, req.body.number)

    async.parallelLimit([
      function (callback) {
        callApi(`whatsAppChat/query`, 'post', messagesCountData, 'kibochat')
          .then(data => {
            callback(null, data)
          })
          .catch(err => {
            callback(err)
          })
      },
      function (callback) {
        callApi(`whatsAppChat/query`, 'post', messagesData, 'kibochat')
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
        let chatCount = results[0]
        let fbchats = results[1].reverse()
        fbchats = logicLayer.setChatProperties(fbchats)
        sendSuccessResponse(res, 200, { chat: fbchats, count: chatCount.length > 0 ? chatCount[0].count : 0 })
      }
    })
  } else {
    sendErrorResponse(res, 400, 'Parameter session_id is required!')
  }
}

exports.create = function (req, res) {
  callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email, populate: 'companyId' })
    .then(companyUser => {
      if (!companyUser) {
        sendErrorResponse(res, 404, '', 'The user account does not belong to any company. Please contact support')
      }
      let subscriberData = {
        query: {_id: req.body.contactId},
        newPayload: {last_activity_time: Date.now()},
        options: {}
      }
      let MessageObject = logicLayer.prepareChat(req.body, companyUser)
      // Create Message Object
      callApi(`whatsAppChat`, 'post', MessageObject, 'kibochat')
        .then(message => {
          async.parallelLimit([
            function (callback) {
              callApi(`whatsAppContacts/update`, 'put', subscriberData)
                .then(updated => {
                  callback(null, updated)
                })
                .catch(error => {
                  callback(error)
                })
            },
            function (callback) {
              subscriberData.newPayload = {$inc: { messagesCount: 1 }}
              callApi(`whatsAppContacts/update`, 'put', subscriberData)
                .then(updated => {
                  callback(null, updated)
                })
                .catch(error => {
                  callback(error)
                })
            },
            function (callback) {
              let accountSid = companyUser.companyId.twilioWhatsApp.accountSID
              let authToken = companyUser.companyId.twilioWhatsApp.authToken
              let client = require('twilio')(accountSid, authToken)
              let messageToSend = logicLayer.prepareSendMessagePayload(req.body, companyUser, message)
              client.messages
                .create(messageToSend)
                .then(response => {
                  callback(null, message)
                })
                .catch(error => {
                  sendErrorResponse(res, 500, `Failed to send message ${JSON.stringify(error)}`)
                })
            }
          ], 10, function (err, results) {
            if (err) {
              sendErrorResponse(res, 500, `Failed to send message ${JSON.stringify(err)}`)
            } else {
              sendSuccessResponse(res, 200, message)
            }
          })
        })
        .catch(error => {
          sendErrorResponse(res, 500, `Failed to save message ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
    })
}
exports.markread = function (req, res) {
  if (req.params.id) {
    callApi('whatsAppContacts/update', 'put', {query: {_id: req.params.id}, newPayload: {unreadCount: 0}, options: {}}, 'accounts', req.headers.authorization)
      .then(subscriber => {
        let updateData = logicLayer.getUpdateData('updateAll', {contactId: req.params.id}, {status: 'seen', seenDateTime: Date.now}, false, true)
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
      require('./../../../config/socketio').sendMessageToClient({
        room_id: req.user.companyId,
        body: {
          action: 'whatsApp_session_status',
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
          action: 'whatsApp_session_pending_response',
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
exports.search = function (req, res) {
  let searchData = { contactId: req.body.subscriber_id, companyId: req.user.companyId, $text: { $search: req.body.text } }
  callApi(`whatsAppChat/search`, 'post', searchData, 'kibochat')
    .then(chats => {
      sendSuccessResponse(res, 200, chats)
    })
    .catch(err => {
      sendErrorResponse(res, 500, '', err)
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
exports.setCustomFieldValue = function (req, res) {
  let customFieldResponse = callApi(
    'custom_fields/query', 'post',
    { purpose: 'findOne', match: { _id: req.body.customFieldId, companyId: req.user.companyId } }
  )
  let foundSubscriberResponse = (subscriberId) => callApi(
    `whatsAppContacts/query`,
    'post',
    {_id: subscriberId}
  )
  let customFieldSubscribersRespons = (subscriberId) => callApi(
    'custom_field_subscribers/query', 'post',
    { purpose: 'findOne', match: { customFieldId: req.body.customFieldId, subscriberId: subscriberId } }
  )

  customFieldResponse.then(foundCustomField => {
    if (!foundCustomField) return new Promise((resolve, reject) => { reject(new Error('Custom Field Not Found With Given ID')) })
    else {
      req.body.subscriberIds.forEach((subscriberId, index) => {
        foundSubscriberResponse(subscriberId)
          .then(foundSubscriber => {
            foundSubscriber = foundSubscriber[0]
            if (!foundSubscriber) return new Promise((resolve, reject) => { reject(new Error('Subscriber Not Found With Given ID')) })
            else return customFieldSubscribersRespons(subscriberId)
          })
          .then(foundCustomFieldSubscriber => {
            let subscribepayload = {
              customFieldId: req.body.customFieldId,
              subscriberId: subscriberId,
              value: req.body.value
            }
            if (!foundCustomFieldSubscriber) {
              return callApi('custom_field_subscribers/', 'post', subscribepayload)
            } else {
              return callApi('custom_field_subscribers/', 'put',
                { purpose: 'updateOne', match: { customFieldId: req.body.customFieldId, subscriberId: subscriberId }, updated: { value: req.body.value } })
            }
          })
          .then(setCustomFieldValue => {
            require('./../../../config/socketio').sendMessageToClient({
              room_id: req.user.companyId,
              body: {
                action: 'set_custom_field_value',
                payload: {
                  setCustomField: setCustomFieldValue
                }
              }
            })
            if (index === req.body.subscriberIds.length - 1) {
              sendSuccessResponse(res, 200, setCustomFieldValue)
            }
          })
          .catch(err => {
            sendErrorResponse(res, 500, `Internal Server ${(err)}`)
          })
      })
    }
  })
    .catch(err => {
      sendErrorResponse(res, 500, `Internal Server ${(err)}`)
    })
}
