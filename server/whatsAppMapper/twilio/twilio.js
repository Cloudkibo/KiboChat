const needle = require('needle')
const logicLayer = require('./logiclayer')
const { callApi } = require('../utility')

exports.sendChatMessage = (body) => {
  return new Promise((resolve, reject) => {
    let accountSid = body.whatsApp.accountSID
    let authToken = body.whatsApp.accessToken
    let client = require('twilio')(accountSid, authToken)
    let messageToSend = logicLayer.prepareSendMessagePayload(body)
    return client.messages
      .create(messageToSend)
      .then(response => {
        resolve(response.sid)
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
    needle('get', `https://${body.accountSID}:${body.accessToken}@api.twilio.com/2010-04-01/Accounts`)
      .then(resp => {
        if (resp.statusCode === 200) {
          resolve()
        } else {
          reject(Error('Twilio account not found. Please enter correct details'))
        }
      })
      .catch((err) => {
        reject(err)
      })
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
    let accountSid = body.whatsApp.accountSID
    let authToken = body.whatsApp.accessToken
    let client = require('twilio')(accountSid, authToken)
    let requests = []
    for (let j = 0; j < body.numbers.length; j++) {
      requests.push(new Promise((resolve, reject) => {
        setTimeout(() => {
          client.messages
            .create(logicLayer.prepareInvitationPayload(body, body.numbers[j]))
            .then(response => {
              resolve('success')
            })
            .catch(error => {
              reject(error)
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

exports.getNormalizedMessageStatusData = (event) => {
  return new Promise((resolve, reject) => {
    try {
      resolve({
        messageId: event.MessageSid,
        status: event.MessageStatus === 'read' ? 'seen' : event.MessageStatus
      })
    } catch (err) {
      reject(err)
    }
  })
}

exports.getNormalizedMessageReceivedData = (event) => {
  return new Promise((resolve, reject) => {
    try {
      callApi(`companyprofile/query`, 'post', { 'twilioWhatsApp.accountSID': event.AccountSid })
        .then(company => {
          resolve({
            accessToken: company.twilioWhatsApp.authToken,
            userData: {
              number: event.From.substring(9),
              name: ''
            },
            messageData: logicLayer.prepareReceivedMessageData(event)
          })
        })
        .catch(err => {
          reject(err)
        })
    } catch (err) {
      reject(err)
    }
  })
}
