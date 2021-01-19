const logger = require('../components/logger')
const TAG = '/chatbotTemplates/index.js'
const async = require('async')

const whatsAppChatbotLogicLayer = require('../api/v1.1/whatsAppChatbot/whatsAppChatbot.logiclayer')
const whatsAppChatbotDataLayer = require('../api/v1.1/whatsAppChatbot/whatsAppChatbot.datalayer')
const configureChatbotDatalayer = require('../api/v1.1/configureChatbot/datalayer')
const { callApi } = require('../api/v1.1/utility')
const { getChatbotResponse } = require('./kiboautomation.layer.js')
const { SPECIALKEYWORDS, transformSpecialKeywords } = require('./specialKeywords')

exports.handleUserInput = async function (inputData, subscriber, company, req, isNewContact, channel) {
  try {
    const inputText = inputData.messageData.text.toLowerCase()
    let isCode = false
    const chatbot = await whatsAppChatbotDataLayer.fetchWhatsAppChatbot({ _id: subscriber.activeChatbotId })
    if (chatbot) {
      const shouldSend = chatbot.published || chatbot.testSubscribers.includes(subscriber.number)
      if (shouldSend) {
        if (
          !isNaN(parseInt(inputText)) ||
          (inputText.length === 1 || SPECIALKEYWORDS.includes(inputText))
        ) {
          isCode = true
        }
        if (isCode) {
          const validCode = await isCodeValid(inputText, subscriber)
          if (validCode) {
            const response = await getChatbotResponse(inputText, chatbot.vertical, subscriber._id)
            // send response back to subscriber
          } else {
            // send Invalid response
          }
        } else {
          const response = await getChatbotResponse(inputText, chatbot.vertical, subscriber._id)
          // send response back to subscriber
        }
      }
    }
  } catch (err) {
    const message = err || 'Error at handling user input'
    logger.serverLog(message, `${TAG}: exports.handleUserInput`, req.body, {inputData, subscriber, company, isNewContact}, 'error')
  }
}

function isCodeValid (inputText, subscriber) {
  const lastMessage = subscriber.lastMessageSentByBot
  if (SPECIALKEYWORDS.includes(inputText)) {
    inputText = transformSpecialKeywords(inputText)
  }
  if (lastMessage) {
    let options = lastMessage.options.map((item) => item.code)
    options = lastMessage.otherOptions.map((item) => item.code)
    if (options.includes(inputText)) {
      return true
    } else {
      return false
    }
  } else {
    return false
  }
}

function updateWhatsAppContact (query, bodyForUpdate, bodyForIncrement, options) {
  callApi(
    `whatsAppContacts/update`,
    'put',
    {
      query: query,
      newPayload: { ...bodyForIncrement, ...bodyForUpdate },
      options: options
    }
  )
    .then(updated => {
    })
    .catch(error => {
      const message = error || 'Failed to update contact'
      logger.serverLog(message, `${TAG}: exports._sendNotification`, {}, { query, bodyForUpdate, bodyForIncrement, options }, 'error')
    })
}
