const logicLayer = require('./logiclayer')
const { flockSendApiCaller } = require('../../api/global/flockSendApiCaller')

exports.sendChatMessage = (data) => {
  return new Promise((resolve, reject) => {
    let { route, MessageObject } = logicLayer.prepareSendMessagePayload(data)
    flockSendApiCaller(route, 'post', MessageObject)
      .then(response => {
        let parsed = JSON.parse(response.body)
        if (parsed.code !== 200) {
          reject(parsed.message)
        } else {
          resolve(parsed.data[0].id)
        }
      })
      .catch(error => {
        reject(error)
      })
  })
}

exports.getNormalizedMessageStatusData = (event) => {
  return {
    messageId: event.id,
    status: event.status
  }
}

exports.getNormalizedMessageReceivedData = (event) => {
  return {
    accessToken: event.user_id,
    userData: {
      number: event.phone_number,
      name: event.wa_user_name
    },
    messageData: logicLayer.prepareReceiveMessageData(event)
  }
}
