const utility = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/v1/messengerEvents/capturePhoneEmail.logiclayer'
const { isEmail, isPhoneNumber } = require('../../global/utility.js')
const { handleChatBotNextMessage, sendResponse } = require('./chatbotAutomation.controller')

exports.captureUserEmailAndPhone = (event, subscriber, page) => {
  var awaitingUserInfo = ''
  var chatBotInfo = null
  var invalidInput = ''
  for (let action of subscriber.awaitingQuickReplyPayload.action) {
    if (action.query) {
      if (action.query === 'email') {
        if (isEmail(event.message.text)) {
          awaitingUserInfo = 'Email'
          if (action.blockId) {
            chatBotInfo = {
              nextBlockId: action.blockId,
              parentBlockTitle: subscriber.awaitingQuickReplyPayload.messageBlockTitle
            }
          }
          break
        } else {
          invalidInput = 'You have entered an invalid email'
        }
      }
      if (action.query === 'phone') {
        if (isPhoneNumber(event.message.text)) {
          awaitingUserInfo = 'Phone Number'
          if (action.blockId) {
            chatBotInfo = {
              nextBlockId: action.blockId,
              parentBlockTitle: subscriber.awaitingQuickReplyPayload.messageBlockTitle
            }
          }
          break
        } else {
          invalidInput = 'You have entered an invalid phone number'
        }
      }
    }
  }
  if (awaitingUserInfo !== '') {
    _saveUserInfoInCustomField(subscriber, awaitingUserInfo, event, page.companyId)
  } else {
    if (invalidInput !== '') {
      var payload = {
        componentType: 'text',
        text: invalidInput
      }
      sendInvalidInputResponse(subscriber.senderId, payload, subscriber, page)
    }
  }
  if (chatBotInfo) {
    handleChatBotNextMessage(event, page, subscriber, chatBotInfo.nextBlockId, chatBotInfo.parentBlockTitle)
  }
  _unSetAwaitingUserInfoPayload(subscriber)
}

function _saveUserInfoInCustomField (subscriber, awaitingUserInfo, event, companyId) {
  utility.callApi('custom_fields/query', 'post', { purpose: 'findOne', match: { name: awaitingUserInfo, default: true } })
    .then(customField => {
      if (customField) {
        var customFieldSubscriber = {
          'customFieldId': customField._id,
          'subscriberId': subscriber._id,
          'value': event.message.text
        }
        utility.callApi('custom_field_subscribers/query', 'post', { purpose: 'findOne', match: {customFieldId: customField._id, subscriberId: subscriber._id} })
          .then(fieldFound => {
            if (fieldFound) {
              utility.callApi('custom_field_subscribers', 'put', { purpose: 'updateOne', match: { customFieldId: customField._id, subscriberId: subscriber._id }, updated: { value: event.message.text } })
                .then(updated => {
                  logger.serverLog('Custom field updated', `${TAG}: exports._saveUserInfoInCustomField`, {}, {awaitingUserInfo, event, subscriber}, 'info')
                  require('./../../../config/socketio').sendMessageToClient({
                    room_id: companyId,
                    body: {
                      action: 'set_custom_field_value',
                      payload: {
                        setCustomField: customFieldSubscriber
                      }
                    }
                  })
                })
                .catch(err => {
                  const message = err || 'Failed to update custom field'
                  return logger.serverLog(message, `${TAG}: exports._saveUserInfoInCustomField`, {}, {awaitingUserInfo, event, subscriber}, 'error')
                })
            } else {
              utility.callApi('custom_field_subscribers', 'post', customFieldSubscriber)
                .then(created => {
                  require('./../../../config/socketio').sendMessageToClient({
                    room_id: companyId,
                    body: {
                      action: 'set_custom_field_value',
                      payload: {
                        setCustomField: customFieldSubscriber
                      }
                    }
                  })
                  logger.serverLog('Custom field created', `${TAG}: exports._saveUserInfoInCustomField`, {}, {awaitingUserInfo, event, subscriber}, 'info')
                })
                .catch(err => {
                  const message = err || 'Failed to create custom field'
                  return logger.serverLog(message, `${TAG}: exports.captureUserEmailAndPhone`, {}, {awaitingUserInfo, event, subscriber}, 'error')
                })
            }
          })
          .catch(error => {
            const message = error || 'Failed to update custom field'
            return logger.serverLog(message, `${TAG}: exports.captureUserEmailAndPhone`, {}, {awaitingUserInfo, event, subscriber}, 'error')
          })
      } else {
        return logger.serverLog('No custom field found', `${TAG}: exports.captureUserEmailAndPhone`, {}, {awaitingUserInfo, event, subscriber}, 'info')
      }
    })
    .catch(error => {
      const message = error || 'Failed to fetch default custom field'
      return logger.serverLog(message, `${TAG}: exports.captureUserEmailAndPhone`, {}, {awaitingUserInfo, event, subscriber}, 'error')
    })
}
function _unSetAwaitingUserInfoPayload (subscriber, awaiting) {
  var updatedSubscriber = {
    $unset: {awaitingQuickReplyPayload: 1}
  }
  utility.callApi('subscribers/update', 'put', {query: {_id: subscriber._id}, newPayload: updatedSubscriber, options: {multi: true}}, 'accounts')
    .then(updatedSubscriber => {
      logger.serverLog('Subscriber payload info has been removed', `${TAG}: exports.captureUserEmailAndPhone`, {}, {subscriber, updatedSubscriber}, 'debug')
    })
    .catch(err => {
      const message = err || 'Failed to unset subscriber payload info'
      logger.serverLog(message, `${TAG}: exports.captureUserEmailAndPhone`, {}, {subscriber, err}, 'error')
    })
}

function sendInvalidInputResponse (senderId, item, subscriber, page) {
  sendResponse(senderId, item, subscriber, page.accessToken, null, 'SENT_FROM_CHATBOT')
}

exports.unSetAwaitingUserInfoPayload = _unSetAwaitingUserInfoPayload
