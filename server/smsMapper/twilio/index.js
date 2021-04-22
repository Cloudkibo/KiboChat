const { callApi } = require('../../api/v1/utility')
const logiclayer = require('./logiclayer')
const async = require('async')
const needle = require('needle')
let config = require('../../config/environment')

exports.verifyCredentials = (body) => {
  return new Promise((resolve, reject) => {
    needle('get', `https://${body.accountSID}:${body.authToken}@api.twilio.com/2010-04-01/Accounts`)
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

exports.setWebhook = (body) => {
  return new Promise((resolve, reject) => {
    let accountSid = body.accountSID
    let authToken = body.authToken
    let client = require('twilio')(accountSid, authToken)
    client.incomingPhoneNumbers
      .list().then((incomingPhoneNumbers) => {
        if (incomingPhoneNumbers && incomingPhoneNumbers.length > 0) {
          const twilioNumber = incomingPhoneNumbers.filter(p => p.phoneNumber === body.businessNumber)
          if (twilioNumber.length > 0) {
            client.incomingPhoneNumbers(twilioNumber[0].sid)
              .update({
                accountSid: body.accountSID,
                smsUrl: `${config.api_urls['webhook']}/webhooks/twilio/receiveSms`
              })
              .then(result => {
                resolve()
              })
              .catch(err => {
                reject(err)
              })
          } else {
            reject(Error('Given Business number does not exist on twilio'))
          }
        } else {
          reject(Error('The twilio account doesnot have any twilio number'))
        }
      })
  })
}

exports.getCompany = (body) => {
  return new Promise((resolve, reject) => {
    callApi(`companyprofile/query`, 'post', {'sms.accountSID': body.AccountSid})
      .then(company => { resolve(company) })
      .catch(err => { reject(err) })
  })
}

exports.respondUsingChatbot = ({payload, options, company, subscriber}) => {
  return new Promise((resolve, reject) => {
    async.eachSeries(payload, function (item, cb) {
      logiclayer.prepareChatbotPayload(company, subscriber, item, options)
        .then(message => {
          const client = twilioClient(company)
          client.messages.create(message)
            .then(res => {
              resolve({status: 'success'})
            })
            .catch(err => {
              reject(err)
            })
        })
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
      from: company.sms.businessNumber,
      to: subscriber.number
    })
      .then(res => {
        console.log('res', res)
        resolve({status: 'success'})
      })
      .catch(err => {
        console.log('err', err)
        reject(err)
      })
  })
}

exports.sendMediaMessage = ({text, mediaUrl, company, subscriber}) => {
  return new Promise((resolve, reject) => {
    const client = twilioClient(company)
    client.messages.create({
      body: text,
      mediaUrl,
      from: company.number,
      to: subscriber.number
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
  const accountSid = company.sms.accountSID
  const authToken = company.sms.authToken
  const client = require('twilio')(accountSid, authToken)
  return client
}
