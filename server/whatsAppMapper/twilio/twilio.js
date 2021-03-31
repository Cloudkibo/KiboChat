const needle = require('needle')
const logicLayer = require('./logiclayer')
const { callApi } = require('../../api/v1/utility')
const async = require('async')

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

exports.checkTwillioVersion = (body) => {
  return new Promise((resolve, reject) => {
    needle('get', `https://${body.accountSID}:${body.accessToken}@api.twilio.com/2010-04-01/Accounts/${body.accountSID}.json`)
      .then(resp => {
        let data = {
          twilioVersionResponse: null,
          businessNumbers: []
        }
        if (resp.statusCode === 200) {
          data.twilioVersionResponse = resp
          if (resp.body.type === 'Trial') {
            resolve(data)
          } else {
            needle('get', `https://${body.accountSID}:${body.accessToken}@api.twilio.com/2010-04-01/Accounts/${body.accountSID}/IncomingPhoneNumbers.json`)
              .then(businessNumbersInfo => {
                let businessNumbers = businessNumbersInfo.body.incoming_phone_numbers.map(numberInfo => numberInfo.phone_number)
                data.businessNumbers = businessNumbers
                resolve(data)
              })
          }
        } else {
          reject(Error('Error in finding twilio version'))
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
      callApi(`companyprofile/query`, 'post', { 'whatsApp.accountSID': event.AccountSid })
        .then(company => {
          resolve({
            accountSID: company.whatsApp.accountSID,
            accessToken: company.whatsApp.accessToken,
            businessNumber: company.whatsApp.businessNumber,
            userData: {
              number: event.From.substring(10),
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

exports.respondUsingChatbot = ({payload, options, company, subscriber}) => {
  return new Promise((resolve, reject) => {
    async.eachSeries(payload, function (item, cb) {
      logicLayer.prepareChatbotPayload(company, subscriber, item, options)
        .then(message => {
          const client = twilioClient(company)
          client.messages.create(message)
            .then(res => {
              cb()
            })
            .catch(err => { cb(err) })
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
    const client = twilioClient(company)
    client.messages.create({
      body: text,
      from: `whatsapp:${company.whatsApp.businessNumber}`,
      to: `whatsapp:${subscriber.number}`
    })
      .then(res => {
        resolve({status: 'success'})
      })
      .catch(err => {
        reject(err)
      })
  })
}

function twilioClient (company) {
  const accountSid = company.whatsApp.accountSID
  const authToken = company.whatsApp.accessToken
  const client = require('twilio')(accountSid, authToken)
  return client
}
