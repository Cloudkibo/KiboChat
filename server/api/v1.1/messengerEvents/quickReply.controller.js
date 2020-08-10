const chatbotAutomation = require('./chatbotAutomation.controller')
const utility = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/v1/messengerEvents/quickReply.controller'
const { saveLiveChat } = require('./sessions.controller')

exports.index = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  let messengerPayload = req.body.entry[0].messaging[0]
  let pageId = messengerPayload.recipient.id
  let subscriberId = messengerPayload.sender.id
  let quickRepyPayload = JSON.parse(messengerPayload.message.quick_reply.payload)
  if (quickRepyPayload.action === '_chatbot') {
    let subscriber
    utility.callApi('subscribers/query', 'post', { senderId: subscriberId })
      .then(gotSubscriber => {
        subscriber = gotSubscriber[0]
        return utility.callApi('pages/query', 'post', { pageId, connected: true })
      })
      .then(page => {
        page = page[0]
        chatbotAutomation.handleChatBotNextMessage(messengerPayload, page, subscriber, quickRepyPayload.blockUniqueId)
        saveLiveChat(page, subscriber, messengerPayload)
      })
      .catch(error => {
        logger.serverLog(TAG, `error on getting subcribers ${error}`, 'error')
      })
  }
}
