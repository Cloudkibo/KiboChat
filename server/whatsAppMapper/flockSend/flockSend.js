const logicLayer = require('./logiclayer')
const {flockSendApiCaller} = require('../../api/global/flockSendApiCaller')

exports.sendChatMessage = (data) => {
  return new Promise((resolve, reject) => {
    let {route, MessageObject} = logicLayer.prepareSendMessagePayload(data)
    flockSendApiCaller(`connect/official/v2/${route}`, 'post', MessageObject)
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
exports.getTemplates = (body) => {
  return new Promise((resolve, reject) => {
    const authData = {
      'token': body.whatsApp.accessToken
    }
    flockSendApiCaller('templates-fetch', 'post', authData)
      .then(resp => {
        let templates = logicLayer.prepareTemplates(resp.body)
        resolve(templates)
      })
      .catch((err) => {
        reject(err)
      })
  })
}
exports.sendInvitationTemplate = (body) => {
  return new Promise((resolve, reject) => {
    let MessageObject = logicLayer.prepareInvitationPayload(body)
    flockSendApiCaller('connect/official/v2/hsm', 'post', MessageObject)
      .then(response => {
        let parsed = JSON.parse(response.body)
        if (parsed.code !== 200) {
          reject(parsed.message)
        } else {
          resolve()
        }
      })
      .catch((err) => {
        reject(err)
      })
  })
}
