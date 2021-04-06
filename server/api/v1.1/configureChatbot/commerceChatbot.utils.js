const { callApi } = require('../utility')
const constants = require('../whatsAppChatbot/constants')
const logger = require('../../../components/logger')
const TAG = 'api/v1️.1/configureChatbot/commerceChatbot.utils.js'

exports.updateSmsContact = (query, bodyForUpdate, bodyForIncrement, options) => {
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
      return `*${key.toUpperCase()}*  Talk to a customer support agent`
    case constants.FAQS_KEY:
      return `*${key.toUpperCase()}*  View FAQs`
    case constants.SHOW_CART_KEY:
      return `*${key.toUpperCase()}*  View your cart`
    case constants.ORDER_STATUS_KEY:
      return `*${key.toUpperCase()}*  Check order status`
    case constants.BACK_KEY:
      return `*${key.toUpperCase()}*  Go back`
    case constants.HOME_KEY:
      return `*${key.toUpperCase()}*  Go home`
  }
}