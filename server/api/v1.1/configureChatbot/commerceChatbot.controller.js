const smsChatbotDataLayer = require('./smsChatbot.datalayer')
const commerceConstants = require('../ecommerceProvidersApiLayer/constants')
const EcommerceProvider = require('../ecommerceProvidersApiLayer/EcommerceProvidersApiLayer.js')
const shopifyDataLayer = require('../shopify/shopify.datalayer')
const logger = require('../../../components/logger')
const TAG = 'api/v1️.1/configureChatbot/commerceChatbot.logiclayer.js'
const constants = require('../whatsAppChatbot/constants')

exports.handleCommerceChatbot = async function (company, message, contact) {
  const chatbot = await smsChatbotDataLayer.findOne({
    companyId: company._id,
    vertical: 'ecommerce',
    published: true
  })
  let ecommerceProvider = null
  let nextMessageBlock = null
  if (chatbot.integration === commerceConstants.shopify) {
    const shopifyIntegration = await shopifyDataLayer.findOneShopifyIntegration({ companyId: chatbot.companyId })
    ecommerceProvider = new EcommerceProvider(commerceConstants.shopify, {
      shopUrl: shopifyIntegration.shopUrl,
      shopToken: shopifyIntegration.shopToken
    })
  }
  if (ecommerceProvider) {
    nextMessageBlock = await getNextMessageBlock(chatbot, ecommerceProvider, contact, message, company)
  }
  sendTextMessage(nextMessageBlock, contact, company._id)
}

function sendTextMessage (nextMessageBlock, contact, companyId) {

}

async function getNextMessageBlock (chatbot, ecommerceProvider, contact, message, company) {
  let userError = false
  const input = message.toLowerCase()
  if (!contact || !contact.lastMessageSentByBot) {
    // TODO, in separate task
    // return getWelcomeMessageBlock(chatbot, contact, EcommerceProvider)
  } else {
    let action = null
    let lastMessageSentByBot = contact.lastMessageSentByBot.payload[0]
    try {
      if (contact.chatbotPaused) {
        if (lastMessageSentByBot.specialKeys && lastMessageSentByBot.specialKeys[input]) {
          action = lastMessageSentByBot.specialKeys[input]
        } else {
          action = {
            type: constants.DYNAMIC,
            action: constants.ASK_UNPAUSE_CHATBOT
          }
        }
      } else if (lastMessageSentByBot.specialKeys && lastMessageSentByBot.specialKeys[input]) {
        action = lastMessageSentByBot.specialKeys[input]
      } else if (input === 'home' && lastMessageSentByBot.specialKeys[constants.HOME_KEY]) {
        action = lastMessageSentByBot.specialKeys[constants.HOME_KEY]
      } else if (input === 'back' && lastMessageSentByBot.specialKeys[BACK_KEY]) {
        action = lastMessageSentByBot.specialKeys[constants.BACK_KEY]
      } else if (lastMessageSentByBot.menu) {
        let menuInput = parseInt(input)
        if (isNaN(menuInput) || menuInput >= lastMessageSentByBot.menu.length || menuInput < 0) {
          if (lastMessageSentByBot.action) {
            action = lastMessageSentByBot.action
          } else {
            userError = true
            throw new Error(`${constants.ERROR_INDICATOR}Invalid User Input`)
          }
        } else {
          action = lastMessageSentByBot.menu[menuInput]
        }
      } else if (lastMessageSentByBot.action) {
        action = lastMessageSentByBot.action
      } else {
        userError = true
        throw new Error(`${constants.ERROR_INDICATOR}Invalid User Input`)
      }
    } catch (err) {
      // if (!userError) {
      //   const message = err || 'Invalid user input'
      //   logger.serverLog(message, `${TAG}: exports.getNextMessageBlock`, chatbot, {}, 'error')
      // }
      // if (chatbot.triggers.includes(input) || (moment().diff(moment(contact.lastMessagedAt), 'minutes') >= 15 && chatbot.companyId !== '5a89ecdaf6b0460c552bf7fe')) {
      //   return getWelcomeMessageBlock(chatbot, contact, EcommerceProvider)
      // } else {
      //   return invalidInput(chatbot, contact.lastMessageSentByBot, `${ERROR_INDICATOR}You entered an invalid response.`)
      // }
    }
  }
}
