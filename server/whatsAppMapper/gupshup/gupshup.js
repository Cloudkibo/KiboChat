const { gupshupApiCaller } = require('../../api/global/gupshupApiCaller')
const logicLayer = require('./logiclayer')
const logger = require('../../components/logger')
const TAG = 'whatsAppMapper/gupshup/gupshup.js'

exports.sendChatMessage = (data) => {
  return new Promise((resolve, reject) => {
    let { route, MessageObject } = logicLayer.prepareSendMessagePayload(data)
    gupshupApiCaller(route, 'post', data.whatsApp.accessToken, MessageObject)
      .then(response => {
        let messageId = getMessageId(response, data)
        if (messageId) {
          resolve(messageId)
        } else {
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
    gupshupApiCaller(`template/list/${body.whatsApp.appName}`, 'get', body.whatsApp.accessToken)
      .then(result => {
        if (result.body && result.body.status === 'success') {
          let templates = logicLayer.prepareTemplates(result.body.templates)
          resolve(templates)
        } else {
          resolve([])
        }
      })
      .catch((err) => {
        reject(err)
      })
  })
}

function getMessageId (response, body) {
  let messageId
  if (response.body.messageId) {
    messageId = response.body.messageId
  } else {
    try {
      let parsedResponse = JSON.parse(response.body)
      if (parsedResponse.messageId) {
        messageId = parsedResponse.messageId
      } else {
        messageId = undefined
      }
    } catch (err) {
      messageId = undefined
    }
  }
  return messageId
}

exports.sendInvitationTemplate = (body) => {
  return new Promise((resolve, reject) => {
    let requests = []
    for (let j = 0; j < body.numbers.length; j++) {
      requests.push(new Promise((resolve, reject) => {
        setTimeout(() => {
          gupshupApiCaller(`template/msg`, 'post',
            body.whatsApp.accessToken,
            logicLayer.prepareInvitationPayload(body, body.numbers[j]))
            .then(response => {
              let messageId = getMessageId(response, body)
              if (messageId) {
                resolve('success')
              } else {
                resolve()
              }
            })
            .catch(error => {
              const message = error || 'Error while sending invitation message'
              logger.serverLog(message, `${TAG}: exports.sendInvitationTemplate`, {}, {body}, 'error')
              resolve()
            })
        }, 1000)
      }))
    }
    Promise.all(requests)
      .then((responses) => {
        resolve()
      })
      .catch((err) => reject(err))
  })
}
