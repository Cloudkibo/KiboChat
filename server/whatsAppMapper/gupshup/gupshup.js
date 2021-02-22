const logicLayer = require('./logiclayer')
const logger = require('../../components/logger')
const TAG = 'whatsAppMapper/gupshup/gupshup.js'
const async = require('async')
const { callApi } = require('../../api/v1/utility')
const { gupshupApiCaller } = require('../../api/global/gupshupApiCaller')

exports.getNormalizedMessageReceivedData = (event) => {
  return new Promise((resolve, reject) => {
    try {
      let sender = event.payload.sender
      let payload = event.payload
      let query = {'whatsApp.appName': {$regex: event.app, $options: 'i'}}
      callApi(`companyprofile/query`, 'post', query)
        .then(company => {
          if (company) {
            logicLayer.prepareReceivedMessageData(payload, company)
              .then(payload => {
                resolve({
                  businessNumber: company.whatsApp.businessNumber,
                  appName: company.whatsApp.appName,
                  accessToken: company.whatsApp.accessToken,
                  userData: {
                    number: sender.phone,
                    name: sender.name
                  },
                  messageData: payload
                })
              })
              .catch(err => {
                reject(err)
              })
          } else {
            reject(new Error())
          }
        })
        .catch(err => {
          reject(err)
        })
    } catch (err) {
      reject(err)
    }
  })
}

exports.getNormalizedMessageStatusData = (event) => {
  return new Promise((resolve, reject) => {
    try {
      resolve({
        messageId: event.payload.gsId,
        status: event.payload.type === 'read' ? 'seen' : event.payload.type
      })
    } catch (err) {
      reject(err)
    }
  })
}

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
exports.respondUsingChatbot = ({payload, options, company, subscriber}) => {
  return new Promise((resolve, reject) => {
    async.eachSeries(payload, function (item, cb) {
      logicLayer.prepareChatbotPayload(company, subscriber, item, options)
        .then(message => {
          gupshupApiCaller('msg', 'post', company.whatsApp.accessToken, message)
            .then(response => {
              let messageId = getMessageId(response, payload)
              if (messageId) {
                cb()
              } else {
                cb(response.body)
              }
            })
            .catch(error => {
              cb(error)
            })
        })
        .catch(err => { cb(err) })
    }, function (err) {
      if (err) {
        reject(err)
      } else {
        resolve({status: 'success'})
      }
    })
  })
}

exports.sendTextMessage = ({text, company, subscriber}) => {
  return new Promise((resolve, reject) => {
    let from = company.whatsApp.businessNumber.replace(/\D/g, '')
    let to = subscriber.number.replace(/\D/g, '')
    let appName = company.whatsApp.appName
    let MessageObject = `channel=whatsapp&source=${from}&destination=${to}&src.name=${appName}&message.type=text&message.text=${text}`
    gupshupApiCaller('msg', 'post', company.whatsApp.accessToken, MessageObject)
      .then(response => {
        let messageId = getMessageId(response, subscriber)
        if (messageId) {
          resolve({status: 'success'})
        } else {
          reject(response.body)
        }
      })
      .catch(error => {
        reject(error)
      })
  })
}
