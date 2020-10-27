const utility = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/v1/messengerEvents/postback.controller'
const chatbotAutomation = require('./chatbotAutomation.controller')
const logicLayer = require('./logiclayer')

exports.index = async (req, res) => {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  try {
    const messengerPayload = req.body.entry[0].messaging[0]
    const pageId = messengerPayload.recipient.id
    const subscriberId = messengerPayload.sender.id

    logger.serverLog(TAG, `postback event ${JSON.stringify(messengerPayload)}`, 'info')

    const pages = await utility.callApi('pages/query', 'post', { pageId, connected: true })
    const page = pages[0]
    const subscribers = await utility.callApi('subscribers/query', 'post', { senderId: subscriberId, pageId: page._id })
    const subscriber = subscribers[0]
    chatbotAutomation.handleCommerceChatbot(messengerPayload, page, subscriber)
    if (logicLayer.isJsonString(messengerPayload.postback.payload)) {
      let manualChatbotPayload = JSON.parse(messengerPayload.postback.payload)
      for (let i = 0; i < manualChatbotPayload.length; i++) {
        if (manualChatbotPayload[i].action === '_chatbot') {
          chatbotAutomation.handleChatBotNextMessage(messengerPayload, page, subscriber, manualChatbotPayload[i].blockUniqueId, manualChatbotPayload[i].parentBlockTitle)
        }
      }
    }
  } catch (err) {
    logger.serverLog(TAG, `error in postback ${err}`, 'error')
  }
}
