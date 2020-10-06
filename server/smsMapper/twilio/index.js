const { callApi } = require('../../api/v1/utility')
const logiclayer = require('./logiclayer')

exports.getCompany = (body) => {
  return new Promise((resolve, reject) => {
    callApi(`companyprofile/query`, 'post', {'twilio.accountSID': body.AccountSid})
      .then(company => { resolve(company) })
      .catch(err => { reject(err) })
  })
}

exports.respondUsingChatbot = ({payload, options, company, subscriber}) => {
  return new Promise((resolve, reject) => {
    const textPayload = payload.find((item) => item.componentType === 'text')
    logiclayer.prepareChatbotPayload(textPayload, options)
      .then(text => {
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

function twilioClient (company) {
  const accountSid = company.twilio.accountSID
  const authToken = company.twilio.authToken
  const client = require('twilio')(accountSid, authToken)
  return client
}
