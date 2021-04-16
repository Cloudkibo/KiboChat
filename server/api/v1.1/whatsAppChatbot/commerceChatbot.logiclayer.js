const dedent = require('dedent-js')
const {
  DYNAMIC,
  STATIC,
  PRODUCT_CATEGORIES,
  FETCH_PRODUCTS,
  PRODUCT_VARIANTS,
  DISCOVER_PRODUCTS,
  ORDER_STATUS,
  SELECT_PRODUCT,
  SHOW_MY_CART,
  ADD_TO_CART,
  REMOVE_FROM_CART,
  UPDATE_CART,
  SHOW_ITEMS_TO_REMOVE,
  SHOW_ITEMS_TO_UPDATE,
  PROCEED_TO_CHECKOUT,
  ASK_PAYMENT_METHOD,
  GET_CHECKOUT_EMAIL,
  CONFIRM_CLEAR_CART,
  CLEAR_CART,
  CONFIRM_TO_REMOVE_CART_ITEM,
  QUANTITY_TO_UPDATE,
  VIEW_RECENT_ORDERS,
  FAQS_KEY,
  ORDER_STATUS_KEY,
  BACK_KEY,
  SHOW_CART_KEY,
  HOME_KEY,
  ERROR_INDICATOR,
  TALK_TO_AGENT_KEY,
  TALK_TO_AGENT,
  ASK_ADDRESS,
  CONFIRM_COMPLETE_ADDRESS,
  UPDATE_ADDRESS_BLOCK,
  GET_CHECKOUT_STREET_ADDRESS,
  GET_CHECKOUT_COUNTRY,
  GET_CHECKOUT_CITY,
  GET_CHECKOUT_ZIP_CODE,
  UPDATE_CHECKOUT_STREET_ADDRESS,
  UPDATE_CHECKOUT_CITY,
  UPDATE_CHECKOUT_COUNTRY,
  UPDATE_CHECKOUT_ZIP_CODE,
  GET_NEW_CHECKOUT_STREET_ADDRESS,
  GET_NEW_CHECKOUT_CITY,
  GET_NEW_CHECKOUT_COUNTRY,
  GET_NEW_CHECKOUT_ZIP_CODE,
  ASK_UNPAUSE_CHATBOT,
  UNPAUSE_CHATBOT,
  SEARCH_PRODUCTS,
  CHECK_ORDERS,
  ASK_ORDER_ID,
  GET_INVOICE,
  GET_CHECKOUT_INFO,
  VIEW_CATALOG,
  CONFIRM_RETURN_ORDER,
  RETURN_ORDER,
  CANCEL_ORDER,
  SHOW_FAQS,
  SHOW_FAQ_QUESTIONS,
  GET_FAQ_ANSWER,
  CANCEL_ORDER_CONFIRM,
  GET_EMAIL_OTP,
  GET_VERIFY_OTP
} = require('./constants')
const { convertToEmoji, sendNotification } = require('./whatsAppChatbot.logiclayer')
const logger = require('../../../components/logger')
const TAG = 'api/v1️.1/whatsAppChatbot/commerceChatbot.logiclayer.js'
const utility = require('../../../components/utility')
const messageBlockDataLayer = require('../messageBlock/messageBlock.datalayer')
const { callApi } = require('../utility')
const moment = require('moment')
const commerceConstants = require('../ecommerceProvidersApiLayer/constants')
const pdf = require('pdf-creator-node')
const fs = require('fs')
const path = require('path')
const config = require('../../../config/environment/index')

function specialKeyText (key) {
  switch (key) {
    case TALK_TO_AGENT_KEY:
      return `*${key.toUpperCase()}*  Talk to a customer support agent`
    case FAQS_KEY:
      return `*${key.toUpperCase()}*  View FAQs`
    case SHOW_CART_KEY:
      return `*${key.toUpperCase()}*  View your cart`
    case ORDER_STATUS_KEY:
      return `*${key.toUpperCase()}*  Check order status`
    case BACK_KEY:
      return `*${key.toUpperCase()}*  Go back`
    case HOME_KEY:
      return `*${key.toUpperCase()}*  Go home`
  }
}

// exports.updateFaqsForStartingBlock = async (chatbot) => {
//   let messageBlocks = []

//   const faqsId = '' + new Date().getTime()
//   let startingBlock = await messageBlockDataLayer.findOneMessageBlock({ uniqueId: chatbot.startingBlockId })

//   if (!startingBlock.payload[0].specialKeys[FAQS_KEY]) {
//     if (chatbot.botLinks && chatbot.botLinks.faqs) {
//       startingBlock.payload[0].text += `\n${specialKeyText(FAQS_KEY)}`
//       startingBlock.payload[0].specialKeys[FAQS_KEY] = { type: STATIC, blockId: faqsId }
//       getFaqsBlock(chatbot, faqsId, messageBlocks, chatbot.startingBlockId)
//       messageBlockDataLayer.genericUpdateMessageBlock({ uniqueId: chatbot.startingBlockId }, startingBlock)
//       messageBlockDataLayer.createForMessageBlock(messageBlocks[0])
//     }
//   } else {
//     if (chatbot.botLinks && chatbot.botLinks.faqs) {
//       startingBlock.payload[0].specialKeys[FAQS_KEY] = { type: STATIC, blockId: faqsId }
//       getFaqsBlock(chatbot, faqsId, messageBlocks, chatbot.startingBlockId)
//       messageBlockDataLayer.genericUpdateMessageBlock({ uniqueId: chatbot.startingBlockId }, startingBlock)
//       messageBlockDataLayer.createForMessageBlock(messageBlocks[0])
//     } else {
//       startingBlock.payload[0].text = startingBlock.payload[0].text.replace(`\n${specialKeyText(FAQS_KEY)}`, '')
//       delete startingBlock.payload[0].specialKeys[FAQS_KEY]
//       messageBlockDataLayer.genericUpdateMessageBlock({ uniqueId: chatbot.startingBlockId }, startingBlock)
//     }
//   }
// }

exports.getMessageBlocks = (chatbot) => {
  const messageBlocks = []
  const mainMenuId = '' + new Date().getTime()
  // const faqsId = '' + new Date().getTime() + 500

  messageBlocks.push({
    module: {
      id: chatbot._id,
      type: 'whatsapp_commerce_chatbot'
    },
    title: 'Main Menu',
    uniqueId: mainMenuId,
    payload: [
      {
        text: dedent(`Please select an option to let me know what you would like to do? (i.e. send “1” to View products on sale):\n
                ${convertToEmoji(0)} Browse all categories
                ${convertToEmoji(1)} View products on sale
                ${convertToEmoji(2)} Search for a product
                ${convertToEmoji(3)} View Catalog\n
                ${specialKeyText(ORDER_STATUS_KEY)}
                ${specialKeyText(SHOW_CART_KEY)}
                ${specialKeyText(FAQS_KEY)}
                ${specialKeyText(TALK_TO_AGENT_KEY)}`),
        componentType: 'text',
        menu: [
          { type: DYNAMIC, action: PRODUCT_CATEGORIES },
          { type: DYNAMIC, action: DISCOVER_PRODUCTS },
          { type: DYNAMIC, action: SEARCH_PRODUCTS },
          { type: DYNAMIC, action: VIEW_CATALOG }
        ],
        specialKeys: {
          [FAQS_KEY]: { type: DYNAMIC, action: SHOW_FAQS },
          [ORDER_STATUS_KEY]: { type: DYNAMIC, action: VIEW_RECENT_ORDERS },
          [SHOW_CART_KEY]: { type: DYNAMIC, action: SHOW_MY_CART },
          [TALK_TO_AGENT_KEY]: { type: DYNAMIC, action: TALK_TO_AGENT }
        }
      }
    ],
    userId: chatbot.userId,
    companyId: chatbot.companyId
  })

  // if (chatbot.botLinks && chatbot.botLinks.faqs) {
  //   messageBlocks[0].payload[0].text += `\n${specialKeyText(FAQS_KEY, 'faqs')} FAQs`
  //   messageBlocks[0].payload[0].specialKeys[FAQS_KEY] = { type: STATIC, blockId: faqsId }
  //   getFaqsBlock(chatbot, faqsId, messageBlocks, mainMenuId)
  // }

  if (chatbot.brandImage) {
    messageBlocks[0].payload.push({
      componentType: 'image',
      fileurl: chatbot.brandImage
    })
  }

  return messageBlocks
}

const getViewCatalogBlock = (chatbot, backId, contact) => {
  try {
    const messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_commerce_chatbot'
      },
      title: 'View Catalog',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: ``,
          componentType: 'text',
          specialKeys: {
            [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId },
            [ORDER_STATUS_KEY]: { type: STATIC, blockId: chatbot.startingBlockId }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }

    if (chatbot.catalog && chatbot.catalog.url) {
      messageBlock.payload[0].text += `Here is our catalog. Please wait a moment for it to send.`
      messageBlock.payload.push({
        componentType: 'file',
        fileurl: {
          url: chatbot.catalog.url
        },
        fileName: chatbot.catalog.name
      })
    } else {
      messageBlock.payload[0].text += `No catalog currently available.`
    }
    messageBlock.payload[0].text += `\n\n${specialKeyText(HOME_KEY)}`
    return messageBlock
  } catch (err) {
    const message = err || 'Unable get talk to agent message block'
    logger.serverLog(message, `${TAG}: getTalkToAgentBlock`, {}, {chatbot, backId, contact}, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to notify customer support agent`)
  }
}

const getCancelOrderBlock = async (chatbot, backId, EcommerceProvider, argument, businessNumber) => {
  let orderId = argument.id.split('//')[1].split('/')[2]
  try {
    const messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_commerce_chatbot'
      },
      title: 'Cancel Order',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: ``,
          componentType: 'text',
          specialKeys: {
            [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId },
            [ORDER_STATUS_KEY]: { type: DYNAMIC, action: VIEW_RECENT_ORDERS },
            [SHOW_CART_KEY]: { type: DYNAMIC, action: SHOW_MY_CART },
            [TALK_TO_AGENT_KEY]: { type: DYNAMIC, action: TALK_TO_AGENT }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    if (!argument.isOrderFulFilled) {
      let orderStatus = await EcommerceProvider.checkOrderStatus(Number(argument.orderId))
      let tags = orderStatus.tags
      tags.push('cancel-request')
      let response = await EcommerceProvider.updateOrderTag(orderId, tags.join())
      if (response.status === 'success') {
        let cancelationMessage = chatbot.cancelOrderMessage.replace(/{{orderId}}/g, argument.orderId)
        messageBlock.payload[0].text += cancelationMessage
      } else {
        messageBlock.payload[0].text += `Failed to send cancel request for your order.`
        messageBlock.payload[0].text += `\n\n${specialKeyText(TALK_TO_AGENT_KEY)}`
      }
      messageBlock.payload[0].text += `\n\n${specialKeyText(ORDER_STATUS_KEY)}`
    } else {
      messageBlock.payload[0].text += `Your order cannot be canceled as it has been shipped. For further details please talk to an agent.`
      messageBlock.payload[0].text += `\n\n${specialKeyText(TALK_TO_AGENT_KEY)}`
      messageBlock.payload[0].text += `\n${specialKeyText(ORDER_STATUS_KEY)}`
    }
    messageBlock.payload[0].text += `\n${specialKeyText(SHOW_CART_KEY)}`
    messageBlock.payload[0].text += `\n${specialKeyText(HOME_KEY)}`
    return messageBlock
  } catch (err) {
    const message = err || 'Unable to cancel order'
    logger.serverLog(message, `${TAG}: getCancelOrderBlock`, {}, {chatbot, backId}, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to notify customer support agent`)
  }
}

const getCancelOrderConfirmBlock = async (chatbot, backId, argument) => {
  try {
    const messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_commerce_chatbot'
      },
      title: 'Cancel Order Confirm',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Are you sure you want to cancel the order? `,
          componentType: 'text',
          specialKeys: {
            [BACK_KEY]: { type: STATIC, blockId: backId },
            [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId },
            'y': { type: DYNAMIC, action: CANCEL_ORDER, argument },
            'n': { type: STATIC, blockId: backId },
            'yes': { type: DYNAMIC, action: CANCEL_ORDER, argument },
            'no': { type: STATIC, blockId: backId }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }

    messageBlock.payload[0].text += dedent(`Please select an option from following:\n
    Send 'Y' for Yes
    Send 'N' for No`)

    messageBlock.payload[0].text += `\n\n${specialKeyText(BACK_KEY)}`
    messageBlock.payload[0].text += `\n${specialKeyText(HOME_KEY)}`
    return messageBlock
  } catch (err) {
    const message = err || 'Unable to confirm cancel order'
    logger.serverLog(message, `${TAG}: getCancelOrderConfirmBlock`, {}, {chatbot, backId}, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to notify customer support agent`)
  }
}

const getTalkToAgentBlock = (chatbot, backId, contact) => {
  try {
    const messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_commerce_chatbot'
      },
      title: 'Talk to Agent',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Our support agents have been notified and will get back to you shortly.`,
          componentType: 'text'
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    const message = `${contact.name} requested to talk to a customer support agent`
    sendNotification(contact, message, chatbot.companyId)
    updateWhatsAppContact({ _id: contact._id }, { chatbotPaused: true }, null, {})
    return messageBlock
  } catch (err) {
    const message = err || 'Unable get talk to agent message block'
    logger.serverLog(message, `${TAG}: getTalkToAgentBlock`, {}, {chatbot, backId, contact}, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to notify customer support agent`)
  }
}

function getAbandonedCartReminderPayload (contact, company, abandonedCart, storeInfo) {
  let payload = []
  if (company.whatsApp.provider === 'flockSend') {
    payload = [
      {
        text: `Hi ${contact.name}, the payment for your order of ${abandonedCart.currency} ${abandonedCart.total_price} from ${storeInfo.name} is still pending. Click on the link to complete the payment and confirm your order 👉 ${contact.commerceCustomerShopify.abandonedCartInfo.abandonedCheckoutUrl}.`,
        componentType: 'text',
        templateArguments: `${contact.name},${abandonedCart.currency} ${abandonedCart.total_price},${storeInfo.name},${contact.commerceCustomerShopify.abandonedCartInfo.abandonedCheckoutUrl}`,
        templateName: 'abandoned_cart_reminder'
      }
    ]
  } else {
    payload = [
      {
        text: `Hi ${contact.name}, the payment for your order of ${abandonedCart.currency} ${abandonedCart.total_price} from ${storeInfo.name} is still pending. Click on the link to complete the payment and confirm your order 👉 ${contact.commerceCustomerShopify.abandonedCartInfo.abandonedCheckoutUrl}.`,
        componentType: 'text'
      }
    ]
  }
  return payload
}

exports.getAbandonedCartReminderBlock = async (chatbot, contact, EcommerceProvider, abandonedCart, company) => {
  try {
    const storeInfo = await EcommerceProvider.fetchStoreInfo()
    const messageBlock = {
      module: {
        id: company.whatsApp.activeWhatsappBot,
        type: 'abandoned_cart_reminder'
      },
      title: 'Abandoned Cart Reminder',
      uniqueId: '' + new Date().getTime(),
      payload: getAbandonedCartReminderPayload(contact, company, abandonedCart, storeInfo),
      userId: company.ownerId,
      companyId: company._id
    }
    if (chatbot) {
      messageBlock.payload[0].specialKeys = {
        [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId },
        [ORDER_STATUS_KEY]: { type: DYNAMIC, action: VIEW_RECENT_ORDERS },
        [TALK_TO_AGENT_KEY]: { type: DYNAMIC, action: TALK_TO_AGENT }
      }
    }
    messageBlock.payload[0].text += `\n\n${specialKeyText(TALK_TO_AGENT_KEY)}`
    messageBlock.payload[0].text += `\n${specialKeyText(ORDER_STATUS_KEY)}`
    messageBlock.payload[0].text += `\n${specialKeyText(HOME_KEY)}`

    return messageBlock
  } catch (err) {
    const message = err || 'Unable get talk fetch reminder block'
    return logger.serverLog(message, `${TAG}: getAbandonedCartReminderBlock`, {}, {chatbot, contact}, 'error')
  }
}

const getSearchProductsBlock = async (chatbot, contact) => {
  try {
    const messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_commerce_chatbot'
      },
      title: 'Search Products',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Please enter the name or SKU code of the product you wish to search for:\n`,
          componentType: 'text',
          action: { type: DYNAMIC, action: DISCOVER_PRODUCTS, input: true }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    return messageBlock
  } catch (err) {
    const message = err || 'Unable get search for products message block'
    logger.serverLog(message, `${TAG}: getSearchProductsBlock`, {}, {chatbot, contact}, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable get search for products message block`)
  }
}

const getDiscoverProductsBlock = async (chatbot, backId, EcommerceProvider, input, argument) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_commerce_chatbot'
      },
      title: 'Discover Products',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: ``,
          componentType: 'text',
          menu: [],
          specialKeys: {
            [SHOW_CART_KEY]: { type: DYNAMIC, action: SHOW_MY_CART },
            [BACK_KEY]: { type: STATIC, blockId: backId },
            [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }

    let products = []
    const storeInfo = await EcommerceProvider.fetchStoreInfo()

    if (input) {
      products = await EcommerceProvider.searchProducts(input)

      if (products.length > 0) {
        messageBlock.payload[0].text = `These products were found for "${input}". Please select a product by sending the corresponding number for it or enter another product name or SKU code to search again:\n`
      } else {
        messageBlock.payload[0].text = `No products found that match "${input}".\n\nEnter another product name or SKU code to search again:`
      }

      messageBlock.payload[0].action = { type: DYNAMIC, action: DISCOVER_PRODUCTS, input: true }
    } else {
      products = await EcommerceProvider.fetchProducts(argument.paginationParams, chatbot.numberOfProducts)

      if (products.length > 0) {
        messageBlock.payload[0].text = `Please select a product by sending the corresponding number for it:\n`
      } else {
        messageBlock.payload[0].text = `No products were found using discover.`
      }
    }

    for (let i = 0; i < products.length; i++) {
      let product = products[i]
      messageBlock.payload[0].text += `\n${convertToEmoji(i)} ${product.name}`
      messageBlock.payload[0].menu.push({
        type: DYNAMIC, action: PRODUCT_VARIANTS, argument: {product}
      })
    }

    if (products.nextPageParameters) {
      messageBlock.payload[0].text += `\n${convertToEmoji(products.length)} View More`
      messageBlock.payload[0].menu.push({
        type: DYNAMIC, action: DISCOVER_PRODUCTS, argument: {paginationParams: products.nextPageParameters}
      })
    }

    messageBlock.payload[0].text += `\n\n${specialKeyText(SHOW_CART_KEY)}`
    messageBlock.payload[0].text += `\n${specialKeyText(BACK_KEY)}`
    messageBlock.payload[0].text += `\n${specialKeyText(HOME_KEY)}`

    for (let i = products.length - 1; i >= 0; i--) {
      let product = products[i]
      if (product.image) {
        messageBlock.payload.unshift({
          componentType: 'image',
          fileurl: product.image,
          caption: `${convertToEmoji(i)} ${product.name}\nPrice: ${product.price} ${storeInfo.currency}`
        })
      }
    }

    return messageBlock
  } catch (err) {
    const message = err || 'Unable to discover products'
    logger.serverLog(message, `${TAG}: exports.getDiscoverProductsBlock`, {}, {}, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to discover products`)
  }
}

// const getReturnOrderIdBlock = (chatbot, blockId, messageBlocks) => {
//   messageBlocks.push({
//     module: {
//       id: chatbot._id,
//       type: 'whatsapp_commerce_chatbot'
//     },
//     title: 'Get Return Product ID',
//     uniqueId: blockId,
//     payload: [
//       {
//         text: `Please enter your order id`,
//         componentType: 'text',
//         action: { type: DYNAMIC, action: RETURN_ORDER, input: true }
//       }
//     ],
//     userId: chatbot.userId,
//     companyId: chatbot.companyId
//   })
// }

// const getReturnOrderBlock = async (chatbot, backId, EcommerceProvider, orderId) => {
//   try {
//     let messageBlock = {
//       module: {
//         id: chatbot._id,
//         type: 'whatsapp_commerce_chatbot'
//       },
//       title: 'Return Request',
//       uniqueId: '' + new Date().getTime(),
//       payload: [
//         {
//           text: dedent(`Your return request has been made.\n
//             ${specialKeyText(SHOW_CART_KEY)}
//             ${specialKeyText(BACK_KEY)}
//             ${specialKeyText(HOME_KEY)}`),
//           componentType: 'text',
//           specialKeys: {
//             [SHOW_CART_KEY]: { type: DYNAMIC, action: SHOW_MY_CART },
//             [BACK_KEY]: { type: STATIC, blockId: backId },
//             [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId }
//           }
//         }
//       ],
//       userId: chatbot.userId,
//       companyId: chatbot.companyId
//     }

//     await EcommerceProvider.returnOrder(orderId)

//     return messageBlock
//   } catch (err) {
//     const message = err || 'Unable to return order'
//     logger.serverLog(message, `${TAG}: exports.getReturnOrderBlock`, {}, {}, 'error')
//     throw new Error(`${ERROR_INDICATOR}Unable to return order. Please make sure your order ID is valid.`)
//   }
// }

// const getFaqsBlock = (chatbot, blockId, messageBlocks, backId) => {
//   messageBlocks.push({
//     module: {
//       id: chatbot._id,
//       type: 'whatsapp_commerce_chatbot'
//     },
//     title: 'FAQs',
//     uniqueId: blockId,
//     payload: [
//       {
//         text: dedent(`View our FAQs here: ${chatbot.botLinks.faqs}\n
//                       ${specialKeyText(SHOW_CART_KEY)}
//                       ${specialKeyText(BACK_KEY)}
//                       ${specialKeyText(HOME_KEY)}
//                     `),
//         componentType: 'text',
//         specialKeys: {
//           [SHOW_CART_KEY]: { type: DYNAMIC, action: SHOW_MY_CART },
//           [BACK_KEY]: { type: STATIC, blockId: backId },
//           [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId }
//         }
//       }
//     ],
//     userId: chatbot.userId,
//     companyId: chatbot.companyId
//   })
// }

const getCheckOrdersBlock = (chatbot, contact) => {
  try {
    const messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_commerce_chatbot'
      },
      title: 'Check Orders',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: dedent(`Please select an option by sending the corresponding number for it:\n
                      ${convertToEmoji(0)} View recently placed orders
                      ${convertToEmoji(1)} Check order status for a specific order id\n
                      ${specialKeyText(SHOW_CART_KEY)}
                      ${specialKeyText(HOME_KEY)}`),
          componentType: 'text',
          menu: [
            { type: DYNAMIC, action: VIEW_RECENT_ORDERS },
            { type: DYNAMIC, action: ASK_ORDER_ID }
          ],
          specialKeys: {
            [SHOW_CART_KEY]: { type: DYNAMIC, action: SHOW_MY_CART },
            [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    return messageBlock
  } catch (err) {
    const message = err || 'Unable get check orders message block'
    logger.serverLog(message, `${TAG}: getCheckOrdersBlock`, {}, {chatbot, contact}, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable get check orders message block`)
  }
}

const getShowFaqQuestionsBlock = async (chatbot, contact, backId, argument) => {
  try {
    const messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_commerce_chatbot'
      },
      title: 'FAQ Questions',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: ``,
          componentType: 'text',
          menu: [],
          specialKeys: {
            [TALK_TO_AGENT_KEY]: { type: DYNAMIC, action: TALK_TO_AGENT },
            [BACK_KEY]: { type: DYNAMIC, action: SHOW_FAQS },
            [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    if (chatbot.faqs[argument.topicIndex] && chatbot.faqs[argument.topicIndex].questions) {
      let questionsLength = chatbot.faqs[argument.topicIndex].questions.length
      if (argument.viewMore) {
        let remainingQuestions = questionsLength - argument.questionIndex
        let length = remainingQuestions > 10 ? argument.questionIndex + 9 : questionsLength
        let index = 0
        for (let i = argument.questionIndex; i < length; i++) {
          const question = chatbot.faqs[argument.topicIndex].questions[i].question
          messageBlock.payload[0].text += `${convertToEmoji(index)} ${question}`
          messageBlock.payload[0].menu.push({
            type: DYNAMIC,
            action: GET_FAQ_ANSWER,
            argument: { topicIndex: argument.topicIndex, questionIndex: i }
          })
          if (i < length - 1) {
            messageBlock.payload[0].text += `\n`
          }
          index += 1
        }
        if (remainingQuestions > 10) {
          messageBlock.payload[0].text += `\n${convertToEmoji(length)} View More Questions`
          messageBlock.payload[0].menu.push({
            type: DYNAMIC,
            action: GET_FAQ_ANSWER,
            argument: { topicIndex: argument.topicIndex, questionIndex: length, viewMore: true }
          })
        }
        messageBlock.payload[0].specialKeys[BACK_KEY] = {
          type: DYNAMIC,
          action: SHOW_FAQ_QUESTIONS,
          argument: { topicIndex: argument.topicIndex }
        }
      } else {
        let length = questionsLength <= 10 ? questionsLength : 9
        messageBlock.payload[0].text += `*${chatbot.faqs[argument.topicIndex].topic}*\n\nBelow are our most frequently asked questions. Send the corresponding number for the question to receive the answer.\n\n`
        for (let i = 0; i < length; i++) {
          const question = chatbot.faqs[argument.topicIndex].questions[i].question
          messageBlock.payload[0].text += `${convertToEmoji(i)} ${question}`
          messageBlock.payload[0].menu.push({
            type: DYNAMIC,
            action: GET_FAQ_ANSWER,
            argument: { topicIndex: argument.topicIndex, questionIndex: i }
          })
          if (i < length - 1) {
            messageBlock.payload[0].text += `\n`
          }
        }
        if (questionsLength > 10) {
          messageBlock.payload[0].text += `\n${convertToEmoji(length)} View More Questions`
          messageBlock.payload[0].menu.push({
            type: DYNAMIC,
            action: SHOW_FAQ_QUESTIONS,
            argument: { topicIndex: argument.topicIndex, questionIndex: length, viewMore: true }
          })
        }
      }
    } else {
      messageBlock.payload[0].text += `Please contact our support agents for any questions you have.`
    }

    messageBlock.payload[0].text += `\n\n${specialKeyText(TALK_TO_AGENT_KEY)}`
    messageBlock.payload[0].text += `\n${specialKeyText(BACK_KEY)}`
    messageBlock.payload[0].text += `\n${specialKeyText(HOME_KEY)}`
    return messageBlock
  } catch (err) {
    const message = err || 'Unable to get FAQs'
    logger.serverLog(message, `${TAG}: getShowFaqsBlock`, {}, {chatbot, backId}, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to get FAQs`)
  }
}

const getShowFaqsBlock = async (chatbot, contact, backId) => {
  try {
    const messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_commerce_chatbot'
      },
      title: 'FAQs',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: ``,
          componentType: 'text',
          menu: [],
          specialKeys: {
            [TALK_TO_AGENT_KEY]: { type: DYNAMIC, action: TALK_TO_AGENT },
            [BACK_KEY]: { type: STATIC, blockId: chatbot.startingBlockId },
            [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }

    if (chatbot.faqs && chatbot.faqs.length > 0) {
      messageBlock.payload[0].text += `Select an FAQ topic by sending the corresponding number for it:\n\n`
      for (let i = 0; i < chatbot.faqs.length; i++) {
        const topic = chatbot.faqs[i].topic
        messageBlock.payload[0].text += `${convertToEmoji(i)} ${topic}`
        messageBlock.payload[0].menu.push({
          type: DYNAMIC,
          action: SHOW_FAQ_QUESTIONS,
          argument: { topicIndex: i }
        })
        if (i < chatbot.faqs.length - 1) {
          messageBlock.payload[0].text += `\n`
        }
      }
    } else {
      messageBlock.payload[0].text += `Please contact our support agents for any questions you have.`
    }

    messageBlock.payload[0].text += `\n\n${specialKeyText(TALK_TO_AGENT_KEY)}`
    messageBlock.payload[0].text += `\n${specialKeyText(BACK_KEY)}`
    messageBlock.payload[0].text += `\n${specialKeyText(HOME_KEY)}`
    return messageBlock
  } catch (err) {
    const message = err || 'Unable to get FAQs'
    logger.serverLog(message, `${TAG}: getShowFaqsBlock`, {}, {chatbot, backId}, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to get FAQs`)
  }
}

const getFaqAnswerBlock = async (chatbot, contact, backId, EcommerceProvider, argument) => {
  try {
    const messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_commerce_chatbot'
      },
      title: 'FAQ Answer',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: ``,
          componentType: 'text',
          menu: [],
          specialKeys: {
            [TALK_TO_AGENT_KEY]: { type: DYNAMIC, action: TALK_TO_AGENT },
            [BACK_KEY]: { type: STATIC, blockId: backId },
            [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    const question = chatbot.faqs[argument.topicIndex].questions[argument.questionIndex].question
    let answer = chatbot.faqs[argument.topicIndex].questions[argument.questionIndex].answer
    if (answer.includes('{{storeName}}')) {
      const storeInfo = await EcommerceProvider.fetchStoreInfo()
      answer = answer.replace(/{{storeName}}/g, storeInfo.name)
    }
    messageBlock.payload[0].text += `*${question}*`
    messageBlock.payload[0].text += `\n\n${answer}`

    messageBlock.payload[0].text += `\n\n${specialKeyText(TALK_TO_AGENT_KEY)}`
    messageBlock.payload[0].text += `\n${specialKeyText(BACK_KEY)}`
    messageBlock.payload[0].text += `\n${specialKeyText(HOME_KEY)}`
    return messageBlock
  } catch (err) {
    const message = err || 'Unable to get faq answer'
    logger.serverLog(message, `${TAG}: getFaqAnswerBlock`, {}, {chatbot, backId, argument}, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to get faq answer`)
  }
}

const getRecentOrdersBlock = async (chatbot, backId, contact, EcommerceProvider) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_commerce_chatbot'
      },
      title: 'Recent Orders',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: ``,
          componentType: 'text',
          menu: [],
          action: { type: DYNAMIC, action: ORDER_STATUS, input: true },
          specialKeys: {
            [SHOW_CART_KEY]: { type: DYNAMIC, action: SHOW_MY_CART },
            [BACK_KEY]: { type: STATIC, blockId: backId },
            [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    let recentOrders = []
    // this is workaround to store both bigcommerce and shopify
    // customer information in contacts table so that during
    // demo we can easily switch between commerce providers.
    // Here we are checking which store the chatbot belongs to
    // and getting the customer payload for that store - Sojharo
    let tempCustomerPayload = contact.commerceCustomer
    if (chatbot.storeType === commerceConstants.shopify) {
      tempCustomerPayload = contact.commerceCustomerShopify
    }
    if (tempCustomerPayload) {
      recentOrders = await EcommerceProvider.findCustomerOrders(tempCustomerPayload.id, 9)
      recentOrders = recentOrders.orders
      if (recentOrders.length > 0) {
        messageBlock.payload[0].text = 'Select an order by sending the corresponding number for it or enter an order ID:\n'
        for (let i = 0; i < recentOrders.length; i++) {
          let orderTitle
          if (!recentOrders[i].cancelReason) {
            orderTitle = `\n${convertToEmoji(i)} Order ${recentOrders[i].name} - ${new Date(recentOrders[i].createdAt).toDateString()} (${recentOrders[i].lineItems[0].name})`
          } else {
            orderTitle = `\n${convertToEmoji(i)} (Canceled) Order ${recentOrders[i].name} - ${new Date(recentOrders[i].createdAt).toDateString()} (${recentOrders[i].lineItems[0].name})`
          }
          messageBlock.payload[0].text += utility.truncate(orderTitle, 55)
          messageBlock.payload[0].menu.push({ type: DYNAMIC, action: ORDER_STATUS, argument: recentOrders[i].name.substr(1) })
        }
      } else {
        messageBlock.payload[0].text = 'You have not placed any orders within the last 60 days. If you have an order ID, you can enter that to view its status.'
      }
    } else {
      messageBlock.payload[0].text = 'You have not placed any orders here yet. If you have an order ID, you can enter that to view its status.'
    }

    messageBlock.payload[0].text += `\n\n${specialKeyText(SHOW_CART_KEY)}`
    messageBlock.payload[0].text += `\n${specialKeyText(BACK_KEY)}`
    messageBlock.payload[0].text += `\n${specialKeyText(HOME_KEY)}`

    for (let i = 0; i < recentOrders.length; i++) {
      const lineItem = recentOrders[i].lineItems[0]
      if (lineItem.image) {
        messageBlock.payload.unshift({
          componentType: 'image',
          fileurl: lineItem.image.originalSrc,
          caption: `${lineItem.name}\nQuantity: ${lineItem.quantity}\nOrder number: ${recentOrders[i].name}`
        })
      }
    }

    return messageBlock
  } catch (err) {
    const message = err || 'Unable to get recent orders'
    logger.serverLog(message, `${TAG}: exports.getRecentOrdersBlock`, {}, {}, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to get recent orders.`)
  }
}

const getOrderIdBlock = (chatbot, contact, backId) => {
  try {
    const messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_commerce_chatbot'
      },
      title: 'Get Order ID',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Please enter your order ID`,
          componentType: 'text',
          action: { type: DYNAMIC, action: ORDER_STATUS, input: true },
          specialKeys: {
            [BACK_KEY]: { type: STATIC, blockId: backId },
            [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId },
            'o': { type: DYNAMIC, action: VIEW_RECENT_ORDERS }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    messageBlock.payload[0].text += `\n\n*O*  View Recent Orders`
    messageBlock.payload[0].text += `\n${specialKeyText(BACK_KEY)}`
    messageBlock.payload[0].text += `\n${specialKeyText(HOME_KEY)}`
    return messageBlock
  } catch (err) {
    const message = err || 'Unable get search for products message block'
    logger.serverLog(message, `${TAG}: getSearchProductsBlock`, {}, {chatbot, contact}, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to notify customer support agent`)
  }
}

const getOrderStatusBlock = async (chatbot, backId, EcommerceProvider, orderId) => {
  let userError = false
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_commerce_chatbot'
      },
      title: 'Order Status',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Here is your order status for Order #${orderId}:\n`,
          componentType: 'text',
          specialKeys: {
            [BACK_KEY]: { type: STATIC, blockId: backId },
            [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId },
            'i': { type: DYNAMIC, action: GET_INVOICE, argument: orderId },
            'o': { type: DYNAMIC, action: VIEW_RECENT_ORDERS }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    let orderStatus = await EcommerceProvider.checkOrderStatus(Number(orderId))
    if (!orderStatus) {
      userError = true
      throw new Error('Unable to get order status. Please make sure your order ID is valid and that the order was placed within the last 60 days.')
    }

    let isOrderFulFilled = orderStatus.displayFulfillmentStatus.toLowerCase() === 'fulfilled'
    if (!orderStatus.cancelReason && chatbot.cancelOrder) {
      messageBlock.payload[0].specialKeys['x'] = { type: DYNAMIC, action: CANCEL_ORDER_CONFIRM, argument: { id: orderStatus.id, orderId, isOrderFulFilled } }
    }

    if (orderStatus.cancelReason) {
      messageBlock.payload[0].text += `\n*Status*: CANCELED`
    } else {
      if (orderStatus.tags && orderStatus.tags.includes('cancel-request')) {
        messageBlock.payload[0].text += `\n*Status*: Request Open for Cancelation `
      }
      if (orderStatus.displayFinancialStatus) {
        messageBlock.payload[0].text += `\n*Payment*: ${orderStatus.displayFinancialStatus}`
      }
      if (orderStatus.displayFulfillmentStatus) {
        messageBlock.payload[0].text += `\n*Delivery*: ${orderStatus.displayFulfillmentStatus}`
      }
    }
    if (isOrderFulFilled && orderStatus.fulfillments) {
      if (orderStatus.fulfillments[0]) {
        let trackingDetails = orderStatus.fulfillments[0].trackingInfo && orderStatus.fulfillments[0].trackingInfo[0] ? orderStatus.fulfillments[0].trackingInfo[0] : null
        if (trackingDetails) {
          messageBlock.payload[0].text += `\n\n*Tracking Details*`
          messageBlock.payload[0].text += `\n*Company*: ${trackingDetails.company}`
          messageBlock.payload[0].text += `\n*Number*: ${trackingDetails.number}`
          messageBlock.payload[0].text += `\n*Url*: ${trackingDetails.url && trackingDetails.url !== '' ? trackingDetails.url : utility.getTrackingUrl(trackingDetails)}`
        }
      }
    }
    if (orderStatus.lineItems) {
      for (let i = 0; i < orderStatus.lineItems.length; i++) {
        let product = orderStatus.lineItems[i]
        if (i === 0) {
          messageBlock.payload[0].text += `\n`
        }
        messageBlock.payload[0].text += `\n*Item*: ${product.name}`
        messageBlock.payload[0].text += `\n*Quantity*: ${product.quantity}`
        if (i + 1 < orderStatus.lineItems.length) {
          messageBlock.payload[0].text += `\n`
        }
      }
    }

    if (orderStatus.shippingAddress) {
      messageBlock.payload[0].text += `\n\n*Shipping Address*: ${orderStatus.billingAddress.address1}`
      if (orderStatus.shippingAddress.address2) {
        messageBlock.payload[0].text += `, ${orderStatus.shippingAddress.address2}`
      }
      if (orderStatus.shippingAddress.city) {
        messageBlock.payload[0].text += `, ${orderStatus.shippingAddress.city}`
      }
      if (orderStatus.shippingAddress.province) {
        messageBlock.payload[0].text += `, ${orderStatus.shippingAddress.province}`
      }
      if (orderStatus.shippingAddress.country) {
        messageBlock.payload[0].text += `, ${orderStatus.shippingAddress.country}`
      }
    } else if (orderStatus.billingAddress) {
      messageBlock.payload[0].text += `\n\n*Shipping Address*: ${orderStatus.billingAddress.address1}`
      if (orderStatus.billingAddress.address2) {
        messageBlock.payload[0].text += `, ${orderStatus.billingAddress.address2}`
      }
      if (orderStatus.billingAddress.city) {
        messageBlock.payload[0].text += `, ${orderStatus.billingAddress.city}`
      }
      if (orderStatus.billingAddress.province) {
        messageBlock.payload[0].text += `, ${orderStatus.billingAddress.province}`
      }
      if (orderStatus.billingAddress.country) {
        messageBlock.payload[0].text += `, ${orderStatus.billingAddress.country}`
      }
    }

    messageBlock.payload[0].text += `\n\nThis order was placed on ${new Date(orderStatus.createdAt).toDateString()}`

    messageBlock.payload[0].text += `\n\n*I*   Get PDF Invoice`
    messageBlock.payload[0].text += `\n*O*  View Recent Orders`

    if (!orderStatus.cancelReason &&
      !(orderStatus.displayFinancialStatus && orderStatus.displayFinancialStatus.includes('PAID')) &&
      !(orderStatus.tags && orderStatus.tags.includes('cancel-request')) &&
      chatbot.cancelOrder
    ) {
      messageBlock.payload[0].text += `\n*X*  Cancel Order`
    }
    if (orderStatus.displayFulfillmentStatus &&
      orderStatus.displayFulfillmentStatus === 'FULFILLED' &&
      orderStatus.displayFinancialStatus &&
      orderStatus.displayFinancialStatus.includes('PAID') &&
      !orderStatus.cancelReason &&
      chatbot.returnOrder
    ) {
      messageBlock.payload[0].specialKeys['r'] = { type: DYNAMIC, action: CONFIRM_RETURN_ORDER, argument: orderId }
      messageBlock.payload[0].text += `\n*R*  Request Return`
    }
    messageBlock.payload[0].text += `\n${specialKeyText(BACK_KEY)}`
    messageBlock.payload[0].text += `\n${specialKeyText(HOME_KEY)}`

    for (let i = 0; i < orderStatus.lineItems.length; i++) {
      let product = orderStatus.lineItems[i]
      messageBlock.payload.unshift({
        componentType: 'image',
        fileurl: product.image.originalSrc,
        caption: `${product.name}\nQuantity: ${product.quantity}`
      })
    }
    return messageBlock
  } catch (err) {
    if (!userError) {
      const message = err || 'Unable to get order status'
      logger.serverLog(message, `${TAG}: exports.getOrderStatusBlock`, {}, {}, 'error')
    }
    if (err && err.message) {
      throw new Error(`${ERROR_INDICATOR}${err.message}`)
    } else {
      throw new Error(`${ERROR_INDICATOR}Unable to get order status.`)
    }
  }
}
const getConfirmReturnOrderBlock = async (chatbot, backId, order) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_commerce_chatbot'
      },
      title: 'Confirm Return Request',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Are you sure you want to return this order?\n\n`,
          componentType: 'text',
          specialKeys: {
            [BACK_KEY]: { type: STATIC, blockId: backId },
            [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId },
            'y': { type: DYNAMIC, action: RETURN_ORDER, argument: order },
            'n': { type: DYNAMIC, action: ORDER_STATUS, argument: order },
            'yes': { type: DYNAMIC, action: RETURN_ORDER, argument: order },
            'no': { type: DYNAMIC, action: ORDER_STATUS, argument: order }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    messageBlock.payload[0].text += dedent(`Please select an option from following:\n
                                            Send 'Y' for Yes
                                            Send 'N' for No`)

    messageBlock.payload[0].text += `\n\n${specialKeyText(BACK_KEY)}`
    messageBlock.payload[0].text += `\n${specialKeyText(HOME_KEY)}`

    return messageBlock
  } catch (err) {
    const message = err || 'Unable to get return order'
    logger.serverLog(message, `${TAG}: exports.getConfirmReturnOrderBlock`, {}, {}, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to return order`)
  }
}

const getReturnOrderBlock = async (chatbot, contact, backId, EcommerceProvider, orderId, businessNumber) => {
  try {
    let returnOrderMessage = chatbot.returnOrderMessage.replace(/{{orderId}}/g, orderId)
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_commerce_chatbot'
      },
      title: 'Return Request',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: dedent(`${returnOrderMessage}\n
            ${specialKeyText(BACK_KEY)}
            ${specialKeyText(HOME_KEY)}`),
          componentType: 'text',
          specialKeys: {
            [BACK_KEY]: { type: STATIC, blockId: backId },
            [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    const message = `${contact.name} is requesting a return for order #${orderId}.`
    sendNotification(contact, message, chatbot.companyId)
    return messageBlock
  } catch (err) {
    const message = err || 'Unable to return order'
    logger.serverLog(message, `${TAG}: exports.getReturnOrderBlock`, {}, {}, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to return order. Please make sure your order ID is valid.`)
  }
}

const getProductCategoriesBlock = async (chatbot, backId, EcommerceProvider, argument) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_commerce_chatbot'
      },
      title: 'Product Categories',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Please select a category by sending the corresponding number for it:\n`,
          componentType: 'text',
          menu: [],
          specialKeys: {
            [SHOW_CART_KEY]: { type: DYNAMIC, action: SHOW_MY_CART },
            [BACK_KEY]: { type: STATIC, blockId: backId },
            [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    let productCategories = await EcommerceProvider.fetchAllProductCategories(argument.paginationParams)
    for (let i = 0; i < productCategories.length; i++) {
      let category = productCategories[i]
      messageBlock.payload[0].text += `\n${convertToEmoji(i)} ${category.name}`
      messageBlock.payload[0].menu.push({
        type: DYNAMIC, action: FETCH_PRODUCTS, argument: {categoryId: category.id}
      })
    }
    if (productCategories.nextPageParameters) {
      messageBlock.payload[0].text += `\n${convertToEmoji(productCategories.length)} View More`
      messageBlock.payload[0].menu.push({
        type: DYNAMIC, action: PRODUCT_CATEGORIES, argument: {paginationParams: productCategories.nextPageParameters}
      })
    }
    messageBlock.payload[0].text += `\n\n${specialKeyText(SHOW_CART_KEY)}`
    messageBlock.payload[0].text += `\n${specialKeyText(BACK_KEY)}`
    messageBlock.payload[0].text += `\n${specialKeyText(HOME_KEY)}`
    return messageBlock
  } catch (err) {
    const message = err || 'Unable to get product categories'
    logger.serverLog(message, `${TAG}: exports.getProductCategoriesBlock`, {}, {}, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to get product categories`)
  }
}

const getProductsInCategoryBlock = async (chatbot, backId, EcommerceProvider, argument) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_commerce_chatbot'
      },
      title: 'Products in Category',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Please select a product by sending the corresponding number for it:\n`,
          componentType: 'text',
          menu: [],
          specialKeys: {
            [SHOW_CART_KEY]: { type: DYNAMIC, action: SHOW_MY_CART },
            [BACK_KEY]: { type: STATIC, blockId: backId },
            [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    const storeInfo = await EcommerceProvider.fetchStoreInfo()
    let products = await EcommerceProvider.fetchProductsInThisCategory(argument.categoryId, argument.paginationParams, chatbot.numberOfProducts)
    for (let i = 0; i < products.length; i++) {
      let product = products[i]
      messageBlock.payload[0].text += `\n${convertToEmoji(i)} ${product.name}`
      messageBlock.payload[0].menu.push({
        type: DYNAMIC, action: PRODUCT_VARIANTS, argument: {product}
      })
    }
    if (products.nextPageParameters) {
      messageBlock.payload[0].text += `\n${convertToEmoji(products.length)} View More`
      messageBlock.payload[0].menu.push({
        type: DYNAMIC, action: FETCH_PRODUCTS, argument: {categoryId: argument.categoryId, paginationParams: products.nextPageParameters}
      })
    }
    messageBlock.payload[0].text += `\n\n${specialKeyText(SHOW_CART_KEY)}`
    messageBlock.payload[0].text += `\n${specialKeyText(BACK_KEY)}`
    messageBlock.payload[0].text += `\n${specialKeyText(HOME_KEY)}`
    for (let i = products.length - 1; i >= 0; i--) {
      let product = products[i]
      if (product.image) {
        messageBlock.payload.unshift({
          componentType: 'image',
          fileurl: product.image,
          caption: `${convertToEmoji(i)} ${product.name}\nPrice: ${product.price} ${storeInfo.currency}`
        })
      }
    }
    return messageBlock
  } catch (err) {
    const message = err || 'Unable to get products in category'
    logger.serverLog(message, `${TAG}: exports.getProductsInCategoryBlock`, {}, {}, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to get products in this category`)
  }
}

const getProductVariantsBlock = async (chatbot, backId, contact, EcommerceProvider, argument) => {
  try {
    const product = argument.product
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_commerce_chatbot'
      },
      title: 'Product Variants',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Please select from following *${product.name}* options by sending the corresponding number for it:\n`,
          componentType: 'text',
          menu: [],
          specialKeys: {
            [SHOW_CART_KEY]: { type: DYNAMIC, action: SHOW_MY_CART },
            [BACK_KEY]: { type: STATIC, blockId: backId },
            [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    let productVariants = await EcommerceProvider.getVariantsOfSelectedProduct(product.id, chatbot.numberOfProducts)
    let storeInfo = await EcommerceProvider.fetchStoreInfo()
    if (productVariants.length === 1) {
      const productVariant = productVariants[0]
      messageBlock = await getSelectProductBlock(chatbot, backId, {
        variant_id: productVariant.id,
        product_id: productVariant.product_id,
        product: `${productVariant.name} ${product.name}`,
        price: productVariant.price ? productVariant.price : product.price,
        inventory_quantity: productVariant.inventory_quantity,
        currency: storeInfo.currency,
        image: productVariant.image ? productVariant.image : product.image
      })
      return messageBlock
    }
    for (let i = 0; i < productVariants.length; i++) {
      let productVariant = productVariants[i]
      messageBlock.payload[0].text += `\n${convertToEmoji(i)} ${productVariant.name} (price: ${productVariant.price ? productVariant.price : product.price} ${storeInfo.currency})`
      messageBlock.payload[0].menu.push({
        type: DYNAMIC,
        action: SELECT_PRODUCT,
        argument: {
          variant_id: productVariant.id,
          product_id: productVariant.product_id,
          product: `${productVariant.name} ${product.name}`,
          price: productVariant.price ? productVariant.price : product.price,
          inventory_quantity: productVariant.inventory_quantity,
          currency: storeInfo.currency,
          image: productVariant.image ? productVariant.image : product.image
        }
      })
    }
    if (productVariants.nextPageParameters) {
      messageBlock.payload[0].text += `\n${convertToEmoji(productVariants.length)} View More`
      messageBlock.payload[0].menu.push({
        type: DYNAMIC, action: PRODUCT_CATEGORIES, argument: {product, paginationParams: productVariants.nextPageParameters}
      })
    }
    messageBlock.payload[0].text += `\n\n${specialKeyText(SHOW_CART_KEY)}`
    messageBlock.payload[0].text += `\n${specialKeyText(BACK_KEY)}`
    messageBlock.payload[0].text += `\n${specialKeyText(HOME_KEY)}`
    for (let i = productVariants.length - 1; i >= 0; i--) {
      let productVariant = productVariants[i]
      if (productVariant.image) {
        messageBlock.payload.unshift({
          componentType: 'image',
          fileurl: productVariant.image,
          caption: `${convertToEmoji(i)} ${productVariant.name} ${product.name}\nPrice: ${productVariant.price ? productVariant.price : product.price} ${storeInfo.currency}`
        })
      }
    }
    return messageBlock
  } catch (err) {
    const message = err || 'Unable to get product variants'
    logger.serverLog(message, `${TAG}: exports.getProductVariantsBlock`, {}, {}, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to get product variants`)
  }
}

const getSelectProductBlock = async (chatbot, backId, product) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_commerce_chatbot'
      },
      title: 'Select Product',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Do you want to purchase this product?\n\n${product.product} (price: ${product.price} ${product.currency}) (stock available: ${product.inventory_quantity}).`,
          componentType: 'text',
          specialKeys: {
            [SHOW_CART_KEY]: { type: DYNAMIC, action: SHOW_MY_CART },
            [BACK_KEY]: { type: STATIC, blockId: backId },
            [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId },
            'y': { type: DYNAMIC, action: ADD_TO_CART, argument: {product, quantity: 1} },
            'n': { type: STATIC, blockId: chatbot.startingBlockId },
            'yes': { type: DYNAMIC,
              action: ADD_TO_CART,
              argument: {product, quantity: 1},
              'no': { type: STATIC, blockId: chatbot.startingBlockId }
            }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }

    if (product.inventory_quantity > 0) {
      messageBlock.payload[0].text += `\n\nSend 'Y' for Yes\nSend 'N' for No\n`
    } else {
      messageBlock.payload[0].text += `\nThis product is currently out of stock. Please check again later.\n`
    }

    messageBlock.payload[0].text += `\n${specialKeyText(SHOW_CART_KEY)}\n${specialKeyText(BACK_KEY)}\n${specialKeyText(HOME_KEY)}`

    if (product.image) {
      messageBlock.payload.unshift({
        componentType: 'image',
        fileurl: product.image,
        caption: `${product.product}\nPrice: ${product.price} ${product.currency}`
      })
    }

    return messageBlock
  } catch (err) {
    const message = err || 'Unable to select product'
    logger.serverLog(message, `${TAG}: exports.getSelectProductBlock`, {}, {}, 'error')
    logger.serverLog(TAG, `Unable to select product ${err}`, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to select product`)
  }
}

// const getQuantityToAddBlock = async (chatbot, backId, contact, product) => {
//   try {
//     let messageBlock = {
//       module: {
//         id: chatbot._id,
//         type: 'whatsapp_commerce_chatbot'
//       },
//       title: 'Quantity to Add',
//       uniqueId: '' + new Date().getTime(),
//       payload: [
//         {
//           text: `How many ${product.product}s (price: ${product.price} ${product.currency}) would you like to add to your cart?\n\n(stock available: ${product.inventory_quantity})`,
//           componentType: 'text',
//           action: { type: DYNAMIC, action: ADD_TO_CART, argument: product, input: true },
//           specialKeys: {
//             [BACK_KEY]: { type: STATIC, blockId: backId },
//             [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId },
//             [SHOW_CART_KEY]: { type: DYNAMIC, action: SHOW_MY_CART }
//           }
//         }
//       ],
//       userId: chatbot.userId,
//       companyId: chatbot.companyId
//     }

//     messageBlock.payload[0].text += `\n\n${specialKeyText(BACK_KEY)}`
//     messageBlock.payload[0].text += `\n${specialKeyText(HOME_KEY)}`
//     messageBlock.payload[0].text += `\n${specialKeyText(SHOW_CART_KEY)} `

//     let shoppingCart = contact.shoppingCart ? contact.shoppingCart : []
//     let existingProductIndex = shoppingCart.findIndex((item) => item.variant_id === product.variant_id)

//     if (existingProductIndex > -1) {
//       if (shoppingCart[existingProductIndex].quantity >= product.inventory_quantity) {
//         let text = `Your cart already contains the maximum stock available for this product.`
//         return getShowMyCartBlock(chatbot, backId, contact, text)
//       }
//     }
//     if (product.image) {
//       messageBlock.payload.unshift({
//         componentType: 'image',
//         fileurl: product.image,
//         caption: `${product.product}\nPrice: ${product.price} ${product.currency}`
//       })
//     }
//     return messageBlock
//   } catch (err) {
//     const message = err || 'Unable to add product(s) to cart'
//     logger.serverLog(message, `${TAG}: exports.getQuantityToAddBlock`, {}, {}, 'error')
//     throw new Error(`${ERROR_INDICATOR}Unable to add product(s) to cart`)
//   }
// }

const getAddToCartBlock = async (chatbot, backId, contact, {product, quantity}) => {
  let userError = false
  try {
    quantity = Number(quantity)
    if (!Number.isInteger(quantity) || quantity < 0) {
      userError = true
      throw new Error(`${ERROR_INDICATOR}Invalid quantity given.`)
    }
    let shoppingCart = contact.shoppingCart ? contact.shoppingCart : []
    let existingProductIndex = shoppingCart.findIndex((item) => item.variant_id === product.variant_id)
    if (existingProductIndex > -1) {
      let previousQuantity = shoppingCart[existingProductIndex].quantity
      if ((previousQuantity + quantity) > product.inventory_quantity) {
        userError = true
        throw new Error(`${ERROR_INDICATOR}You can not add any more of this product. Your cart already contains ${previousQuantity}, which is the maximum stock currently available.`)
      }
      shoppingCart[existingProductIndex].quantity += quantity
    } else {
      if (quantity > product.inventory_quantity) {
        userError = true
        throw new Error(`${ERROR_INDICATOR}Your requested quantity exceeds the stock available (${product.inventory_quantity}). Please enter a quantity less than ${product.inventory_quantity}.`)
      }
      if (quantity > 0) {
        shoppingCart.push({
          variant_id: product.variant_id,
          product_id: product.product_id,
          quantity,
          product: product.product,
          inventory_quantity: product.inventory_quantity,
          price: Number(product.price),
          currency: product.currency,
          image: product.image
        })
      }
    }
    if (contact.commerceCustomer) {
      contact.commerceCustomer.cartId = null
    }
    updateWhatsAppContact({ _id: contact._id }, { shoppingCart, commerceCustomer: contact.commerceCustomer }, null, {})
    let text = `${quantity} ${product.product}${quantity !== 1 ? 's have' : ' has'} been successfully added to your cart.`
    return getShowMyCartBlock(chatbot, backId, contact, text)
  } catch (err) {
    if (!userError) {
      const message = err || 'Unable to add to cart'
      logger.serverLog(message, `${TAG}: exports.getAddToCartBlock`, chatbot, {}, 'error')
    }
    if (err.message) {
      throw new Error(`${ERROR_INDICATOR}${err.message}`)
    } else {
      throw new Error(`${ERROR_INDICATOR}Unable to add to cart`)
    }
  }
}

const getShowMyCartBlock = async (chatbot, backId, contact, optionalText) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_commerce_chatbot'
      },
      title: 'Show My Cart',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: optionalText ? `${optionalText}\n\n` : '',
          componentType: 'text',
          menu: [],
          specialKeys: {
            [BACK_KEY]: { type: STATIC, blockId: backId },
            [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }

    let shoppingCart = contact.shoppingCart
    if (!shoppingCart || shoppingCart.length === 0) {
      messageBlock.payload[0].text += `You have no items in your cart`
    } else {
      messageBlock.payload[0].text += `Here is your cart:\n`
      let totalPrice = 0
      let currency = ''
      for (let i = 0; i < shoppingCart.length; i++) {
        let product = shoppingCart[i]

        currency = product.currency

        let price = product.quantity * product.price
        price = Number(price.toFixed(2))
        totalPrice += price

        messageBlock.payload[0].text += `\n*Item*: ${product.product}`
        messageBlock.payload[0].text += `\n*Quantity*: ${product.quantity}`
        messageBlock.payload[0].text += `\n*Price*: ${price} ${currency}`

        if (i + 1 < shoppingCart.length) {
          messageBlock.payload[0].text += `\n`
        }
      }
      messageBlock.payload[0].text += `\n\n*Total price*: ${totalPrice} ${currency}\n\n`
      messageBlock.payload[0].menu.push(
        { type: DYNAMIC, action: SHOW_ITEMS_TO_REMOVE },
        { type: DYNAMIC, action: SHOW_ITEMS_TO_UPDATE },
        { type: DYNAMIC, action: CONFIRM_CLEAR_CART })
      messageBlock.payload[0].text += dedent(`Please select an option by sending the corresponding number for it:\n
                                            ${convertToEmoji(0)} Remove an item
                                            ${convertToEmoji(1)} Update quantity for an item
                                            ${convertToEmoji(2)} Clear cart`)
    }

    if (chatbot.enabledFeatures.commerceBotFeatures.preSales.createOrder) {
      messageBlock.payload[0].text += `\n${convertToEmoji(3)} Proceed to Checkout`
      messageBlock.payload[0].menu.push(
        { type: DYNAMIC, action: ASK_PAYMENT_METHOD }
      )
    }
    messageBlock.payload[0].text += `\n\n${specialKeyText(BACK_KEY)}`
    messageBlock.payload[0].text += `\n${specialKeyText(HOME_KEY)}`

    // adding images of cart items to message
    for (let i = 0; i < shoppingCart.length; i++) {
      let product = shoppingCart[i]
      if (product.image) {
        let currency = product.currency
        let price = product.quantity * product.price
        price = Number(price.toFixed(2))
        messageBlock.payload.unshift({
          componentType: 'image',
          fileurl: product.image,
          caption: `${product.product}\nQuantity: ${product.quantity}\nPrice: ${price} ${currency}`
        })
      }
    }
    return messageBlock
  } catch (err) {
    const message = err || 'Unable to show cart'
    logger.serverLog(message, `${TAG}: exports.getShowMyCartBlock`, {}, {}, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to show cart`)
  }
}

const getRemoveFromCartBlock = async (chatbot, backId, contact, productInfo) => {
  const shoppingCart = contact.shoppingCart.filter((item, index) => index !== productInfo.productIndex)
  contact.shoppingCart = shoppingCart
  if (contact.commerceCustomer) {
    contact.commerceCustomer.cartId = null
  }
  await updateWhatsAppContact({ _id: contact._id }, { shoppingCart, commerceCustomer: contact.commerceCustomer }, null, {})
  const text = `${productInfo.product} has been successfully removed from your cart.`
  return getShowMyCartBlock(chatbot, backId, contact, text)
}

const getConfirmRemoveItemBlock = async (chatbot, backId, product) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_commerce_chatbot'
      },
      title: 'Quantity to Remove',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Are you sure you want to remove ${product.product}?\n\nYou currently have ${product.quantity} in your cart.\n\n(price: ${product.price} ${product.currency})\n\n`,
          componentType: 'text',
          specialKeys: {
            [BACK_KEY]: { type: STATIC, blockId: backId },
            [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId },
            'y': { type: DYNAMIC, action: REMOVE_FROM_CART, argument: product },
            'n': { type: DYNAMIC, action: SHOW_ITEMS_TO_REMOVE },
            'yes': { type: DYNAMIC, action: REMOVE_FROM_CART, argument: product },
            'no': { type: DYNAMIC, action: SHOW_ITEMS_TO_REMOVE }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    messageBlock.payload[0].text += dedent(`Please select an option from following:\n
                                            Send 'Y' for Yes
                                            Send 'N' for No`)

    messageBlock.payload[0].text += `\n\n${specialKeyText(BACK_KEY)}`
    messageBlock.payload[0].text += `\n${specialKeyText(HOME_KEY)}`

    if (product.image) {
      messageBlock.payload.unshift({
        componentType: 'image',
        fileurl: product.image,
        caption: `${product.product}\nPrice: ${product.price} ${product.currency}\nQuantity: ${product.quantity}`
      })
    }
    return messageBlock
  } catch (err) {
    const message = err || 'Unable to remove product(s) from cart'
    logger.serverLog(message, `${TAG}: exports.getConfirmRemoveItemBlock`, {}, {}, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to remove product(s) from cart`)
  }
}

const getShowItemsToRemoveBlock = (chatbot, backId, contact) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_commerce_chatbot'
      },
      title: 'Select Item to Remove',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Please select an item to remove from your cart: \n`,
          componentType: 'text',
          menu: [],
          specialKeys: {
            [SHOW_CART_KEY]: { type: DYNAMIC, action: SHOW_MY_CART },
            [BACK_KEY]: { type: STATIC, blockId: backId },
            [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }

    let shoppingCart = contact.shoppingCart
    for (let i = 0; i < shoppingCart.length; i++) {
      let product = shoppingCart[i]
      messageBlock.payload[0].text += `\n${convertToEmoji(i)} ${product.product} `
      messageBlock.payload[0].menu.push({ type: DYNAMIC, action: CONFIRM_TO_REMOVE_CART_ITEM, argument: { ...product, productIndex: i } })
    }
    messageBlock.payload[0].text += `\n\n${specialKeyText(SHOW_CART_KEY)} `
    messageBlock.payload[0].text += `\n${specialKeyText(BACK_KEY)} `
    messageBlock.payload[0].text += `\n${specialKeyText(HOME_KEY)} `
    for (let i = shoppingCart.length - 1; i >= 0; i--) {
      let product = shoppingCart[i]
      if (product.image) {
        messageBlock.payload.unshift({
          componentType: 'image',
          fileurl: product.image,
          caption: `${convertToEmoji(i)} ${product.product}\nPrice: ${product.price} ${product.currency}`
        })
      }
    }
    return messageBlock
  } catch (err) {
    const message = err || 'Unable to show items from cart'
    logger.serverLog(message, `${TAG}: exports.getShowItemsToRemoveBlock`, {}, {}, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to show items from cart`)
  }
}

const getQuantityToUpdateBlock = async (chatbot, backId, product) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_commerce_chatbot'
      },
      title: 'Quantity to Update',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `What quantity would you like to set for ${product.product}?\n\nYou currently have ${product.quantity} in your cart.\n\n(price: ${product.price} ${product.currency}) (stock available: ${product.inventory_quantity})`,
          componentType: 'text',
          action: { type: DYNAMIC, action: UPDATE_CART, argument: product, input: true },
          specialKeys: {
            [BACK_KEY]: { type: STATIC, blockId: backId },
            [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId },
            'p': { type: DYNAMIC, action: ASK_PAYMENT_METHOD }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }

    messageBlock.payload[0].text += `\n\n${specialKeyText(BACK_KEY)}`
    messageBlock.payload[0].text += `\n${specialKeyText(HOME_KEY)}`
    messageBlock.payload[0].text += `\n*P*  Proceed to Checkout`

    if (product.image) {
      messageBlock.payload.unshift({
        componentType: 'image',
        fileurl: product.image,
        caption: `${product.product}\nQuantity: ${product.quantity}\nPrice: ${product.price} ${product.currency}`
      })
    }

    return messageBlock
  } catch (err) {
    const message = err || 'Unable to update product(s) in cart'
    logger.serverLog(message, `${TAG}: exports.getQuantityToUpdateBlock`, {}, {}, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to update product(s) in cart`)
  }
}

const getShowItemsToUpdateBlock = (chatbot, backId, contact) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_commerce_chatbot'
      },
      title: 'Select Item to Remove',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Please select an item in your cart for which you want to update the quantity: \n`,
          componentType: 'text',
          menu: [],
          specialKeys: {
            [SHOW_CART_KEY]: { type: DYNAMIC, action: SHOW_MY_CART },
            [BACK_KEY]: { type: STATIC, blockId: backId },
            [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }

    let shoppingCart = contact.shoppingCart

    if (shoppingCart.length === 1) {
      let product = shoppingCart[0]
      return getQuantityToUpdateBlock(chatbot, backId, { ...product, productIndex: 0 })
    }

    for (let i = 0; i < shoppingCart.length; i++) {
      let product = shoppingCart[i]

      messageBlock.payload[0].text += `\n${convertToEmoji(i)} ${product.product} `

      messageBlock.payload[0].menu.push({ type: DYNAMIC, action: QUANTITY_TO_UPDATE, argument: { ...product, productIndex: i } })
    }

    messageBlock.payload[0].text += `\n\n${specialKeyText(SHOW_CART_KEY)} `
    messageBlock.payload[0].text += `\n${specialKeyText(BACK_KEY)} `
    messageBlock.payload[0].text += `\n${specialKeyText(HOME_KEY)} `

    for (let i = shoppingCart.length - 1; i >= 0; i--) {
      let product = shoppingCart[i]
      if (product.image) {
        messageBlock.payload.unshift({
          componentType: 'image',
          fileurl: product.image,
          caption: `${convertToEmoji(i)} ${product.product}\nPrice: ${product.price} ${product.currency}`
        })
      }
    }
    return messageBlock
  } catch (err) {
    const message = err || 'Unable to show items from cart'
    logger.serverLog(message, `${TAG}: exports.getShowItemsToUpdateBlock`, {}, {}, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to show items from cart`)
  }
}

const getUpdateCartBlock = async (chatbot, backId, contact, product, quantity) => {
  let userError = false
  try {
    quantity = Number(quantity)
    if (!Number.isInteger(quantity) || quantity < 0) {
      userError = true
      throw new Error(`${ERROR_INDICATOR}Invalid quantity given.`)
    }
    if (quantity > product.inventory_quantity) {
      userError = true
      throw new Error(`${ERROR_INDICATOR}Your requested quantity exceeds the stock available (${product.inventory_quantity}). Please enter a quantity less than ${product.inventory_quantity}.`)
    }
    let shoppingCart = contact.shoppingCart ? contact.shoppingCart : []
    let existingProductIndex = shoppingCart.findIndex((item) => item.variant_id === product.variant_id)
    if (existingProductIndex > -1) {
      if (quantity === 0) {
        shoppingCart.splice(existingProductIndex, 1)
      } else {
        shoppingCart[existingProductIndex].quantity = quantity
      }
    } else if (quantity > 0) {
      shoppingCart.push({
        variant_id: product.variant_id,
        product_id: product.product_id,
        quantity,
        product: product.product,
        inventory_quantity: product.inventory_quantity,
        price: Number(product.price),
        currency: product.currency,
        image: product.image
      })
    }
    if (contact.commerceCustomer) {
      contact.commerceCustomer.cartId = null
    }
    updateWhatsAppContact({ _id: contact._id }, { shoppingCart, commerceCustomer: contact.commerceCustomer }, null, {})
    let text = `${product.product} quantity has been updated to ${quantity}.`
    if (quantity === 0) {
      text = `${product.product} has been removed from cart.`
    }
    return getShowMyCartBlock(chatbot, backId, contact, text)
  } catch (err) {
    if (!userError) {
      const message = err || 'Unable to update cart'
      logger.serverLog(message, `${TAG}: exports.getUpdateCartBlock`, chatbot, {}, 'error')
    } if (err.message) {
      throw new Error(`${ERROR_INDICATOR}${err.message}`)
    } else {
      throw new Error(`${ERROR_INDICATOR}Unable to update cart`)
    }
  }
}

const confirmClearCart = (chatbot, contact) => {
  let messageBlock = {
    module: {
      id: chatbot._id,
      type: 'whatsapp_commerce_chatbot'
    },
    title: 'Are you sure you want empty your cart?',
    uniqueId: '' + new Date().getTime(),
    payload: [
      {
        text: dedent(`Are you sure you want to empty your cart? Please select an option by sending the corresponding number for it:\n
                                            Send 'Y' for Yes
                                            Send 'N' for No`),
        componentType: 'text',
        menu: [],
        specialKeys: {
          [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId },
          'y': { type: DYNAMIC, action: CLEAR_CART },
          'n': { type: DYNAMIC, action: SHOW_MY_CART },
          'yes': { type: DYNAMIC, action: CLEAR_CART },
          'no': { type: DYNAMIC, action: SHOW_MY_CART }

        }
      }
    ],
    userId: chatbot.userId,
    companyId: chatbot.companyId
  }

  messageBlock.payload[0].text += `\n\n${specialKeyText(HOME_KEY)}`
  return messageBlock
}

const clearCart = async (chatbot, contact) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_commerce_chatbot'
      },
      title: 'Your cart has been successfully cleared',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: dedent(`Your cart is now empty.\n
  ${specialKeyText(HOME_KEY)} `),
          componentType: 'text',
          specialKeys: {
            [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    let shoppingCart = []
    if (contact.commerceCustomer) {
      contact.commerceCustomer.cartId = null
    }
    updateWhatsAppContact({ _id: contact._id }, { shoppingCart, commerceCustomer: contact.commerceCustomer }, null, {})
    return messageBlock
  } catch (err) {
    const message = err || 'Unable to clear cart'
    logger.serverLog(message, `${TAG}: exports.clearCart`, {}, {}, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to clear cart`)
  }
}

function updateWhatsAppContact (query, bodyForUpdate, bodyForIncrement, options) {
  callApi(`whatsAppContacts/update`, 'put', { query: query, newPayload: { ...bodyForIncrement, ...bodyForUpdate }, options: options })
    .then(updated => {
    })
    .catch(error => {
      const message = error || 'Failed to update contact'
      logger.serverLog(message, `${TAG}: exports.updateWhatsAppContact`, {}, {}, 'error')
    })
}

const getCheckoutInfoBlock = async (chatbot, contact, EcommerceProvider, backId, argument, userInput) => {
  let userError = false
  try {
    let messageBlock = null
    if (userInput && argument.updatingZip) {
      argument.address.zip = userInput
    }

    // this is workaround to store both bigcommerce and shopify
    // customer information in contacts table so that during
    // demo we can easily switch between commerce providers.
    // Here we are checking which store the chatbot belongs to
    // and getting the customer payload for that store - Sojharo
    let tempCustomerPayload = contact.commerceCustomer
    if (chatbot.storeType === commerceConstants.shopify) {
      tempCustomerPayload = contact.commerceCustomerShopify
    }
    const address = argument.address ? argument.address : tempCustomerPayload ? tempCustomerPayload.defaultAddress : null
    let yesAction = null
    if (address && argument.paymentMethod === 'cod') {
      yesAction = { type: DYNAMIC, action: PROCEED_TO_CHECKOUT, argument: {...argument, address} }
    } else if (!address && argument.paymentMethod === 'cod') {
      yesAction = { type: DYNAMIC, action: ASK_ADDRESS, argument: {...argument} }
    } else {
      yesAction = { type: DYNAMIC, action: PROCEED_TO_CHECKOUT, argument: {...argument} }
    }
    if (userInput || argument.updatingZip || argument.updatingAddress || (!argument.newEmail && tempCustomerPayload && tempCustomerPayload.email)) {
      if (argument.updatingZip) {
        argument.updatingZip = false
      }
      if (argument.updatingAddress) {
        argument.updatingAddress = false
      }
      if (!contact.emailVerified) {
        return getEmailOtpBlock(chatbot, contact, EcommerceProvider, backId, {...argument, newEmail: true}, argument.newEmail ? argument.newEmail : tempCustomerPayload.email)
      }
      messageBlock = {
        module: {
          id: chatbot._id,
          type: 'messenger_commerce_chatbot'
        },
        title: 'Checkout Info',
        uniqueId: '' + new Date().getTime(),
        payload: [
          {
            text: ``,
            componentType: 'text',
            menu: [
              yesAction
            ],
            specialKeys: {
              [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId },
              [BACK_KEY]: { type: STATIC, blockId: backId }
            }
          }
        ],
        userId: chatbot.userId,
        companyId: chatbot.companyId
      }
      messageBlock.payload[0].text += `Would you like to use the current information for checkout?`
      messageBlock.payload[0].text += `\n\nEmail: ${argument.newEmail ? argument.newEmail : tempCustomerPayload.email}`

      if (address && argument.paymentMethod === 'cod') {
        messageBlock.payload[0].text += `\n\nAddress: ${address.address1}, ${address.city} ${address.zip}, ${address.country}`
        messageBlock.payload[0].menu.push(
          { type: DYNAMIC, action: UPDATE_ADDRESS_BLOCK, argument: {...argument, address} }
        )
      }
      messageBlock.payload[0].text += `\n\n${convertToEmoji(0)} Yes, Proceed to checkout`
      // messageBlock.payload[0].text += `\n${convertToEmoji(1)} No, update email`
      if (address && argument.paymentMethod === 'cod') {
        messageBlock.payload[0].text += `\n${convertToEmoji(1)} No, update address`
      }
    } else {
      messageBlock = {
        module: {
          id: chatbot._id,
          type: 'messenger_commerce_chatbot'
        },
        title: 'Checkout Email',
        uniqueId: '' + new Date().getTime(),
        payload: [
          {
            text: `Please enter your email: `,
            componentType: 'text',
            action: {
              type: DYNAMIC,
              action: GET_EMAIL_OTP,
              argument: {...argument, newEmail: true},
              input: true
            },
            specialKeys: {
              [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId },
              [BACK_KEY]: { type: STATIC, blockId: backId }
            }
          }
        ],
        userId: chatbot.userId,
        companyId: chatbot.companyId
      }
    }
    messageBlock.payload[0].text += `\n\n${specialKeyText(BACK_KEY)}`
    messageBlock.payload[0].text += `\n${specialKeyText(HOME_KEY)}`
    return messageBlock
  } catch (err) {
    if (!userError) {
      const message = err || 'Unable to checkout'
      logger.serverLog(message, `${TAG}: exports.getCheckoutEmailBlock`, {}, {}, 'error')
      throw new Error(`${ERROR_INDICATOR}Unable to show checkout`)
    } else {
      throw new Error(`${ERROR_INDICATOR}${err.message}`)
    }
  }
}

const getEmailOtpBlock = async (chatbot, contact, EcommerceProvider, backId, argument, userInput) => {
  let userError = false
  try {
    let messageBlock = null
    let newEmailInput = userInput && argument.newEmail
    if (newEmailInput) {
      const emailRegex = /\S+@\S+\.\S+/
      if (!emailRegex.test(userInput)) {
        userError = true
        throw new Error('Invalid Email. Please input a valid email address.')
      }
      const storeInfo = await EcommerceProvider.fetchStoreInfo()
      // generating the OTP
      callApi(`email_verification_otps/`, 'post', {
        companyId: contact.companyId,
        platform: 'whatsapp',
        commercePlatform: 'shopify',
        phone: contact.number,
        emailAddress: userInput,
        storeName: storeInfo.name
      })
        .then(created => {
          logger.serverLog('otp created and sent', `${TAG}: exports.getEmailOtpBlock`, { created }, {}, 'info')
        })
        .catch(error => {
          const message = error || 'Failed to create otp for customer'
          logger.serverLog(message, `${TAG}: exports.getEmailOtpBlock`, {}, {}, 'error')
        })
      argument.newEmail = userInput
    }
    messageBlock = {
      module: {
        id: chatbot._id,
        type: 'messenger_commerce_chatbot'
      },
      title: 'Checkout Email OTP',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `In order to verify your email address, please enter the OTP which is sent to your email address: `,
          componentType: 'text',
          action: {
            type: DYNAMIC,
            action: GET_VERIFY_OTP,
            argument: {...argument},
            input: true
          },
          specialKeys: {
            [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId },
            [BACK_KEY]: { type: STATIC, blockId: backId }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    messageBlock.payload[0].text += `\n\n${specialKeyText(BACK_KEY)}`
    messageBlock.payload[0].text += `\n${specialKeyText(HOME_KEY)}`
    return messageBlock
  } catch (err) {
    if (!userError) {
      const message = err || 'Unable to input otp for email verification'
      logger.serverLog(message, `${TAG}: exports.getEmailOtpBlock`, {contact}, {}, 'error')
      throw new Error(`${ERROR_INDICATOR}Unable to input otp for email verification`)
    } else {
      throw new Error(`${ERROR_INDICATOR}${err.message}`)
    }
  }
}

const getVerifyOtpBlock = async (chatbot, contact, backId, argument, userInput) => {
  let userError = false
  try {
    let messageBlock = null
    let otpInput = userInput
    if (otpInput) {
      let otpRecord = await callApi('email_verification_otps/verify', 'post', {
        companyId: contact.companyId,
        platform: 'whatsapp',
        commercePlatform: 'shopify',
        phone: contact.number,
        emailAddress: argument.newEmail,
        otp: otpInput
      })
      if (otpRecord !== 'otp matched') {
        userError = true
        throw new Error('OTP is invalid or expired.')
      }
      updateWhatsAppContact({ _id: contact._id }, {emailVerified: true}, null, {})
    }
    messageBlock = {
      module: {
        id: chatbot._id,
        type: 'messenger_commerce_chatbot'
      },
      title: 'Verify Email OTP',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Email address is verified successfully`,
          componentType: 'text',
          menu: [
            {
              type: DYNAMIC,
              action: argument.address || argument.paymentMethod !== 'cod' ? GET_CHECKOUT_INFO : ASK_ADDRESS,
              argument: { ...argument }
            }
          ],
          specialKeys: {
            [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId },
            [BACK_KEY]: { type: STATIC, blockId: backId }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    messageBlock.payload[0].text += `\n\n${convertToEmoji(0)} Proceed to checkout`
    messageBlock.payload[0].text += `\n\n${specialKeyText(BACK_KEY)}`
    messageBlock.payload[0].text += `\n${specialKeyText(HOME_KEY)}`
    return messageBlock
  } catch (err) {
    if (!userError) {
      const message = err || 'Unable to verify otp for email verification'
      logger.serverLog(message, `${TAG}: exports.getVerifyOtpBlock`, {contact}, {}, 'info')
      throw new Error(`${ERROR_INDICATOR}Unable to verify otp for email verification`)
    } else {
      throw new Error(`${ERROR_INDICATOR}${err.message}`)
    }
  }
}

// NOTE: We are not using it. We won't allow customers to
// change email address to avoid data conflicts
const getCheckoutEmailBlock = async (chatbot, contact, newEmail) => {
  try {
    let messageBlock = null

    // this is workaround to store both bigcommerce and shopify
    // customer information in contacts table so that during
    // demo we can easily switch between commerce providers.
    // Here we are checking which store the chatbot belongs to
    // and getting the customer payload for that store - Sojharo
    let tempCustomerPayload = contact.commerceCustomer
    if (chatbot.storeType === commerceConstants.shopify) {
      tempCustomerPayload = contact.commerceCustomerShopify
    }

    if (!newEmail && tempCustomerPayload && tempCustomerPayload.email) {
      messageBlock = {
        module: {
          id: chatbot._id,
          type: 'whatsapp_commerce_chatbot'
        },
        title: 'Checkout Email',
        uniqueId: '' + new Date().getTime(),
        payload: [
          {
            text: dedent(`Would you like to use ${tempCustomerPayload.email} as your email?\n
                        Send 'Y' for Yes
                        Send 'N' for No`),
            componentType: 'text',
            specialKeys: {
              'y': { type: DYNAMIC, action: ASK_PAYMENT_METHOD },
              'n': { type: DYNAMIC, action: GET_CHECKOUT_EMAIL, argument: true }
            }
          }
        ],
        userId: chatbot.userId,
        companyId: chatbot.companyId
      }
    } else {
      messageBlock = {
        module: {
          id: chatbot._id,
          type: 'whatsapp_commerce_chatbot'
        },
        title: 'Checkout Email',
        uniqueId: '' + new Date().getTime(),
        payload: [
          {
            text: `Please enter your email: `,
            componentType: 'text',
            action: { type: DYNAMIC, action: ASK_PAYMENT_METHOD, input: true }
          }
        ],
        userId: chatbot.userId,
        companyId: chatbot.companyId
      }
    }
    return messageBlock
  } catch (err) {
    const message = err || 'Unable to checkout'
    logger.serverLog(message, `${TAG}: exports.getCheckoutEmailBlock`, {}, {}, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to show checkout`)
  }
}

const getAskPaymentMethodBlock = async (chatbot, backId, contact, newEmail) => {
  let userError = false
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_commerce_chatbot'
      },
      title: 'Ask Payment Method',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: dedent(`Please select a payment method:\n
                        ${convertToEmoji(0)} Cash on Delivery
                        ${convertToEmoji(1)} Electronic Payment\n
                        ${specialKeyText(SHOW_CART_KEY)}
                        ${specialKeyText(HOME_KEY)}`),
          componentType: 'text',
          menu: [
            { type: DYNAMIC, action: GET_CHECKOUT_INFO, argument: {paymentMethod: 'cod'} },
            { type: DYNAMIC, action: GET_CHECKOUT_INFO, argument: {paymentMethod: 'e-payment'} }
          ],
          specialKeys: {
            [SHOW_CART_KEY]: { type: DYNAMIC, action: SHOW_MY_CART },
            [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }

    if (newEmail) {
      const emailRegex = /\S+@\S+\.\S+/
      if (!emailRegex.test(newEmail)) {
        userError = true
        throw new Error('Invalid Email. Please input a valid email address.')
      }
    }

    return messageBlock
  } catch (err) {
    if (!userError) {
      const message = err || 'Unable to checkout'
      logger.serverLog(message, `${TAG}: askPaymentMethod`, {}, {contact, newEmail}, 'error')
    }
    if (userError && err.message) {
      throw new Error(`${ERROR_INDICATOR}${err.message}`)
    } else {
      throw new Error(`${ERROR_INDICATOR}Unable to select payment method`)
    }
  }
}

const getAskAddressBlock = async (chatbot, contact, argument, userInput) => {
  let userError = false
  try {
    let messageBlock = null
    if (userInput) {
      const emailRegex = /\S+@\S+\.\S+/
      if (!emailRegex.test(userInput)) {
        userError = true
        throw new Error('Invalid Email. Please input a valid email address.')
      }
      argument.newEmail = userInput
    }
    // this is workaround to store both bigcommerce and shopify
    // customer information in contacts table so that during
    // demo we can easily switch between commerce providers.
    // Here we are checking which store the chatbot belongs to
    // and getting the customer payload for that store - Sojharo
    let tempCustomerPayload = contact.commerceCustomer
    if (chatbot.storeType === commerceConstants.shopify) {
      tempCustomerPayload = contact.commerceCustomerShopify
    }

    if (tempCustomerPayload &&
        tempCustomerPayload.defaultAddress &&
        tempCustomerPayload.defaultAddress.address1 &&
        tempCustomerPayload.defaultAddress.city &&
        tempCustomerPayload.defaultAddress.country &&
        tempCustomerPayload.defaultAddress.zip
    ) {
      messageBlock = {
        module: {
          id: chatbot._id,
          type: 'whatsapp_commerce_chatbot'
        },
        title: 'Ask Address',
        uniqueId: '' + new Date().getTime(),
        payload: [
          {
            text: dedent(`Would you like to use your existing address as your shipping address?\n
                        Send 'Y' for Yes
                        Send 'N' for No`),
            componentType: 'text',
            specialKeys: {
              'y': { type: DYNAMIC, action: PROCEED_TO_CHECKOUT, argument: { ...argument, address: tempCustomerPayload.defaultAddress } },
              'n': { type: DYNAMIC, action: GET_CHECKOUT_STREET_ADDRESS, argument: { ...argument, address: {address1: ''} } },
              'yes': { type: DYNAMIC, action: PROCEED_TO_CHECKOUT, argument: { ...argument, address: tempCustomerPayload.defaultAddress } },
              'no': { type: DYNAMIC, action: GET_CHECKOUT_STREET_ADDRESS, argument: { ...argument, address: {address1: ''} } },
              [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId }
            }
          }
        ],
        userId: chatbot.userId,
        companyId: chatbot.companyId
      }
      const address = tempCustomerPayload.defaultAddress
      messageBlock.payload[0].text += `\n\nYour current existing address is ${address.address1}, ${address.city} ${address.zip}, ${address.country}`
    } else {
      messageBlock = {
        module: {
          id: chatbot._id,
          type: 'whatsapp_commerce_chatbot'
        },
        title: 'Checkout Email',
        uniqueId: '' + new Date().getTime(),
        payload: [
          {
            text: `Please enter your street address: `,
            componentType: 'text',
            action: {
              type: DYNAMIC,
              action: GET_CHECKOUT_CITY,
              input: true,
              argument: { ...argument,
                address: { address1: '' }
              }
            },
            specialKeys: {
              [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId }
            }
          }
        ],
        userId: chatbot.userId,
        companyId: chatbot.companyId
      }
    }
    messageBlock.payload[0].text += `\n\n${specialKeyText(HOME_KEY)} `
    return messageBlock
  } catch (err) {
    if (!userError) {
      logger.serverLog(TAG, `Unable to input street address ${err} `, 'error')
      throw new Error(`${ERROR_INDICATOR}Unable to input street address`)
    } else {
      throw new Error(`${ERROR_INDICATOR}${err.message}`)
    }
  }
}

const getCheckoutStreetAddressBlock = async (chatbot, contact, argument) => {
  try {
    const messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_commerce_chatbot'
      },
      title: 'Checkout Email',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Please enter your street address: `,
          componentType: 'text',
          action: {
            type: DYNAMIC,
            action: GET_CHECKOUT_CITY,
            input: true,
            argument: { ...argument,
              address: {...argument.address, address1: ''}
            }
          },
          specialKeys: {
            [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    messageBlock.payload[0].text += `\n\n${specialKeyText(HOME_KEY)} `
    return messageBlock
  } catch (err) {
    logger.serverLog(TAG, `Unable to input street address ${err} `, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to input street address`)
  }
}

const getCheckoutCityBlock = async (chatbot, contact, argument, userInput) => {
  try {
    if (userInput && argument.address && !argument.address.address1) {
      argument.address.address1 = userInput
    }
    const messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_commerce_chatbot'
      },
      title: 'Checkout Email',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Please enter your city: `,
          componentType: 'text',
          action: {
            type: DYNAMIC,
            action: GET_CHECKOUT_COUNTRY,
            input: true,
            argument: { ...argument,
              address: { ...argument.address, city: '' }
            }
          },
          specialKeys: {
            [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }

    messageBlock.payload[0].text += `\n\n${specialKeyText(HOME_KEY)} `
    return messageBlock
  } catch (err) {
    logger.serverLog(TAG, `Unable to input city ${err} `, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to input city`)
  }
}

const getCheckoutCountryBlock = async (chatbot, contact, argument, userInput) => {
  try {
    if (userInput && argument.address && !argument.address.city) {
      argument.address.city = userInput
    }
    const messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_commerce_chatbot'
      },
      title: 'Checkout Email',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Please enter your country: `,
          componentType: 'text',
          action: {
            type: DYNAMIC,
            action: GET_CHECKOUT_ZIP_CODE,
            input: true,
            argument: { ...argument,
              address: { ...argument.address, country: '' }
            }
          },
          specialKeys: {
            [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }

    messageBlock.payload[0].text += `\n\n${specialKeyText(HOME_KEY)} `
    return messageBlock
  } catch (err) {
    logger.serverLog(TAG, `Unable to input country ${err} `, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to input country`)
  }
}

const getCheckoutZipCodeBlock = async (chatbot, contact, argument, userInput) => {
  try {
    if (userInput && argument.address && !argument.address.country) {
      argument.address.country = userInput
    }
    const messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_commerce_chatbot'
      },
      title: 'Checkout Zip Code',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Please enter your zip code: `,
          componentType: 'text',
          action: {
            type: DYNAMIC,
            action: GET_CHECKOUT_INFO,
            input: true,
            argument: { ...argument,
              updatingZip: true,
              address: { ...argument.address, zip: '' }
            }
          },
          specialKeys: {
            [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }

    messageBlock.payload[0].text += `\n\n${specialKeyText(HOME_KEY)} `
    return messageBlock
  } catch (err) {
    logger.serverLog(TAG, `Unable to input country ${err} `, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to input country`)
  }
}

const confirmCompleteAddress = (chatbot, contact, argument, userInput) => {
  if (userInput && argument.address && !argument.address.zip) {
    argument.address.zip = userInput
  }
  let messageBlock = {
    module: {
      id: chatbot._id,
      type: 'whatsapp_commerce_chatbot'
    },
    title: 'Is this address confirmed?',
    uniqueId: '' + new Date().getTime(),
    payload: [
      {
        text: 'Thank you for providing address details.',
        componentType: 'text',
        menu: [],
        specialKeys: {
          [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId },
          'y': { type: DYNAMIC, action: PROCEED_TO_CHECKOUT, argument },
          'n': { type: DYNAMIC, action: UPDATE_ADDRESS_BLOCK, argument },
          'yes': { type: DYNAMIC, action: PROCEED_TO_CHECKOUT, argument },
          'no': { type: DYNAMIC, action: UPDATE_ADDRESS_BLOCK, argument }
        }
      }
    ],
    userId: chatbot.userId,
    companyId: chatbot.companyId
  }

  const address = argument.address
  messageBlock.payload[0].text += `\n\nYour given address is ${address.address1}, ${address.city} ${address.zip}, ${address.country}\n\n`

  messageBlock.payload[0].text += dedent(`Please validate the address. Is it correct to proceed to checkout:\n
                                      Send 'Y' for Yes, Proceed to checkout
                                      Send 'N' for No, Change the address`)

  messageBlock.payload[0].text += `\n\n${specialKeyText(HOME_KEY)}`
  return messageBlock
}

const updateAddressBlock = (chatbot, contact, argument) => {
  let messageBlock = {
    module: {
      id: chatbot._id,
      type: 'whatsapp_commerce_chatbot'
    },
    title: 'Update in the address',
    uniqueId: '' + new Date().getTime(),
    payload: [
      {
        text: '',
        componentType: 'text',
        menu: [],
        specialKeys: {
          [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId }
        }
      }
    ],
    userId: chatbot.userId,
    companyId: chatbot.companyId
  }

  messageBlock.payload[0].text += dedent(`Select from following that you want to change in your address:\n
                                              ${convertToEmoji(0)} Update Street Address
                                              ${convertToEmoji(1)} Update City
                                              ${convertToEmoji(2)} Update Country
                                              ${convertToEmoji(3)} Update Zip Code`)

  messageBlock.payload[0].menu.push(
    { type: DYNAMIC, action: UPDATE_CHECKOUT_STREET_ADDRESS, argument },
    { type: DYNAMIC, action: UPDATE_CHECKOUT_CITY, argument },
    { type: DYNAMIC, action: UPDATE_CHECKOUT_COUNTRY, argument },
    { type: DYNAMIC, action: UPDATE_CHECKOUT_ZIP_CODE, argument })

  messageBlock.payload[0].text += `\n\n${specialKeyText(HOME_KEY)}`
  return messageBlock
}

const updateCheckoutStreetAddressBlock = async (chatbot, contact, argument) => {
  try {
    const messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_commerce_chatbot'
      },
      title: 'Update street address for checkout',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Please enter the new street address: `,
          componentType: 'text',
          action: {
            type: DYNAMIC,
            action: GET_NEW_CHECKOUT_STREET_ADDRESS,
            input: true,
            argument
          },
          specialKeys: {
            [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    messageBlock.payload[0].text += `\n\n${specialKeyText(HOME_KEY)} `
    return messageBlock
  } catch (err) {
    logger.serverLog(TAG, `Unable to input street address ${err} `, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to input street address`)
  }
}

const updateCheckoutCityBlock = async (chatbot, contact, argument) => {
  try {
    const messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_commerce_chatbot'
      },
      title: 'Update city for checkout',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Please enter the new city : `,
          componentType: 'text',
          action: {
            type: DYNAMIC,
            action: GET_NEW_CHECKOUT_CITY,
            input: true,
            argument
          },
          specialKeys: {
            [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    messageBlock.payload[0].text += `\n\n${specialKeyText(HOME_KEY)} `
    return messageBlock
  } catch (err) {
    logger.serverLog(TAG, `Unable to input city name ${err} `, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to input city name`)
  }
}

const updateCheckoutCountryBlock = async (chatbot, contact, argument) => {
  try {
    const messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_commerce_chatbot'
      },
      title: 'Update country for checkout',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Please enter the new country : `,
          componentType: 'text',
          action: {
            type: DYNAMIC,
            action: GET_NEW_CHECKOUT_COUNTRY,
            input: true,
            argument
          },
          specialKeys: {
            [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    messageBlock.payload[0].text += `\n\n${specialKeyText(HOME_KEY)} `
    return messageBlock
  } catch (err) {
    logger.serverLog(TAG, `Unable to input country ${err} `, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to input country`)
  }
}

const updateCheckoutZipCodeBlock = async (chatbot, contact, argument) => {
  try {
    const messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_commerce_chatbot'
      },
      title: 'Update zip code for checkout',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Please enter the new zip code : `,
          componentType: 'text',
          action: {
            type: DYNAMIC,
            action: GET_NEW_CHECKOUT_ZIP_CODE,
            input: true,
            argument
          },
          specialKeys: {
            [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    messageBlock.payload[0].text += `\n\n${specialKeyText(HOME_KEY)} `
    return messageBlock
  } catch (err) {
    logger.serverLog(TAG, `Unable to input zip code ${err} `, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to input zip code`)
  }
}

const getNewCheckoutStreetAddressBlock = async (chatbot, contact, argument, userInput) => {
  try {
    if (userInput && argument.address) {
      argument.address.address1 = userInput
      argument.updatingAddress = true
      return getCheckoutInfoBlock(chatbot, contact, contact.lastMessageSentByBot.uniqueId, argument)
      // return updatedAddressBlockedMessage(chatbot, contact, argument)
    } else {
      throw new Error(`${ERROR_INDICATOR} Unable to input street address for update`)
    }
  } catch (err) {
    logger.serverLog(TAG, `Unable to input street address for update ${err} `, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to input street address for update`)
  }
}

const getNewCheckoutCityBlock = async (chatbot, contact, argument, userInput) => {
  try {
    if (userInput && argument.address) {
      argument.address.city = userInput
      argument.updatingAddress = true
      return getCheckoutInfoBlock(chatbot, contact, contact.lastMessageSentByBot.uniqueId, argument)
      // return updatedAddressBlockedMessage(chatbot, contact, argument)
    } else {
      throw new Error(`${ERROR_INDICATOR} Unable to input city for update`)
    }
  } catch (err) {
    logger.serverLog(TAG, `Unable to input city for update ${err} `, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to input city for update`)
  }
}

const getNewCheckoutCountryBlock = async (chatbot, contact, argument, userInput) => {
  try {
    if (userInput && argument.address) {
      argument.address.country = userInput
      argument.updatingAddress = true
      return getCheckoutInfoBlock(chatbot, contact, contact.lastMessageSentByBot.uniqueId, argument)
      // return updatedAddressBlockedMessage(chatbot, contact, argument)
    } else {
      throw new Error(`${ERROR_INDICATOR} Unable to input country for update`)
    }
  } catch (err) {
    logger.serverLog(TAG, `Unable to input country for update ${err} `, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to input country for update`)
  }
}

const getNewCheckoutZipCodeBlock =
  async (chatbot, contact, argument, userInput) => {
    try {
      if (userInput && argument.address) {
        argument.address.zip = userInput
        argument.updatingAddress = true
        return getCheckoutInfoBlock(chatbot, contact, contact.lastMessageSentByBot.uniqueId, argument)
        // return updatedAddressBlockedMessage(chatbot, contact, argument)
      } else {
        throw new Error(`${ERROR_INDICATOR} Unable to input zip for update`)
      }
    } catch (err) {
      logger.serverLog(TAG, `Unable to input zip for update ${err} `, 'error')
      throw new Error(`${ERROR_INDICATOR}Unable to input zip for update`)
    }
  }

// const updatedAddressBlockedMessage = async (chatbot, contact, argument) => {
//   let messageBlock = {
//     module: {
//       id: chatbot._id,
//       type: 'whatsapp_commerce_chatbot'
//     },
//     title: 'Is this new address confirmed?',
//     uniqueId: '' + new Date().getTime(),
//     payload: [
//       {
//         text: 'Thank you for updating address details.',
//         componentType: 'text',
//         menu: [],
//         specialKeys: {
//           [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId },
//           'y': { type: DYNAMIC, action: PROCEED_TO_CHECKOUT, argument },
//           'n': { type: DYNAMIC, action: UPDATE_ADDRESS_BLOCK, argument },
//           'yes': { type: DYNAMIC, action: PROCEED_TO_CHECKOUT, argument },
//           'no': { type: DYNAMIC, action: UPDATE_ADDRESS_BLOCK, argument }
//         }
//       }
//     ],
//     userId: chatbot.userId,
//     companyId: chatbot.companyId
//   }

//   const address = argument.address
//   messageBlock.payload[0].text += `\n\nYour new address is ${address.address1}, ${address.city} ${address.zip}, ${address.country}\n\n`

//   messageBlock.payload[0].text += dedent(`Please validate the new address. Is it correct to proceed to checkout:\n
//                                       Send 'Y' for Yes, Proceed to checkout
//                                       Send 'N' for No, Change the address`)

//   messageBlock.payload[0].text += `\n\n${specialKeyText(HOME_KEY)}`
//   return messageBlock
// }

const getInvoiceBlock = async (chatbot, contact, backId, EcommerceProvider, orderId) => {
  let userError = false
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'messenger_commerce_chatbot'
      },
      title: 'Order Invoice',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Here is your invoice for order #${orderId}:`,
          componentType: 'text',
          specialKeys: {
            [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId },
            [BACK_KEY]: { type: STATIC, blockId: backId }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    let orderStatus = await EcommerceProvider.checkOrderStatus(Number(orderId))
    let attempts = 0
    const maxAttempts = 10
    while (!orderStatus && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      orderStatus = await EcommerceProvider.checkOrderStatus(Number(orderId))
      attempts++
    }

    if (!orderStatus) {
      userError = true
      throw new Error('Unable to get order status. Please make sure your order ID is valid and that the order was placed within the last 60 days.')
    }

    let shoppingCart = []
    let totalOrderPriceString = ''
    if (orderStatus.lineItems && orderStatus.lineItems.length > 0) {
      const totalOrderPrice = orderStatus.lineItems.reduce((acc, item) => acc + Number(item.price), 0)
      const currency = orderStatus.lineItems[0].currency
      totalOrderPriceString = currency === 'USD' ? `$${totalOrderPrice}` : `${totalOrderPrice} ${currency}`
      for (let i = 0; i < orderStatus.lineItems.length; i++) {
        let product = orderStatus.lineItems[i]
        const individualPrice = Number(product.price) / Number(product.quantity)
        const priceString = currency === 'USD' ? `$${individualPrice}` : `${individualPrice} ${currency}`
        const totalPriceString = currency === 'USD' ? `$${product.price}` : `${product.price} ${currency}`
        shoppingCart.push({
          image_url: product.image.originalSrc,
          name: product.name,
          price: priceString,
          quantity: product.quantity,
          totalPrice: totalPriceString
        })
      }
    }

    let shippingAddress = null
    let billingAddress = null
    if (orderStatus.shippingAddress) {
      shippingAddress = orderStatus.shippingAddress
    } else if (contact.commerceCustomer && contact.commerceCustomer.defaultAddress) {
      shippingAddress = contact.commerceCustomer.defaultAddress
    }

    if (orderStatus.billingAddress) {
      billingAddress = orderStatus.billingAddress
    }

    const storeInfo = await EcommerceProvider.fetchStoreInfo()

    const invoiceComponent = await generateInvoice(
      storeInfo,
      orderId,
      new Date(orderStatus.createdAt).toLocaleString(),
      orderStatus.customer,
      shippingAddress,
      billingAddress,
      shoppingCart,
      totalOrderPriceString
    )
    messageBlock.payload[0].text += `\n\n${specialKeyText(BACK_KEY)}`
    messageBlock.payload[0].text += `\n${specialKeyText(HOME_KEY)}`
    messageBlock.payload.push(invoiceComponent)

    return messageBlock
  } catch (err) {
    if (!userError) {
      const message = err || 'Unable to get order status'
      logger.serverLog(message, `${TAG}: getInvoiceBlock`, {}, {}, 'error')
    }
    if (err && err.message) {
      throw new Error(`${ERROR_INDICATOR}${err.message}`)
    } else {
      throw new Error(`${ERROR_INDICATOR}Unable to get order status.`)
    }
  }
}

const generateInvoice = async (storeInfo, orderId, date, customer, shippingAddress, billingAddress, items, totalPrice) => {
  const html = fs.readFileSync(path.join(__dirname, '../chatbots/invoice_template.html'), 'utf8')
  const options = {
    format: 'A3',
    orientation: 'portrait',
    border: '10mm'
  }
  const document = {
    html: html,
    data: {
      shopName: storeInfo.name,
      orderId,
      date,
      customer,
      shippingAddress,
      billingAddress,
      items,
      totalPrice
    },
    path: `./invoices/${storeInfo.id}/order${orderId}.pdf`
  }
  await pdf.create(document, options)
  return {
    componentType: 'file',
    fileurl: {
      url: `${config.domain}/invoices/${storeInfo.id}/order${orderId}.pdf`
    },
    fileName: `order${orderId}.pdf`
  }
}

const getCheckoutBlock = async (chatbot, backId, EcommerceProvider, contact, argument, userInput) => {
  let userError = false
  try {
    if (userInput && argument.address && !argument.address.zip) {
      argument.address.zip = userInput
    }
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_commerce_chatbot'
      },
      title: 'Checkout',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: ``,
          componentType: 'text',
          specialKeys: {
            [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    const names = contact.name.split(' ')
    const firstName = names[0]
    const lastName = names[1] ? names[1] : names[0]

    let commerceCustomer = null
    let shoppingCart = contact.shoppingCart

    // this is workaround to store both bigcommerce and shopify
    // customer information in contacts table so that during
    // demo we can easily switch between commerce providers.
    // Here we are checking which store the chatbot belongs to
    // and getting the customer payload for that store - Sojharo
    let tempCustomerPayload = contact.commerceCustomer
    if (chatbot.storeType === commerceConstants.shopify) {
      tempCustomerPayload = contact.commerceCustomerShopify
    }

    if (argument.newEmail) {
      commerceCustomer = await EcommerceProvider.searchCustomerUsingEmail(argument.newEmail)
      if (commerceCustomer.length === 0) {
        commerceCustomer = await EcommerceProvider.createCustomer(firstName, lastName, argument.newEmail, argument.address)
      } else {
        commerceCustomer = commerceCustomer[0]
      }
      commerceCustomer.provider = chatbot.storeType
    } else {
      if (!tempCustomerPayload.provider || tempCustomerPayload.provider !== chatbot.storeType) {
        commerceCustomer = await EcommerceProvider.searchCustomerUsingEmail(tempCustomerPayload.email)
        if (commerceCustomer.length === 0) {
          commerceCustomer = await EcommerceProvider.createCustomer(firstName, lastName, tempCustomerPayload.email, argument.address)
        } else {
          commerceCustomer = commerceCustomer[0]
        }
        commerceCustomer.provider = chatbot.storeType
      } else {
        commerceCustomer = tempCustomerPayload
      }
    }

    let checkoutLink = ''
    if (argument.paymentMethod === 'cod') {
      if (chatbot.storeType === commerceConstants.shopify) {
        const testOrderCart = shoppingCart.map((item) => {
          return {
            variant_id: item.variant_id + '',
            quantity: item.quantity
          }
        })

        const order = await EcommerceProvider.createTestOrder(
          {id: commerceCustomer.id + ''},
          testOrderCart,
          {
            first_name: commerceCustomer.first_name,
            last_name: commerceCustomer.last_name,
            ...argument.address
          }
        )

        if (order) {
          let storeInfo = await EcommerceProvider.fetchStoreInfo()
          const orderId = order.name.replace('#', '')
          messageBlock.payload[0].text += `Thank you for shopping at ${storeInfo.name}. We have received your order. Please note the order number given below to track your order:\n\n`
          messageBlock.payload[0].text += `*${orderId}*\n\n`
          messageBlock.payload[0].text += `Here is your complete order:\n`

          let totalPrice = 0
          let currency = ''
          for (let i = 0; i < shoppingCart.length; i++) {
            let product = shoppingCart[i]

            currency = product.currency

            let price = product.quantity * product.price
            price = Number(price.toFixed(2))
            totalPrice += price

            messageBlock.payload[0].text += `\n*Item*: ${product.product}`
            messageBlock.payload[0].text += `\n*Quantity*: ${product.quantity}`
            messageBlock.payload[0].text += `\n*Price*: ${price} ${currency}`

            if (i + 1 < shoppingCart.length) {
              messageBlock.payload[0].text += `\n`
            }
          }

          messageBlock.payload[0].text += `\n\n*Total price*: ${totalPrice} ${currency}\n\n`

          const address = argument.address
          messageBlock.payload[0].text += `*Address*: ${address.address1}, ${address.city} ${address.zip}, ${address.country}`

          messageBlock.payload[0].text += `\n\n*I*  Get PDF Invoice`
          messageBlock.payload[0].specialKeys['i'] = { type: DYNAMIC, action: GET_INVOICE, argument: orderId }
        } else {
          throw new Error()
        }
      } else {
        messageBlock.payload[0].text += `Cash on delivery is currently not supported for this store`
      }
    } else if (argument.paymentMethod === 'e-payment') {
      messageBlock.payload[0].text += `Here is your checkout link:`
      if (chatbot.storeType === commerceConstants.shopify) {
        checkoutLink = await EcommerceProvider.createPermalinkForCart(commerceCustomer, contact.shoppingCart)
      } else if (chatbot.storeType === commerceConstants.bigcommerce) {
        const bigcommerceCart = await EcommerceProvider.createCart(commerceCustomer.id, contact.shoppingCart)
        checkoutLink = await EcommerceProvider.createPermalinkForCartBigCommerce(bigcommerceCart.id)
        checkoutLink = checkoutLink.data.cart_url
      }
      if (checkoutLink) {
        messageBlock.payload[0].text += `\n${checkoutLink} `
      } else {
        throw new Error()
      }
    }

    messageBlock.payload[0].text += `\n\n${specialKeyText(HOME_KEY)} `

    commerceCustomer.defaultAddress = argument.address

    let updatePayload = {
      shoppingCart: []
    }
    if (chatbot.storeType === commerceConstants.shopify) {
      updatePayload.commerceCustomerShopify = commerceCustomer
    } else {
      updatePayload.commerceCustomer = commerceCustomer
    }
    updateWhatsAppContact({ _id: contact._id }, updatePayload, null, {})

    // adding images of cart items to message
    for (let i = 0; i < shoppingCart.length; i++) {
      let product = shoppingCart[i]
      if (product.image) {
        let currency = product.currency
        let price = product.quantity * product.price
        price = Number(price.toFixed(2))
        messageBlock.payload.unshift({
          componentType: 'image',
          fileurl: product.image,
          caption: `${product.product}\nQuantity: ${product.quantity}\nPrice: ${price} ${currency}`
        })
      }
    }
    return messageBlock
  } catch (err) {
    if (!userError) {
      const message = err || 'Unable to checkout'
      logger.serverLog(message, `${TAG}: exports.getCheckoutBlock`, {}, {contact, argument}, 'error')
    }
    if (userError && err.message) {
      throw new Error(`${ERROR_INDICATOR}${err.message}`)
    } else {
      throw new Error(`${ERROR_INDICATOR}Unable to checkout`)
    }
  }
}

const getWelcomeMessageBlock = async (chatbot, contact, ecommerceProvider) => {
  let storeInfo = await ecommerceProvider.fetchStoreInfo()

  const messageBlock = {
    module: {
      id: chatbot._id,
      type: 'whatsapp_commerce_chatbot'
    },
    title: 'Main Menu',
    uniqueId: '' + new Date().getTime(),
    payload: [
      {
        text: null,
        componentType: 'text',
        menu: [],
        specialKeys: {}
      }
    ],
    userId: chatbot.userId,
    companyId: chatbot.companyId
  }

  let welcomeMessage = 'Hi'

  if (contact.name && contact.name !== contact.number) {
    welcomeMessage += ` ${contact.name.split(' ')[0]}!`
  } else {
    welcomeMessage += `!`
  }

  welcomeMessage += ` Greetings from ${storeInfo.name} ${chatbot.storeType} chatbot 🤖😀`

  welcomeMessage += `\n\nI am here to guide you on your journey of shopping on ${storeInfo.name}`

  welcomeMessage += `Please select an option to let me know what you would like to do? (i.e. send "1" to select option listed as 1)\n`

  let indexCounter = 0
  if (chatbot.enabledFeatures.commerceBotFeatures.preSales.browseCategories) {
    welcomeMessage += `\n${convertToEmoji(indexCounter)} Browse all categories`
    messageBlock.payload[0].menu.push({
      'type': 'DYNAMIC', 'action': PRODUCT_CATEGORIES
    })
    indexCounter++
  }

  if (chatbot.enabledFeatures.commerceBotFeatures.preSales.discoverProducts) {
    welcomeMessage += `\n${convertToEmoji(indexCounter)} View Products on sale`
    messageBlock.payload[0].menu.push({
      'type': 'DYNAMIC', 'action': DISCOVER_PRODUCTS
    })
    indexCounter++
  }

  if (chatbot.enabledFeatures.commerceBotFeatures.preSales.searchProducts) {
    welcomeMessage += `\n${convertToEmoji(indexCounter)} Search for a product`
    messageBlock.payload[0].menu.push({
      'type': 'DYNAMIC', 'action': SEARCH_PRODUCTS
    })
    indexCounter++
  }

  if (chatbot.enabledFeatures.commerceBotFeatures.generalFeatures.catalogPdf) {
    welcomeMessage += `\n${convertToEmoji(indexCounter)} View Catalog`
    messageBlock.payload[0].menu.push({
      'type': 'DYNAMIC', 'action': VIEW_CATALOG
    })
    indexCounter++
  }

  welcomeMessage = `\n`

  if (chatbot.enabledFeatures.commerceBotFeatures.postSales.checkOrderStatus) {
    welcomeMessage += `\n${specialKeyText(ORDER_STATUS_KEY)}`
    messageBlock.payload[0].specialKeys[ORDER_STATUS_KEY] = { type: DYNAMIC, action: VIEW_RECENT_ORDERS }
  }

  if (chatbot.enabledFeatures.commerceBotFeatures.preSales.manageShoppingCart) {
    welcomeMessage += `\n${specialKeyText(SHOW_CART_KEY)}`
    messageBlock.payload[0].specialKeys[SHOW_CART_KEY] = { type: DYNAMIC, action: SHOW_MY_CART }
  }

  if (chatbot.enabledFeatures.commerceBotFeatures.generalFeatures.faqs) {
    welcomeMessage += `\n${specialKeyText(FAQS_KEY)}`
    messageBlock.payload[0].specialKeys[FAQS_KEY] = { type: DYNAMIC, action: SHOW_FAQS }
  }

  if (chatbot.enabledFeatures.commerceBotFeatures.generalFeatures.talkToAgent) {
    welcomeMessage += `\n${specialKeyText(TALK_TO_AGENT_KEY)}`
    messageBlock.payload[0].specialKeys[TALK_TO_AGENT_KEY] = { type: DYNAMIC, action: TALK_TO_AGENT }
  }

  messageBlock.payload[0].text = welcomeMessage

  return messageBlock
}

const invalidInput = async (chatbot, messageBlock, errMessage) => {
  if (messageBlock.uniqueId === chatbot.startingBlockId) {
    messageBlock = await messageBlockDataLayer.findOneMessageBlock({ uniqueId: chatbot.startingBlockId })
  }

  for (let i = 0; i < messageBlock.payload.length; i++) {
    if (messageBlock.payload[i].text && messageBlock.payload[i].text.includes(ERROR_INDICATOR)) {
      messageBlock.payload[i].text = messageBlock.payload[i].text.split('\n').filter((line) => {
        return !line.includes(ERROR_INDICATOR)
      }).join('\n')
      messageBlock.payload[i].text = `${errMessage}\n` + messageBlock.payload[i].text
    } else {
      messageBlock.payload[i].text = `${errMessage}\n\n` + messageBlock.payload[i].text
    }
  }

  // removing the images so that they won't repeat in error message
  messageBlock.payload = messageBlock.payload.filter(item => item.componentType === 'text')

  return messageBlock
}

const getAskUnpauseChatbotBlock = (chatbot, contact) => {
  try {
    const messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_commerce_chatbot'
      },
      title: 'Ask Unpause Chatbot',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Do you want to unpause the chatbot and cancel the customer support agent request?`,
          componentType: 'text',
          specialKeys: {
            'y': { type: DYNAMIC, action: UNPAUSE_CHATBOT },
            'yes': { type: DYNAMIC, action: UNPAUSE_CHATBOT },
            'n': { type: DYNAMIC, action: TALK_TO_AGENT },
            'no': { type: DYNAMIC, action: TALK_TO_AGENT }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    messageBlock.payload[0].text += `\n\nSend 'Y' for Yes, unpause the chatbot`
    messageBlock.payload[0].text += `\nSend 'N' for No, wait for agent`
    return messageBlock
  } catch (err) {
    const message = err || 'Unable to request for unpause chatbot'
    logger.serverLog(message, `${TAG}: getAskUnpauseChatbotBlock`, {}, {chatbot, contact}, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to request for unpause chatbot`)
  }
}

exports.allowUserUnpauseChatbot = (contact) => {
  try {
    const messageBlock = {
      module: {
        type: 'automated_message'
      },
      title: 'Allow Unpause Chatbot',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Do you want to unpause the chatbot or continue conversation with customer agent support?`,
          componentType: 'text',
          specialKeys: {
            'unpause': { type: DYNAMIC, action: UNPAUSE_CHATBOT }
          }
        }
      ]
    }
    messageBlock.payload[0].text += `\n\nSend 'unpause', to unpause the chatbot`
    return messageBlock
  } catch (err) {
    const message = err || 'Unable to allow for unpause chatbot'
    logger.serverLog(message, `${TAG}: allowUnpauseChatbotBlock`, {}, {contact}, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to allow for unpause chatbot`)
  }
}

exports.getNextMessageBlock = async (chatbot, EcommerceProvider, contact, input, company) => {
  let userError = false
  input = input.toLowerCase()
  if (!contact || !contact.lastMessageSentByBot) {
    return getWelcomeMessageBlock(chatbot, contact, EcommerceProvider)
  } else {
    let action = null
    let lastMessageSentByBot = contact.lastMessageSentByBot.payload[0]
    // sometimes the message with menu and special keys may appear last
    // in payload array due to request by sir to show menu as last message
    // so at zero index we may not have the message containing menu
    // Following loope is trying to find that particular message payload which
    // contains menu
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
            type: DYNAMIC,
            action: ASK_UNPAUSE_CHATBOT
          }
        }
      } else if (lastMessageSentByBot.specialKeys && lastMessageSentByBot.specialKeys[input]) {
        action = lastMessageSentByBot.specialKeys[input]
      } else if (input === 'home' && lastMessageSentByBot.specialKeys[HOME_KEY]) {
        action = lastMessageSentByBot.specialKeys[HOME_KEY]
      } else if (input === 'back' && lastMessageSentByBot.specialKeys[BACK_KEY]) {
        action = lastMessageSentByBot.specialKeys[BACK_KEY]
      } else if (lastMessageSentByBot.menu) {
        let menuInput = parseInt(input)
        if (isNaN(menuInput) || menuInput >= lastMessageSentByBot.menu.length || menuInput < 0) {
          if (lastMessageSentByBot.action) {
            action = lastMessageSentByBot.action
          } else {
            userError = true
            throw new Error(`${ERROR_INDICATOR}Invalid User Input`)
          }
        } else {
          action = lastMessageSentByBot.menu[menuInput]
        }
      } else if (lastMessageSentByBot.action) {
        action = lastMessageSentByBot.action
      } else {
        userError = true
        throw new Error(`${ERROR_INDICATOR}Invalid User Input`)
      }
    } catch (err) {
      if (!userError) {
        const message = err || 'Invalid user input'
        logger.serverLog(message, `${TAG}: exports.getNextMessageBlock`, chatbot, {}, 'error')
      }
      if (chatbot.triggers.includes(input) || (moment().diff(moment(contact.lastMessagedAt), 'minutes') >= 15 && chatbot.companyId !== '5a89ecdaf6b0460c552bf7fe')) {
        return getWelcomeMessageBlock(chatbot, contact, EcommerceProvider)
      } else {
        return invalidInput(chatbot, contact.lastMessageSentByBot, `${ERROR_INDICATOR}You entered an invalid response.`)
      }
    }
    if (action.type === DYNAMIC) {
      try {
        let messageBlock = null
        switch (action.action) {
          case ASK_UNPAUSE_CHATBOT: {
            messageBlock = await getAskUnpauseChatbotBlock(chatbot, contact)
            break
          }
          case UNPAUSE_CHATBOT: {
            updateWhatsAppContact({ _id: contact._id }, { chatbotPaused: false }, null, {})
            return getWelcomeMessageBlock(chatbot, contact, EcommerceProvider)
          }
          case PRODUCT_CATEGORIES: {
            messageBlock = await getProductCategoriesBlock(chatbot, contact.lastMessageSentByBot.uniqueId, EcommerceProvider, action.argument ? action.argument : {})
            break
          }
          case FETCH_PRODUCTS: {
            messageBlock = await getProductsInCategoryBlock(chatbot, contact.lastMessageSentByBot.uniqueId, EcommerceProvider, action.argument)
            break
          }
          case PRODUCT_VARIANTS: {
            messageBlock = await getProductVariantsBlock(chatbot, contact.lastMessageSentByBot.uniqueId, contact, EcommerceProvider, action.argument)
            break
          }
          case DISCOVER_PRODUCTS: {
            messageBlock = await getDiscoverProductsBlock(chatbot, contact.lastMessageSentByBot.uniqueId, EcommerceProvider, action.input ? input : '', action.argument ? action.argument : {})
            break
          }
          case ORDER_STATUS: {
            messageBlock = await getOrderStatusBlock(chatbot, contact.lastMessageSentByBot.uniqueId, EcommerceProvider, action.input ? input : action.argument)
            break
          }
          case SELECT_PRODUCT: {
            messageBlock = await getSelectProductBlock(chatbot, contact.lastMessageSentByBot.uniqueId, action.argument)
            break
          }
          case ADD_TO_CART: {
            messageBlock = await getAddToCartBlock(chatbot, contact.lastMessageSentByBot.uniqueId, contact, action.argument, action.input ? input : '')
            break
          }
          case SHOW_MY_CART: {
            messageBlock = await getShowMyCartBlock(chatbot, contact.lastMessageSentByBot.uniqueId, contact)
            break
          }
          case GET_CHECKOUT_INFO: {
            messageBlock = await getCheckoutInfoBlock(chatbot, contact, EcommerceProvider, contact.lastMessageSentByBot.uniqueId, action.argument, action.input ? input : '')
            break
          }
          case GET_EMAIL_OTP: {
            messageBlock = await getEmailOtpBlock(chatbot, contact, EcommerceProvider, contact.lastMessageSentByBot.uniqueId, action.argument, action.input ? input : '')
            break
          }
          case GET_VERIFY_OTP: {
            messageBlock = await getVerifyOtpBlock(chatbot, contact, contact.lastMessageSentByBot.uniqueId, action.argument, action.input ? input : '')
            break
          }
          case GET_CHECKOUT_EMAIL: {
            messageBlock = await getCheckoutEmailBlock(chatbot, contact, action.argument)
            break
          }
          case ASK_PAYMENT_METHOD: {
            messageBlock = await getAskPaymentMethodBlock(chatbot, contact.lastMessageSentByBot.uniqueId, contact, action.input ? input : '')
            break
          }
          case PROCEED_TO_CHECKOUT: {
            messageBlock = await getCheckoutBlock(chatbot, contact.lastMessageSentByBot.uniqueId, EcommerceProvider, contact, action.argument, action.input ? input : '')
            break
          }
          case CONFIRM_RETURN_ORDER: {
            messageBlock = await getConfirmReturnOrderBlock(chatbot, contact.lastMessageSentByBot.uniqueId, action.argument)
            break
          }
          case RETURN_ORDER: {
            messageBlock = await getReturnOrderBlock(chatbot, contact, contact.lastMessageSentByBot.uniqueId, EcommerceProvider, action.argument, company.whatsApp.businessNumber)
            break
          }
          case SHOW_ITEMS_TO_REMOVE: {
            messageBlock = await getShowItemsToRemoveBlock(chatbot, contact.lastMessageSentByBot.uniqueId, contact)
            break
          }
          case SHOW_ITEMS_TO_UPDATE: {
            messageBlock = await getShowItemsToUpdateBlock(chatbot, contact.lastMessageSentByBot.uniqueId, contact)
            break
          }
          case REMOVE_FROM_CART: {
            messageBlock = await getRemoveFromCartBlock(chatbot, contact.lastMessageSentByBot.uniqueId, contact, action.argument)
            break
          }
          case UPDATE_CART: {
            messageBlock = await getUpdateCartBlock(chatbot, contact.lastMessageSentByBot.uniqueId, contact, action.argument, action.input ? input : '')
            break
          }
          case CONFIRM_CLEAR_CART: {
            messageBlock = await confirmClearCart(chatbot, contact)
            break
          }
          case CLEAR_CART: {
            messageBlock = await clearCart(chatbot, contact)
            break
          }
          // case QUANTITY_TO_ADD: {
          //   messageBlock = await getQuantityToAddBlock(chatbot, contact.lastMessageSentByBot.uniqueId, contact, action.argument)
          //   break
          // }
          case CONFIRM_TO_REMOVE_CART_ITEM: {
            messageBlock = await getConfirmRemoveItemBlock(chatbot, contact.lastMessageSentByBot.uniqueId, action.argument)
            break
          }
          case QUANTITY_TO_UPDATE: {
            messageBlock = await getQuantityToUpdateBlock(chatbot, contact.lastMessageSentByBot.uniqueId, action.argument)
            break
          }
          case VIEW_RECENT_ORDERS: {
            messageBlock = await getRecentOrdersBlock(chatbot, contact.lastMessageSentByBot.uniqueId, contact, EcommerceProvider)
            break
          }
          case TALK_TO_AGENT: {
            messageBlock = await getTalkToAgentBlock(chatbot, contact.lastMessageSentByBot.uniqueId, contact)
            break
          }
          case ASK_ADDRESS: {
            messageBlock = await getAskAddressBlock(chatbot, contact, action.argument, action.input ? input : '')
            break
          }
          case GET_CHECKOUT_STREET_ADDRESS: {
            messageBlock = await getCheckoutStreetAddressBlock(chatbot, contact, action.argument)
            break
          }
          case GET_CHECKOUT_CITY: {
            messageBlock = await getCheckoutCityBlock(chatbot, contact, action.argument, action.input ? input : '')
            break
          }
          case GET_CHECKOUT_COUNTRY: {
            messageBlock = await getCheckoutCountryBlock(chatbot, contact, action.argument, action.input ? input : '')
            break
          }
          case GET_CHECKOUT_ZIP_CODE: {
            messageBlock = await getCheckoutZipCodeBlock(chatbot, contact, action.argument, action.input ? input : '')
            break
          }
          case CONFIRM_COMPLETE_ADDRESS: {
            messageBlock = await confirmCompleteAddress(chatbot, contact, action.argument, action.input ? input : '')
            break
          }
          case UPDATE_ADDRESS_BLOCK: {
            messageBlock = await updateAddressBlock(chatbot, contact, action.argument)
            break
          }
          case UPDATE_CHECKOUT_STREET_ADDRESS: {
            messageBlock = await updateCheckoutStreetAddressBlock(chatbot, contact, action.argument)
            break
          }
          case UPDATE_CHECKOUT_CITY: {
            messageBlock = await updateCheckoutCityBlock(chatbot, contact, action.argument)
            break
          }
          case UPDATE_CHECKOUT_COUNTRY: {
            messageBlock = await updateCheckoutCountryBlock(chatbot, contact, action.argument)
            break
          }
          case UPDATE_CHECKOUT_ZIP_CODE: {
            messageBlock = await updateCheckoutZipCodeBlock(chatbot, contact, action.argument, action.input ? input : '')
            break
          }
          case GET_NEW_CHECKOUT_STREET_ADDRESS: {
            messageBlock = await getNewCheckoutStreetAddressBlock(chatbot, contact, action.argument, action.input ? input : '')
            break
          }
          case GET_NEW_CHECKOUT_CITY: {
            messageBlock = await getNewCheckoutCityBlock(chatbot, contact, action.argument, action.input ? input : '')
            break
          }
          case GET_NEW_CHECKOUT_COUNTRY: {
            messageBlock = await getNewCheckoutCountryBlock(chatbot, contact, action.argument, action.input ? input : '')
            break
          }
          case GET_NEW_CHECKOUT_ZIP_CODE: {
            messageBlock = await getNewCheckoutZipCodeBlock(chatbot, contact, action.argument, action.input ? input : '')
            break
          }
          case SEARCH_PRODUCTS: {
            messageBlock = await getSearchProductsBlock(chatbot, contact)
            break
          }
          case CHECK_ORDERS: {
            messageBlock = await getCheckOrdersBlock(chatbot, contact)
            break
          }
          case ASK_ORDER_ID: {
            messageBlock = await getOrderIdBlock(chatbot, contact, contact.lastMessageSentByBot.uniqueId)
            break
          }
          case GET_INVOICE: {
            messageBlock = await getInvoiceBlock(chatbot, contact, contact.lastMessageSentByBot.uniqueId, EcommerceProvider, action.argument)
            break
          }
          case VIEW_CATALOG: {
            messageBlock = await getViewCatalogBlock(chatbot, contact.lastMessageSentByBot.uniqueId, contact)
            break
          }
          case CANCEL_ORDER: {
            messageBlock = await getCancelOrderBlock(chatbot, contact.lastMessageSentByBot.uniqueId, EcommerceProvider, action.argument, company.whatsApp.businessNumber)
            break
          }
          case CANCEL_ORDER_CONFIRM: {
            messageBlock = await getCancelOrderConfirmBlock(chatbot, contact.lastMessageSentByBot.uniqueId, action.argument, action.input ? input : '')
            break
          }
          case SHOW_FAQ_QUESTIONS: {
            messageBlock = await getShowFaqQuestionsBlock(chatbot, contact, contact.lastMessageSentByBot.uniqueId, action.argument)
            break
          }
          case SHOW_FAQS: {
            messageBlock = await getShowFaqsBlock(chatbot, contact, contact.lastMessageSentByBot.uniqueId)
            break
          }
          case GET_FAQ_ANSWER: {
            messageBlock = await getFaqAnswerBlock(chatbot, contact, contact.lastMessageSentByBot.uniqueId, EcommerceProvider, action.argument)
            break
          }
        }
        await messageBlockDataLayer.createForMessageBlock(messageBlock)
        return messageBlock
      } catch (err) {
        if (chatbot.triggers.includes(input) || moment().diff(moment(contact.lastMessagedAt), 'minutes') >= 15) {
          return getWelcomeMessageBlock(chatbot, contact, EcommerceProvider)
        } else {
          return invalidInput(chatbot, contact.lastMessageSentByBot, `${ERROR_INDICATOR}You entered an invalid response.`)
        }
      }
    } else if (action.type === STATIC) {
      return messageBlockDataLayer.findOneMessageBlock({ uniqueId: action.blockId })
    }
  }
}
exports.generateInvoice = generateInvoice
