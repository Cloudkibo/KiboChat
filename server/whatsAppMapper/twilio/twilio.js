const logicLayer = require('./logiclayer')

exports.sendChatMessage = (body) => {
  let accountSid = body.whatsApp.accountSID
  let authToken = body.whatsApp.accessToken
  let client = require('twilio')(accountSid, authToken)
  let messageToSend = logicLayer.prepareSendMessagePayload(body)
  return client.messages
    .create(messageToSend)
}
