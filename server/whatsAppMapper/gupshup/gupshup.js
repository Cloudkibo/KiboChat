const logicLayer = require('./logiclayer')
const { callApi } = require('../../api/v1/utility')

exports.getNormalizedMessageReceivedData = (event) => {
  return new Promise((resolve, reject) => {
    try {
      let sender = event.payload.sender
      let payload = event.payload
      let businessNumber = event.businessNumber.replace(/\D/g, '')
      let query = {
        $or: [
          {'whatsApp.businessNumber': businessNumber},
          {'whatsApp.businessNumber': `+${businessNumber}`}
        ]
      }
      console.log('Event info', sender, payload, businessNumber)
      callApi(`companyprofile/query`, 'post', query)
        .then(company => {
          if (company) {
            logicLayer.prepareReceivedMessageData(payload, company)
              .then(payload => {
                console.log('Payload', payload)
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
