const { Client, ApiController } = require('@bandwidth/messaging')
const numbers = require('@bandwidth/numbers')
const { callApi } = require('../../api/v1/utility')
const logiclayer = require('./logiclayer')
const async = require('async')

exports.verifyCredentials = (body) => {
  return new Promise((resolve, reject) => {
    resolve()
  })
}

exports.setWebhook = (body) => {
  return new Promise((resolve, reject) => {
    resolve()
  })
}

exports.getCompany = (body) => {
  return new Promise((resolve, reject) => {
    callApi(`companyprofile/query`, 'post', {'sms.accountId': body.AccountSid})
      .then(company => { resolve(company) })
      .catch(err => { reject(err) })
  })
}

exports.respondUsingChatbot = ({payload, options, company, subscriber}) => {
  return new Promise((resolve, reject) => {
    async.eachSeries(payload, function (item, cb) {
      logiclayer.prepareChatbotPayload(company, subscriber, item, options)
        .then(message => {
          const controller = bandwidthClient(company)
          controller.createMessage(company.sms.accountId, message)
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
    const controller = bandwidthClient(company)
    controller.createMessage(company.sms.accountId, {
      applicationId: company.sms.appId,
      to: [subscriber.number],
      from: company.sms.businessNumber,
      text: text
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
    const controller = bandwidthClient(company)
    controller.createMessage(company.sms.accountId, {
      applicationId: company.sms.appId,
      to: [subscriber.number],
      media: mediaUrl,
      from: company.sms.businessNumber,
      text: text
    })
      .then(res => {
        resolve({status: 'success'})
      })
      .catch(err => {
        reject(err)
      })
  })
}

exports.fetchAvailableNumbers = ({company, query}) => {
  return new Promise(async (resolve, reject) => {
    try {
      const client = new numbers.Client(company.sms.accountId, company.sms.username, company.sms.password)
      const availableNumbers = await numbers.AvailableNumbers.listAsync(client, query)
      if (availableNumbers.telephoneNumberList && availableNumbers.telephoneNumberList.telephoneNumber) {
        resolve(availableNumbers.telephoneNumberList.telephoneNumber)
      } else {
        resolve([])
      }
    } catch (err) {
      reject(err)
    }
  })
}

exports.createOrder = ({company, body}) => {
  return new Promise(async (resolve, reject) => {
    numbers.Client.globalOptions.accountId = company.sms.accountId
    numbers.Client.globalOptions.userName = company.sms.username
    numbers.Client.globalOptions.password = company.sms.password
    let order = {
      name: company._id,
      siteId: body.siteId,
      existingTelephoneNumberOrderType: {
        telephoneNumberList: [body.number]
      }
    }
    numbers.Order.create(order, function (err, res) {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  })
}

function bandwidthClient (company) {
  const client = new Client({
    basicAuthUserName: company.sms.username,
    basicAuthPassword: company.sms.password
  })
  const controller = new ApiController(client)
  return controller
}
