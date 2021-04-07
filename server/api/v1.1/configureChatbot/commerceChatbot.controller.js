const smsChatbotDataLayer = require('./smsChatbot.datalayer')
const commerceConstants = require('../ecommerceProvidersApiLayer/constants')
const EcommerceProvider = require('../ecommerceProvidersApiLayer/EcommerceProvidersApiLayer.js')
const shopifyDataLayer = require('../shopify/shopify.datalayer')
const commerceBotLogicLayer = require('./commerceChatbot.logiclayer')
const logger = require('../../../components/logger')
const TAG = 'api/v1️.1/configureChatbot/commerceChatbot.controller.js'
const constants = require('../whatsAppChatbot/constants')
const botUtils = require('./commerceChatbot.utils')

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
  if (nextMessageBlock) {
    sendTextMessage(nextMessageBlock, contact, company._id)
    botUtils.updateSmsContact({ _id: contact._id }, {lastMessageSentByBot: nextMessageBlock}, null, {})
  }
}

function sendTextMessage (nextMessageBlock, contact, companyId) {

}

async function getNextMessageBlock (chatbot, ecommerceProvider, contact, message, company) {
  let userError = false
  const input = message.toLowerCase()
  if (!contact || !contact.lastMessageSentByBot) {
    return commerceBotLogicLayer.getWelcomeMessageBlock(chatbot, contact, ecommerceProvider)
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
      } else if (input === 'back' && lastMessageSentByBot.specialKeys[constants.BACK_KEY]) {
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
      if (!userError) {
        const message = err || 'Invalid user input'
        logger.serverLog(message, `${TAG}: exports.getNextMessageBlock`, chatbot, {}, 'error')
      }
      if (chatbot.triggers.includes(input)) {
        return commerceBotLogicLayer.getWelcomeMessageBlock(chatbot, contact, ecommerceProvider)
      } else {
        return commerceBotLogicLayer.invalidInput(chatbot, contact.lastMessageSentByBot, `${constants.ERROR_INDICATOR}You entered an invalid response.`)
      }
    }
    if (action.type === constants.DYNAMIC) {
      try {
        let messageBlock = null
        switch (action.action) {
          case constants.SHOW_MAIN_MENU: {
            messageBlock = await commerceBotLogicLayer.getWelcomeMessageBlock(chatbot, contact, ecommerceProvider)
            break
          }
          case constants.PRODUCT_CATEGORIES: {
            messageBlock = await commerceBotLogicLayer.getProductCategoriesBlock(chatbot, contact.lastMessageSentByBot.uniqueId, ecommerceProvider, action.argument ? action.argument : {})
            break
          }
          case constants.FETCH_PRODUCTS: {
            messageBlock = await commerceBotLogicLayer.getProductsInCategoryBlock(chatbot, contact.lastMessageSentByBot.uniqueId, ecommerceProvider, action.argument)
            break
          }
          case constants.PRODUCT_VARIANTS: {
            messageBlock = await commerceBotLogicLayer.getProductVariantsBlock(chatbot, contact.lastMessageSentByBot.uniqueId, contact, ecommerceProvider, action.argument)
            break
          }
          case constants.DISCOVER_PRODUCTS: {
            messageBlock = await commerceBotLogicLayer.getDiscoverProductsBlock(chatbot, contact.lastMessageSentByBot.uniqueId, ecommerceProvider, action.input ? input : '', action.argument ? action.argument : {})
            break
          }
          case constants.ADD_TO_CART: {
            messageBlock = await commerceBotLogicLayer.getAddToCartBlock(chatbot, contact.lastMessageSentByBot.uniqueId, contact, action.argument, action.input ? input : '')
            break
          }
          case constants.SHOW_MY_CART: {
            messageBlock = await commerceBotLogicLayer.getShowMyCartBlock(chatbot, contact.lastMessageSentByBot.uniqueId, contact)
            break
          }
          case constants.SHOW_ITEMS_TO_REMOVE: {
            messageBlock = await commerceBotLogicLayer.getShowItemsToRemoveBlock(chatbot, contact.lastMessageSentByBot.uniqueId, contact)
            break
          }
          case constants.REMOVE_FROM_CART: {
            messageBlock = await commerceBotLogicLayer.getRemoveFromCartBlock(chatbot, contact.lastMessageSentByBot.uniqueId, contact, action.argument)
            break
          }
          case constants.CONFIRM_TO_REMOVE_CART_ITEM: {
            messageBlock = await commerceBotLogicLayer.getConfirmRemoveItemBlock(chatbot, contact.lastMessageSentByBot.uniqueId, action.argument)
            break
          }
          case constants.CONFIRM_CLEAR_CART: {
            messageBlock = await commerceBotLogicLayer.confirmClearCart(chatbot, contact)
            break
          }
          case constants.CLEAR_CART: {
            messageBlock = await commerceBotLogicLayer.clearCart(chatbot, contact)
            break
          }
          case constants.VIEW_RECENT_ORDERS: {
            messageBlock = await commerceBotLogicLayer.getRecentOrdersBlock(chatbot, contact.lastMessageSentByBot.uniqueId, contact, ecommerceProvider)
            break
          }
        }
        // await messageBlockDataLayer.createForMessageBlock(messageBlock)
        return messageBlock
      } catch (err) {
        if (chatbot.triggers.includes(input)) {
          return commerceBotLogicLayer.getWelcomeMessageBlock(chatbot, contact, ecommerceProvider)
        } else {
          return commerceBotLogicLayer.invalidInput(chatbot, contact.lastMessageSentByBot, `${constants.ERROR_INDICATOR}You entered an invalid response.`)
        }
      }
    }
  }
}
