const logicLayer = require('./logiclayer')
const { cequensApiCaller } = require('../../api/global/cequensApiCaller')
const logger = require('../../components/logger')
const TAG = 'whatsAppMapper/cequens/cequens.js'
const async = require('async')
const { callApi } = require('../../api/v1/utility')

exports.sendChatMessage = (data) => {
  return new Promise((resolve, reject) => {
    let MessageObject = logicLayer.prepareSendMessagePayload(data)
    cequensApiCaller('messages',
      data.whatsApp.clientName,
      data.whatsApp.businessNumber,
      'post',
      data.whatsApp.accessToken,
      MessageObject)
      .then(response => {
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
    let templates = logicLayer.prepareTemplates()
    resolve(templates)
  })
}
exports.sendInvitationTemplate = (body) => {
  return new Promise((resolve, reject) => {
    let requests = []
    for (let j = 0; j < body.numbers.length; j++) {
      requests.push(new Promise((resolve, reject) => {
        setTimeout(() => {
          cequensApiCaller('messages',
            body.whatsApp.clientName,
            body.whatsApp.businessNumber,
            'post',
            body.whatsApp.accessToken,
            logicLayer.prepareInvitationPayload(body, body.numbers[j]))
            .then(response => {
              if (response.body.errors) {
                const message = response.body.errors.title || 'Error while sending invitation message'
                logger.serverLog(message, `${TAG}: exports.sendInvitationTemplate`, {}, {body}, 'error')
                resolve()
              } else {
                resolve('success')
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
          cequensApiCaller('messages',
            company.whatsApp.clientName,
            company.whatsApp.businessNumber,
            'post',
            company.whatsApp.accessToken,
            message)
            .then(response => {
              if (response.body.errors) {
                cb(response.body.errors)
              } else {
                cb()
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
    let MessageObject = {
      to: subscriber.number.replace(/\D/g, ''),
      recipient_type: 'individual',
      preview_url: true,
      type: 'text',
      text: {
        body: text
      }
    }
    cequensApiCaller('messages',
      company.whatsApp.clientName,
      company.whatsApp.businessNumber,
      'post',
      company.whatsApp.accessToken,
      MessageObject)
      .then(response => {
        if (response.body.errors) {
          reject(response.body.errors.title)
        } else {
          resolve({status: 'success'})
        }
      })
      .catch(error => {
        reject(error)
      })
  })
}

exports.getNormalizedMessageReceivedData = (event) => {
  return new Promise((resolve, reject) => {
    try {
      let contact = event.contacts[0]
      let message = event.messages[0]
      let businessNumber = '+' + event.businessNumber.replace(/\D/g, '')
      let query = {
        $or: [
          {'whatsApp.businessNumber': businessNumber},
          {'whatsApp.businessNumber': `+${businessNumber}`},
          {'whatsApp.businessNumber': event.businessNumber}
        ]
      }
      callApi(`companyprofile/query`, 'post', query)
        .then(company => {
          if (company) {
            logicLayer.prepareReceivedMessageData(event, company)
              .then(payload => {
                resolve({
                  accessToken: company.whatsApp.accessToken,
                  userData: {
                    number: message.from,
                    name: contact.profile.name
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
