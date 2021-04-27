const twilio = require('./twilio')
const { ActionTypes } = require('./constants')

const providers = [
  { key: 'twilio', value: twilio }
]

exports.smsMapper = (provider, action, data) => {
  provider = providers.find(a => a.key === provider).value
  return callAction(action, data, provider)
}

function callAction (action, data, provider) {
  switch (action) {
    case ActionTypes.GET_COMPANY:
      return provider.getCompany(data)
    case ActionTypes.RESPOND_USING_CHATBOT:
      return provider.respondUsingChatbot(data)
    case ActionTypes.SEND_TEXT_MESSAGE:
      return provider.sendTextMessage(data)
    case ActionTypes.SEND_MEDIA_MESSAGE:
      return provider.sendMediaMessage(data)
    default:
  }
}
