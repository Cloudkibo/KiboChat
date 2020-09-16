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
  utility.callApi('pages/query', 'post', { pageId, connected: true })
    .then(page => {
      page = page[0]
      let type = ''
      if (messengerPayload.optin.ref === '_chatbot') {
        type = 'manual'
      } else if (messengerPayload.optin.ref === '_shopify_chatbot') {
        type = 'automated'
      }
      return chatbotAutomation.handleChatBotTestMessage(messengerPayload, page, subscriberInfo, type)
    })
    .catch(error => {
      console.log('error on getting subcribers', error.stack)
      logger.serverLog(TAG, `error on getting subcribers ${error}`, 'error')
    })
}
