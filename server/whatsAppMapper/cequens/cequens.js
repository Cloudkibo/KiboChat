const logicLayer = require('./logiclayer')
const { cequensApiCaller } = require('../../api/global/cequensApiCaller')
const async = require('async')

exports.sendChatMessage = (data) => {
  return new Promise((resolve, reject) => {
    console.log('data got', data)
    let MessageObject = logicLayer.prepareSendMessagePayload(data)
    console.log('MessageObject', MessageObject)
    cequensApiCaller('messages', data.whatsApp.clientName, data.whatsApp.businessNumber, 'post', data.whatsApp.accessToken, MessageObject)
      .then(response => {
        console.log('response got', response.body)
        if (response.body.errors) {
          reject(response.body.errors.title)
        } else {
          resolve(response.body.messages && response.body.messages.length > 0 && response.body.messages[0].id)
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
    resolve()
  })
}
exports.getTemplates = (body) => {
  return new Promise((resolve, reject) => {
    resolve([])
  })
}
