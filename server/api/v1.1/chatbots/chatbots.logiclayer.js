const logger = require('../../../components/logger')
const TAG = 'api/v1.1/chatbots/chatbots.logiclayer.js'

exports.preparePayload = function (companyId, userId, body) {
  let payload = {
    companyId: companyId,
    userId: userId,
    ...body
  }
  return payload
}
