const chatbotAutomation = require('./chatbotAutomation.controller')
const utility = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/v1/messengerEvents/chatbotOptin.controller'

exports.index = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  let messengerPayload = req.body.entry[0].messaging[0]
  let pageId = messengerPayload.recipient.id
  let subscriberInfo = req.body.subscriberInfo
  const senderId = req.body.entry[0].messaging[0].sender.id
  utility.callApi('pages/query', 'post', { pageId, connected: true })
    .then(page => {
      page = page[0]
      utility.callApi('subscribers/query', 'post', {pageId: page._id, senderId: senderId, companyId: page.companyId})
        .then(subscriberFound => {
          if (subscriberFound.length > 0) {
            let subscriberInfo = subscriberFound[0]
            let type = ''
            if (messengerPayload.optin.ref === '_chatbot') {
              type = 'manual'
            } else if (messengerPayload.optin.ref === '_commerce_chatbot') {
              type = 'automated'
            }
            chatbotAutomation.handleChatBotTestMessage(messengerPayload, page, subscriberInfo, type)
          }
        }).catch(error => {
          const message = error || 'Failed to fetch subscriber'
          return logger.serverLog(message, `${TAG}: exports.index`, req.body, {companyId: page.companyId}, 'error')
        })
    })
    .catch(error => {
      const message = error || 'error on getting subcribers'
      return logger.serverLog(message, `${TAG}: exports.index`, req.body, {messengerPayload, subscriberInfo}, 'error')
    })
}
