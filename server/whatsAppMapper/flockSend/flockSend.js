const logicLayer = require('./logiclayer')
const {flockSendApiCaller} = require('../../api/global/flockSendApiCaller')
const async = require('async')

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
exports.setWebhook = (body) => {
  return new Promise((resolve, reject) => {
    async.parallelLimit([
      function (callback) {
        flockSendApiCaller('update-send-message-webhook', 'post', {
          token: body.accessToken,
          webhook_url: 'https://webhook.cloudkibo.com/webhooks/flockSend/messageStatus',
          webhook_status: 1})
          .then(response => {
            callback()
          })
          .catch((err) => {
            reject(err)
          })
      },
      function (callback) {
        flockSendApiCaller('update-listen-webhook', 'post', {
          token: body.accessToken,
          webhook_url: 'https://webhook.cloudkibo.com/webhooks/flockSend',
          webhook_status: 1})
          .then(response => {
            callback()
          })
          .catch((err) => {
            reject(err)
          })
      }
    ], 10, function (err, results) {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  })
}
exports.verifyCredentials = (body) => {
  return new Promise((resolve, reject) => {
    resolve()
  })
}
