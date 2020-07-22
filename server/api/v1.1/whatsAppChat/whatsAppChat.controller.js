const logicLayer = require('./whatsAppChat.logiclayer')
const { callApi } = require('../utility')
const async = require('async')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')
const { sendOpAlert } = require('../../global/operationalAlert')
const { flockSendApiCaller } = require('../../global/flockSendApiCaller')
const logger = require('../../../components/logger')
const TAG = '/api/v1/whatsAppChat/whatsAppChat.controller.js'

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
        newPayload: {last_activity_time: Date.now(), pendingResponse: false},
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
              let {route, MessageObject} = logicLayer.prepareFlockSendPayload(req.body, companyUser, message)
              // record('whatsappChatOutGoing')
              flockSendApiCaller(route, 'post', MessageObject)
                .then(response => {
                  let parsed = JSON.parse(response.body)
                  if (parsed.code !== 200) {
                    callback(parsed.message)
                  } else {
                    updateChat(parsed.data, message)
                    callback(null, message)
                  }
                })
                .catch(error => {
                  sendOpAlert(error, 'whatsAppChat controller in kibochat', null, req.user._id, companyUser.companyId)
                  callback(error)
                })
            }
          ], 10, function (err, results) {
            if (err) {
              sendErrorResponse(res, 500, err)
            } else {
              require('./../../../config/socketio').sendMessageToClient({
                room_id: req.user.companyId,
                body: {
                  action: 'agent_replied_whatsapp',
                  payload: {
                    subscriber_id: req.body.contactId,
                    message: message,
                    action: 'agent_replied_whatsapp',
                    user_id: req.user._id,
                    user_name: req.user.name
                  }
                }
              })
              sendSuccessResponse(res, 200, message)
            }
          })
        })
        .catch(error => {
          sendErrorResponse(res, 500, `Failed to save message ${error}`)
        })
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
    })
}

function updateChat (data, message) {
  let query = {
    purpose: 'updateOne',
    match: {_id: message._id},
    updated: {messageId: data[0].id}
  }
  callApi(`whatsAppChat`, 'put', query, 'kibochat')
    .then(updated => {
    })
    .catch((err) => {
      logger.serverLog(TAG, `Failed to update chat ${err}`, 'error')
    })
}

exports.search = function (req, res) {
  let searchData = {
    contactId: req.body.subscriber_id,
    companyId: req.user.companyId,
    $text: { $search: req.body.text }
  }
  if (req.body.datetime) {
    searchData.datetime = {$lt: new Date(req.body.datetime)}
  }
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

exports.setCustomFieldValue = function (req, res) {
  let customFieldResponse = callApi(
    'custom_fields/query', 'post',
    { purpose: 'findOne', match: { _id: req.body.customFieldId, $or: [{companyId: req.user.companyId}, {default: true}] } }
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
