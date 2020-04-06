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

exports.prepareIdsArray = function (payload) {
  let ids = []
  for (let i = 0; i < payload.length; i++) {
    ids.push(payload[i]._id)
  }
  return ids
}

exports.populatePageIdsInChatBots = function (pages, chatbots) {
  return chatbots.map((bot) => {
    bot.pageId = pages.filter(page => page._id === bot.pageId)[0]
  })
}
