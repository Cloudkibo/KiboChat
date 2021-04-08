const { callApi } = require('../../api/v1/utility')
const logiclayer = require('./logiclayer')
const async = require('async')

exports.getCompany = (body) => {
  return new Promise((resolve, reject) => {
    callApi(`companyprofile/query`, 'post', {'twilio.accountSID': body.AccountSid})
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
  const accountSid = company.twilio.accountSID
  const authToken = company.twilio.authToken
  const client = require('twilio')(accountSid, authToken)
  return client
}
