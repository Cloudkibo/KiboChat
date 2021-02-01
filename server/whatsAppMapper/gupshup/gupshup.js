const logicLayer = require('./logiclayer')
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
  console.log('Event Received')
  return new Promise((resolve, reject) => {
    try {
      resolve({
        messageId: event.payload.id,
        status: event.payload.type
      })
    } catch (err) {
      reject(err)
    }
  })
}

exports.sendChatMessage = (data) => {
  return new Promise((resolve, reject) => {
    let MessageObject = logicLayer.prepareSendMessagePayload(data)
    gupshupApiCaller(`msg`, 'post', data.whatsApp.accessToken, MessageObject)
      .then(response => {
        try {
          let parsedResponse = JSON.parse(response.body)
          if (parsedResponse.messageId) {
            resolve(parsedResponse.messageId)
          } else {
            reject(response.body)
          }
        } catch (err) {
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
    resolve([])
  })
}
