const { gupshupApiCaller } = require('../../api/global/gupshupApiCaller')
const logicLayer = require('./logiclayer')

exports.sendChatMessage = (data) => {
  return new Promise((resolve, reject) => {
    let MessageObject = logicLayer.prepareSendMessagePayload(data)
    gupshupApiCaller(`msg`, 'post', data.whatsApp.accessToken, MessageObject)
      .then(response => {
        try {
          let parsedResponse = JSON.parse(response.body)
          if (parsedResponse.messageId) {
            resolve(parsedResponse.messageId)
          } else {
            reject(response.body)
          }
        } catch (err) {
          reject(response.body)
        }
      })
      .catch(error => {
        reject(error)
      })
  })
}

exports.setWebhook = (body) => {
  return new Promise((resolve, reject) => {
    resolve()
  })
}
exports.verifyCredentials = (body) => {
  return new Promise((resolve, reject) => {
    gupshupApiCaller(`template/list/${body.appName}`, 'get', body.accessToken)
      .then(result => {
        if (result.body && result.body.status === 'success') {
          resolve()
        } else {
          reject(Error('You have entered incorrect credentials. Please enter correct gupshup credentials'))
        }
      })
      .catch((err) => {
        reject(err)
      })
  })
}
exports.getTemplates = (body) => {
  return new Promise((resolve, reject) => {
    resolve([])
  })
}
