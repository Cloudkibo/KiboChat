const utility = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/v1/messengerEvents/postback.controller'
const chatbotAutomation = require('./chatbotAutomation.controller')
const logicLayer = require('./logiclayer')
const { saveLiveChat } = require('./sessions.controller')

exports.index = async (req, res) => {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  try {
    const messengerPayload = req.body.entry[0].messaging[0]
    const pageId = messengerPayload.recipient.id
    const subscriberId = messengerPayload.sender.id

    const pages = await utility.callApi('pages/query', 'post', { pageId, connected: true })
    const page = pages[0]
    if (page) {
      const subscribers = await utility.callApi('subscribers/query', 'post', { senderId: subscriberId, pageId: page._id })
      const subscriber = subscribers[0]
      if (subscriber) {
        chatbotAutomation.handleCommerceChatbot(messengerPayload, page, subscriber)
        if (logicLayer.isJsonString(messengerPayload.postback.payload)) {
          let manualChatbotPayload = JSON.parse(messengerPayload.postback.payload)
          if (manualChatbotPayload && manualChatbotPayload.action === '_chatbot') {
            console.log('handleChatBotNextMessage')
            chatbotAutomation.handleChatBotNextMessage(messengerPayload, page, subscriber, manualChatbotPayload.blockUniqueId, manualChatbotPayload.parentBlockTitle)
          }
        }
        saveLiveChat(page, subscriber, {...messengerPayload, message: {text: messengerPayload.postback.title}})
      }
    }
  } catch (err) {
    const message = err || 'error in postback'
    return logger.serverLog(message, `${TAG}: exports.index`, req.body, {}, 'error')
  }
}
