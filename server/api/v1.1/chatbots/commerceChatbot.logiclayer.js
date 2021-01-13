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
  RETURN_ORDER,
  GET_CHECKOUT_EMAIL,
  CLEAR_CART,
  QUANTITY_TO_ADD,
  QUANTITY_TO_REMOVE,
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
  ASK_UNPAUSE_CHATBOT
} = require('./constants')
const logger = require('../../../components/logger')
const TAG = 'api/v1️.1/chatbots/commerceChatbot.logiclayer.js'
const messageBlockDataLayer = require('../messageBlock/messageBlock.datalayer')
const { callApi } = require('../utility')
const commerceConstants = require('../ecommerceProvidersApiLayer/constants')
const moment = require('moment')

exports.updateFaqsForStartingBlock = async (chatbot) => {
  let messageBlocks = []
  const faqsId = '' + new Date().getTime()
  let startingBlock = await messageBlockDataLayer.findOneMessageBlock({ uniqueId: chatbot.startingBlockId })
  let faqsQuickReplyIndex = startingBlock.payload[0].quickReplies.findIndex((qr) => qr.title.includes('FAQ'))
  let faqsQuickReply = {
    content_type: 'text',
    title: 'View FAQs',
    payload: JSON.stringify({ type: STATIC, blockId: faqsId })
  }
  if (faqsQuickReplyIndex <= -1) {
    if (chatbot.botLinks && chatbot.botLinks.faqs) {
      startingBlock.payload[0].quickReplies.push(faqsQuickReply)
      getFaqsBlock(chatbot, faqsId, messageBlocks, chatbot.startingBlockId)
      messageBlockDataLayer.genericUpdateMessageBlock({ uniqueId: chatbot.startingBlockId }, startingBlock)
      messageBlockDataLayer.createForMessageBlock(messageBlocks[0])
    }
  } else {
    if (chatbot.botLinks && chatbot.botLinks.faqs) {
      startingBlock.payload[0].quickReplies[faqsQuickReplyIndex] = faqsQuickReply
      getFaqsBlock(chatbot, faqsId, messageBlocks, chatbot.startingBlockId)
      messageBlockDataLayer.genericUpdateMessageBlock({ uniqueId: chatbot.startingBlockId }, startingBlock)
      messageBlockDataLayer.createForMessageBlock(messageBlocks[0])
    } else {
      startingBlock.payload[0].quickReplies.splice(faqsQuickReplyIndex, 1)
      messageBlockDataLayer.genericUpdateMessageBlock({ uniqueId: chatbot.startingBlockId }, startingBlock)
    }
  }
}

exports.updateStartingBlock = (chatbot, storeName) => {
  let welcomeMessage = `Hi {{user_first_name}}! Greetings from ${chatbot.storeType} chatbot 🤖😀`
  welcomeMessage += `\n\nI am here to guide you on your journey of shopping on ${storeName}.`
  welcomeMessage += `\n\nPlease select an option to let me know what you would like to do?`
  const startingBlock = messageBlockDataLayer.findOneMessageBlock({ uniqueId: chatbot.startingBlockId })
  startingBlock.payload[0].text = welcomeMessage
  messageBlockDataLayer.genericUpdateMessageBlock({ uniqueId: chatbot.startingBlockId }, startingBlock)
}

exports.getMessageBlocks = (chatbot, storeName) => {
  const messageBlocks = []
  const mainMenuId = '' + new Date().getTime()
  const orderStatusId = '' + new Date().getTime() + 100
  const checkOrdersId = '' + new Date().getTime() + 200
  const returnOrderId = '' + new Date().getTime() + 300
  const searchProductsId = '' + new Date().getTime() + 400
  const faqsId = '' + new Date().getTime() + 500
  let welcomeMessage = `Hi {{user_first_name}}! Greetings from ${chatbot.storeType} chatbot 🤖😀`
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
            payload: JSON.stringify({ type: STATIC, blockId: searchProductsId })
          },
          {
            content_type: 'text',
            title: 'Check order status',
            payload: JSON.stringify({ type: STATIC, blockId: checkOrdersId })
          },
          {
            content_type: 'text',
            title: 'Show my cart',
            payload: JSON.stringify({ type: DYNAMIC, action: SHOW_MY_CART })
          },
          {
            content_type: 'text',
            title: 'Talk to agent',
            payload: JSON.stringify({ type: DYNAMIC, action: TALK_TO_AGENT })
          }
        ]
      }
    ],
    userId: chatbot.userId,
    companyId: chatbot.companyId
  })

  getCheckOrdersBlock(chatbot, mainMenuId, checkOrdersId, orderStatusId, messageBlocks)
  getReturnOrderIdBlock(chatbot, returnOrderId, messageBlocks)
  getSearchProductsBlock(chatbot, searchProductsId, messageBlocks)
  if (chatbot.botLinks && chatbot.botLinks.faqs) {
    messageBlocks[0].payload[0].quickReplies.push({
      content_type: 'text',
      title: 'View FAQs',
      payload: JSON.stringify({ type: STATIC, blockId: faqsId })
    })
    getFaqsBlock(chatbot, faqsId, messageBlocks, mainMenuId)
  }
  messageBlockDataLayer.createBulkMessageBlocks(messageBlocks)
  return messageBlocks
}

const getTalkToAgentBlock = (chatbot, contact) => {
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
          componentType: 'text',
          text: dedent(`Our support agents have been notified and will get back to you shortly`)
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    updateSubscriber({ _id: contact._id }, { chatbotPaused: true }, null, {})
    return messageBlock
  } catch (err) {
    const message = err || 'Unable get talk to agent message block'
    logger.serverLog(message, `${TAG}: getTalkToAgentBlock`, {}, {chatbot, contact}, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to notify customer support agent`)
  }
}

const getSearchProductsBlock = async (chatbot, blockId, messageBlocks, input) => {
  messageBlocks.push({
    module: {
      id: chatbot._id,
      type: 'messenger_commerce_chatbot'
    },
    title: 'Search Products',
    uniqueId: blockId,
    payload: [
      {
        text: `Please enter the name of the product you wish to search for:`,
        componentType: 'text',
        action: { type: DYNAMIC, action: DISCOVER_PRODUCTS, input: true },
        quickReplies: [
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
  })
}

const getCheckOrdersBlock = (chatbot, mainMenuId, blockId, orderStatusId, messageBlocks) => {
  getOrderIdBlock(chatbot, orderStatusId, blockId, messageBlocks)
  messageBlocks.push({
    module: {
      id: chatbot._id,
      type: 'messenger_commerce_chatbot'
    },
    title: 'Check Orders',
    uniqueId: blockId,
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
            payload: JSON.stringify({ type: STATIC, blockId: orderStatusId })
          },
          {
            content_type: 'text',
            title: 'Show my Cart',
            payload: JSON.stringify({ type: DYNAMIC, action: SHOW_MY_CART })
          },
          {
            content_type: 'text',
            title: 'Go Home',
            payload: JSON.stringify({ type: STATIC, blockId: mainMenuId })
          }
        ]
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
      products = await EcommerceProvider.searchProducts(input)
      if (products.length > 0) {
        messageBlock.payload[0].text = `Following products were found for "${input}".\n\nPlease select a product or enter another product name to search again:`
      } else {
        messageBlock.payload[0].text = `No products found that match "${input}".\n\nEnter another product name to search again:`
      }
    } else {
      if (argument && argument.categoryId) {
        products = await EcommerceProvider.fetchProductsInThisCategory(argument.categoryId, argument.paginationParams)
      } else {
        products = await EcommerceProvider.fetchProducts(argument.paginationParams)
      }
      if (products.length > 0) {
        messageBlock.payload[0].text = `Please select a product:`
      } else {
        messageBlock.payload[0].text = `No products were found using discover.`
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
        let priceString = storeInfo.currency === 'USD' ? `$${product.price}` : `${product.price} ${storeInfo.currency}`
        messageBlock.payload[1].cards.push({
          image_url: product.image,
          title: product.name,
          subtitle: `Price: ${priceString}`,
          buttons: [{
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

const getReturnOrderIdBlock = (chatbot, blockId, messageBlocks) => {
  messageBlocks.push({
    module: {
      id: chatbot._id,
      type: 'messenger_commerce_chatbot'
    },
    title: 'Get Return Product ID',
    uniqueId: blockId,
    payload: [
      {
        text: `Please enter your order id`,
        componentType: 'text',
        action: { type: DYNAMIC, action: RETURN_ORDER, input: true },
        quickReplies: [
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
  })
}

const getReturnOrderBlock = async (chatbot, backId, EcommerceProvider, orderId) => {
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
          text: dedent(`Your return request has been made.`),
          componentType: 'text',
          quickReplies: [
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
          ]
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
    throw new Error(`${ERROR_INDICATOR}Unable to return order`)
  }
}

const getFaqsBlock = (chatbot, blockId, messageBlocks, backId) => {
  messageBlocks.push({
    module: {
      id: chatbot._id,
      type: 'messenger_commerce_chatbot'
    },
    title: 'FAQs',
    uniqueId: blockId,
    payload: [
      {
        text: `View our FAQs here: ${chatbot.botLinks.faqs}`,
        componentType: 'text',
        quickReplies: [
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
        ]
      }
    ],
    userId: chatbot.userId,
    companyId: chatbot.companyId
  })
}

const getOrderIdBlock = (chatbot, blockId, backId, messageBlocks) => {
  messageBlocks.push({
    module: {
      id: chatbot._id,
      type: 'messenger_commerce_chatbot'
    },
    title: 'Get Order ID',
    uniqueId: blockId,
    payload: [
      {
        text: `Please enter your order ID`,
        componentType: 'text',
        action: { type: DYNAMIC, action: ORDER_STATUS, input: true },
        quickReplies: [
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
        ]
      }
    ],
    userId: chatbot.userId,
    companyId: chatbot.companyId
  })
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
    if (orderStatus.displayFinancialStatus) {
      messageBlock.payload[0].text += `\nPayment: ${orderStatus.displayFinancialStatus}`
    }
    if (orderStatus.displayFulfillmentStatus) {
      messageBlock.payload[0].text += `\nDelivery: ${orderStatus.displayFulfillmentStatus}`
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
          text: `Please select a category:`,
          componentType: 'text',
          menu: [],
          quickReplies: []
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    let productCategories = await EcommerceProvider.fetchAllProductCategories(argument.paginationParams)
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
    messageBlock.payload[0].quickReplies.push(
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
    let productVariants = await EcommerceProvider.getVariantsOfSelectedProduct(product.id)
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
          messageBlock.payload[1].cards[i].buttons = [{
            title: 'Add to Cart',
            type: 'postback',
            payload: JSON.stringify({
              type: DYNAMIC,
              action: QUANTITY_TO_ADD,
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
          }]
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
              payload: JSON.stringify({ type: DYNAMIC, action: QUANTITY_TO_ADD, argument: product })
            },
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
          ]
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    return messageBlock
  } catch (err) {
    const message = err || 'Unable to select product variants'
    logger.serverLog(message, `${TAG}: exports.getSelectProductBlock`, {}, {}, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to select product`)
  }
}

const getQuantityToAddBlock = async (chatbot, backId, contact, product) => {
  try {
    let priceString = product.currency === 'USD' ? `$${product.price}` : `${product.price} ${product.currency}`
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'messenger_commerce_chatbot'
      },
      title: 'Quantity to Add',
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
          text: ``,
          componentType: 'text',
          action: { type: DYNAMIC, action: ADD_TO_CART, argument: product, input: true },
          quickReplies: [
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
          ]
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    let shoppingCart = contact.shoppingCart ? contact.shoppingCart : []
    let existingProductIndex = shoppingCart.findIndex((item) => item.variant_id === product.variant_id)
    if (existingProductIndex > -1) {
      if (shoppingCart[existingProductIndex].quantity >= product.inventory_quantity) {
        let text = `Your cart already contains the maximum stock available for this product.`
        return getShowMyCartBlock(chatbot, backId, contact, text)
      } else {
        messageBlock.payload[1].text = `How many ${product.product}s would you like to add to your cart?\n\nYou already have ${shoppingCart[existingProductIndex].quantity} in your cart.`
      }
    } else {
      messageBlock.payload[1].text = `How many ${product.product}s would you like to add to your cart?`
    }
    return messageBlock
  } catch (err) {
    const message = err || 'Unable to add product variants'
    logger.serverLog(message, `${TAG}: exports.getQuantityToAddBlock`, {}, {}, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to add product(s) to cart`)
  }
}

const getAddToCartBlock = async (chatbot, backId, contact, product, quantity) => {
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
        throw new Error(`${ERROR_INDICATOR}Your requested quantity exceeds the stock available (${product.inventory_quantity}). Your cart already contains ${previousQuantity}. Please enter a quantity less than ${product.inventory_quantity - previousQuantity}.`)
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
    let text = `${quantity} ${product.product}${quantity !== 1 ? 's have' : 'has'} been succesfully added to your cart.`
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

const getShowMyCartBlock = async (chatbot, backId, contact, optionalText, showButtons = true) => {
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

      if (showButtons) {
        messageBlock.payload[messageBlock.payload.length - 1].quickReplies.push(
          {
            content_type: 'text',
            title: 'Clear cart',
            payload: JSON.stringify({ type: DYNAMIC, action: CONFIRM_CLEAR_CART })
          },
          {
            content_type: 'text',
            title: 'Proceed to Checkout',
            payload: JSON.stringify({ type: DYNAMIC, action: GET_CHECKOUT_EMAIL })
          }
        )
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

const getQuantityToRemoveBlock = async (chatbot, backId, product) => {
  try {
    let priceString = product.currency === 'USD' ? `$${product.price}` : `${product.price} ${product.currency}`
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'messenger_commerce_chatbot'
      },
      title: 'Quantity to Remove',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `How many ${product.product}s would you like to remove from your cart?\n\nYou currently have ${product.quantity} in your cart.\n\n(price: ${priceString})`,
          componentType: 'text',
          action: { type: DYNAMIC, action: REMOVE_FROM_CART, argument: product, input: true },
          quickReplies: [
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
          ]
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    return messageBlock
  } catch (err) {
    const message = err || 'Unable to remove product(s) from cart'
    logger.serverLog(message, `${TAG}: exports.getQuantityToRemoveBlock`, {}, {}, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to remove product(s) from cart`)
  }
}

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
          text += `Thank you for shopping at ${storeInfo.name}. We have received your order. Please note the order id given below to track your order:\n\n${order.name.replace('#', '')}`
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
      return getShowMyCartBlock(chatbot, backId, contact, text, false)
    }
    return messageBlock
  } catch (err) {
    const message = err || 'Unable to checkout'
    logger.serverLog(message, `${TAG}: exports.getCheckoutBlock`, {}, {}, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to show checkout`)
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
        messageBlock.payload[0].text = 'Here are your recently placed orders. Select an order to view its status:'
        for (let i = 0; i < recentOrders.length; i++) {
          const totalPrice = Number(recentOrders[i].totalPriceSet.presentmentMoney.amount)
          const currency = recentOrders[i].totalPriceSet.presentmentMoney.currencyCode
          const totalPriceString = currency === 'USD' ? `$${totalPrice}` : `${totalPrice} ${currency}`
          messageBlock.payload[1].cards.push({
            image_url: recentOrders[i].lineItems[0].image.originalSrc,
            title: `Order ${recentOrders[i].name}`,
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
        messageBlock.payload[0].text = 'You have not placed any orders within the last 60 days.'
      }
    } else {
      messageBlock.payload[0].text = 'You have not placed any orders yet.'
    }

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

  if (messageBlock.payload[0].text.includes(ERROR_INDICATOR)) {
    messageBlock.payload[0].text = messageBlock.payload[0].text.split('\n').filter((line) => {
      return !line.includes(ERROR_INDICATOR)
    }).join('\n')
    messageBlock.payload[0].text = `${errMessage}\n` + messageBlock.payload[0].text
  } else {
    messageBlock.payload[0].text = `${errMessage}\n\n` + messageBlock.payload[0].text
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

    if (newEmail) {
      const emailRegex = /\S+@\S+\.\S+/
      if (!emailRegex.test(newEmail)) {
        userError = true
        throw new Error('Invalid Email. Please input a valid email address.')
      }
    }

    if (chatbot.storeType === 'shopify') {
      messageBlock.payload[0].quickReplies.unshift(
        {
          content_type: 'text',
          title: 'Cash on Delivery',
          payload: JSON.stringify({ type: DYNAMIC, action: ASK_ADDRESS, argument: {newEmail, paymentMethod: 'cod'} })
        },
        {
          content_type: 'text',
          title: 'Electronic Payment',
          payload: JSON.stringify({ type: DYNAMIC, action: PROCEED_TO_CHECKOUT, argument: {newEmail, paymentMethod: 'e-payment'} })
        }
      )
    } else {
      messageBlock.payload[0].quickReplies.unshift(
        {
          content_type: 'text',
          title: 'Electronic Payment',
          payload: JSON.stringify({ type: DYNAMIC, action: PROCEED_TO_CHECKOUT, argument: {newEmail, paymentMethod: 'e-payment'} })
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

const getAskAddressBlock = async (chatbot, backId, contact, argument) => {
  try {
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
    logger.serverLog(TAG, `Unable to input street address ${err} `, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to input street address`)
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
            action: CONFIRM_COMPLETE_ADDRESS,
            input: true,
            argument: { ...argument,
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
      type: 'messenger_commerce_chatbot'
    },
    title: 'Is this new address confirmed?',
    uniqueId: '' + new Date().getTime(),
    payload: [
      {
        text: 'Thank you for updating address details.',
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
  messageBlock.payload[0].text += `\n\nYour new address is ${address.address1}, ${address.city} ${address.zip}, ${address.country}\n\n`

  messageBlock.payload[0].text += `Do you want to update this address before continue with the checkout`

  return messageBlock
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
      title: 'Checkout Link',
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

exports.getNextMessageBlock = async (chatbot, EcommerceProvider, contact, event) => {
  let userError = false
  try {
    const userMessage = event.message
    const input = (userMessage && userMessage.text) ? userMessage.text.toLowerCase() : null
    let startingBlock = await messageBlockDataLayer.findOneMessageBlock({ uniqueId: chatbot.startingBlockId })
    if (!contact || !contact.lastMessageSentByBot) {
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
          return startingBlock
        } else {
          userError = true
          throw new Error(`${ERROR_INDICATOR}Invalid User Input`)
        }
      } catch (err) {
        if (!userError) {
          const message = err || 'Invalid user input'
          logger.serverLog(message, `${TAG}: exports.getNextMessageBlock`, {}, {chatbot, EcommerceProvider, contact, event}, 'error')
        }
        if (startingBlock.triggers.includes(input) || (moment().diff(moment(contact.lastMessagedAt), 'minutes') >= 15)) {
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
              case GET_CHECKOUT_EMAIL: {
                messageBlock = await getCheckoutEmailBlock(chatbot, contact, contact.lastMessageSentByBot.uniqueId, action.argument)
                break
              }
              case PROCEED_TO_CHECKOUT: {
                messageBlock = await getCheckoutBlock(chatbot, contact.lastMessageSentByBot.uniqueId, EcommerceProvider, contact, action.argument)
                break
              }
              case RETURN_ORDER: {
                messageBlock = await getReturnOrderBlock(chatbot, contact.lastMessageSentByBot.uniqueId, EcommerceProvider, action.input ? input : '')
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
              case QUANTITY_TO_ADD: {
                messageBlock = await getQuantityToAddBlock(chatbot, contact.lastMessageSentByBot.uniqueId, contact, action.argument)
                break
              }
              case QUANTITY_TO_REMOVE: {
                messageBlock = await getQuantityToRemoveBlock(chatbot, contact.lastMessageSentByBot.uniqueId, action.argument)
                break
              }
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
                messageBlock = await getAskAddressBlock(chatbot, contact.lastMessageSentByBot.uniqueId, contact, action.argument)
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
            }
            await messageBlockDataLayer.createForMessageBlock(messageBlock)
            return messageBlock
          } catch (err) {
            if (startingBlock.triggers.includes(input)) {
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
    logger.serverLog(message, `${TAG}: exports.getNextMessageBlock`, {}, {chatbot, EcommerceProvider, contact, event}, 'error')
  }
}
