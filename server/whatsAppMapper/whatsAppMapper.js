const flockSend = require('../whatsAppMapper/flockSend/flockSend')
const twilio = require('../whatsAppMapper/twilio/twilio')
const cequens = require('../whatsAppMapper/cequens/cequens')
const gupshup = require('../whatsAppMapper/gupshup/gupshup')
const { ActionTypes } = require('./constants')
const providers = [
  { key: 'flockSend', value: flockSend },
  { key: 'twilio', value: twilio },
  { key: 'cequens', value: cequens },
  { key: 'gupshup', value: gupshup }
]

exports.whatsAppMapper = (provider, action, data) => {
  provider = providers.find(a => a.key === provider).value
  return callAction(action, data, provider)
}

function callAction (action, data, provider) {
  switch (action) {
    case ActionTypes.SEND_CHAT_MESSAGE:
      return provider.sendChatMessage(data)
    case ActionTypes.GET_TEMPLATES:
      return provider.getTemplates(data)
    case ActionTypes.SEND_INVITATION_TEMPLATE:
      return provider.sendInvitationTemplate(data)
    case ActionTypes.SET_WEBHOOK:
      return provider.setWebhook(data)
    case ActionTypes.VERIFY_CREDENTIALS:
      return provider.verifyCredentials(data)
    case ActionTypes.RESPOND_USING_CHATBOT:
      return provider.respondUsingChatbot(data)
    case ActionTypes.SEND_TEXT_MESSAGE:
      return provider.sendTextMessage(data)
    case ActionTypes.CHECK_TWILLO_VERSION:
      return provider.checkTwillioVersion(data)
    case ActionTypes.GET_COMMERCE_TEMPLATES:
      return provider.getCommerceTemplates(data)
    default: break
  }
}

exports.handleInboundMessageReceived = (provider, event) => {
  provider = providers.find(a => a.key === provider).value
  return provider.getNormalizedMessageReceivedData(event)
}

exports.handleInboundMessageStatus = (provider, event) => {
  provider = providers.find(a => a.key === provider).value
  return provider.getNormalizedMessageStatusData(event)
}
