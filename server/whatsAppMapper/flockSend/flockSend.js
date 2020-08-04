const logicLayer = require('./logiclayer')
const {flockSendApiCaller} = require('../../api/global/flockSendApiCaller')

exports.sendChatMessage = (data) => {
  return new Promise((resolve, reject) => {
    let {route, MessageObject} = logicLayer.prepareSendMessagePayload(data)
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
