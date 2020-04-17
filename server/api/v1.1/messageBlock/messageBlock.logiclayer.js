const logger = require('../../../components/logger')
const TAG = 'api/v1.1/messageBlock/messageBlock.logiclayer.js'

exports.preparePayload = function (companyId, userId, body) {
  let payload = {
    module: {
      id: body.chatbotId,
      type: 'chatbot'
    },
    companyId: companyId,
    userId: userId,
    uniqueId: body.uniqueId,
    payload: body.payload,
    title: body.title
  }
  return payload
}
