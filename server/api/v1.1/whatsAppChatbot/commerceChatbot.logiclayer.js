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
  RETURN_ORDER,
  GET_CHECKOUT_EMAIL,
  CONFIRM_CLEAR_CART,
  CLEAR_CART,
  QUANTITY_TO_ADD,
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
  GET_NEW_CHECKOUT_ZIP_CODE

} = require('./constants')
const { convertToEmoji, sendTalkToAgentNotification } = require('./whatsAppChatbot.logiclayer')
const logger = require('../../../components/logger')
const TAG = 'api/v1️.1/whatsAppChatbot/commerceChatbot.logiclayer.js'
const utility = require('../../../components/utility')
const messageBlockDataLayer = require('../messageBlock/messageBlock.datalayer')
const { callApi } = require('../utility')
const moment = require('moment')
const commerceConstants = require('../ecommerceProvidersApiLayer/constants')

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

exports.updateFaqsForStartingBlock = async (chatbot) => {
  let messageBlocks = []
  const faqsId = '' + new Date().getTime()
  let startingBlock = await messageBlockDataLayer.findOneMessageBlock({ uniqueId: chatbot.startingBlockId })
  if (!startingBlock.payload[0].specialKeys[FAQS_KEY]) {
    if (chatbot.botLinks && chatbot.botLinks.faqs) {
      startingBlock.payload[0].text += `\n${specialKeyText(FAQS_KEY)}`
      startingBlock.payload[0].specialKeys[FAQS_KEY] = { type: STATIC, blockId: faqsId }
      getFaqsBlock(chatbot, faqsId, messageBlocks, chatbot.startingBlockId)
      messageBlockDataLayer.genericUpdateMessageBlock({ uniqueId: chatbot.startingBlockId }, startingBlock)
      messageBlockDataLayer.createForMessageBlock(messageBlocks[0])
    }
  } else {
    if (chatbot.botLinks && chatbot.botLinks.faqs) {
      startingBlock.payload[0].specialKeys[FAQS_KEY] = { type: STATIC, blockId: faqsId }
      getFaqsBlock(chatbot, faqsId, messageBlocks, chatbot.startingBlockId)
      messageBlockDataLayer.genericUpdateMessageBlock({ uniqueId: chatbot.startingBlockId }, startingBlock)
      messageBlockDataLayer.createForMessageBlock(messageBlocks[0])
    } else {
      startingBlock.payload[0].text = startingBlock.payload[0].text.replace(`\n${specialKeyText(FAQS_KEY)}`, '')
      delete startingBlock.payload[0].specialKeys[FAQS_KEY]
      messageBlockDataLayer.genericUpdateMessageBlock({ uniqueId: chatbot.startingBlockId }, startingBlock)
    }
  }
}

exports.getMessageBlocks = (chatbot) => {
  const messageBlocks = []
  const mainMenuId = '' + new Date().getTime()
  const orderStatusId = '' + new Date().getTime() + 100
  const checkOrdersId = '' + new Date().getTime() + 200
  const returnOrderId = '' + new Date().getTime() + 300
  const searchProductsId = '' + new Date().getTime() + 400
  const faqsId = '' + new Date().getTime() + 500

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
                ${convertToEmoji(2)} Search for a product\n
                ${specialKeyText(ORDER_STATUS_KEY)}
                ${specialKeyText(SHOW_CART_KEY)}
                ${specialKeyText(TALK_TO_AGENT_KEY)}`),
        componentType: 'text',
        menu: [
          { type: DYNAMIC, action: PRODUCT_CATEGORIES },
          { type: DYNAMIC, action: DISCOVER_PRODUCTS },
          { type: STATIC, blockId: searchProductsId }
        ],
        specialKeys: {
          [ORDER_STATUS_KEY]: { type: STATIC, blockId: checkOrdersId },
          [SHOW_CART_KEY]: { type: DYNAMIC, action: SHOW_MY_CART },
          [TALK_TO_AGENT_KEY]: { type: DYNAMIC, action: TALK_TO_AGENT }
        }
      }
    ],
    userId: chatbot.userId,
    companyId: chatbot.companyId
  })

  getCheckOrdersBlock(chatbot, mainMenuId, checkOrdersId, orderStatusId, messageBlocks)
  getReturnOrderIdBlock(chatbot, returnOrderId, messageBlocks)
  getSearchProductsBlock(chatbot, searchProductsId, messageBlocks)
  if (chatbot.botLinks && chatbot.botLinks.faqs) {
    messageBlocks[0].payload[0].text += `\n${specialKeyText(FAQS_KEY, 'faqs')} FAQs`
    messageBlocks[0].payload[0].specialKeys[FAQS_KEY] = { type: STATIC, blockId: faqsId }
    getFaqsBlock(chatbot, faqsId, messageBlocks, mainMenuId)
  }
  if (chatbot.brandImage) {
    messageBlocks[0].payload.push({
      componentType: 'image',
      fileurl: chatbot.brandImage
    })
  }
  return messageBlocks
}

const getTalkToAgentBlock = (chatbot, backId, contact) => {
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
          text: dedent(`Our support agents have been notified and will get back to you shortly\n
                      ${specialKeyText(HOME_KEY)}`),
          componentType: 'text',
          specialKeys: {
            [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    sendTalkToAgentNotification(contact, chatbot.companyId)
    return messageBlock
  } catch (err) {
    const message = err || 'Unable get talk to agent message block'
    logger.serverLog(message, `${TAG}: getTalkToAgentBlock`, {}, {chatbot, backId, contact}, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to notify customer support agent`)
  }
}

const getSearchProductsBlock = async (chatbot, blockId, messageBlocks) => {
  messageBlocks.push({
    module: {
      id: chatbot._id,
      type: 'whatsapp_commerce_chatbot'
    },
    title: 'Search Products',
    uniqueId: blockId,
    payload: [
      {
        text: `Please enter the name of the product you wish to search for:\n`,
        componentType: 'text',
        action: { type: DYNAMIC, action: DISCOVER_PRODUCTS, input: true }
      }
    ],
    userId: chatbot.userId,
    companyId: chatbot.companyId
  })
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
        messageBlock.payload[0].text = `These products were found for "${input}". Please select a product by sending the corresponding number for it or enter another product name to search again:\n`
      } else {
        messageBlock.payload[0].text = `No products found that match "${input}".\n\nEnter another product name to search again:`
      }
      messageBlock.payload[0].action = { type: DYNAMIC, action: DISCOVER_PRODUCTS, input: true }
    } else {
      products = await EcommerceProvider.fetchProducts(argument.paginationParams)
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

const getReturnOrderIdBlock = (chatbot, blockId, messageBlocks) => {
  messageBlocks.push({
    module: {
      id: chatbot._id,
      type: 'whatsapp_commerce_chatbot'
    },
    title: 'Get Return Product ID',
    uniqueId: blockId,
    payload: [
      {
        text: `Please enter your order id`,
        componentType: 'text',
        action: { type: DYNAMIC, action: RETURN_ORDER, input: true }
      }
    ],
    userId: chatbot.userId,
    companyId: chatbot.companyId
  })
}

const getReturnOrderBlock = async (chatbot, backId, EcommerceProvider, orderId) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_commerce_chatbot'
      },
      title: 'Return Request',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: dedent(`Your return request has been made.\n
            ${specialKeyText(SHOW_CART_KEY)}
            ${specialKeyText(BACK_KEY)}
            ${specialKeyText(HOME_KEY)}`),
          componentType: 'text',
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
    await EcommerceProvider.returnOrder(orderId)

    return messageBlock
  } catch (err) {
    const message = err || 'Unable to return order'
    logger.serverLog(message, `${TAG}: exports.getReturnOrderBlock`, {}, {}, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to return order. Please make sure your order ID is valid.`)
  }
}

const getFaqsBlock = (chatbot, blockId, messageBlocks, backId) => {
  messageBlocks.push({
    module: {
      id: chatbot._id,
      type: 'whatsapp_commerce_chatbot'
    },
    title: 'FAQs',
    uniqueId: blockId,
    payload: [
      {
        text: dedent(`View our FAQs here: ${chatbot.botLinks.faqs}\n
                      ${specialKeyText(SHOW_CART_KEY)}
                      ${specialKeyText(BACK_KEY)}
                      ${specialKeyText(HOME_KEY)}
                    `),
        componentType: 'text',
        specialKeys: {
          [SHOW_CART_KEY]: { type: DYNAMIC, action: SHOW_MY_CART },
          [BACK_KEY]: { type: STATIC, blockId: backId },
          [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId }
        }
      }
    ],
    userId: chatbot.userId,
    companyId: chatbot.companyId
  })
}

const getCheckOrdersBlock = (chatbot, mainMenuId, blockId, orderStatusId, messageBlocks) => {
  getOrderIdBlock(chatbot, orderStatusId, messageBlocks)
  messageBlocks.push({
    module: {
      id: chatbot._id,
      type: 'whatsapp_commerce_chatbot'
    },
    title: 'Check Orders',
    uniqueId: blockId,
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
          { type: STATIC, blockId: orderStatusId }
        ],
        specialKeys: {
          [SHOW_CART_KEY]: { type: DYNAMIC, action: SHOW_MY_CART },
          [HOME_KEY]: { type: STATIC, blockId: mainMenuId }
        }
      }
    ],
    userId: chatbot.userId,
    companyId: chatbot.companyId
  })
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
        messageBlock.payload[0].text = 'Select an order by sending the corresponding number for it:\n'
        for (let i = 0; i < recentOrders.length; i++) {
          const orderTitle = `\n${convertToEmoji(i)} Order ${recentOrders[i].name} - ${new Date(recentOrders[i].createdAt).toDateString()} (${recentOrders[i].lineItems[0].name})`
          messageBlock.payload[0].text += utility.truncate(orderTitle, 55)
          messageBlock.payload[0].menu.push({ type: DYNAMIC, action: ORDER_STATUS, argument: recentOrders[i].name.substr(1) })
        }
      } else {
        messageBlock.payload[0].text = 'You have not placed any orders within the last 60 days.'
      }
    } else {
      messageBlock.payload[0].text = 'You have not placed any orders yet.'
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

const getOrderIdBlock = (chatbot, blockId, messageBlocks) => {
  messageBlocks.push({
    module: {
      id: chatbot._id,
      type: 'whatsapp_commerce_chatbot'
    },
    title: 'Get Order ID',
    uniqueId: blockId,
    payload: [
      {
        text: `Please enter your order ID`,
        componentType: 'text',
        action: { type: DYNAMIC, action: ORDER_STATUS, input: true }
      }
    ],
    userId: chatbot.userId,
    companyId: chatbot.companyId
  })
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
            [SHOW_CART_KEY]: { type: DYNAMIC, action: SHOW_MY_CART },
            [BACK_KEY]: { type: STATIC, blockId: backId },
            [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId }
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

    if (orderStatus.displayFinancialStatus) {
      messageBlock.payload[0].text += `\n*Payment*: ${orderStatus.displayFinancialStatus}`
    }
    if (orderStatus.displayFulfillmentStatus) {
      messageBlock.payload[0].text += `\n*Delivery*: ${orderStatus.displayFulfillmentStatus}`
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

    messageBlock.payload[0].text += `\n\n${specialKeyText(SHOW_CART_KEY)}`
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
    let products = await EcommerceProvider.fetchProductsInThisCategory(argument.categoryId, argument.paginationParams)
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

const getProductVariantsBlock = async (chatbot, backId, EcommerceProvider, argument) => {
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
    let productVariants = await EcommerceProvider.getVariantsOfSelectedProduct(product.id)
    let storeInfo = await EcommerceProvider.fetchStoreInfo()
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
            'y': { type: DYNAMIC, action: QUANTITY_TO_ADD, argument: product },
            'n': { type: STATIC, blockId: chatbot.startingBlockId },
            'yes': { type: DYNAMIC, action: QUANTITY_TO_ADD, argument: product },
            'no': { type: STATIC, blockId: chatbot.startingBlockId }
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

const getQuantityToAddBlock = async (chatbot, backId, contact, product) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_commerce_chatbot'
      },
      title: 'Quantity to Add',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `How many ${product.product}s (price: ${product.price} ${product.currency}) would you like to add to your cart?\n\n(stock available: ${product.inventory_quantity})`,
          componentType: 'text',
          action: { type: DYNAMIC, action: ADD_TO_CART, argument: product, input: true },
          specialKeys: {
            [BACK_KEY]: { type: STATIC, blockId: backId },
            [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId },
            [SHOW_CART_KEY]: { type: DYNAMIC, action: SHOW_MY_CART }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }

    messageBlock.payload[0].text += `\n\n${specialKeyText(BACK_KEY)}`
    messageBlock.payload[0].text += `\n${specialKeyText(HOME_KEY)}`
    messageBlock.payload[0].text += `\n${specialKeyText(SHOW_CART_KEY)} `

    let shoppingCart = contact.shoppingCart ? contact.shoppingCart : []
    let existingProductIndex = shoppingCart.findIndex((item) => item.variant_id === product.variant_id)

    if (existingProductIndex > -1) {
      if (shoppingCart[existingProductIndex].quantity >= product.inventory_quantity) {
        let text = `Your cart already contains the maximum stock available for this product.`
        return getShowMyCartBlock(chatbot, backId, contact, text)
      }
    }
    if (product.image) {
      messageBlock.payload.unshift({
        componentType: 'image',
        fileurl: product.image,
        caption: `${product.product}\nPrice: ${product.price} ${product.currency}`
      })
    }
    return messageBlock
  } catch (err) {
    const message = err || 'Unable to add product(s) to cart'
    logger.serverLog(message, `${TAG}: exports.getQuantityToAddBlock`, {}, {}, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to add product(s) to cart`)
  }
}

const getAddToCartBlock = async (chatbot, backId, contact, product, quantity) => {
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
        throw new Error(`${ERROR_INDICATOR}Your requested quantity exceeds the stock available (${product.inventory_quantity}). Your cart already contains ${previousQuantity}. Please enter a quantity less than ${product.inventory_quantity - previousQuantity}.`)
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

    updateWhatsAppContact({ _id: contact._id }, { shoppingCart }, null, {})
    let text = `${quantity} ${product.product}${quantity !== 1 ? 's have' : 'has'} been successfully added to your cart.`
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
        { type: DYNAMIC, action: CONFIRM_CLEAR_CART },
        { type: DYNAMIC, action: GET_CHECKOUT_EMAIL })
      messageBlock.payload[0].text += dedent(`Please select an option by sending the corresponding number for it:\n
                                            ${convertToEmoji(0)} Remove an item
                                            ${convertToEmoji(1)} Update quantity for an item
                                            ${convertToEmoji(2)} Clear cart
                                            ${convertToEmoji(3)} Proceed to Checkout`)
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
  await updateWhatsAppContact({ _id: contact._id }, { shoppingCart }, null, {})
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
            'p': { type: DYNAMIC, action: GET_CHECKOUT_EMAIL }
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
    updateWhatsAppContact({ _id: contact._id }, { shoppingCart }, null, {})
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
    updateWhatsAppContact({ _id: contact._id }, { shoppingCart }, null, {})
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
            { type: DYNAMIC, action: ASK_ADDRESS, argument: {newEmail, paymentMethod: 'cod'} },
            { type: DYNAMIC, action: PROCEED_TO_CHECKOUT, argument: {newEmail, paymentMethod: 'e-payment'} }
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

const getAskAddressBlock = async (chatbot, contact, argument) => {
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
    logger.serverLog(TAG, `Unable to input street address ${err} `, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to input street address`)
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
      title: 'Checkout Email',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Please enter your zip code: `,
          componentType: 'text',
          action: {
            type: DYNAMIC,
            action: CONFIRM_COMPLETE_ADDRESS,
            input: true,
            argument: { ...argument,
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
      return updatedAddressBlockedMessage(chatbot, contact, argument)
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
      return updatedAddressBlockedMessage(chatbot, contact, argument)
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
      return updatedAddressBlockedMessage(chatbot, contact, argument)
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
        return updatedAddressBlockedMessage(chatbot, contact, argument)
      } else {
        throw new Error(`${ERROR_INDICATOR} Unable to input zip for update`)
      }
    } catch (err) {
      logger.serverLog(TAG, `Unable to input zip for update ${err} `, 'error')
      throw new Error(`${ERROR_INDICATOR}Unable to input zip for update`)
    }
  }

const updatedAddressBlockedMessage = async (chatbot, contact, argument) => {
  let messageBlock = {
    module: {
      id: chatbot._id,
      type: 'whatsapp_commerce_chatbot'
    },
    title: 'Is this new address confirmed?',
    uniqueId: '' + new Date().getTime(),
    payload: [
      {
        text: 'Thank you for updating address details.',
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
  messageBlock.payload[0].text += `\n\nYour new address is ${address.address1}, ${address.city} ${address.zip}, ${address.country}\n\n`

  messageBlock.payload[0].text += dedent(`Please validate the new address. Is it correct to proceed to checkout:\n
                                      Send 'Y' for Yes, Proceed to checkout
                                      Send 'N' for No, Change the address`)

  messageBlock.payload[0].text += `\n\n${specialKeyText(HOME_KEY)}`
  return messageBlock
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

        const order = await EcommerceProvider.createTestOrder({id: commerceCustomer.id + ''}, testOrderCart)

        if (order) {
          let storeInfo = await EcommerceProvider.fetchStoreInfo()

          messageBlock.payload[0].text += `Thank you for shopping at ${storeInfo.name}. We have received your order. Please note the order number given below to track your order:\n\n`
          messageBlock.payload[0].text += `*${order.name.replace('#', '')}*\n\n`
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
  let welcomeMessage = 'Hi'

  if (contact.name && contact.name !== contact.number) {
    welcomeMessage += ` ${contact.name.split(' ')[0]}!`
  } else {
    welcomeMessage += `!`
  }
  welcomeMessage += ` Greetings from ${chatbot.storeType} chatbot 🤖😀`

  welcomeMessage += `\n\nI am here to guide you on your journey of shopping on ${storeInfo.name}`
  let messageBlock = await messageBlockDataLayer.findOneMessageBlock({ uniqueId: chatbot.startingBlockId })
  if (messageBlock) {
    messageBlock.payload[0].text = `${welcomeMessage}\n\n` + messageBlock.payload[0].text
    return messageBlock
  } else {
    return null
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
    } else {
      messageBlock.payload[i].text = `${errMessage}\n\n` + messageBlock.payload[i].text
    }
  }

  // removing the images so that they won't repeat in error message
  messageBlock.payload = messageBlock.payload.filter(item => item.componentType === 'text')

  return messageBlock
}

exports.getNextMessageBlock = async (chatbot, EcommerceProvider, contact, input) => {
  let userError = false
  input = input.toLowerCase()
  if (!contact || !contact.lastMessageSentByBot) {
    if (chatbot.triggers.includes(input)) {
      return getWelcomeMessageBlock(chatbot, contact, EcommerceProvider)
    }
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
      if (lastMessageSentByBot.specialKeys && lastMessageSentByBot.specialKeys[input]) {
        action = lastMessageSentByBot.specialKeys[input]
      } else if (input === 'home' && lastMessageSentByBot.specialKeys[HOME_KEY]) {
        action = lastMessageSentByBot.specialKeys[HOME_KEY]
      } else if (input === 'back' && lastMessageSentByBot.specialKeys[BACK_KEY]) {
        action = lastMessageSentByBot.specialKeys[BACK_KEY]
      } else if (lastMessageSentByBot.menu) {
        let menuInput = parseInt(input)
        if (isNaN(menuInput) || menuInput >= lastMessageSentByBot.menu.length || menuInput < 0) {
          if (isNaN(menuInput) && lastMessageSentByBot.action) {
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
          case PRODUCT_CATEGORIES: {
            messageBlock = await getProductCategoriesBlock(chatbot, contact.lastMessageSentByBot.uniqueId, EcommerceProvider, action.argument ? action.argument : {})
            break
          }
          case FETCH_PRODUCTS: {
            messageBlock = await getProductsInCategoryBlock(chatbot, contact.lastMessageSentByBot.uniqueId, EcommerceProvider, action.argument)
            break
          }
          case PRODUCT_VARIANTS: {
            messageBlock = await getProductVariantsBlock(chatbot, contact.lastMessageSentByBot.uniqueId, EcommerceProvider, action.argument)
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
          case RETURN_ORDER: {
            messageBlock = await getReturnOrderBlock(chatbot, contact.lastMessageSentByBot.uniqueId, EcommerceProvider, action.input ? input : '')
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
          case QUANTITY_TO_ADD: {
            messageBlock = await getQuantityToAddBlock(chatbot, contact.lastMessageSentByBot.uniqueId, contact, action.argument)
            break
          }
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
            messageBlock = await getAskAddressBlock(chatbot, contact, action.argument)
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
        }
        await messageBlockDataLayer.createForMessageBlock(messageBlock)
        return messageBlock
      } catch (err) {
        if (chatbot.triggers.includes(input) || moment().diff(moment(contact.lastMessagedAt), 'minutes') >= 15) {
          return getWelcomeMessageBlock(chatbot, contact, EcommerceProvider)
        } else {
          return invalidInput(chatbot, contact.lastMessageSentByBot, err.message)
        }
      }
    } else if (action.type === STATIC) {
      return messageBlockDataLayer.findOneMessageBlock({ uniqueId: action.blockId })
    }
  }
}
