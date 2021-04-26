const { _appendOptions } = require('../twilio/logiclayer')

exports.prepareChatbotPayload = (company, subscriber, data, options) => {
  let message = {
    applicationId: data.appId,
    to: [subscriber.number],
    from: company.sms.businessNumber
  }
  return new Promise((resolve, reject) => {
    if (data.componentType === 'text') {
      message.text = data.text + _appendOptions(options)
    } else if (['image', 'file', 'audio', 'video', 'media'].includes(data.componentType)) {
      message.media = [data.fileurl.url]
    } else if (data.componentType === 'card') {
      message.text = data.url
    }
    resolve(message)
  })
}
exports.preparePortinPayload = (body) => {
  let data = {
    siteId: body.siteId,
    peerId: body.peerId,
    billingTelephoneNumber: body.businessNumber,
    subscriber: body.subscriber,
    loaAuthorizingPerson: body.loaAuthorizingPerson,
    listOfPhoneNumbers: {
      phoneNumber: body.businessNumber
    },
    billingType: 'PORTIN'
  }
  return data
}