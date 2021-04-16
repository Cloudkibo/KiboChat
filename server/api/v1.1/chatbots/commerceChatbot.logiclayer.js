const dedent = require('dedent-js')
const {
  DYNAMIC,
  STATIC,
  DEFAULT_TEXT,
  PRODUCT_CATEGORIES,
  PRODUCT_VARIANTS,
  DISCOVER_PRODUCTS,
  ORDER_STATUS,
  SELECT_PRODUCT,
  SHOW_MY_CART,
  ADD_TO_CART,
  REMOVE_FROM_CART,
  UPDATE_CART,
  PROCEED_TO_CHECKOUT,
  ASK_PAYMENT_METHOD,
  // RETURN_ORDER,
  GET_CHECKOUT_EMAIL,
  CLEAR_CART,
  QUANTITY_TO_UPDATE,
  VIEW_RECENT_ORDERS,
  ERROR_INDICATOR,
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
  CONFIRM_CLEAR_CART,
  CONFIRM_TO_REMOVE_CART_ITEM,
  TALK_TO_AGENT,
  UNPAUSE_CHATBOT,
  ASK_UNPAUSE_CHATBOT,
  SEARCH_PRODUCTS,
  CHECK_ORDERS,
  ASK_ORDER_ID,
  GET_INVOICE,
  GET_CHECKOUT_INFO,
  VIEW_CATALOG,
  SHOW_FAQS,
  SHOW_FAQ_QUESTIONS,
  GET_FAQ_ANSWER,
  RETURN_ORDER,
  CONFIRM_RETURN_ORDER,
  CANCEL_ORDER,
  CANCEL_ORDER_CONFIRM,
  GET_EMAIL_OTP,
  GET_VERIFY_OTP
} = require('./constants')
const logger = require('../../../components/logger')
const TAG = 'api/v1️.1/chatbots/commerceChatbot.logiclayer.js'
const messageBlockDataLayer = require('../messageBlock/messageBlock.datalayer')
const { callApi } = require('../utility')
const commerceConstants = require('../ecommerceProvidersApiLayer/constants')
const {getProfileIds, prepareText} = require('../ecommerceProfiles/index')
const moment = require('moment')
const { sendNotification } = require('./chatbots.logiclayer')
const pdf = require('pdf-creator-node')
const fs = require('fs')
const path = require('path')
const utility = require('../../../components/utility')
const config = require('../../../config/environment/index')

// exports.updateFaqsForStartingBlock = async (chatbot) => {
//   let messageBlocks = []
//   const faqsId = '' + new Date().getTime()
//   let startingBlock = await messageBlockDataLayer.findOneMessageBlock({ uniqueId: chatbot.startingBlockId })
//   let faqsQuickReplyIndex = startingBlock.payload[0].quickReplies.findIndex((qr) => qr.title.includes('FAQ'))
//   let faqsQuickReply = {
//     content_type: 'text',
//     title: 'View FAQs',
//     payload: JSON.stringify({ type: STATIC, blockId: faqsId })
//   }
//   if (faqsQuickReplyIndex <= -1) {
//     if (chatbot.botLinks && chatbot.botLinks.faqs) {
//       startingBlock.payload[0].quickReplies.push(faqsQuickReply)
//       getFaqsBlock(chatbot, faqsId, messageBlocks, chatbot.startingBlockId)
//       messageBlockDataLayer.genericUpdateMessageBlock({ uniqueId: chatbot.startingBlockId }, startingBlock)
//       messageBlockDataLayer.createForMessageBlock(messageBlocks[0])
//     }
//   } else {
//     if (chatbot.botLinks && chatbot.botLinks.faqs) {
//       startingBlock.payload[0].quickReplies[faqsQuickReplyIndex] = faqsQuickReply
//       getFaqsBlock(chatbot, faqsId, messageBlocks, chatbot.startingBlockId)
//       messageBlockDataLayer.genericUpdateMessageBlock({ uniqueId: chatbot.startingBlockId }, startingBlock)
//       messageBlockDataLayer.createForMessageBlock(messageBlocks[0])
//     } else {
//       startingBlock.payload[0].quickReplies.splice(faqsQuickReplyIndex, 1)
//       messageBlockDataLayer.genericUpdateMessageBlock({ uniqueId: chatbot.startingBlockId }, startingBlock)
//     }
//   }
// }

exports.updateStartingBlock = (chatbot, storeName) => {
  let welcomeMessage = `Hi {{user_first_name}}! Greetings from ${storeName} chatbot 🤖😀`
  welcomeMessage += `\n\nI am here to guide you on your journey of shopping on ${storeName}.`
  welcomeMessage += `\n\nPlease select an option to let me know what you would like to do?`
  const startingBlock = messageBlockDataLayer.findOneMessageBlock({ uniqueId: chatbot.startingBlockId })
  startingBlock.payload[0].text = welcomeMessage
  messageBlockDataLayer.genericUpdateMessageBlock({ uniqueId: chatbot.startingBlockId }, startingBlock)
}

exports.getMessageBlocks = (chatbot, storeName) => {
  const messageBlocks = []
  const mainMenuId = '' + new Date().getTime()
  // const faqsId = '' + new Date().getTime() + 500
  let welcomeMessage = `Hi {{user_first_name}}! Greetings from ${storeName} chatbot 🤖😀`
  welcomeMessage += `\n\nI am here to guide you on your journey of shopping on ${storeName}.`
  welcomeMessage += `\n\nPlease select an option to let me know what you would like to do?`
  messageBlocks.push({
    module: {
      id: chatbot._id,
      type: 'messenger_commerce_chatbot'
    },
    title: 'Main Menu',
    triggers: ['hi', 'hello'],
    uniqueId: mainMenuId,
    payload: [
      {
        text: welcomeMessage,
        componentType: 'text',
        quickReplies: [
          {
            content_type: 'text',
            title: 'Browse all categories',
            payload: JSON.stringify({ type: DYNAMIC, action: PRODUCT_CATEGORIES })
          },
          {
            content_type: 'text',
            title: 'View products on sale',
            payload: JSON.stringify({ type: DYNAMIC, action: DISCOVER_PRODUCTS })
          },
          {
            content_type: 'text',
            title: 'Search for a product',
            payload: JSON.stringify({ type: DYNAMIC, action: SEARCH_PRODUCTS })
          },
          {
            content_type: 'text',
            title: 'View catalog',
            payload: JSON.stringify({ type: DYNAMIC, action: VIEW_CATALOG })
          }
        ]
      }
    ],
    userId: chatbot.userId,
    companyId: chatbot.companyId
  })

  if (chatbot.storeType !== 'shops') {
    messageBlocks[0].payload[0].quickReplies.push(
      {
        content_type: 'text',
        title: 'Check order status',
        payload: JSON.stringify({ type: DYNAMIC, action: VIEW_RECENT_ORDERS })
      },
      {
        content_type: 'text',
        title: 'Show my cart',
        payload: JSON.stringify({ type: DYNAMIC, action: SHOW_MY_CART })
      }
    )
  }
  // else {
  //   messageBlocks[0].payload[0].quickReplies.push(
  //     {
  //       content_type: 'text',
  //       title: 'Check order status',
  //       payload: JSON.stringify({ type: DYNAMIC, action: ASK_ORDER_ID })
  //     }
  //   )
  // }

  messageBlocks[0].payload[0].quickReplies.push(
    {
      content_type: 'text',
      title: 'View FAQs',
      payload: JSON.stringify({ type: DYNAMIC, action: SHOW_FAQS })
    },
    {
      content_type: 'text',
      title: 'Talk to agent',
      payload: JSON.stringify({ type: DYNAMIC, action: TALK_TO_AGENT })
    }
  )

  // if (chatbot.botLinks && chatbot.botLinks.faqs) {
  //   messageBlocks[0].payload[0].quickReplies.push({
  //     content_type: 'text',
  //     title: 'View FAQs',
  //     payload: JSON.stringify({ type: STATIC, blockId: faqsId })
  //   })
  //   getFaqsBlock(chatbot, faqsId, messageBlocks, mainMenuId)
  // }
  messageBlockDataLayer.createBulkMessageBlocks(messageBlocks)
  return messageBlocks
}

const getShowFaqsBlock = async (chatbot, contact, backId) => {
  try {
    const messageBlock = {
      module: {
        id: chatbot._id,
        type: 'messenger_commerce_chatbot'
      },
      title: 'FAQs',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: ``,
          componentType: 'text',
          menu: [],
          quickReplies: []
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }

    if (chatbot.faqs && chatbot.faqs.length > 0) {
      messageBlock.payload[0].text += `Please select an FAQ topic:`
      for (let i = 0; i < chatbot.faqs.length; i++) {
        const topic = chatbot.faqs[i].topic
        messageBlock.payload[0].quickReplies.push({
          content_type: 'text',
          title: topic,
          payload: JSON.stringify({
            type: DYNAMIC,
            action: SHOW_FAQ_QUESTIONS,
            argument: { topicIndex: i }
          })
        })
      }
    } else {
      messageBlock.payload[0].text += `Please contact our support agents for any questions you have.`
    }

    messageBlock.payload[0].quickReplies.push(
      {
        content_type: 'text',
        title: 'Talk to agent',
        payload: JSON.stringify({ type: DYNAMIC, action: TALK_TO_AGENT })
      },
      {
        content_type: 'text',
        title: 'Go Back',
        payload: JSON.stringify({ type: STATIC, blockId: chatbot.startingBlockId })
      },
      {
        content_type: 'text',
        title: 'Go Home',
        payload: JSON.stringify({ type: STATIC, blockId: chatbot.startingBlockId })
      }
    )

    return messageBlock
  } catch (err) {
    const message = err || 'Unable to get FAQs'
    logger.serverLog(message, `${TAG}: getShowFaqsBlock`, {}, {chatbot, backId}, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to get FAQs`)
  }
}

const getShowFaqQuestionsBlock = async (chatbot, contact, backId, argument) => {
  try {
    const messageBlock = {
      module: {
        id: chatbot._id,
        type: 'messenger_commerce_chatbot'
      },
      title: 'FAQ Questions',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: ``,
          componentType: 'text',
          menu: [],
          quickReplies: []
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
        for (let i = argument.questionIndex; i < length; i++) {
          const question = chatbot.faqs[argument.topicIndex].questions[i].question
          messageBlock.payload[0].text += `${i + 1}. ${question}`
          messageBlock.payload[0].quickReplies.push({
            content_type: 'text',
            title: `Question ${i + 1}`,
            payload: JSON.stringify({
              type: DYNAMIC,
              action: GET_FAQ_ANSWER,
              argument: { topicIndex: argument.topicIndex, questionIndex: i }
            })
          })
          if (i < length - 1) {
            messageBlock.payload[0].text += `\n\n`
          }
        }
        if (remainingQuestions > 10) {
          messageBlock.payload[0].quickReplies.push({
            content_type: 'text',
            title: `View More Questions`,
            payload: JSON.stringify({
              type: DYNAMIC,
              action: SHOW_FAQ_QUESTIONS,
              argument: { topicIndex: argument.topicIndex, questionIndex: length, viewMore: true }
            })
          })
        }
        messageBlock.payload[0].quickReplies.push({
          content_type: 'text',
          title: 'Go Back',
          payload: JSON.stringify({
            type: DYNAMIC,
            action: SHOW_FAQ_QUESTIONS,
            argument: { topicIndex: argument.topicIndex }
          })
        })
      } else {
        let length = questionsLength <= 10 ? questionsLength : 9

        messageBlock.payload[0].text += `${chatbot.faqs[argument.topicIndex].topic}\n\nBelow are our most frequently asked questions. Select a question to view its answer.\n\n`
        for (let i = 0; i < length; i++) {
          const question = chatbot.faqs[argument.topicIndex].questions[i].question
          messageBlock.payload[0].text += `${i + 1}. ${question}`
          messageBlock.payload[0].quickReplies.push({
            content_type: 'text',
            title: `Question ${i + 1}`,
            payload: JSON.stringify({
              type: DYNAMIC,
              action: GET_FAQ_ANSWER,
              argument: { topicIndex: argument.topicIndex, questionIndex: i }
            })
          })
          if (i < length - 1) {
            messageBlock.payload[0].text += `\n\n`
          }
        }
        if (questionsLength > 10) {
          messageBlock.payload[0].quickReplies.push({
            content_type: 'text',
            title: `View More Questions`,
            payload: JSON.stringify({
              type: DYNAMIC,
              action: SHOW_FAQ_QUESTIONS,
              argument: { topicIndex: argument.topicIndex, questionIndex: length, viewMore: true }
            })
          })
        }
        messageBlock.payload[0].quickReplies.push(
          {
            content_type: 'text',
            title: 'Go Back',
            payload: JSON.stringify({ type: DYNAMIC, action: SHOW_FAQS })
          }
        )
      }
    } else {
      messageBlock.payload[0].text += `Please contact our support agents for any questions you have.`
    }

    messageBlock.payload[0].quickReplies.push(
      {
        content_type: 'text',
        title: 'Talk to agent',
        payload: JSON.stringify({ type: DYNAMIC, action: TALK_TO_AGENT })
      },
      {
        content_type: 'text',
        title: 'Go Home',
        payload: JSON.stringify({ type: STATIC, blockId: chatbot.startingBlockId })
      }
    )

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
          quickReplies: [
            {
              content_type: 'text',
              title: 'Talk to agent',
              payload: JSON.stringify({ type: DYNAMIC, action: TALK_TO_AGENT })
            },
            {
              content_type: 'text',
              title: 'Go Back',
              payload: JSON.stringify({ type: STATIC, blockId: backId })
            },
            {
              content_type: 'text',
              title: 'Go Home',
              payload: JSON.stringify({ type: STATIC, blockId: chatbot.startingBlockId })
            }
          ]
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
    messageBlock.payload[0].text += `${question}`
    messageBlock.payload[0].text += `\n\n${answer}`
    return messageBlock
  } catch (err) {
    const message = err || 'Unable to get faq answer'
    logger.serverLog(message, `${TAG}: getFaqAnswerBlock`, {}, {chatbot, backId, argument}, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to get faq answer`)
  }
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
          componentType: 'text'
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    if (chatbot.catalog && chatbot.catalog.url) {
      messageBlock.payload[0].text = getProfileIds().includes(chatbot.companyId) ? prepareText(chatbot.companyId, 'VIEW_CATALOG') : `Here is our catalog. Please wait a moment for it to send.`
      messageBlock.payload.push({
        componentType: 'file',
        fileurl: {
          url: chatbot.catalog.url
        },
        fileName: chatbot.catalog.name,
        quickReplies: [
          {
            content_type: 'text',
            title: 'Go Home',
            payload: JSON.stringify({ type: STATIC, blockId: chatbot.startingBlockId })
          }
        ]
      })
    } else {
      messageBlock.payload[0].text = `No catalog currently available.`
      messageBlock.payload[0].quickReplies = [
        {
          content_type: 'text',
          title: 'Go Home',
          payload: JSON.stringify({ type: STATIC, blockId: chatbot.startingBlockId })
        }
      ]
    }
    return messageBlock
  } catch (err) {
    const message = err || 'Unable get talk to agent message block'
    logger.serverLog(message, `${TAG}: getTalkToAgentBlock`, {}, {chatbot, backId, contact}, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to notify customer support agent`)
  }
}

const getTalkToAgentBlock = (chatbot, contact) => {
  try {
    const messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_commerce_chatbot'
      },
      title: 'Talk To Agent',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          componentType: 'text',
          text: dedent(getProfileIds().includes(chatbot.companyId) ? prepareText(chatbot.companyId, 'TALK_TO_AGENT') : 'Our support agents have been notified and will get back to you shortly')
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    const message = `${contact.firstName} requested to talk to a customer support agent`
    sendNotification(contact, message, chatbot.companyId)
    updateSubscriber({ _id: contact._id }, { chatbotPaused: true }, null, {})
    return messageBlock
  } catch (err) {
    const message = err || 'Unable get talk to agent message block'
    logger.serverLog(message, `${TAG}: getTalkToAgentBlock`, {}, {chatbot, contact}, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to notify customer support agent`)
  }
}

const getSearchProductsBlock = async (chatbot, contact) => {
  try {
    let skuCode = chatbot.storeType === 'shops' ? '' : 'or SKU code '
    const messageBlock = {
      module: {
        id: chatbot._id,
        type: 'messenger_commerce_chatbot'
      },
      title: 'Search Products',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: getProfileIds().includes(chatbot.companyId) ? prepareText(chatbot.companyId, 'SEARCH_PRODUCTS') : `Please enter the name ${skuCode}of the product you wish to search for:`,
          componentType: 'text',
          action: { type: DYNAMIC, action: DISCOVER_PRODUCTS, input: true },
          quickReplies: [
            {
              content_type: 'text',
              title: 'Go Home',
              payload: JSON.stringify({ type: STATIC, blockId: chatbot.startingBlockId })
            }
          ]
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    if (chatbot.storeType !== 'shops') {
      messageBlock.payload[messageBlock.payload.length - 1].quickReplies.unshift(
        {
          content_type: 'text',
          title: 'Show my cart',
          payload: JSON.stringify({ type: DYNAMIC, action: SHOW_MY_CART })
        }
      )
    }
    return messageBlock
  } catch (err) {
    const message = err || 'Unable get search for products message block'
    logger.serverLog(message, `${TAG}: getSearchProductsBlock`, {}, {chatbot, contact}, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to notify customer support agent`)
  }
}

const getCheckOrdersBlock = (chatbot, contact) => {
  try {
    const messageBlock = {
      module: {
        id: chatbot._id,
        type: 'messenger_commerce_chatbot'
      },
      title: 'Check Orders',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: DEFAULT_TEXT,
          componentType: 'text',
          quickReplies: [
            {
              content_type: 'text',
              title: 'View Recent Orders',
              payload: JSON.stringify({ type: DYNAMIC, action: VIEW_RECENT_ORDERS })
            },
            {
              content_type: 'text',
              title: 'View Specific Order Status',
              payload: JSON.stringify({ type: DYNAMIC, action: ASK_ORDER_ID })
            },
            {
              content_type: 'text',
              title: 'Show my Cart',
              payload: JSON.stringify({ type: DYNAMIC, action: SHOW_MY_CART })
            },
            {
              content_type: 'text',
              title: 'Go Home',
              payload: JSON.stringify({ type: STATIC, blockId: chatbot.startingBlockId })
            }
          ]
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

const getDiscoverProductsBlock = async (chatbot, backId, EcommerceProvider, input, argument) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'messenger_commerce_chatbot'
      },
      title: 'Discover Products',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: ``,
          componentType: 'text',
          quickReplies: []
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    let products = []
    let storeInfo = await EcommerceProvider.fetchStoreInfo()
    if (input) {
      products = await EcommerceProvider.searchProducts(input, chatbot.catalogId)
      let skuCode = chatbot.storeType === 'shops' ? '' : 'or SKU code '
      if (products.length > 0) {
        messageBlock.payload[0].text = `Following products were found for "${input}".\n\nPlease select a product or enter another product name ${skuCode}to search again:`
      } else {
        messageBlock.payload[0].text = `No products found that match "${input}".\n\nEnter another product name ${skuCode}to search again:`
      }
    } else {
      if (argument && argument.categoryId) {
        products = await EcommerceProvider.fetchProductsInThisCategory(argument.categoryId, argument.paginationParams, chatbot.numberOfProducts)
      } else {
        if (getProfileIds().includes(chatbot.companyId)) {
          products = []
        } else {
          products = await EcommerceProvider.fetchProducts(
            chatbot.storeType === 'shops' ? chatbot.catalogId : argument.paginationParams,
            chatbot.numberOfProducts)
        }
      }
      if (products.length > 0) {
        messageBlock.payload[0].text = `Please select a product:`
      } else {
        messageBlock.payload[0].text =
          getProfileIds().includes(chatbot.companyId) ? prepareText(chatbot.companyId, 'ON_SALE')
            : argument && argument.categoryId ? 'There are no products in the selected category' : 'There are no products on sale'
      }
    }

    if (products.length > 0) {
      messageBlock.payload.push({
        componentType: 'gallery',
        cards: [],
        quickReplies: []
      })
      for (let i = 0; i < products.length; i++) {
        let product = products[i]
        let priceString = storeInfo ? storeInfo.currency === 'USD' ? `$${product.price}` : `${product.price} ${storeInfo.currency}` : product.price
        messageBlock.payload[1].cards.push({
          image_url: product.image,
          title: product.name,
          subtitle: `Price: ${priceString}`,
          buttons: chatbot.storeType === 'shops' ? [{
            title: 'Select Product',
            type: 'web_url',
            url: `https://www.facebook.com/commerce/products/${product.id}`
          }]
            : [{
              title: 'Select Product',
              type: 'postback',
              payload: JSON.stringify({ type: DYNAMIC, action: PRODUCT_VARIANTS, argument: { product } })
            }]
        })
      }

      if (products.nextPageParameters) {
        console.log('products.nextPageParameters', products.nextPageParameters)
        messageBlock.payload[1].cards.push({
          title: 'View More',
          subtitle: `Click on the "View More" button to view more products`,
          buttons: [{
            title: 'View More',
            type: 'postback',
            payload: JSON.stringify({ type: DYNAMIC, action: DISCOVER_PRODUCTS, argument: { paginationParams: products.nextPageParameters, categoryId: argument.categoryId } })
          }]
        })
      }
    }

    if (chatbot.storeType !== 'shops') {
      messageBlock.payload[messageBlock.payload.length - 1].quickReplies.push(
        {
          content_type: 'text',
          title: 'Show my cart',
          payload: JSON.stringify({ type: DYNAMIC, action: SHOW_MY_CART })
        }
      )
    }

    messageBlock.payload[messageBlock.payload.length - 1].quickReplies.push(
      {
        content_type: 'text',
        title: 'Go Back',
        payload: JSON.stringify({ type: STATIC, blockId: backId })
      },
      {
        content_type: 'text',
        title: 'Go Home',
        payload: JSON.stringify({ type: STATIC, blockId: chatbot.startingBlockId })
      }
    )
    if (input) {
      messageBlock.payload[messageBlock.payload.length - 1].action = { type: DYNAMIC, action: DISCOVER_PRODUCTS, input: true }
    }
    return messageBlock
  } catch (err) {
    const message = err || 'Unable to discover products'
    logger.serverLog(message, `${TAG}: exports.getDiscoverProductsBlock`, {}, {}, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to discover products`)
  }
}

const getConfirmReturnOrderBlock = async (chatbot, backId, order) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'messenger_commerce_chatbot'
      },
      title: 'Confirm Return Request',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Are you sure you want to return this order?`,
          componentType: 'text',
          menu: [],
          quickReplies: [
            {
              content_type: 'text',
              title: 'Yes',
              payload: JSON.stringify({ type: DYNAMIC, action: RETURN_ORDER, argument: order })
            },
            {
              content_type: 'text',
              title: 'No',
              payload: JSON.stringify({ type: DYNAMIC, action: ORDER_STATUS, argument: order })
            },
            {
              content_type: 'text',
              title: 'Go Back',
              payload: JSON.stringify({ type: DYNAMIC, action: ORDER_STATUS, argument: order })
            },
            {
              content_type: 'text',
              title: 'Go Home',
              payload: JSON.stringify({ type: STATIC, blockId: chatbot.startingBlockId })
            }
          ]
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }

    return messageBlock
  } catch (err) {
    const message = err || 'Unable to remove product(s) from cart'
    logger.serverLog(message, `${TAG}: exports.getConfirmRemoveItemBlock`, {}, {}, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to remove product(s) from cart`)
  }
}

const getReturnOrderBlock = async (chatbot, contact, backId, EcommerceProvider, orderId) => {
  try {
    let returnOrderMessage = chatbot.returnOrderMessage.replace(/{{orderId}}/g, orderId)
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'messenger_commerce_chatbot'
      },
      title: 'Return Order',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: dedent(`${returnOrderMessage}`),
          componentType: 'text',
          quickReplies: [
            {
              content_type: 'text',
              title: 'Go Back',
              payload: JSON.stringify({ type: STATIC, blockId: backId })
            },
            {
              content_type: 'text',
              title: 'Go Home',
              payload: JSON.stringify({ type: STATIC, blockId: chatbot.startingBlockId })
            }
          ]
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    const message = `${contact.firstName} is requesting a return for order #${orderId}.`
    sendNotification(contact, message, chatbot.companyId)
    return messageBlock
  } catch (err) {
    const message = err || 'Unable to return order'
    logger.serverLog(message, `${TAG}: exports.getReturnOrderBlock`, {}, {}, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to return order`)
  }
}

// const getFaqsBlock = (chatbot, blockId, messageBlocks, backId) => {
//   messageBlocks.push({
//     module: {
//       id: chatbot._id,
//       type: 'messenger_commerce_chatbot'
//     },
//     title: 'FAQs',
//     uniqueId: blockId,
//     payload: [
//       {
//         text: `View our FAQs here: ${chatbot.botLinks.faqs}`,
//         componentType: 'text',
//         quickReplies: [
//           {
//             content_type: 'text',
//             title: 'Show my Cart',
//             payload: JSON.stringify({ type: DYNAMIC, action: SHOW_MY_CART })
//           },
//           {
//             content_type: 'text',
//             title: 'Go Back',
//             payload: JSON.stringify({ type: STATIC, blockId: backId })
//           },
//           {
//             content_type: 'text',
//             title: 'Go Home',
//             payload: JSON.stringify({ type: STATIC, blockId: chatbot.startingBlockId })
//           }
//         ]
//       }
//     ],
//     userId: chatbot.userId,
//     companyId: chatbot.companyId
//   })
// }

const getOrderIdBlock = (chatbot, contact, backId) => {
  try {
    const messageBlock = {
      module: {
        id: chatbot._id,
        type: 'messenger_commerce_chatbot'
      },
      title: 'Get Order ID',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: getProfileIds().includes(chatbot.companyId) ? prepareText(chatbot.companyId, 'ASK_ORDER_ID') : `Please enter your order ID`,
          componentType: 'text',
          action: { type: DYNAMIC, action: ORDER_STATUS, input: true },
          quickReplies: [
            {
              content_type: 'text',
              title: 'Go Back',
              payload: JSON.stringify({ type: STATIC, blockId: backId })
            },
            {
              content_type: 'text',
              title: 'Go Home',
              payload: JSON.stringify({ type: STATIC, blockId: chatbot.startingBlockId })
            }
          ]
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    if (chatbot.storeType !== 'shops') {
      messageBlock.payload[messageBlock.payload.length - 1].quickReplies.unshift(
        {
          content_type: 'text',
          title: 'Show my cart',
          payload: JSON.stringify({ type: DYNAMIC, action: SHOW_MY_CART })
        }
      )
    }
    return messageBlock
  } catch (err) {
    const message = err || 'Unable get search for products message block'
    logger.serverLog(message, `${TAG}: getSearchProductsBlock`, {}, {chatbot, contact}, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to notify customer support agent`)
  }
}

const getOrderStatusBlock = async (chatbot, backId, EcommerceProvider, contact, orderId) => {
  let userError = false
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'messenger_commerce_chatbot'
      },
      title: 'Order Status',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Here is your order status for order #${orderId}:\n`,
          componentType: 'text'
        },
        {
          componentType: 'gallery',
          cards: [],
          quickReplies: [
            {
              content_type: 'text',
              title: 'View Recent Orders',
              payload: JSON.stringify({ type: DYNAMIC, action: VIEW_RECENT_ORDERS })
            },
            {
              content_type: 'text',
              title: 'Go Back',
              payload: JSON.stringify({ type: STATIC, blockId: backId })
            },
            {
              content_type: 'text',
              title: 'Go Home',
              payload: JSON.stringify({ type: STATIC, blockId: chatbot.startingBlockId })
            }
          ]
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

    if (!orderStatus.cancelReason &&
      !(orderStatus.displayFinancialStatus && orderStatus.displayFinancialStatus.includes('PAID')) &&
      !(orderStatus.tags && orderStatus.tags.includes('cancel-request')) &&
      chatbot.cancelOrder
    ) {
      messageBlock.payload[0].buttons = [{
        type: 'postback',
        title: 'Cancel Order',
        payload: JSON.stringify({ type: DYNAMIC, action: CANCEL_ORDER_CONFIRM, argument: { id: orderStatus.id, orderId, isOrderFulFilled } })
      }]
    }

    if (orderStatus.cancelReason) {
      messageBlock.payload[0].text += `\n*Status*: CANCELED`
    } else {
      if (orderStatus.tags && orderStatus.tags.includes('cancel-request')) {
        messageBlock.payload[0].text += `\n*Status*: Request Open for Cancelation `
      }
      if (orderStatus.displayFinancialStatus) {
        messageBlock.payload[0].text += `\nPayment: ${orderStatus.displayFinancialStatus}`
      }
      if (orderStatus.displayFulfillmentStatus) {
        messageBlock.payload[0].text += `\nDelivery: ${orderStatus.displayFulfillmentStatus}`
      }
      if (orderStatus.displayFulfillmentStatus &&
        orderStatus.displayFulfillmentStatus === 'FULFILLED' &&
        orderStatus.displayFinancialStatus &&
        orderStatus.displayFinancialStatus.includes('PAID') &&
        chatbot.returnOrder
      ) {
        messageBlock.payload[messageBlock.payload.length - 1].quickReplies.unshift(
          {
            content_type: 'text',
            title: 'Request Return',
            payload: JSON.stringify({ type: DYNAMIC, action: CONFIRM_RETURN_ORDER, argument: orderId })
          }
        )
      }
    }
    if (isOrderFulFilled && orderStatus.fulfillments) {
      if (orderStatus.fulfillments[0]) {
        let trackingDetails = orderStatus.fulfillments[0].trackingInfo && orderStatus.fulfillments[0].trackingInfo[0] ? orderStatus.fulfillments[0].trackingInfo[0] : null
        if (trackingDetails) {
          messageBlock.payload[0].text += `\n\n*Tracking Details*`
          messageBlock.payload[0].text += `\n*Company*: ${trackingDetails.company}`
          messageBlock.payload[0].text += `\n*Number*: ${trackingDetails.number}`
          let trackingLink = {
            type: 'web_url',
            title: 'Tracking Link',
            url: trackingDetails.url && trackingDetails.url !== '' ? trackingDetails.url : utility.getTrackingUrl(trackingDetails)
          }
          if (messageBlock.payload[0].buttons) {
            messageBlock.payload[0].buttons.push(trackingLink)
          } else {
            messageBlock.payload[0].buttons = [trackingLink]
          }
        }
      }
    }
    if (orderStatus.lineItems && orderStatus.lineItems.length > 0) {
      const totalOrderPrice = orderStatus.lineItems.reduce((acc, item) => acc + Number(item.price), 0)
      const currency = orderStatus.lineItems[0].currency
      const totalOrderPriceString = currency === 'USD' ? `$${totalOrderPrice}` : `${totalOrderPrice} ${currency}`
      messageBlock.payload[0].text += `\n\nTotal Price: ${totalOrderPriceString}`
      for (let i = 0; i < orderStatus.lineItems.length; i++) {
        let product = orderStatus.lineItems[i]
        const individualPrice = Number(product.price) / Number(product.quantity)
        const priceString = currency === 'USD' ? `$${individualPrice}` : `${individualPrice} ${currency}`
        const totalPriceString = currency === 'USD' ? `$${product.price}` : `${product.price} ${currency}`
        messageBlock.payload[1].cards.push({
          image_url: product.image.originalSrc,
          title: product.name,
          subtitle: `Price: ${priceString}\nQuantity: ${product.quantity}\nTotal Price: ${totalPriceString}`
        })
      }
    }

    if (orderStatus.shippingAddress) {
      messageBlock.payload[0].text += `\n\nShipping Address: ${orderStatus.billingAddress.address1}`
      if (orderStatus.shippingAddress.address2) {
        messageBlock.payload[0].text += `, ${orderStatus.shippingAddress.address2}`
      }
      if (orderStatus.shippingAddress.city) {
        messageBlock.payload[0].text += `, ${orderStatus.shippingAddress.city}`
      }
      if (orderStatus.shippingAddress.province) {
        messageBlock.payload[0].text += `, ${orderStatus.shippingAddress.province}`
      }
      if (orderStatus.shippingAddress.zip) {
        messageBlock.payload[0].text += `, ${orderStatus.shippingAddress.zip}`
      }
      if (orderStatus.shippingAddress.country) {
        messageBlock.payload[0].text += `, ${orderStatus.shippingAddress.country}`
      }
    } else if (orderStatus.billingAddress) {
      messageBlock.payload[0].text += `\n\nShipping Address: ${orderStatus.billingAddress.address1}`
      if (orderStatus.billingAddress.address2) {
        messageBlock.payload[0].text += `, ${orderStatus.billingAddress.address2}`
      }
      if (orderStatus.billingAddress.city) {
        messageBlock.payload[0].text += `, ${orderStatus.billingAddress.city}`
      }
      if (orderStatus.billingAddress.province) {
        messageBlock.payload[0].text += `, ${orderStatus.billingAddress.province}`
      }
      if (orderStatus.billingAddress.zip) {
        messageBlock.payload[0].text += `, ${orderStatus.billingAddress.zip}`
      }
      if (orderStatus.billingAddress.country) {
        messageBlock.payload[0].text += `, ${orderStatus.billingAddress.country}`
      }
    } else if (contact.commerceCustomer && contact.commerceCustomer.defaultAddress) {
      const defaultAddress = contact.commerceCustomer.defaultAddress
      messageBlock.payload[0].text += `\n\nShipping Address: ${defaultAddress.address1}`
      if (defaultAddress.address2) {
        messageBlock.payload[0].text += `, ${defaultAddress.address2}`
      }
      if (defaultAddress.city) {
        messageBlock.payload[0].text += `, ${defaultAddress.city}`
      }
      if (defaultAddress.province) {
        messageBlock.payload[0].text += `, ${defaultAddress.province}`
      }
      if (defaultAddress.zip) {
        messageBlock.payload[0].text += `, ${defaultAddress.zip}`
      }
      if (defaultAddress.country) {
        messageBlock.payload[0].text += `, ${defaultAddress.country}`
      }
    }

    messageBlock.payload[0].text += `\n\nThis order was placed on ${new Date(orderStatus.createdAt).toLocaleString()}`

    if (!orderStatus.cancelReason) {
      messageBlock.payload[messageBlock.payload.length - 1].quickReplies.unshift(
        {
          content_type: 'text',
          title: 'Get PDF Invoice',
          payload: JSON.stringify({ type: DYNAMIC, action: GET_INVOICE, argument: orderId })
        }
      )
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

const getProductCategoriesBlock = async (chatbot, backId, EcommerceProvider, argument) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'messenger_commerce_chatbot'
      },
      title: 'Product Categories',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: getProfileIds().includes(chatbot.companyId) ? prepareText(chatbot.companyId, 'PRODUCT_CATEGORIES') : 'Please select a category:',
          componentType: 'text',
          menu: [],
          quickReplies: []
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    let productCategories = await EcommerceProvider.fetchAllProductCategories(
      argument.paginationParams,
      chatbot.catalogId
    )
    for (let i = 0; i < productCategories.length; i++) {
      let category = productCategories[i]
      messageBlock.payload[0].quickReplies.push({
        content_type: 'text',
        title: category.name,
        payload: JSON.stringify({ type: DYNAMIC, action: DISCOVER_PRODUCTS, argument: {categoryId: category.id} })
      })
    }
    if (productCategories.nextPageParameters) {
      messageBlock.payload[0].quickReplies.push({
        content_type: 'text',
        title: 'View More',
        payload: JSON.stringify({ type: DYNAMIC, action: PRODUCT_CATEGORIES, argument: {paginationParams: productCategories.nextPageParameters} })
      })
    }
    if (chatbot.storeType !== 'shops') {
      messageBlock.payload[messageBlock.payload.length - 1].quickReplies.push(
        {
          content_type: 'text',
          title: 'Show my cart',
          payload: JSON.stringify({ type: DYNAMIC, action: SHOW_MY_CART })
        }
      )
    }
    messageBlock.payload[0].quickReplies.push(
      {
        content_type: 'text',
        title: 'Go Back',
        payload: JSON.stringify({ type: STATIC, blockId: backId })
      },
      {
        content_type: 'text',
        title: 'Go Home',
        payload: JSON.stringify({ type: STATIC, blockId: chatbot.startingBlockId })
      }
    )
    return messageBlock
  } catch (err) {
    const message = err || 'Unable to get product categories'
    logger.serverLog(message, `${TAG}: exports.getProductCategoriesBlock`, {}, {}, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to get product categories`)
  }
}

const getProductVariantsBlock = async (chatbot, backId, contact, EcommerceProvider, argument) => {
  try {
    const product = argument.product
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'messenger_commerce_chatbot'
      },
      title: 'Product Variants',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Please select from the following options for ${product.name}:`,
          componentType: 'text'
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    let productVariants = await EcommerceProvider.getVariantsOfSelectedProduct(product.id, chatbot.numberOfProducts)
    let storeInfo = await EcommerceProvider.fetchStoreInfo()
    // if (productVariants.length === 1) {
    //   const productVariant = productVariants[0]
    //   messageBlock = await getSelectProductBlock(chatbot, backId, {
    //     variant_id: productVariant.id,
    //     product_id: productVariant.product_id,
    //     product: `${productVariant.name} ${product.name}`,
    //     price: productVariant.price ? productVariant.price : product.price,
    //     inventory_quantity: productVariant.inventory_quantity,
    //     currency: storeInfo.currency,
    //     image: productVariant.image ? productVariant.image : product.image
    //   })
    //   return messageBlock
    // }
    if (productVariants.length > 0) {
      messageBlock.payload.push({
        componentType: 'gallery',
        cards: [],
        quickReplies: []
      })
      for (let i = 0; i < productVariants.length; i++) {
        let productVariant = productVariants[i]
        let priceString = storeInfo.currency === 'USD' ? `Price: $${productVariant.price ? productVariant.price : product.price}` : `Price: ${productVariant.price ? productVariant.price : product.price} ${storeInfo.currency}`
        messageBlock.payload[1].cards.push({
          title: `${productVariant.name} ${product.name}`,
          subtitle: priceString
        })
        if (productVariant.inventory_quantity > 0) {
          messageBlock.payload[1].cards[i].image_url = productVariant.image ? productVariant.image : product.image
          if (chatbot.storeType === 'shops') {
            messageBlock.payload[1].cards[i].buttons = [{
              type: 'web_url',
              title: 'Add to Cart',
              url: productVariant.url
            }]
          } else {
            messageBlock.payload[1].cards[i].buttons = [{
              title: 'Add to Cart',
              type: 'postback',
              payload: JSON.stringify({
                type: DYNAMIC,
                action: ADD_TO_CART,
                argument: {
                  product: {
                    variant_id: productVariant.id,
                    product_id: productVariant.product_id,
                    product: `${productVariant.name} ${product.name}`,
                    price: productVariant.price ? productVariant.price : product.price,
                    inventory_quantity: productVariant.inventory_quantity,
                    currency: storeInfo.currency,
                    image: productVariant.image ? productVariant.image : product.image
                  },
                  quantity: 1
                }
              })
            }]
          }
          messageBlock.payload[1].cards[i].subtitle += `\nStock Available: ${productVariant.inventory_quantity}`
        } else {
          messageBlock.payload[1].cards[i].image_url = productVariant.image ? productVariant.image : product.image
          messageBlock.payload[1].cards[i].subtitle += `\nOut of Stock`
        }
      }
      if (productVariants.nextPageParameters) {
        messageBlock.payload[1].cards.push({
          title: 'View More',
          subtitle: `Click on the "View More" button to view more options`,
          buttons: [{
            title: 'View More',
            type: 'postback',
            payload: JSON.stringify({ type: DYNAMIC, action: PRODUCT_VARIANTS, argument: { product, paginationParams: productVariants.nextPageParameters } })
          }]
        })
      }
    }
    if (chatbot.storeType !== 'shops') {
      messageBlock.payload[messageBlock.payload.length - 1].quickReplies.push(
        {
          content_type: 'text',
          title: 'Show my cart',
          payload: JSON.stringify({ type: DYNAMIC, action: SHOW_MY_CART })
        }
      )
    }
    messageBlock.payload[messageBlock.payload.length - 1].quickReplies.push(
      {
        content_type: 'text',
        title: 'Go Back',
        payload: JSON.stringify({ type: STATIC, blockId: backId })
      },
      {
        content_type: 'text',
        title: 'Go Home',
        payload: JSON.stringify({ type: STATIC, blockId: chatbot.startingBlockId })
      }
    )
    return messageBlock
  } catch (err) {
    const message = err || 'Unable to get product variants'
    logger.serverLog(message, `${TAG}: exports.getProductVariantsBlock`, {}, {}, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to get product variants`)
  }
}

const getSelectProductBlock = async (chatbot, backId, product) => {
  try {
    let priceString = product.currency === 'USD' ? `$${product.price}` : `${product.price} ${product.currency}`
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'messenger_commerce_chatbot'
      },
      title: 'Select Product',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: dedent(`You have selected ${product.product} (price: ${priceString}).\n
                  ${DEFAULT_TEXT}:`),
          componentType: 'text',
          quickReplies: [
            {
              content_type: 'text',
              title: 'Add to Cart',
              payload: JSON.stringify({ type: DYNAMIC, action: ADD_TO_CART, argument: {product, quantity: 1} })
            }
          ]
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    if (chatbot.storeType !== 'shops') {
      messageBlock.payload[messageBlock.payload.length - 1].quickReplies.push(
        {
          content_type: 'text',
          title: 'Show my cart',
          payload: JSON.stringify({ type: DYNAMIC, action: SHOW_MY_CART })
        }
      )
    }
    messageBlock.payload[messageBlock.payload.length - 1].quickReplies.push(
      {
        content_type: 'text',
        title: 'Go Back',
        payload: JSON.stringify({ type: STATIC, blockId: backId })
      },
      {
        content_type: 'text',
        title: 'Go Home',
        payload: JSON.stringify({ type: STATIC, blockId: chatbot.startingBlockId })
      }
    )
    return messageBlock
  } catch (err) {
    const message = err || 'Unable to get product variants'
    logger.serverLog(message, `${TAG}: exports.getProductVariantsBlock`, {}, {}, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to get product variants`)
  }
}

// const getQuantityToAddBlock = async (chatbot, backId, contact, product) => {
//   try {
//     let priceString = product.currency === 'USD' ? `$${product.price}` : `${product.price} ${product.currency}`
//     let messageBlock = {
//       module: {
//         id: chatbot._id,
//         type: 'messenger_commerce_chatbot'
//       },
//       title: 'Quantity to Add',
//       uniqueId: '' + new Date().getTime(),
//       payload: [
//         {
//           componentType: 'gallery',
//           cards: [
//             {
//               image_url: product.image,
//               title: product.product,
//               subtitle: `Price: ${priceString}\nStock Available: ${product.inventory_quantity}`
//             }
//           ]
//         },
//         {
//           text: ``,
//           componentType: 'text',
//           action: { type: DYNAMIC, action: ADD_TO_CART, argument: product, input: true },
//           quickReplies: [
//             {
//               content_type: 'text',
//               title: 'Show my Cart',
//               payload: JSON.stringify({ type: DYNAMIC, action: SHOW_MY_CART })
//             },
//             {
//               content_type: 'text',
//               title: 'Go Back',
//               payload: JSON.stringify({ type: STATIC, blockId: backId })
//             },
//             {
//               content_type: 'text',
//               title: 'Go Home',
//               payload: JSON.stringify({ type: STATIC, blockId: chatbot.startingBlockId })
//             }
//           ]
//         }
//       ],
//       userId: chatbot.userId,
//       companyId: chatbot.companyId
//     }
//     let shoppingCart = contact.shoppingCart ? contact.shoppingCart : []
//     let existingProductIndex = shoppingCart.findIndex((item) => item.variant_id === product.variant_id)
//     if (existingProductIndex > -1) {
//       if (shoppingCart[existingProductIndex].quantity >= product.inventory_quantity) {
//         let text = `Your cart already contains the maximum stock available for this product.`
//         return getShowMyCartBlock(chatbot, backId, contact, text)
//       } else {
//         messageBlock.payload[1].text = `How many ${product.product}s would you like to add to your cart?\n\nYou already have ${shoppingCart[existingProductIndex].quantity} in your cart.`
//       }
//     } else {
//       messageBlock.payload[1].text = `How many ${product.product}s would you like to add to your cart?`
//     }
//     return messageBlock
//   } catch (err) {
//     const message = err || 'Unable to add product variants'
//     logger.serverLog(message, `${TAG}: exports.getQuantityToAddBlock`, {}, {}, 'error')
//     throw new Error(`${ERROR_INDICATOR}Unable to add product(s) to cart`)
//   }
// }

const getAddToCartBlock = async (chatbot, backId, contact, {product, quantity}) => {
  let userError = false
  try {
    quantity = Number(quantity)
    if (!Number.isInteger(quantity) || quantity <= 0) {
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
    updateSubscriber({ _id: contact._id }, { shoppingCart, commerceCustomer: contact.commerceCustomer }, null, {})
    let text = `${quantity} ${product.product}${quantity !== 1 ? 's have' : ' has'} been succesfully added to your cart.`
    return getShowMyCartBlock(chatbot, backId, contact, text)
  } catch (err) {
    if (!userError) {
      const message = err || 'Unable to add to cart'
      logger.serverLog(message, `${TAG}: exports.getAddToCartBlock`, {}, {}, 'error')
    }
    if (err.message) {
      throw new Error(`${ERROR_INDICATOR}${err.message}`)
    } else {
      throw new Error(`${ERROR_INDICATOR}Unable to add to cart`)
    }
  }
}

const getShowMyCartBlock = async (chatbot, backId, contact, optionalText, showButtons = true, orderId) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'messenger_commerce_chatbot'
      },
      title: 'Show My Cart',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: optionalText ? `${optionalText}\n\n` : '',
          componentType: 'text',
          quickReplies: []
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }

    let shoppingCart = contact.shoppingCart
    if (!shoppingCart || shoppingCart.length === 0) {
      messageBlock.payload[0].text += `You have no items in your cart.`
    } else {
      messageBlock.payload.push({
        componentType: 'gallery',
        cards: [],
        quickReplies: []
      })
      messageBlock.payload[0].text += showButtons ? `Here is your cart.` : `Here is your order.`
      let totalPrice = 0
      let currency = ''
      for (let i = 0; i < shoppingCart.length; i++) {
        let product = shoppingCart[i]
        if (!currency) {
          currency = product.currency
        }
        let price = product.quantity * product.price
        price = Number(price.toFixed(2))
        totalPrice += price

        let priceString = currency === 'USD' ? `$${product.price}` : `${product.price} ${currency}`
        let totalPriceString = currency === 'USD' ? `$${price}` : `${price} ${currency}`
        messageBlock.payload[1].cards.push({
          image_url: product.image,
          title: product.product,
          subtitle: `Price: ${priceString}\nQuantity: ${product.quantity}\nTotal Price: ${totalPriceString}`,
          buttons: showButtons ? [
            {
              title: 'Update Quantity',
              type: 'postback',
              payload: JSON.stringify({ type: DYNAMIC, action: QUANTITY_TO_UPDATE, argument: { ...product, productIndex: i } })
            },
            {
              title: 'Remove',
              type: 'postback',
              payload: JSON.stringify({ type: DYNAMIC, action: CONFIRM_TO_REMOVE_CART_ITEM, argument: { ...product, productIndex: i } })
            }
          ] : undefined
        })
      }
      let totalPriceString = currency === 'USD' ? `$${totalPrice}` : `${totalPrice} ${currency}`
      messageBlock.payload[0].text += ` Total price is: ${totalPriceString}.`

      if (orderId) {
        messageBlock.payload[messageBlock.payload.length - 1].quickReplies.push(
          {
            content_type: 'text',
            title: 'Get PDF Invoice',
            payload: JSON.stringify({ type: DYNAMIC, action: GET_INVOICE, argument: orderId })
          }
        )
      }

      if (showButtons) {
        messageBlock.payload[messageBlock.payload.length - 1].quickReplies.push(
          {
            content_type: 'text',
            title: 'Clear cart',
            payload: JSON.stringify({ type: DYNAMIC, action: CONFIRM_CLEAR_CART })
          }
        )
        if (chatbot.enabledFeatures.commerceBotFeatures.preSales.createOrder) {
          messageBlock.payload[messageBlock.payload.length - 1].quickReplies.push(
            {
              content_type: 'text',
              title: 'Proceed to Checkout',
              payload: JSON.stringify({ type: DYNAMIC, action: ASK_PAYMENT_METHOD })
            }
          )
        }
      }
    }
    messageBlock.payload[messageBlock.payload.length - 1].quickReplies.push(
      {
        content_type: 'text',
        title: 'Go Home',
        payload: JSON.stringify({ type: STATIC, blockId: chatbot.startingBlockId })
      }
    )
    if (!optionalText) {
      messageBlock.payload[messageBlock.payload.length - 1].quickReplies.push({
        content_type: 'text',
        title: 'Go Back',
        payload: JSON.stringify({ type: STATIC, blockId: backId })
      })
    }
    return messageBlock
  } catch (err) {
    const message = err || 'Unable to show cart'
    logger.serverLog(message, `${TAG}: exports.getShowMyCartBlock`, {}, {}, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to show cart`)
  }
}

const getRemoveFromCartBlock = async (chatbot, backId, contact, productInfo, quantity) => {
  let userError = false
  try {
    let shoppingCart = contact.shoppingCart ? contact.shoppingCart : []
    let existingProductIndex = shoppingCart.findIndex((item) => item.variant_id === productInfo.variant_id)
    if (existingProductIndex === -1) {
      let text = `This product no longer exists in your cart`
      return getShowMyCartBlock(chatbot, backId, contact, text)
    }
    if (!quantity) {
      quantity = productInfo.quantity
    }
    quantity = Number(quantity)
    if (!Number.isInteger(quantity) || quantity < 0) {
      userError = true
      throw new Error(`${ERROR_INDICATOR}Invalid quantity given.`)
    }
    shoppingCart[productInfo.productIndex].quantity -= quantity
    if (shoppingCart[productInfo.productIndex].quantity === 0) {
      shoppingCart.splice(productInfo.productIndex, 1)
    } else if (shoppingCart[productInfo.productIndex].quantity < 0) {
      userError = true
      throw new Error(`${ERROR_INDICATOR}Invalid quantity given.`)
    }
    if (contact.commerceCustomer) {
      contact.commerceCustomer.cartId = null
    }
    updateSubscriber({ _id: contact._id }, { shoppingCart, commerceCustomer: contact.commerceCustomer }, null, {})
    let text = `${quantity} ${productInfo.product}${quantity !== 1 ? 's have' : 'has'} been succesfully removed from your cart.`
    return getShowMyCartBlock(chatbot, backId, contact, text)
  } catch (err) {
    if (!userError) {
      const message = err || 'Unable to remove item(s) from cart'
      logger.serverLog(message, `${TAG}: exports.getRemoveFromCartBlock`, {}, {}, 'error')
    }
    if (err.message) {
      throw new Error(`${ERROR_INDICATOR}${err.message}`)
    } else {
      throw new Error(`${ERROR_INDICATOR}Unable to remove item(s) from cart`)
    }
  }
}

// const getQuantityToRemoveBlock = async (chatbot, backId, product) => {
//   try {
//     let priceString = product.currency === 'USD' ? `$${product.price}` : `${product.price} ${product.currency}`
//     let messageBlock = {
//       module: {
//         id: chatbot._id,
//         type: 'messenger_commerce_chatbot'
//       },
//       title: 'Quantity to Remove',
//       uniqueId: '' + new Date().getTime(),
//       payload: [
//         {
//           text: `How many ${product.product}s would you like to remove from your cart?\n\nYou currently have ${product.quantity} in your cart.\n\n(price: ${priceString})`,
//           componentType: 'text',
//           action: { type: DYNAMIC, action: REMOVE_FROM_CART, argument: product, input: true },
//           quickReplies: [
//             {
//               content_type: 'text',
//               title: 'Show my Cart',
//               payload: JSON.stringify({ type: DYNAMIC, action: SHOW_MY_CART })
//             },
//             {
//               content_type: 'text',
//               title: 'Go Back',
//               payload: JSON.stringify({ type: STATIC, blockId: backId })
//             },
//             {
//               content_type: 'text',
//               title: 'Go Home',
//               payload: JSON.stringify({ type: STATIC, blockId: chatbot.startingBlockId })
//             }
//           ]
//         }
//       ],
//       userId: chatbot.userId,
//       companyId: chatbot.companyId
//     }
//     return messageBlock
//   } catch (err) {
//     const message = err || 'Unable to remove product(s) from cart'
//     logger.serverLog(message, `${TAG}: exports.getQuantityToRemoveBlock`, {}, {}, 'error')
//     throw new Error(`${ERROR_INDICATOR}Unable to remove product(s) from cart`)
//   }
// }

const confirmClearCart = (chatbot, contact) => {
  let messageBlock = {
    module: {
      id: chatbot._id,
      type: 'messenger_commerce_chatbot'
    },
    title: 'Are you sure you want empty your cart?',
    uniqueId: '' + new Date().getTime(),
    payload: [
      {
        text: `Are you sure you want to empty your cart?`,
        componentType: 'text',
        quickReplies: [
          {
            content_type: 'text',
            title: 'Yes',
            payload: JSON.stringify({ type: DYNAMIC, action: CLEAR_CART })
          },
          {
            content_type: 'text',
            title: 'No',
            payload: JSON.stringify({ type: DYNAMIC, action: SHOW_MY_CART })
          },
          {
            content_type: 'text',
            title: 'Go Back',
            payload: JSON.stringify({ type: DYNAMIC, action: SHOW_MY_CART })
          },
          {
            content_type: 'text',
            title: 'Go Home',
            payload: JSON.stringify({ type: STATIC, blockId: chatbot.startingBlockId })
          }
        ]
      }
    ],
    userId: chatbot.userId,
    companyId: chatbot.companyId
  }

  return messageBlock
}

const clearCart = async (chatbot, contact) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'messenger_commerce_chatbot'
      },
      title: 'Your cart has been successfully cleared',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Your cart is now empty.`,
          componentType: 'text',
          quickReplies: [
            {
              content_type: 'text',
              title: 'Go Home',
              payload: JSON.stringify({ type: STATIC, blockId: chatbot.startingBlockId })
            }
          ]
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    let shoppingCart = []
    if (contact.commerceCustomer) {
      contact.commerceCustomer.cartId = null
    }
    updateSubscriber({ _id: contact._id }, { shoppingCart, commerceCustomer: contact.commerceCustomer }, {})
    return messageBlock
  } catch (err) {
    const message = err || 'Unable to clear cart'
    logger.serverLog(message, `${TAG}: exports.clearCart`, {}, {}, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to clear cart`)
  }
}

const updateSubscriber = (query, newPayload, options) => {
  return callApi(`subscribers/update`, 'put', {
    query,
    newPayload,
    options: {}
  })
}

const getCheckoutInfoBlock = async (chatbot, contact, EcommerceProvider, backId, argument, userInput) => {
  let userError = false
  try {
    let messageBlock = null
    if (userInput && argument.updatingZip) {
      argument.address.zip = userInput
    }
    const address = argument.address ? argument.address : contact.commerceCustomer ? contact.commerceCustomer.defaultAddress : null
    let yesAction = null
    if (address && argument.paymentMethod === 'cod') {
      yesAction = { type: DYNAMIC, action: PROCEED_TO_CHECKOUT, argument: {...argument, address} }
    } else if (!address && argument.paymentMethod === 'cod') {
      yesAction = { type: DYNAMIC, action: ASK_ADDRESS, argument: {...argument} }
    } else {
      yesAction = { type: DYNAMIC, action: PROCEED_TO_CHECKOUT, argument: {...argument} }
    }
    if (argument.updatingZip || (!argument.newEmail && contact.commerceCustomer && contact.commerceCustomer.email)) {
      if (argument.updatingZip) {
        argument.updatingZip = false
      }
      if (!contact.emailVerified) {
        return getEmailOtpBlock(chatbot, contact, EcommerceProvider, backId, {...argument, newEmail: true}, argument.newEmail ? argument.newEmail : contact.commerceCustomer.email)
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
            quickReplies: [
              {
                content_type: 'text',
                title: 'Yes, proceed to checkout',
                payload: JSON.stringify(yesAction)
              }
            ]
          }
        ],
        userId: chatbot.userId,
        companyId: chatbot.companyId
      }
      messageBlock.payload[0].text += `Would you like to use the current information for checkout?`
      messageBlock.payload[0].text += `\n\nEmail: ${argument.newEmail ? argument.newEmail : contact.commerceCustomer.email}`

      if (address && argument.paymentMethod === 'cod') {
        messageBlock.payload[0].text += `\n\nAddress: ${address.address1}, ${address.city} ${address.zip}, ${address.country}`
        messageBlock.payload[0].quickReplies.push(
          {
            content_type: 'text',
            title: 'No, update address',
            payload: JSON.stringify({ type: DYNAMIC, action: UPDATE_ADDRESS_BLOCK, argument: {...argument, address} })
          }
        )
      }
      messageBlock.payload[0].quickReplies.push(
        {
          content_type: 'text',
          title: 'Go Back',
          payload: JSON.stringify({ type: STATIC, blockId: backId })
        },
        {
          content_type: 'text',
          title: 'Go Home',
          payload: JSON.stringify({ type: STATIC, blockId: chatbot.startingBlockId })
        }
      )
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
            action: { type: DYNAMIC, action: GET_EMAIL_OTP, argument: {...argument, newEmail: true}, input: true },
            quickReplies: [
              {
                content_type: 'text',
                title: 'Go Back',
                payload: JSON.stringify({ type: STATIC, blockId: backId })
              },
              {
                content_type: 'text',
                title: 'Go Home',
                payload: JSON.stringify({ type: STATIC, blockId: chatbot.startingBlockId })
              }
            ]
          }
        ],
        userId: chatbot.userId,
        companyId: chatbot.companyId
      }
    }
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
        platform: 'messenger',
        commercePlatform: 'shopify',
        subscriberId: contact._id,
        emailAddress: userInput,
        storeName: storeInfo.name
      })
        .then(created => {
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
          action: { type: DYNAMIC, action: GET_VERIFY_OTP, argument: {...argument}, input: true },
          quickReplies: [
            {
              content_type: 'text',
              title: 'Go Back',
              payload: JSON.stringify({ type: STATIC, blockId: backId })
            },
            {
              content_type: 'text',
              title: 'Go Home',
              payload: JSON.stringify({ type: STATIC, blockId: chatbot.startingBlockId })
            }
          ]
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
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
        platform: 'messenger',
        commercePlatform: 'shopify',
        subscriberId: contact._id,
        emailAddress: argument.newEmail,
        otp: otpInput
      })
      if (otpRecord !== 'otp matched') {
        userError = true
        throw new Error('OTP is invalid or expired.')
      }
      await updateSubscriber({ _id: contact._id }, { emailVerified: true }, null, {})
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
          quickReplies: [
            {
              content_type: 'text',
              title: 'Yes, proceed to checkout',
              payload: JSON.stringify({ type: DYNAMIC, action: argument.address ? GET_CHECKOUT_INFO : ASK_ADDRESS, argument: {...argument} })
            },
            {
              content_type: 'text',
              title: 'Go Back',
              payload: JSON.stringify({ type: STATIC, blockId: backId })
            },
            {
              content_type: 'text',
              title: 'Go Home',
              payload: JSON.stringify({ type: STATIC, blockId: chatbot.startingBlockId })
            }
          ]
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
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

const getCheckoutEmailBlock = async (chatbot, contact, backId, newEmail) => {
  try {
    let messageBlock = null
    if (!newEmail && contact.commerceCustomer && contact.commerceCustomer.email) {
      messageBlock = {
        module: {
          id: chatbot._id,
          type: 'messenger_commerce_chatbot'
        },
        title: 'Checkout Email',
        uniqueId: '' + new Date().getTime(),
        payload: [
          {
            text: `Would you like to use ${contact.commerceCustomer.email} as your email?`,
            componentType: 'text',
            quickReplies: [
              {
                content_type: 'text',
                title: 'Yes',
                payload: JSON.stringify({ type: DYNAMIC, action: ASK_PAYMENT_METHOD })
              },
              {
                content_type: 'text',
                title: 'No',
                payload: JSON.stringify({ type: DYNAMIC, action: GET_CHECKOUT_EMAIL, argument: true })
              },
              {
                content_type: 'text',
                title: 'Go Back',
                payload: JSON.stringify({ type: STATIC, blockId: backId })
              },
              {
                content_type: 'text',
                title: 'Go Home',
                payload: JSON.stringify({ type: STATIC, blockId: chatbot.startingBlockId })
              }
            ]
          }
        ],
        userId: chatbot.userId,
        companyId: chatbot.companyId
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
            action: { type: DYNAMIC, action: ASK_PAYMENT_METHOD, input: true },
            quickReplies: [
              {
                content_type: 'text',
                title: 'Go Back',
                payload: JSON.stringify({ type: STATIC, blockId: backId })
              },
              {
                content_type: 'text',
                title: 'Go Home',
                payload: JSON.stringify({ type: STATIC, blockId: chatbot.startingBlockId })
              }
            ]
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

const getCheckoutBlock = async (chatbot, backId, EcommerceProvider, contact, argument) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'messenger_commerce_chatbot'
      },
      title: 'Checkout Link',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: ``,
          componentType: 'text',
          quickReplies: [
            {
              content_type: 'text',
              title: 'Go Home',
              payload: JSON.stringify({ type: STATIC, blockId: chatbot.startingBlockId })
            }
          ]
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }

    let commerceCustomer = null
    if (argument.newEmail) {
      commerceCustomer = await EcommerceProvider.searchCustomerUsingEmail(argument.newEmail)
      if (commerceCustomer.length === 0) {
        commerceCustomer = await EcommerceProvider.createCustomer(contact.firstName, contact.lastName, argument.newEmail, argument.address)
      } else {
        commerceCustomer = commerceCustomer[0]
      }
    } else {
      commerceCustomer = contact.commerceCustomer
    }

    let checkoutLink = ''
    let text = ''
    let orderId = ''
    if (argument.paymentMethod === 'cod') {
      if (chatbot.storeType === commerceConstants.shopify) {
        const testOrderCart = contact.shoppingCart.map((item) => {
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
          orderId = order.name.replace('#', '')
          text += `Thank you for shopping at ${storeInfo.name}. We have received your order. Please note the order id given below to track your order:\n\n${orderId}`
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
        commerceCustomer.cartId = bigcommerceCart.id
        checkoutLink = await EcommerceProvider.createPermalinkForCartBigCommerce(bigcommerceCart.id)
        checkoutLink = checkoutLink.data.cart_url
      }
      if (checkoutLink) {
        messageBlock.payload[0].buttons = [{
          type: 'web_url',
          title: 'Proceed to Checkout',
          url: checkoutLink
        }]
      } else {
        throw new Error()
      }
    }

    commerceCustomer.defaultAddress = argument.address

    updateSubscriber({ _id: contact._id }, { shoppingCart: [], commerceCustomer }, null, {})

    if (argument.paymentMethod === 'cod' && chatbot.storeType === commerceConstants.shopify) {
      return getShowMyCartBlock(chatbot, backId, contact, text, false, orderId)
    }
    return messageBlock
  } catch (err) {
    const message = err || 'Unable to checkout'
    logger.serverLog(message, `${TAG}: exports.getCheckoutBlock`, {}, {}, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to show checkout`)
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
          buttons: [
            {
              type: 'postback',
              title: 'Unpause Chatbot',
              payload: JSON.stringify({ type: STATIC, action: UNPAUSE_CHATBOT })
            }
          ]
        }
      ]
    }
    return messageBlock
  } catch (err) {
    const message = err || 'Unable to allow for unpause chatbot'
    logger.serverLog(message, `${TAG}: allowUnpauseChatbotBlock`, {}, {contact}, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to allow for unpause chatbot`)
  }
}

const getRecentOrdersBlock = async (chatbot, backId, contact, EcommerceProvider) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'messenger_commerce_chatbot'
      },
      title: 'Recent Orders',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: ``,
          componentType: 'text',
          quickReplies: []
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    let recentOrders = []
    if (contact.commerceCustomer) {
      recentOrders = await EcommerceProvider.findCustomerOrders(contact.commerceCustomer.id, 9)
      recentOrders = recentOrders.orders
      if (recentOrders.length > 0) {
        messageBlock.payload.push(
          {
            componentType: 'gallery',
            cards: [],
            quickReplies: []
          }
        )
        messageBlock.payload[0].text = getProfileIds().includes(chatbot.companyId) ? prepareText(chatbot.companyId, 'ASK_ORDER_ID') : 'Here are your recently placed orders. Select an order to view its status or enter an order ID:'
        for (let i = 0; i < recentOrders.length; i++) {
          let orderTitle
          if (!recentOrders[i].cancelReason) {
            orderTitle = `Order ${recentOrders[i].name}`
          } else {
            orderTitle = `(Canceled) Order ${recentOrders[i].name}`
          }
          const totalPrice = Number(recentOrders[i].totalPriceSet.presentmentMoney.amount)
          const currency = recentOrders[i].totalPriceSet.presentmentMoney.currencyCode
          const totalPriceString = currency === 'USD' ? `$${totalPrice}` : `${totalPrice} ${currency}`
          messageBlock.payload[1].cards.push({
            image_url: recentOrders[i].lineItems[0].image.originalSrc,
            title: orderTitle,
            subtitle: `Date/time: ${new Date(recentOrders[i].createdAt).toLocaleString()}\nTotal Price: ${totalPriceString}`,
            buttons: [
              {
                title: 'View Status',
                type: 'postback',
                payload: JSON.stringify({ type: DYNAMIC, action: ORDER_STATUS, argument: recentOrders[i].name.substr(1) })
              }
            ]
          })
        }
      } else {
        messageBlock.payload[0].text = getProfileIds().includes(chatbot.companyId) ? prepareText(chatbot.companyId, 'ASK_ORDER_ID') : 'You have not placed any orders within the last 60 days. If you have an order ID, you can enter that to view its status.'
      }
    } else {
      messageBlock.payload[0].text = getProfileIds().includes(chatbot.companyId) ? prepareText(chatbot.companyId, 'ASK_ORDER_ID') : 'You have not placed any orders yet. If you have an order ID, you can enter that to view its status.'
    }

    messageBlock.payload[messageBlock.payload.length - 1].action = { type: DYNAMIC, action: ORDER_STATUS, input: true }

    messageBlock.payload[messageBlock.payload.length - 1].quickReplies.push(
      {
        content_type: 'text',
        title: 'Show my Cart',
        payload: JSON.stringify({ type: DYNAMIC, action: SHOW_MY_CART })
      },
      {
        content_type: 'text',
        title: 'Go Back',
        payload: JSON.stringify({ type: STATIC, blockId: backId })
      },
      {
        content_type: 'text',
        title: 'Go Home',
        payload: JSON.stringify({ type: STATIC, blockId: chatbot.startingBlockId })
      }
    )
    return messageBlock
  } catch (err) {
    const message = err || 'Unable to get recent orders'
    logger.serverLog(message, `${TAG}: exports.getRecentOrdersBlock`, {}, {}, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to get recent orders.`)
  }
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
      break
    } else if (messageBlock.payload[i].text) {
      messageBlock.payload[i].text = `${errMessage}\n\n` + messageBlock.payload[i].text
      break
    }
  }
  return messageBlock
}

const getQuantityToUpdateBlock = async (chatbot, backId, product, contact) => {
  try {
    let shoppingCart = contact.shoppingCart ? contact.shoppingCart : []
    let existingProductIndex = shoppingCart.findIndex((item) => item.variant_id === product.variant_id)
    if (existingProductIndex === -1) {
      product.quantity = 0
    }
    let priceString = product.currency === 'USD' ? `$${product.price}` : `${product.price} ${product.currency}`
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'messenger_commerce_chatbot'
      },
      title: 'Quantity to Update',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          componentType: 'gallery',
          cards: [
            {
              image_url: product.image,
              title: product.product,
              subtitle: `Price: ${priceString}\nStock Available: ${product.inventory_quantity}`
            }
          ]
        },
        {
          text: `What quantity would you like to set for ${product.product}?\n\nYou currently have ${product.quantity} in your cart.`,
          componentType: 'text',
          action: { type: DYNAMIC, action: UPDATE_CART, argument: product, input: true },
          quickReplies: [
            {
              content_type: 'text',
              title: 'Show my Cart',
              payload: JSON.stringify({ type: DYNAMIC, action: SHOW_MY_CART })
            },
            {
              content_type: 'text',
              title: 'Go Back',
              payload: JSON.stringify({ type: DYNAMIC, action: SHOW_MY_CART })
            },
            {
              content_type: 'text',
              title: 'Go Home',
              payload: JSON.stringify({ type: STATIC, blockId: chatbot.startingBlockId })
            }
          ]
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    return messageBlock
  } catch (err) {
    const message = err || 'Unable to update product(s) in cart'
    logger.serverLog(message, `${TAG}: exports.getQuantityToUpdateBlock`, {}, {}, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to update product(s) in cart`)
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
    updateSubscriber({ _id: contact._id }, { shoppingCart, commerceCustomer: contact.commerceCustomer }, null, {})
    let text = `${product.product} quantity has been updated to ${quantity}.`
    return getShowMyCartBlock(chatbot, backId, contact, text)
  } catch (err) {
    if (!userError) {
      const message = err || 'Unable to update cart'
      logger.serverLog(message, `${TAG}: exports.getUpdateCartBlock`, {}, {}, 'error')
    }
    if (err.message) {
      throw new Error(`${ERROR_INDICATOR}${err.message}`)
    } else {
      throw new Error(`${ERROR_INDICATOR}Unable to update cart`)
    }
  }
}

const getAskPaymentMethodBlock = async (chatbot, backId, contact, newEmail) => {
  let userError = false
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'messenger_commerce_chatbot'
      },
      title: 'Ask Payment Method',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Please select a payment method`,
          componentType: 'text',
          quickReplies: [
            {
              content_type: 'text',
              title: 'Go Back',
              payload: JSON.stringify({ type: STATIC, blockId: backId })
            },
            {
              content_type: 'text',
              title: 'Go Home',
              payload: JSON.stringify({ type: STATIC, blockId: chatbot.startingBlockId })
            }
          ]
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }

    if (chatbot.storeType === 'shopify') {
      messageBlock.payload[0].quickReplies.unshift(
        {
          content_type: 'text',
          title: 'Cash on Delivery',
          payload: JSON.stringify({ type: DYNAMIC, action: GET_CHECKOUT_INFO, argument: {paymentMethod: 'cod'} })
        },
        {
          content_type: 'text',
          title: 'Electronic Payment',
          payload: JSON.stringify({ type: DYNAMIC, action: GET_CHECKOUT_INFO, argument: {paymentMethod: 'e-payment'} })
        }
      )
    } else {
      messageBlock.payload[0].quickReplies.unshift(
        {
          content_type: 'text',
          title: 'Electronic Payment',
          payload: JSON.stringify({ type: DYNAMIC, action: GET_CHECKOUT_INFO, argument: {paymentMethod: 'e-payment'} })
        }
      )
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

const getAskAddressBlock = async (chatbot, backId, contact, argument, userInput) => {
  let userError = false
  try {
    if (userInput) {
      const emailRegex = /\S+@\S+\.\S+/
      if (!emailRegex.test(userInput)) {
        userError = true
        throw new Error('Invalid Email. Please input a valid email address.')
      }
      argument.newEmail = userInput
    }
    let messageBlock = null
    if (contact.commerceCustomer &&
        contact.commerceCustomer.defaultAddress &&
        contact.commerceCustomer.defaultAddress.address1 &&
        contact.commerceCustomer.defaultAddress.city &&
        contact.commerceCustomer.defaultAddress.country &&
        contact.commerceCustomer.defaultAddress.zip
    ) {
      messageBlock = {
        module: {
          id: chatbot._id,
          type: 'messenger_commerce_chatbot'
        },
        title: 'Ask Address',
        uniqueId: '' + new Date().getTime(),
        payload: [
          {
            text: `Would you like to use your existing address as your shipping address?`,
            componentType: 'text',
            quickReplies: [
              {
                content_type: 'text',
                title: 'Yes',
                payload: JSON.stringify({ type: DYNAMIC, action: PROCEED_TO_CHECKOUT, argument: { ...argument, address: contact.commerceCustomer.defaultAddress } })
              },
              {
                content_type: 'text',
                title: 'No',
                payload: JSON.stringify({ type: DYNAMIC, action: GET_CHECKOUT_STREET_ADDRESS, argument: { ...argument, address: {address1: ''} } })
              },
              {
                content_type: 'text',
                title: 'Go Back',
                payload: JSON.stringify({ type: STATIC, blockId: backId })
              },
              {
                content_type: 'text',
                title: 'Go Home',
                payload: JSON.stringify({ type: STATIC, blockId: chatbot.startingBlockId })
              }
            ]
          }
        ],
        userId: chatbot.userId,
        companyId: chatbot.companyId
      }
      const address = contact.commerceCustomer.defaultAddress
      messageBlock.payload[0].text += `\n\nYour current existing address is ${address.address1}, ${address.city} ${address.zip}, ${address.country}`
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
            quickReplies: [
              {
                content_type: 'text',
                title: 'Go Back',
                payload: JSON.stringify({ type: STATIC, blockId: backId })
              },
              {
                content_type: 'text',
                title: 'Go Home',
                payload: JSON.stringify({ type: STATIC, blockId: chatbot.startingBlockId })
              }
            ]
          }
        ],
        userId: chatbot.userId,
        companyId: chatbot.companyId
      }
    }
    return messageBlock
  } catch (err) {
    if (!userError) {
      logger.serverLog(TAG, `Unable to input street address ${err} `, 'error')
      throw new Error(`${ERROR_INDICATOR}Unable to input street address`)
    } else {
      logger.serverLog(TAG, `Unable to input street address ${err} `, 'error')
      throw new Error(`${ERROR_INDICATOR}${err.message}`)
    }
  }
}

const getCheckoutStreetAddressBlock = async (chatbot, backId, contact, argument) => {
  try {
    const messageBlock = {
      module: {
        id: chatbot._id,
        type: 'messenger_commerce_chatbot'
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
          quickReplies: [
            {
              content_type: 'text',
              title: 'Go Back',
              payload: JSON.stringify({ type: STATIC, blockId: backId })
            },
            {
              content_type: 'text',
              title: 'Go Home',
              payload: JSON.stringify({ type: STATIC, blockId: chatbot.startingBlockId })
            }
          ]
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    return messageBlock
  } catch (err) {
    logger.serverLog(TAG, `Unable to input street address ${err} `, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to input street address`)
  }
}

const getCheckoutCityBlock = async (chatbot, backId, contact, argument, userInput) => {
  try {
    if (userInput && argument.address && !argument.address.address1) {
      argument.address.address1 = userInput
    }
    const messageBlock = {
      module: {
        id: chatbot._id,
        type: 'messenger_commerce_chatbot'
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
          quickReplies: [
            {
              content_type: 'text',
              title: 'Go Back',
              payload: JSON.stringify({ type: STATIC, blockId: backId })
            },
            {
              content_type: 'text',
              title: 'Go Home',
              payload: JSON.stringify({ type: STATIC, blockId: chatbot.startingBlockId })
            }
          ]
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }

    return messageBlock
  } catch (err) {
    logger.serverLog(TAG, `Unable to input city ${err} `, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to input city`)
  }
}

const getCheckoutCountryBlock = async (chatbot, backId, contact, argument, userInput) => {
  try {
    if (userInput && argument.address && !argument.address.city) {
      argument.address.city = userInput
    }
    const messageBlock = {
      module: {
        id: chatbot._id,
        type: 'messenger_commerce_chatbot'
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
          quickReplies: [
            {
              content_type: 'text',
              title: 'Go Back',
              payload: JSON.stringify({ type: STATIC, blockId: backId })
            },
            {
              content_type: 'text',
              title: 'Go Home',
              payload: JSON.stringify({ type: STATIC, blockId: chatbot.startingBlockId })
            }
          ]
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }

    return messageBlock
  } catch (err) {
    logger.serverLog(TAG, `Unable to input country ${err} `, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to input country`)
  }
}

const getCheckoutZipCodeBlock = async (chatbot, backId, contact, argument, userInput) => {
  try {
    if (userInput && argument.address && !argument.address.country) {
      argument.address.country = userInput
    }
    const messageBlock = {
      module: {
        id: chatbot._id,
        type: 'messenger_commerce_chatbot'
      },
      title: 'Checkout Email',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Please enter your zip code: `,
          componentType: 'text',
          action: {
            type: DYNAMIC,
            action: GET_CHECKOUT_INFO,
            input: true,
            argument: {
              ...argument,
              updatingZip: true,
              address: { ...argument.address, zip: '' }
            }
          },
          quickReplies: [
            {
              content_type: 'text',
              title: 'Go Back',
              payload: JSON.stringify({ type: STATIC, blockId: backId })
            },
            {
              content_type: 'text',
              title: 'Go Home',
              payload: JSON.stringify({ type: STATIC, blockId: chatbot.startingBlockId })
            }
          ]
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }

    return messageBlock
  } catch (err) {
    logger.serverLog(TAG, `Unable to input country ${err} `, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to input country`)
  }
}

const confirmCompleteAddress = (chatbot, backId, contact, argument, userInput) => {
  if (userInput && argument.address && !argument.address.zip) {
    argument.address.zip = userInput
  }
  let messageBlock = {
    module: {
      id: chatbot._id,
      type: 'messenger_commerce_chatbot'
    },
    title: 'Is this address confirmed?',
    uniqueId: '' + new Date().getTime(),
    payload: [
      {
        text: 'Thank you for providing address details.',
        componentType: 'text',
        quickReplies: [
          {
            content_type: 'text',
            title: 'Yes, update address',
            payload: JSON.stringify({ type: DYNAMIC, action: UPDATE_ADDRESS_BLOCK, argument })
          },
          {
            content_type: 'text',
            title: 'No, continue to checkout',
            payload: JSON.stringify({ type: DYNAMIC, action: PROCEED_TO_CHECKOUT, argument })
          },
          {
            content_type: 'text',
            title: 'Go Back',
            payload: JSON.stringify({ type: STATIC, blockId: backId })
          },
          {
            content_type: 'text',
            title: 'Go Home',
            payload: JSON.stringify({ type: STATIC, blockId: chatbot.startingBlockId })
          }
        ]
      }
    ],
    userId: chatbot.userId,
    companyId: chatbot.companyId
  }

  const address = argument.address
  messageBlock.payload[0].text += `\n\nYour given address is ${address.address1}, ${address.city} ${address.zip}, ${address.country}\n\n`

  messageBlock.payload[0].text += `Do you want to update this address before continuing with checkout?`

  return messageBlock
}

const updateAddressBlock = (chatbot, backId, contact, argument) => {
  let messageBlock = {
    module: {
      id: chatbot._id,
      type: 'messenger_commerce_chatbot'
    },
    title: 'Update in the address',
    uniqueId: '' + new Date().getTime(),
    payload: [
      {
        text: 'Select from following that you want to change in your address',
        componentType: 'text',
        quickReplies: [
          {
            content_type: 'text',
            title: 'Update Street Address',
            payload: JSON.stringify({ type: DYNAMIC, action: UPDATE_CHECKOUT_STREET_ADDRESS, argument })
          },
          {
            content_type: 'text',
            title: 'Update City',
            payload: JSON.stringify({ type: DYNAMIC, action: UPDATE_CHECKOUT_CITY, argument })
          },
          {
            content_type: 'text',
            title: 'Update Country',
            payload: JSON.stringify({ type: DYNAMIC, action: UPDATE_CHECKOUT_COUNTRY, argument })
          },
          {
            content_type: 'text',
            title: 'Update ZIP Code',
            payload: JSON.stringify({ type: DYNAMIC, action: UPDATE_CHECKOUT_ZIP_CODE, argument })
          },
          {
            content_type: 'text',
            title: 'Go Back',
            payload: JSON.stringify({ type: STATIC, blockId: backId })
          },
          {
            content_type: 'text',
            title: 'Go Home',
            payload: JSON.stringify({ type: STATIC, blockId: chatbot.startingBlockId })
          }
        ]
      }
    ],
    userId: chatbot.userId,
    companyId: chatbot.companyId
  }

  return messageBlock
}

const updateCheckoutStreetAddressBlock = async (chatbot, backId, contact, argument) => {
  try {
    const messageBlock = {
      module: {
        id: chatbot._id,
        type: 'messenger_commerce_chatbot'
      },
      title: 'Update street address for checkout',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Your current given street address is ${argument.address.address1}\n\nPlease enter the new street address: `,
          componentType: 'text',
          action: {
            type: DYNAMIC,
            action: GET_NEW_CHECKOUT_STREET_ADDRESS,
            input: true,
            argument
          },
          quickReplies: [
            {
              content_type: 'text',
              title: 'Go Back',
              payload: JSON.stringify({ type: STATIC, blockId: backId })
            },
            {
              content_type: 'text',
              title: 'Go Home',
              payload: JSON.stringify({ type: STATIC, blockId: chatbot.startingBlockId })
            }
          ]
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }

    return messageBlock
  } catch (err) {
    logger.serverLog(TAG, `Unable to input street address ${err} `, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to input street address`)
  }
}

const updateCheckoutCityBlock = async (chatbot, backId, contact, argument) => {
  try {
    const messageBlock = {
      module: {
        id: chatbot._id,
        type: 'messenger_commerce_chatbot'
      },
      title: 'Update city for checkout',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Your current given city is ${argument.address.city}\n\nPlease enter the new city : `,
          componentType: 'text',
          action: {
            type: DYNAMIC,
            action: GET_NEW_CHECKOUT_CITY,
            input: true,
            argument
          },
          quickReplies: [
            {
              content_type: 'text',
              title: 'Go Back',
              payload: JSON.stringify({ type: STATIC, blockId: backId })
            },
            {
              content_type: 'text',
              title: 'Go Home',
              payload: JSON.stringify({ type: STATIC, blockId: chatbot.startingBlockId })
            }
          ]
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }

    return messageBlock
  } catch (err) {
    logger.serverLog(TAG, `Unable to input city name ${err} `, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to input city name`)
  }
}

const updateCheckoutCountryBlock = async (chatbot, backId, contact, argument) => {
  try {
    const messageBlock = {
      module: {
        id: chatbot._id,
        type: 'messenger_commerce_chatbot'
      },
      title: 'Update country for checkout',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Your current given country is ${argument.address.country}\n\nPlease enter the new country : `,
          componentType: 'text',
          action: {
            type: DYNAMIC,
            action: GET_NEW_CHECKOUT_COUNTRY,
            input: true,
            argument
          },
          quickReplies: [
            {
              content_type: 'text',
              title: 'Go Back',
              payload: JSON.stringify({ type: STATIC, blockId: backId })
            },
            {
              content_type: 'text',
              title: 'Go Home',
              payload: JSON.stringify({ type: STATIC, blockId: chatbot.startingBlockId })
            }
          ]
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }

    return messageBlock
  } catch (err) {
    logger.serverLog(TAG, `Unable to input country ${err} `, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to input country`)
  }
}

const updateCheckoutZipCodeBlock = async (chatbot, backId, contact, argument) => {
  try {
    const messageBlock = {
      module: {
        id: chatbot._id,
        type: 'messenger_commerce_chatbot'
      },
      title: 'Update zip code for checkout',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Your current given zip code is ${argument.address.zip}\n\nPlease enter the new zip code : `,
          componentType: 'text',
          action: {
            type: DYNAMIC,
            action: GET_NEW_CHECKOUT_ZIP_CODE,
            input: true,
            argument
          },
          quickReplies: [
            {
              content_type: 'text',
              title: 'Go Back',
              payload: JSON.stringify({ type: STATIC, blockId: backId })
            },
            {
              content_type: 'text',
              title: 'Go Home',
              payload: JSON.stringify({ type: STATIC, blockId: chatbot.startingBlockId })
            }
          ]
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }

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

const getCancelOrderBlock = async (chatbot, backId, EcommerceProvider, argument) => {
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
          quickReplies: [
            {
              content_type: 'text',
              title: 'View Recent Orders',
              payload: JSON.stringify({ type: DYNAMIC, action: VIEW_RECENT_ORDERS })
            },
            {
              content_type: 'text',
              title: 'Show my Cart',
              payload: JSON.stringify({ type: DYNAMIC, action: SHOW_MY_CART })
            },
            {
              content_type: 'text',
              title: 'Go Home',
              payload: JSON.stringify({ type: STATIC, blockId: chatbot.startingBlockId })
            }
          ]
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
        let cancelationMessage = chatbot.cancelOrderMessage.replace(/{{orderId}}/g, orderId)
        messageBlock.payload[0].text += cancelationMessage
      } else {
        messageBlock.payload[0].text += `Failed to send cancel request for your order.`
        messageBlock.payload[0].quickReplies.unshift(
          {
            content_type: 'text',
            title: 'Talk to agent',
            payload: JSON.stringify({ type: DYNAMIC, action: TALK_TO_AGENT })
          }
        )
      }
    } else {
      messageBlock.payload[0].text += `Your order cannot be canceled as it has been shipped. For further details please talk to an agent.`
      messageBlock.payload[0].quickReplies.unshift(
        {
          content_type: 'text',
          title: 'Talk to agent',
          payload: JSON.stringify({ type: DYNAMIC, action: TALK_TO_AGENT })
        }
      )
    }
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
          text: `Are you sure you want to cancel the order?`,
          componentType: 'text',
          quickReplies: [
            {
              content_type: 'text',
              title: 'Yes',
              payload: JSON.stringify({ type: DYNAMIC, action: CANCEL_ORDER, argument })
            },
            {
              content_type: 'text',
              title: 'No',
              payload: JSON.stringify({ type: STATIC, blockId: backId })
            },
            {
              content_type: 'text',
              title: 'Go Back',
              payload: JSON.stringify({ type: STATIC, blockId: backId })
            },
            {
              content_type: 'text',
              title: 'Go Home',
              payload: JSON.stringify({ type: STATIC, blockId: chatbot.startingBlockId })
            }
          ]
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    return messageBlock
  } catch (err) {
    const message = err || 'Unable to confirm cancel order'
    logger.serverLog(message, `${TAG}: getCancelOrderConfirmBlock`, {}, {chatbot, backId}, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to notify customer support agent`)
  }
}

const getConfirmRemoveItemBlock = async (chatbot, backId, product) => {
  try {
    const priceString = product.currency === 'USD' ? `$${product.price}` : `${product.price} ${product.currency}`
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'messenger_commerce_chatbot'
      },
      title: 'Quantity to Remove',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          componentType: 'gallery',
          cards: [
            {
              image_url: product.image,
              title: product.product,
              subtitle: `Price: ${priceString}\nStock Available: ${product.inventory_quantity}`
            }
          ]
        },
        {
          text: `Are you sure you want to remove ${product.product}?\n\nYou currently have ${product.quantity} in your cart.`,
          componentType: 'text',
          menu: [],
          quickReplies: [
            {
              content_type: 'text',
              title: 'Yes',
              payload: JSON.stringify({ type: DYNAMIC, action: REMOVE_FROM_CART, argument: product })
            },
            {
              content_type: 'text',
              title: 'No',
              payload: JSON.stringify({ type: DYNAMIC, action: SHOW_MY_CART })
            },
            {
              content_type: 'text',
              title: 'Go Back',
              payload: JSON.stringify({ type: DYNAMIC, action: SHOW_MY_CART })
            },
            {
              content_type: 'text',
              title: 'Go Home',
              payload: JSON.stringify({ type: STATIC, blockId: chatbot.startingBlockId })
            }
          ]
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }

    return messageBlock
  } catch (err) {
    const message = err || 'Unable to remove product(s) from cart'
    logger.serverLog(message, `${TAG}: exports.getConfirmRemoveItemBlock`, {}, {}, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to remove product(s) from cart`)
  }
}

const getAskUnpauseChatbotBlock = (chatbot, contact) => {
  try {
    const messageBlock = {
      module: {
        id: chatbot._id,
        type: 'messenger_commerce_chatbot'
      },
      title: 'Ask Unpause Chatbot',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Do you want to unpause the chatbot and cancel the customer support agent request?`,
          componentType: 'text',
          quickReplies: [
            {
              content_type: 'text',
              title: 'Yes, unpause chatbot',
              payload: JSON.stringify({ type: DYNAMIC, action: UNPAUSE_CHATBOT })
            },
            {
              content_type: 'text',
              title: 'No, wait for agent',
              payload: JSON.stringify({ type: DYNAMIC, action: TALK_TO_AGENT })
            }
          ]
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    return messageBlock
  } catch (err) {
    const message = err || 'Unable to request for unpause chatbot'
    logger.serverLog(message, `${TAG}: getAskUnpauseChatbotBlock`, {}, {chatbot, contact}, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to request for unpause chatbot`)
  }
}

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
          componentType: 'text'
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

    invoiceComponent.quickReplies = [
      {
        content_type: 'text',
        title: 'Go Back',
        payload: JSON.stringify({ type: DYNAMIC, action: backId })
      },
      {
        content_type: 'text',
        title: 'Go Home',
        payload: JSON.stringify({ type: STATIC, blockId: chatbot.startingBlockId })
      }
    ]

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
  const html = fs.readFileSync(path.join(__dirname, '/invoice_template.html'), 'utf8')
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

function filterEnabledFeatures (quickReplies, chatbot) {
  let tempQuickReplies = quickReplies

  if (!chatbot.enabledFeatures.commerceBotFeatures.generalFeatures.talkToAgent) {
    tempQuickReplies = tempQuickReplies.filter(item => {
      return JSON.parse(item.payload).action !== TALK_TO_AGENT
    })
  }

  if (!chatbot.enabledFeatures.commerceBotFeatures.generalFeatures.faqs) {
    tempQuickReplies = tempQuickReplies.filter(item => {
      return JSON.parse(item.payload).action !== SHOW_FAQS
    })
  }

  if (!chatbot.enabledFeatures.commerceBotFeatures.generalFeatures.catalogPdf) {
    tempQuickReplies = tempQuickReplies.filter(item => {
      return JSON.parse(item.payload).action !== VIEW_CATALOG
    })
  }

  if (!chatbot.enabledFeatures.commerceBotFeatures.postSales.checkOrderStatus) {
    tempQuickReplies = tempQuickReplies.filter(item => {
      return JSON.parse(item.payload).action !== VIEW_RECENT_ORDERS
    })
  }

  if (!chatbot.enabledFeatures.commerceBotFeatures.preSales.discoverProducts) {
    tempQuickReplies = tempQuickReplies.filter(item => {
      return JSON.parse(item.payload).action !== DISCOVER_PRODUCTS
    })
  }

  if (!chatbot.enabledFeatures.commerceBotFeatures.preSales.browseCategories) {
    tempQuickReplies = tempQuickReplies.filter(item => {
      return JSON.parse(item.payload).action !== PRODUCT_CATEGORIES
    })
  }

  if (!chatbot.enabledFeatures.commerceBotFeatures.preSales.searchProducts) {
    tempQuickReplies = tempQuickReplies.filter(item => {
      return JSON.parse(item.payload).action !== SEARCH_PRODUCTS
    })
  }

  if (!chatbot.enabledFeatures.commerceBotFeatures.preSales.manageShoppingCart) {
    tempQuickReplies = tempQuickReplies.filter(item => {
      return JSON.parse(item.payload).action !== SHOW_MY_CART
    })
  }
  return tempQuickReplies
}

exports.getNextMessageBlock = async (chatbot, EcommerceProvider, contact, event) => {
  let userError = false
  try {
    const userMessage = event.message
    const input = (userMessage && userMessage.text) ? userMessage.text.toLowerCase() : null
    let startingBlock = await messageBlockDataLayer.findOneMessageBlock({ uniqueId: chatbot.startingBlockId })
    if (!contact || !contact.lastMessageSentByBot) {
      const tempQuickReplies = filterEnabledFeatures(startingBlock.payload[0].quickReplies, chatbot)
      startingBlock.payload[0].quickReplies = tempQuickReplies
      return startingBlock
    } else {
      let action = null
      try {
        let lastMessageSentByBot = contact.lastMessageSentByBot.payload[contact.lastMessageSentByBot.payload.length - 1]
        if (contact.chatbotPaused) {
          if (userMessage && userMessage.quick_reply && userMessage.quick_reply.payload) {
            action = JSON.parse(userMessage.quick_reply.payload)
          } else {
            action = {
              type: DYNAMIC,
              action: ASK_UNPAUSE_CHATBOT
            }
          }
        } else if (userMessage && userMessage.quick_reply && userMessage.quick_reply.payload) {
          action = JSON.parse(userMessage.quick_reply.payload)
        } else if (event.postback && event.postback.payload) {
          action = JSON.parse(event.postback.payload)
        } else if (lastMessageSentByBot.action) {
          action = lastMessageSentByBot.action
        } else if (startingBlock.triggers.includes(input)) {
          const tempQuickReplies = filterEnabledFeatures(startingBlock.payload[0].quickReplies, chatbot)
          startingBlock.payload[0].quickReplies = tempQuickReplies
          return startingBlock
        } else {
          userError = true
          throw new Error(`${ERROR_INDICATOR}Invalid User Input`)
        }
      } catch (err) {
        if (!userError) {
          const message = err || 'Invalid user input'
          logger.serverLog(message, `${TAG}: exports.getNextMessageBlock`, {},  { contact, event, chatbot: chatbot._id, EcommerceProvider }, 'error')
        }
        if (startingBlock.triggers.includes(input) || (moment().diff(moment(contact.lastMessagedAt), 'minutes') >= 15)) {
          const tempQuickReplies = filterEnabledFeatures(startingBlock.payload[0].quickReplies, chatbot)
          startingBlock.payload[0].quickReplies = tempQuickReplies
          return startingBlock
        } else {
          return invalidInput(chatbot, contact.lastMessageSentByBot, `${ERROR_INDICATOR}You entered an invalid response.`)
        }
      }
      if (action) {
        if (action.type === DYNAMIC) {
          try {
            let messageBlock = null
            switch (action.action) {
              case ASK_UNPAUSE_CHATBOT: {
                messageBlock = await getAskUnpauseChatbotBlock(chatbot, contact)
                break
              }
              case UNPAUSE_CHATBOT: {
                updateSubscriber({ _id: contact._id }, { chatbotPaused: false }, null, {})
                const tempQuickReplies = filterEnabledFeatures(startingBlock.payload[0].quickReplies, chatbot)
                startingBlock.payload[0].quickReplies = tempQuickReplies
                return startingBlock
              }
              case TALK_TO_AGENT: {
                messageBlock = await getTalkToAgentBlock(chatbot, contact)
                break
              }
              case PRODUCT_CATEGORIES: {
                messageBlock = await getProductCategoriesBlock(chatbot, contact.lastMessageSentByBot.uniqueId, EcommerceProvider, action.argument ? action.argument : {})
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
                messageBlock = await getOrderStatusBlock(chatbot, contact.lastMessageSentByBot.uniqueId, EcommerceProvider, contact, action.input ? input : action.argument)
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
              case GET_CHECKOUT_EMAIL: {
                messageBlock = await getCheckoutEmailBlock(chatbot, contact, contact.lastMessageSentByBot.uniqueId, action.argument)
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
              case PROCEED_TO_CHECKOUT: {
                messageBlock = await getCheckoutBlock(chatbot, contact.lastMessageSentByBot.uniqueId, EcommerceProvider, contact, action.argument)
                break
              }
              case CONFIRM_RETURN_ORDER: {
                messageBlock = await getConfirmReturnOrderBlock(chatbot, contact.lastMessageSentByBot.uniqueId, action.argument)
                break
              }
              case RETURN_ORDER: {
                messageBlock = await getReturnOrderBlock(chatbot, contact, contact.lastMessageSentByBot.uniqueId, EcommerceProvider, action.argument)
                break
              }
              case REMOVE_FROM_CART: {
                messageBlock = await getRemoveFromCartBlock(chatbot, contact.lastMessageSentByBot.uniqueId, contact, action.argument, action.input ? input : '')
                break
              }
              case CLEAR_CART: {
                messageBlock = await clearCart(chatbot, contact)
                break
              }
              case UPDATE_CART: {
                messageBlock = await getUpdateCartBlock(chatbot, contact.lastMessageSentByBot.uniqueId, contact, action.argument, action.input ? input : '')
                break
              }
              // case QUANTITY_TO_ADD: {
              //   messageBlock = await getQuantityToAddBlock(chatbot, contact.lastMessageSentByBot.uniqueId, contact, action.argument)
              //   break
              // }
              case QUANTITY_TO_UPDATE: {
                messageBlock = await getQuantityToUpdateBlock(chatbot, contact.lastMessageSentByBot.uniqueId, action.argument, contact)
                break
              }
              case VIEW_RECENT_ORDERS: {
                messageBlock = await getRecentOrdersBlock(chatbot, contact.lastMessageSentByBot.uniqueId, contact, EcommerceProvider)
                break
              }
              case ASK_PAYMENT_METHOD: {
                messageBlock = await getAskPaymentMethodBlock(chatbot, contact.lastMessageSentByBot.uniqueId, contact, action.input ? input : '')
                break
              }
              case ASK_ADDRESS: {
                messageBlock = await getAskAddressBlock(chatbot, contact.lastMessageSentByBot.uniqueId, contact, action.argument, action.input ? input : '')
                break
              }
              case GET_CHECKOUT_STREET_ADDRESS: {
                messageBlock = await getCheckoutStreetAddressBlock(chatbot, contact.lastMessageSentByBot.uniqueId, contact, action.argument)
                break
              }
              case GET_CHECKOUT_CITY: {
                messageBlock = await getCheckoutCityBlock(chatbot, contact.lastMessageSentByBot.uniqueId, contact, action.argument, action.input ? input : '')
                break
              }
              case GET_CHECKOUT_COUNTRY: {
                messageBlock = await getCheckoutCountryBlock(chatbot, contact.lastMessageSentByBot.uniqueId, contact, action.argument, action.input ? input : '')
                break
              }
              case GET_CHECKOUT_ZIP_CODE: {
                messageBlock = await getCheckoutZipCodeBlock(chatbot, contact.lastMessageSentByBot.uniqueId, contact, action.argument, action.input ? input : '')
                break
              }
              case CONFIRM_COMPLETE_ADDRESS: {
                messageBlock = await confirmCompleteAddress(chatbot, contact.lastMessageSentByBot.uniqueId, contact, action.argument, action.input ? input : '')
                break
              }
              case UPDATE_ADDRESS_BLOCK: {
                messageBlock = await updateAddressBlock(chatbot, contact.lastMessageSentByBot.uniqueId, contact, action.argument)
                break
              }
              case UPDATE_CHECKOUT_STREET_ADDRESS: {
                messageBlock = await updateCheckoutStreetAddressBlock(chatbot, contact.lastMessageSentByBot.uniqueId, contact, action.argument)
                break
              }
              case UPDATE_CHECKOUT_CITY: {
                messageBlock = await updateCheckoutCityBlock(chatbot, contact.lastMessageSentByBot.uniqueId, contact, action.argument)
                break
              }
              case UPDATE_CHECKOUT_COUNTRY: {
                messageBlock = await updateCheckoutCountryBlock(chatbot, contact.lastMessageSentByBot.uniqueId, contact, action.argument)
                break
              }
              case UPDATE_CHECKOUT_ZIP_CODE: {
                messageBlock = await updateCheckoutZipCodeBlock(chatbot, contact.lastMessageSentByBot.uniqueId, contact, action.argument, action.input ? input : '')
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
              case CONFIRM_CLEAR_CART: {
                messageBlock = await confirmClearCart(chatbot, contact)
                break
              }
              case CONFIRM_TO_REMOVE_CART_ITEM: {
                messageBlock = await getConfirmRemoveItemBlock(chatbot, contact.lastMessageSentByBot.uniqueId, action.argument)
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
              case CANCEL_ORDER_CONFIRM: {
                messageBlock = await getCancelOrderConfirmBlock(chatbot, contact.lastMessageSentByBot.uniqueId, action.argument, action.input ? input : '')
                break
              }
              case CANCEL_ORDER: {
                messageBlock = await getCancelOrderBlock(chatbot, contact.lastMessageSentByBot.uniqueId, EcommerceProvider, action.argument)
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
            if (startingBlock.triggers.includes(input)) {
              const tempQuickReplies = filterEnabledFeatures(startingBlock.payload[0].quickReplies, chatbot)
              startingBlock.payload[0].quickReplies = tempQuickReplies
              return startingBlock
            } else {
              return invalidInput(chatbot, contact.lastMessageSentByBot, err.message)
            }
          }
        } else if (action.type === STATIC) {
          return messageBlockDataLayer.findOneMessageBlock({ uniqueId: action.blockId })
        }
      } else {
        return null
      }
    }
  } catch (err) {
    const message = err || 'nextMessageBlock error'
    logger.serverLog(message, `${TAG}: exports.getNextMessageBlock`, {},  { contact, event, chatbot: chatbot._id, EcommerceProvider }, 'error')
  }
}
