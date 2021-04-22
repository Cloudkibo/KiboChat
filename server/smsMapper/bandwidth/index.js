const { Client, ApiController } = require('@bandwidth/messaging')
const numbers = require('@bandwidth/numbers')
const { callApi } = require('../../api/v1/utility')
const logiclayer = require('./logiclayer')
const async = require('async')
let config = require('../../config/environment')

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
          let data = company.sms.accountType === 'cloudkibo' ? config.sms : company.sms
          const controller = bandwidthClient(data)
          controller.createMessage(data.accountId, message)
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
    let data = company.sms.accountType === 'cloudkibo' ? config.sms : company.sms
    const controller = bandwidthClient(data)
    controller.createMessage(data.accountId, {
      applicationId: data.appId,
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
    let data = company.sms.accountType === 'cloudkibo' ? config.sms : company.sms
    const controller = bandwidthClient(data)
    controller.createMessage(data.accountId, {
      applicationId: data.appId,
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

exports.fetchAvailableNumbers = ({query}) => {
  return new Promise(async (resolve, reject) => {
    try {
      let data = config.sms
      const client = new numbers.Client(data.accountId, data.username, data.password)
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
    let data = config.sms
    numbers.Client.globalOptions.accountId = data.accountId
    numbers.Client.globalOptions.userName = data.username
    numbers.Client.globalOptions.password = data.password
    let order = {
      name: body.orderName,
      siteId: body.siteId,
      existingTelephoneNumberOrderType: {
        telephoneNumberList: body.numbers
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
    basicAuthUserName: company.username,
    basicAuthPassword: company.password
  })
  const controller = new ApiController(client)
  return controller
}
