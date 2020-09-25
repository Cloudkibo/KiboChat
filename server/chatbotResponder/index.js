const chatbotDatalayer = require('../api/v1.1/configureChatbot/datalayer')
const logger = require('../components/logger')
const TAG = '/chatbotResponder/index.js'

exports.respondUsingChatbot = (platform, provider, companyId, message) => {
  chatbotDatalayer.fetchChatbotRecords({companyId})
    .then(chatbots => {
      const chatbot = chatbots[0]
      if (chatbot && chatbot.published) {
        if (chatbot.startingBlockId) {
          let userText = message.toLowerCase().trim()
          chatbotDatalayer.fetchChatbotBlockRecords({
            companyId,
            chatbotId: chatbot.chatbotId,
            uniqueId: chatbot.startingBlockId
          })
        } else {
          logger.serverLog(TAG, 'chatbot startingBlockId is not set', 'error')
        }
      } else {
        logger.serverLog(TAG, 'chatbot not found or is diabled', 'debug')
      }
    })
    .catch(err => {
      logger.serverLog(TAG, err, 'error')
    })
}
