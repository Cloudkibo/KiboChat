const logicLayer = require('./whatsAppChat.logiclayer')
const { callApi } = require('../utility')
const async = require('async')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')
const { sendOpAlert } = require('../../global/operationalAlert')
const { whatsAppMapper } = require('../../../whatsAppMapper/whatsAppMapper')
const logger = require('../../../components/logger')
const TAG = '/api/v1.1/whatsAppChat/whatsAppChat.controller.js'
const { record } = require('../../global/messageStatistics')
const {ActionTypes} = require('../../../whatsAppMapper/constants')
const { deletePendingSessionFromStack } = require('../../global/messageAlerts')

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
        const message = err || 'Failed to update webhooks'
        logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user, params: req.params}, 'error')
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
  let MessageObject = logicLayer.prepareChat(req.body, req.user.companyId, req.user.whatsApp)
  callApi(`whatsAppChat`, 'post', MessageObject, 'kibochat')
    .then(message => {
      async.parallelLimit([
        function (callback) {
          let subscriberData = {
            query: {_id: req.body.contactId},
            newPayload: {
              $set: {
                last_activity_time: Date.now(),
                agent_activity_time: Date.now(),
                pendingResponse: false,
                chatbotPaused: true
              },
              $inc: { messagesCount: 1 }
            },
            options: {}
          }
          callApi(`whatsAppContacts/update`, 'put', subscriberData)
            .then(updated => {
              callback(null, updated)
            })
            .catch(error => {
              callback(error)
            })
        },
        function (callback) {
          req.body.message = message
          req.body.whatsApp = req.user.whatsApp
          record('whatsappChatOutGoing')
          whatsAppMapper(req.user.whatsApp.provider, ActionTypes.SEND_CHAT_MESSAGE, req.body)
            .then(messageId => {
              updateChat(messageId, message)
              callback(null, message)
            })
            .catch(error => {
              sendOpAlert(error, 'whatsAppChat controller in kibochat', null, req.user._id, req.user.companyId)
              callback(error)
            })
        },
        function (callback) {
          deletePendingSessionFromStack(req.body.contactId)
          callback(null)
        }
      ], 10, function (err, results) {
        if (err) {
          const message = err || 'Failed to update webhooks'
          logger.serverLog(message, `${TAG}: exports.create`, req.body, {user: req.user, params: req.params}, 'error')
          sendErrorResponse(res, 500, err)
        } else {
          let data = {...message}
          data._id = req.body._id
          require('./../../../config/socketio').sendMessageToClient({
            room_id: req.user.companyId,
            body: {
              action: 'agent_replied_whatsapp',
              payload: {
                subscriber_id: req.body.contactId,
                message: data,
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
      const message = error || 'Failed to save message'
      logger.serverLog(message, `${TAG}: exports.create`, req.body, {user: req.user, params: req.params}, 'error')
      sendErrorResponse(res, 500, `Failed to save message ${error}`)
    })
}

function updateChat (messageId, chat) {
  let query = {
    purpose: 'updateOne',
    match: {_id: chat._id},
    updated: {messageId: messageId}
  }
  callApi(`whatsAppChat`, 'put', query, 'kibochat')
    .then(updated => {
    })
    .catch((err) => {
      const message = err || 'Failed to update chat'
      logger.serverLog(message, `${TAG}: exports.updateChat`, {}, { messageId, chat }, 'error')
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
      const message = err || 'Failed to search chat'
      logger.serverLog(message, `${TAG}: exports.search`, req.body, { user: req.user, searchData }, 'error')
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
      const message = err || 'Failed to assign agent'
      logger.serverLog(message, `${TAG}: exports.assignAgent`, req.body, { user: req.user }, 'error')
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
            const message = err || 'Failed to set custom field value'
            logger.serverLog(message, `${TAG}: exports.setCustomFieldValue`, req.body, { user: req.user }, 'error')
            sendErrorResponse(res, 500, `Internal Server ${(err)}`)
          })
      })
    }
  })
    .catch(err => {
      const message = err || 'Failed to fetch custom field value'
      logger.serverLog(message, `${TAG}: exports.setCustomFieldValue`, req.body, { user: req.user }, 'error')
      sendErrorResponse(res, 500, `Internal Server ${(err)}`)
    })
}
