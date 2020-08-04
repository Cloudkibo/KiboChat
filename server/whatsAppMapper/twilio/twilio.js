const logicLayer = require('./logiclayer')

exports.sendChatMessage = (body) => {
  return new Promise((resolve, reject) => {
    let accountSid = body.whatsApp.accountSID
    let authToken = body.whatsApp.accessToken
    let client = require('twilio')(accountSid, authToken)
    let messageToSend = logicLayer.prepareSendMessagePayload(body)
    return client.messages
      .create(messageToSend)
      .then(response => {
        resolve(response.sid)
      })
      .catch(error => {
        reject(error)
      })
  })
}
