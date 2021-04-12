const smsChatbotDataLayer = require('./smsChatbot.datalayer')
const commerceConstants = require('../ecommerceProvidersApiLayer/constants')
const EcommerceProvider = require('../ecommerceProvidersApiLayer/EcommerceProvidersApiLayer.js')
const shopifyDataLayer = require('../shopify/shopify.datalayer')
const commerceBotLogicLayer = require('./commerceChatbot.logiclayer')
const logger = require('../../../components/logger')
const TAG = 'api/v1️.1/configureChatbot/commerceChatbot.controller.js'
const constants = require('../whatsAppChatbot/constants')
const botUtils = require('./commerceChatbot.utils')
const { smsMapper } = require('./../../../smsMapper')
const { ActionTypes } = require('./../../../smsMapper/constants')
const { intervalForEach } = require('./../../../components/utility')

exports.handleCommerceChatbot = async function (company, message, contact) {
  const chatbot = await smsChatbotDataLayer.findOne({
    companyId: company._id,
    vertical: 'ecommerce',
    published: true
  })
  let ecommerceProvider = null
  let nextMessageBlock = null
  if (chatbot) {
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
      sendTextMessage(nextMessageBlock, contact, company)
      botUtils.updateSmsContact({ _id: contact._id },
        {lastMessageSentByBot: nextMessageBlock, backMessageByBot: contact.lastMessageSentByBot},
        null, {})
    }
  }
}

function sendTextMessage (nextMessageBlock, contact, company) {
  intervalForEach(nextMessageBlock.payload, (msgPayload) => {
    if (msgPayload.componentType === 'text') {
      smsMapper('twilio', ActionTypes.SEND_TEXT_MESSAGE, {
        text: msgPayload.text,
        subscriber: contact,
        company
      })
    } else if (msgPayload.componentType === 'image') {
      smsMapper('twilio', ActionTypes.SEND_MEDIA_MESSAGE, {
        text: msgPayload.caption,
        mediaUrl: [msgPayload.fileurl],
        subscriber: contact,
        company
      })
    }
  }, 1500)
}

async function getNextMessageBlock (chatbot, ecommerceProvider, contact, message, company) {
  let userError = false
  const input = message.toLowerCase()
  if (!contact || !contact.lastMessageSentByBot) {
    return commerceBotLogicLayer.getWelcomeMessageBlock(chatbot, contact, ecommerceProvider)
  } else {
    let action = null
    let lastMessageSentByBot = contact.lastMessageSentByBot.payload[0]
    for (let i = 0; i < contact.lastMessageSentByBot.payload.length; i++) {
      const payload = contact.lastMessageSentByBot.payload[i]
      if (payload.specialKeys || payload.menu || payload.action) {
        lastMessageSentByBot = payload
        break
      }
    }
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
          case constants.GO_BACK: {
            messageBlock = contact.backMessageByBot
            break
          }
          case constants.SHOW_MAIN_MENU: {
            messageBlock = await commerceBotLogicLayer.getWelcomeMessageBlock(chatbot, contact, ecommerceProvider)
            break
          }
          case constants.PRODUCT_CATEGORIES: {
            messageBlock = await commerceBotLogicLayer.getProductCategoriesBlock(chatbot, ecommerceProvider, action.argument ? action.argument : {})
            break
          }
          case constants.FETCH_PRODUCTS: {
            messageBlock = await commerceBotLogicLayer.getProductsInCategoryBlock(chatbot, ecommerceProvider, action.argument)
            break
          }
          case constants.PRODUCT_VARIANTS: {
            messageBlock = await commerceBotLogicLayer.getProductVariantsBlock(chatbot, contact, ecommerceProvider, action.argument)
            break
          }
          case constants.SEARCH_PRODUCTS: {
            messageBlock = await commerceBotLogicLayer.getSearchProductsBlock(chatbot, contact)
            break
          }
          case constants.DISCOVER_PRODUCTS: {
            messageBlock = await commerceBotLogicLayer.getDiscoverProductsBlock(chatbot, ecommerceProvider, action.input ? input : '', action.argument ? action.argument : {})
            break
          }
          case constants.SELECT_PRODUCT: {
            messageBlock = await commerceBotLogicLayer.getSelectProductBlock(chatbot, action.argument)
            break
          }
          case constants.ADD_TO_CART: {
            messageBlock = await commerceBotLogicLayer.getAddToCartBlock(chatbot, contact, action.argument, action.input ? input : '')
            break
          }
          case constants.SHOW_MY_CART: {
            messageBlock = await commerceBotLogicLayer.getShowMyCartBlock(chatbot, contact)
            break
          }
          case constants.SHOW_ITEMS_TO_UPDATE: {
            messageBlock = await commerceBotLogicLayer.getShowItemsToUpdateBlock(chatbot, contact)
            break
          }
          case constants.QUANTITY_TO_UPDATE: {
            messageBlock = await commerceBotLogicLayer.getQuantityToUpdateBlock(chatbot, action.argument)
            break
          }
          case constants.UPDATE_CART: {
            messageBlock = await commerceBotLogicLayer.getUpdateCartBlock(chatbot, contact, action.argument, action.input ? input : '')
            break
          }
          case constants.SHOW_ITEMS_TO_REMOVE: {
            messageBlock = await commerceBotLogicLayer.getShowItemsToRemoveBlock(chatbot, contact)
            break
          }
          case constants.REMOVE_FROM_CART: {
            messageBlock = await commerceBotLogicLayer.getRemoveFromCartBlock(chatbot, contact, action.argument)
            break
          }
          case constants.CONFIRM_TO_REMOVE_CART_ITEM: {
            messageBlock = await commerceBotLogicLayer.getConfirmRemoveItemBlock(chatbot, action.argument)
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
            messageBlock = await commerceBotLogicLayer.getRecentOrdersBlock(chatbot, contact, ecommerceProvider)
            break
          }
          case constants.ORDER_STATUS: {
            messageBlock = await commerceBotLogicLayer.getOrderStatusBlock(chatbot, ecommerceProvider, action.input ? input : action.argument)
            break
          }
          case constants.PROCEED_TO_CHECKOUT: {
            messageBlock = await commerceBotLogicLayer.getCheckoutBlock(chatbot, ecommerceProvider, contact, action.argument, action.input ? input : '')
            break
          }
          case constants.ASK_ORDER_ID: {
            messageBlock = await commerceBotLogicLayer.getOrderIdBlock(chatbot, contact)
            break
          }
          case constants.CHECK_ORDERS: {
            messageBlock = await commerceBotLogicLayer.getCheckOrdersBlock(chatbot, contact)
            break
          }
          case constants.GET_CHECKOUT_INFO: {
            messageBlock = await commerceBotLogicLayer.getCheckoutInfoBlock(chatbot, contact, ecommerceProvider, action.argument, action.input ? input : '')
            break
          }
          case constants.GET_EMAIL_OTP: {
            messageBlock = await commerceBotLogicLayer.getEmailOtpBlock(chatbot, contact, ecommerceProvider, action.argument, action.input ? input : '')
            break
          }
          case constants.GET_VERIFY_OTP: {
            messageBlock = await commerceBotLogicLayer.getVerifyOtpBlock(chatbot, contact, action.argument, action.input ? input : '', ecommerceProvider)
            break
          }
          case constants.ASK_ADDRESS: {
            messageBlock = await commerceBotLogicLayer.getAskAddressBlock(chatbot, contact, action.argument, action.input ? input : '')
            break
          }
          case constants.GET_CHECKOUT_STREET_ADDRESS: {
            messageBlock = await commerceBotLogicLayer.getCheckoutStreetAddressBlock(chatbot, contact, action.argument)
            break
          }
          case constants.GET_CHECKOUT_CITY: {
            messageBlock = await commerceBotLogicLayer.getCheckoutCityBlock(chatbot, contact, action.argument, action.input ? input : '')
            break
          }
          case constants.GET_CHECKOUT_COUNTRY: {
            messageBlock = await commerceBotLogicLayer.getCheckoutCountryBlock(chatbot, contact, action.argument, action.input ? input : '')
            break
          }
          case constants.GET_CHECKOUT_ZIP_CODE: {
            messageBlock = await commerceBotLogicLayer.getCheckoutZipCodeBlock(chatbot, contact, action.argument, action.input ? input : '')
            break
          }
          case constants.CONFIRM_COMPLETE_ADDRESS: {
            messageBlock = await commerceBotLogicLayer.confirmCompleteAddress(chatbot, contact, action.argument, action.input ? input : '')
            break
          }
          case constants.UPDATE_ADDRESS_BLOCK: {
            messageBlock = await commerceBotLogicLayer.updateAddressBlock(chatbot, contact, action.argument)
            break
          }
          case constants.UPDATE_CHECKOUT_STREET_ADDRESS: {
            messageBlock = await commerceBotLogicLayer.updateCheckoutStreetAddressBlock(chatbot, contact, action.argument)
            break
          }
          case constants.UPDATE_CHECKOUT_CITY: {
            messageBlock = await commerceBotLogicLayer.updateCheckoutCityBlock(chatbot, contact, action.argument)
            break
          }
          case constants.UPDATE_CHECKOUT_COUNTRY: {
            messageBlock = await commerceBotLogicLayer.updateCheckoutCountryBlock(chatbot, contact, action.argument)
            break
          }
          case constants.UPDATE_CHECKOUT_ZIP_CODE: {
            messageBlock = await commerceBotLogicLayer.updateCheckoutZipCodeBlock(chatbot, contact, action.argument, action.input ? input : '')
            break
          }
          case constants.GET_NEW_CHECKOUT_STREET_ADDRESS: {
            messageBlock = await commerceBotLogicLayer.getNewCheckoutStreetAddressBlock(chatbot, contact, action.argument, action.input ? input : '')
            break
          }
          case constants.GET_NEW_CHECKOUT_CITY: {
            messageBlock = await commerceBotLogicLayer.getNewCheckoutCityBlock(chatbot, contact, action.argument, action.input ? input : '')
            break
          }
          case constants.GET_NEW_CHECKOUT_COUNTRY: {
            messageBlock = await commerceBotLogicLayer.getNewCheckoutCountryBlock(chatbot, contact, action.argument, action.input ? input : '')
            break
          }
          case constants.GET_NEW_CHECKOUT_ZIP_CODE: {
            messageBlock = await commerceBotLogicLayer.getNewCheckoutZipCodeBlock(chatbot, contact, action.argument, action.input ? input : '')
            break
          }
          case constants.ASK_PAYMENT_METHOD: {
            messageBlock = await commerceBotLogicLayer.getAskPaymentMethodBlock(chatbot, contact, action.input ? input : '')
            break
          }
          case constants.TALK_TO_AGENT: {
            messageBlock = await commerceBotLogicLayer.getTalkToAgentBlock(chatbot, contact)
            break
          }
          case constants.ASK_UNPAUSE_CHATBOT: {
            messageBlock = await commerceBotLogicLayer.getAskUnpauseChatbotBlock(chatbot, contact)
            break
          }
          case constants.UNPAUSE_CHATBOT: {
            await botUtils.updateSmsContact({ _id: contact._id }, { chatbotPaused: false }, null, {})
            return commerceBotLogicLayer.getWelcomeMessageBlock(chatbot, contact, ecommerceProvider)
          }
        }
        return messageBlock
      } catch (err) {
        if (chatbot.triggers.includes(input)) {
          return commerceBotLogicLayer.getWelcomeMessageBlock(chatbot, contact, ecommerceProvider)
        } else {
          return commerceBotLogicLayer.invalidInput(chatbot, contact.lastMessageSentByBot, `${constants.ERROR_INDICATOR}${err && err.message ? err.message : 'You entered an invalid response.'}`)
        }
      }
    }
  }
}
