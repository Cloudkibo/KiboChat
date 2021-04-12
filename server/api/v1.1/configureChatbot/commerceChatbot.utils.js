const { callApi } = require('../utility')
const constants = require('../whatsAppChatbot/constants')
const logger = require('../../../components/logger')
const TAG = 'api/v1️.1/configureChatbot/commerceChatbot.utils.js'

const updateSmsContact = (query, bodyForUpdate, bodyForIncrement, options) => {
  callApi(`contacts/update`, 'put', { query: query, newPayload: { ...bodyForIncrement, ...bodyForUpdate }, options: options })
    .then(updated => {
    })
    .catch(error => {
      const message = error || 'Failed to update contact'
      logger.serverLog(message, `${TAG}: exports.updateSmsContact`, {}, {}, 'error')
    })
}

exports.specialKeyText = (key) => {
  switch (key) {
    case constants.TALK_TO_AGENT_KEY:
      return `${key.toUpperCase()}  Talk to a customer support agent`
    case constants.FAQS_KEY:
      return `${key.toUpperCase()}  View FAQs`
    case constants.SHOW_CART_KEY:
      return `${key.toUpperCase()}  View your cart`
    case constants.ORDER_STATUS_KEY:
      return `${key.toUpperCase()}  Check order status`
    case constants.BACK_KEY:
      return `${key.toUpperCase()}  Go back`
    case constants.HOME_KEY:
      return `${key.toUpperCase()}  Go home`
  }
}
exports.storeChat = (from, to, contact, messageData, format) => {
  let MessageObject = {
    senderNumber: from,
    recipientNumber: to,
    contactId: contact._id,
    companyId: contact.companyId,
    payload: messageData,
    status: 'unseen',
    format
  }
  callApi(`smsChat`, 'post', MessageObject, 'kibochat')
    .then(message => {
      let query = { _id: contact._id }
      let updatePayload = { last_activity_time: Date.now(), status: 'new', pendingResponse: true, lastMessagedAt: Date.now() }
      let incrementPayload = { $inc: { unreadCount: 1, messagesCount: 1 } }
      updateSmsContact(query, updatePayload, incrementPayload, {})
      message.payload.format = format
      require('./../../../config/socketio').sendMessageToClient({
        room_id: contact.companyId,
        body: {
          action: 'new_chat_sms',
          payload: {
            subscriber_id: contact._id,
            chat_id: message._id,
            text: message.payload.text,
            name: contact.name,
            subscriber: contact,
            message: message
          }
        }
      })
    })
    .catch(err => {
      const message = err || 'Failed to save WhatsApp chat'
      logger.serverLog(message, `${TAG}: storeChat`, MessageObject, {from, to, contact, messageData, format}, 'error')
    })
}

exports.updateSmsContact = updateSmsContact
