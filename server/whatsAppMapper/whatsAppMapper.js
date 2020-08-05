const flockSend = require('../whatsAppMapper/flockSend/flockSend')
const twilio = require('../whatsAppMapper/twilio/twilio')
const { ActionTypes } = require('./constants')
const providers = [
  { key: 'flockSend', value: flockSend },
  { key: 'twilio', value: twilio }
]

exports.whatsAppMapper = (provider, action, data) => {
  provider = providers.find(a => a.key === provider).value
  return callAction(action, data, provider)
}

function callAction (action, data, provider) {
  switch (action) {
    case ActionTypes.SEND_CHAT_MESSAGE:
      return provider.sendChatMessage(data)
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
