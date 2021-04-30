const logicLayer = require('./logiclayer')
const { cequensApiCaller } = require('../../api/global/cequensApiCaller')
const logger = require('../../components/logger')
const TAG = 'whatsAppMapper/cequens/cequens.js'
const async = require('async')
const { callApi } = require('../../api/v1/utility')
const { containsURL } = require('../../api/global/utility')

exports.sendChatMessage = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      let namespace
      if (data.payload.componentType === 'text' && data.payload.templateName) {
        const namespaceResponse = await cequensApiCaller('templates/namespace', 'get', data.whatsApp.accessToken)
        namespace = namespaceResponse.body.data && namespaceResponse.body.data.message_template_namespace
      }
      let MessageObject = logicLayer.prepareSendMessagePayload(data, namespace)
      const response = await cequensApiCaller('messages',
        'post',
        data.whatsApp.accessToken,
        MessageObject)
      if (response.body.errors) {
        reject(response.body.errors.title)
      } else {
        resolve(response.body.messages && response.body.messages.length > 0 && response.body.messages[0].id)
      }
    } catch (error) {
      reject(error)
    }
  })
}

exports.setWebhook = (body) => {
  return new Promise((resolve, reject) => {
    async.parallelLimit([
      function (callback) {
        cequensApiCaller('webhook',
          'put',
          body.accessToken,
          {url: `https://webhook.cloudkibo.com/webhooks/cequens/${body.businessNumber}`,
            type: 'message'})
          .then(response => {
            if (response.body.data) {
              callback()
            } else {
              callback(response.body)
            }
          })
          .catch(error => {
            reject(error)
          })
      },
      function (callback) {
        cequensApiCaller('webhook',
          'put',
          body.accessToken,
          {url: `https://kibopush-anisha.ngrok.io/webhooks/cequens/${body.businessNumber}`,
            type: 'status'})
          .then(response => {
            if (response.body.data) {
              callback()
            } else {
              callback(response.body)
            }
          })
          .catch(error => {
            reject(error)
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
    cequensApiCaller(`credentials/${body.businessNumber}`,
      'get',
      body.accessToken)
      .then(response => {
        if (response.body.data && response.body.data.status && response.body.data.status === 'valid') {
          resolve()
        } else {
          reject(Error('Cequens account not found. Please enter correct details'))
        }
      })
      .catch(error => {
        reject(error)
      })
  })
}
exports.getTemplates = (body) => {
  return new Promise((resolve, reject) => {
    cequensApiCaller(`templates`,
      'get',
      body.whatsApp.accessToken)
      .then(response => {
        if (response.body && response.body.data) {
          let templates = logicLayer.prepareTemplates(response.body.data.commercialTemplates)
          resolve(templates)
        } else {
          reject(response.body)
        }
      })
      .catch(error => {
        reject(error)
      })
  })
}
exports.sendInvitationTemplate = (body) => {
  return new Promise(async (resolve, reject) => {
    const namespaceResponse = await cequensApiCaller('templates/namespace', 'get', body.whatsApp.accessToken)
    const namespace = namespaceResponse.body.data && namespaceResponse.body.data.message_template_namespace
    let requests = []
    for (let j = 0; j < body.numbers.length; j++) {
      requests.push(new Promise((resolve, reject) => {
        setTimeout(() => {
          cequensApiCaller('messages',
            'post',
            body.whatsApp.accessToken,
            logicLayer.prepareInvitationPayload(body, body.numbers[j], namespace))
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
      type: 'text',
      text: {
        body: text
      }
    }
    if (containsURL(text)) {
      MessageObject.preview_url = true
    }
    cequensApiCaller('messages',
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
exports.getNormalizedMessageStatusData = (event) => {
  return new Promise((resolve, reject) => {
    try {
      resolve({
        messageId: event.statuses[0].id,
        status: event.statuses[0].status === 'read' ? 'seen' : event.statuses[0].status
      })
    } catch (err) {
      reject(err)
    }
  })
}
