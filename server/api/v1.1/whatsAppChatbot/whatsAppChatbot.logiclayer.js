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
  RETURN_ORDER,
  GET_CHECKOUT_EMAIL,
  CLEAR_CART,
  QUANTITY_TO_ADD,
  QUANTITY_TO_REMOVE,
  QUANTITY_TO_UPDATE,
  VIEW_RECENT_ORDERS,
  FAQS_KEY,
  ORDER_STATUS_KEY,
  BACK_KEY,
  SHOW_CART_KEY,
  HOME_KEY,
  ERROR_INDICATOR
} = require('./constants')
const logger = require('../../../components/logger')
const TAG = 'api/v1️.1/whatsAppChatbot/whatsAppChatbot.logiclayer.js'
const messageBlockDataLayer = require('../messageBlock/messageBlock.datalayer')
const { callApi } = require('../utility')
const moment = require('moment')

exports.criteriaForPeriodicBotStats = (chatbotId, days) => {
  let matchAggregate = {
    chatbotId: chatbotId,
    'dateToday': {
      $gte: new Date(
        (new Date() - (days * 24 * 60 * 60 * 1000))),
      $lt: new Date(
        (new Date()))
    }
  }
  return matchAggregate
}

exports.criteriaForPeriodicBotStatsForGroup = () => {
  let groupCriteria = {
    '_id': '$chatbotId',
    'sentCount': {
      '$sum': '$sentCount'
    },
    'triggerWordsMatched': {
      '$sum': '$triggerWordsMatched'
    },
    'newSubscribersCount': {
      '$sum': '$newSubscribersCount'
    },
    'returningSubscribers': {
      '$sum': '$returningSubscribers'
    }
  }
  return groupCriteria
}

exports.validateWhatsAppChatbotPayload = (payload) => {
  let bool = true
  let whatsAppChatbotFields = [
    'usedBy',
    'triggers',
    'botLinks',
    'testSubscribers',
    'startingBlockId',
    'maxLevels',
    'published',
    'stats'
  ]
  let arrayOfKeys = Object.keys(payload)

  arrayOfKeys.forEach(field => {
    if (!whatsAppChatbotFields.includes(field)) {
      bool = false
    }
  })

  return bool
}

function convertToEmoji (num) {
  if (isNaN(num)) {
    throw new Error(`${ERROR_INDICATOR}invalid number`)
  } else {
    let stringNum = num + ''
    const numbers = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣']
    let emoji = ''
    for (let i = 0; i < stringNum.length; i++) {
      emoji += numbers[parseInt(stringNum.charAt(i))]
    }
    return emoji
  }
}

function specialKeyText (key) {
  switch (key) {
    case FAQS_KEY:
      return `Send '${key.toUpperCase()}' for faqs`
    case SHOW_CART_KEY:
      return `Send '${key.toUpperCase()}' to show cart`
    case ORDER_STATUS_KEY:
      return `Send '${key.toUpperCase()}' to check order status`
    case BACK_KEY:
      return `Send '${key.toUpperCase()}' to go back`
    case HOME_KEY:
      return `Send '${key.toUpperCase()}' to go home`
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
      type: 'whatsapp_chatbot'
    },
    title: 'Main Menu',
    uniqueId: mainMenuId,
    payload: [
      {
        text: dedent(`Please select an option by sending the corresponding number for it (e.g. send '1' to select On Sale):\n
                ${convertToEmoji(0)} All Categories
                ${convertToEmoji(1)} On Sale
                ${convertToEmoji(2)} Search for a Product\n
                ${specialKeyText(ORDER_STATUS_KEY)}
                ${specialKeyText(SHOW_CART_KEY)}`),
        componentType: 'text',
        menu: [
          { type: DYNAMIC, action: PRODUCT_CATEGORIES },
          { type: DYNAMIC, action: DISCOVER_PRODUCTS },
          { type: STATIC, blockId: searchProductsId }
        ],
        specialKeys: {
          [ORDER_STATUS_KEY]: { type: STATIC, blockId: checkOrdersId },
          [SHOW_CART_KEY]: { type: DYNAMIC, action: SHOW_MY_CART }
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
    messageBlocks[0].payload[0].text = `\n${specialKeyText(FAQS_KEY, 'faqs')} FAQs`
    messageBlocks[0].payload[0].specialKeys[FAQS_KEY] = { type: STATIC, blockId: faqsId }
    getFaqsBlock(chatbot, faqsId, messageBlocks, mainMenuId)
  }
  return messageBlocks
}

const getSearchProductsBlock = async (chatbot, blockId, messageBlocks) => {
  messageBlocks.push({
    module: {
      id: chatbot._id,
      type: 'whatsapp_chatbot'
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

const getDiscoverProductsBlock = async (chatbot, backId, EcommerceProvider, input) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_chatbot'
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
    if (input) {
      products = await EcommerceProvider.searchProducts(input)
      if (products.length > 0) {
        messageBlock.payload[0].text = `Following products were found for "${input}". Please select a product by sending the corresponding number for it:\n`
      } else {
        messageBlock.payload[0].text = `No products found that match "${input}".`
      }
    } else {
      products = await EcommerceProvider.fetchProducts()
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
        type: DYNAMIC, action: PRODUCT_VARIANTS, argument: product
      })
    }
    messageBlock.payload[0].text += `\n\n${specialKeyText(SHOW_CART_KEY)}`
    messageBlock.payload[0].text += `\n${specialKeyText(BACK_KEY)}`
    messageBlock.payload[0].text += `\n${specialKeyText(HOME_KEY)}`
    return messageBlock
  } catch (err) {
    logger.serverLog(TAG, `Unable to discover products ${err}`, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to discover products`)
  }
}

const getReturnOrderIdBlock = (chatbot, blockId, messageBlocks) => {
  messageBlocks.push({
    module: {
      id: chatbot._id,
      type: 'whatsapp_chatbot'
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
        type: 'whatsapp_chatbot'
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
    logger.serverLog(TAG, `Unable to return order ${err}`, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to return order. Please make sure your order ID is valid.`)
  }
}

const getFaqsBlock = (chatbot, blockId, messageBlocks, backId) => {
  messageBlocks.push({
    module: {
      id: chatbot._id,
      type: 'whatsapp_chatbot'
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
      type: 'whatsapp_chatbot'
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
        type: 'whatsapp_chatbot'
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
    if (contact.shopifyCustomer) {
      recentOrders = await EcommerceProvider.findCustomerOrders(contact.shopifyCustomer.id, 9)
      recentOrders = recentOrders.orders
      if (recentOrders.length > 0) {
        messageBlock.payload[0].text = 'Here are your recently placed orders. Select an order by sending the corresponding number for it:\n'
        for (let i = 0; i < recentOrders.length; i++) {
          messageBlock.payload[0].text += `\n${convertToEmoji(i)} Order ${recentOrders[i].name}`
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
    return messageBlock
  } catch (err) {
    logger.serverLog(TAG, `Unable to get recent orders ${err}`, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to get recent orders.`)
  }
}

const getOrderIdBlock = (chatbot, blockId, messageBlocks) => {
  messageBlocks.push({
    module: {
      id: chatbot._id,
      type: 'whatsapp_chatbot'
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
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_chatbot'
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

    logger.serverLog(TAG, `orderStatus ${JSON.stringify(orderStatus)}`, 'info')
    messageBlock.payload[0].text += `\n*Payment*: ${orderStatus.displayFinancialStatus}`
    messageBlock.payload[0].text += `\n*Delivery*: ${orderStatus.displayFulfillmentStatus}`

    for (let i = 0; i < orderStatus.lineItems.length; i++) {
      let product = orderStatus.lineItems[i]
      messageBlock.payload[0].text += `\n*Item*: ${product.name}`
      messageBlock.payload[0].text += `\n*Quantity*: ${product.quantity}`
      if (i + 1 < orderStatus.lineItems.length) {
        messageBlock.payload[0].text += `\n`
      }
    }

    messageBlock.payload[0].text += `\n\nThis order was placed on ${new Date(orderStatus.createdAt).toDateString()}`

    messageBlock.payload[0].text += `\n\n*Shipping Address*: ${orderStatus.shippingAddress.address1}, ${orderStatus.shippingAddress.city}, ${orderStatus.shippingAddress.country}`

    messageBlock.payload[0].text += `\n\n${specialKeyText(SHOW_CART_KEY)}`
    messageBlock.payload[0].text += `\n${specialKeyText(BACK_KEY)}`
    messageBlock.payload[0].text += `\n${specialKeyText(HOME_KEY)}`
    return messageBlock
  } catch (err) {
    logger.serverLog(TAG, `Unable to get order status ${err}`, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to get order status. Please make sure your order ID is valid.`)
  }
}

const getProductCategoriesBlock = async (chatbot, backId, EcommerceProvider) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_chatbot'
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
    let productCategories = await EcommerceProvider.fetchAllProductCategories()
    for (let i = 0; i < productCategories.length; i++) {
      let category = productCategories[i]
      messageBlock.payload[0].text += `\n${convertToEmoji(i)} ${category.name}`
      messageBlock.payload[0].menu.push({
        type: DYNAMIC, action: FETCH_PRODUCTS, argument: category.id
      })
    }
    messageBlock.payload[0].text += `\n\n${specialKeyText(SHOW_CART_KEY)}`
    messageBlock.payload[0].text += `\n${specialKeyText(BACK_KEY)}`
    messageBlock.payload[0].text += `\n${specialKeyText(HOME_KEY)}`
    return messageBlock
  } catch (err) {
    logger.serverLog(TAG, `Unable to get product categories ${err}`, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to get product categories`)
  }
}

const getProductsInCategoryBlock = async (chatbot, backId, EcommerceProvider, categoryId) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_chatbot'
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
    let products = await EcommerceProvider.fetchProductsInThisCategory(categoryId)
    for (let i = 0; i < products.length; i++) {
      let product = products[i]
      messageBlock.payload[0].text += `\n${convertToEmoji(i)} ${product.name}`
      messageBlock.payload[0].menu.push({
        type: DYNAMIC, action: PRODUCT_VARIANTS, argument: product
      })
    }
    messageBlock.payload[0].text += `\n\n${specialKeyText(SHOW_CART_KEY)}`
    messageBlock.payload[0].text += `\n${specialKeyText(BACK_KEY)}`
    messageBlock.payload[0].text += `\n${specialKeyText(HOME_KEY)}`
    return messageBlock
  } catch (err) {
    logger.serverLog(TAG, `Unable to get products in category ${err}`, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to get products in this category`)
  }
}

const getProductVariantsBlock = async (chatbot, backId, EcommerceProvider, product) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_chatbot'
      },
      title: 'Product Variants',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `You have selected ${product.name}.\n\nPlease select a product variant by sending the corresponding number for it:\n`,
          componentType: 'text',
          menu: [],
          specialKeys: {
            [SHOW_CART_KEY]: { type: DYNAMIC, action: SHOW_MY_CART },
            [BACK_KEY]: { type: STATIC, blockId: backId },
            [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId }
          }
        },
        {
          componentType: 'image',
          fileurl: product.image
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    let productVariants = await EcommerceProvider.getVariantsOfSelectedProduct(product.id)
    let storeInfo = await EcommerceProvider.fetchStoreInfo()
    logger.serverLog(TAG, `store info ${JSON.stringify(storeInfo)}`, 'info')
    for (let i = 0; i < productVariants.length; i++) {
      let productVariant = productVariants[i]
      messageBlock.payload[0].text += `\n${convertToEmoji(i)} ${productVariant.name} (price: ${product.price} ${storeInfo.currency})`
      messageBlock.payload[0].menu.push({
        type: DYNAMIC,
        action: SELECT_PRODUCT,
        argument: {
          variant_id: productVariant.id,
          product: `${productVariant.name} ${product.name}`,
          price: productVariant.price,
          inventory_quantity: productVariant.inventory_quantity,
          currency: storeInfo.currency
        }
      })
    }
    messageBlock.payload[0].text += `\n\n${specialKeyText(SHOW_CART_KEY)}`
    messageBlock.payload[0].text += `\n${specialKeyText(BACK_KEY)}`
    messageBlock.payload[0].text += `\n${specialKeyText(HOME_KEY)}`
    return messageBlock
  } catch (err) {
    logger.serverLog(TAG, `Unable to get product variants ${err}`, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to get product variants`)
  }
}

const getSelectProductBlock = async (chatbot, backId, product) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_chatbot'
      },
      title: 'Select Product',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: dedent(`You have selected ${product.product} (price: ${product.price} ${product.currency}).\n
                  Please select an option by sending the corresponding number for it:\n
                  ${convertToEmoji(0)} Add to Cart\n
                  ${specialKeyText(SHOW_CART_KEY)}
                  ${specialKeyText(BACK_KEY)}
                  ${specialKeyText(HOME_KEY)}`),
          componentType: 'text',
          menu: [
            { type: DYNAMIC, action: QUANTITY_TO_ADD, argument: product },
            { type: DYNAMIC, action: SHOW_MY_CART }
          ],
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
    return messageBlock
  } catch (err) {
    logger.serverLog(TAG, `Unable to select product ${err}`, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to select product`)
  }
}

const getQuantityToAddBlock = async (chatbot, backId, contact, product) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_chatbot'
      },
      title: 'Quantity to Add',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `How many ${product.product}s (price: ${product.price} ${product.currency}) would you like to add to your cart? (stock available: ${product.inventory_quantity})`,
          componentType: 'text',
          action: { type: DYNAMIC, action: ADD_TO_CART, argument: product, input: true }
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
      }
    }
    return messageBlock
  } catch (err) {
    logger.serverLog(TAG, `Unable to add product(s) to cart ${err}`, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to add product(s) to cart`)
  }
}

const getAddToCartBlock = async (chatbot, backId, contact, product, quantity) => {
  try {
    quantity = Number(quantity)
    if (!Number.isInteger(quantity) || quantity < 0) {
      throw new Error(`${ERROR_INDICATOR}Invalid quantity given.`)
    }
    let shoppingCart = contact.shoppingCart ? contact.shoppingCart : []
    let existingProductIndex = shoppingCart.findIndex((item) => item.variant_id === product.variant_id)
    if (existingProductIndex > -1) {
      let previousQuantity = shoppingCart[existingProductIndex].quantity
      if ((previousQuantity + quantity) > product.inventory_quantity) {
        throw new Error(`${ERROR_INDICATOR}Your requested quantity exceeds the stock available (${product.inventory_quantity}). Your cart already contains ${previousQuantity}. Please enter a quantity less than ${product.inventory_quantity - previousQuantity}.`)
      }
      shoppingCart[existingProductIndex].quantity += quantity
    } else {
      if (quantity > product.inventory_quantity) {
        throw new Error(`${ERROR_INDICATOR}Your requested quantity exceeds the stock available (${product.inventory_quantity}). Please enter a quantity less than ${product.inventory_quantity}.`)
      }
      if (quantity > 0) {
        shoppingCart.push({
          variant_id: product.variant_id,
          quantity,
          product: product.product,
          inventory_quantity: product.inventory_quantity,
          price: Number(product.price),
          currency: product.currency
        })
      }
    }

    logger.serverLog(TAG, `shoppingCart ${JSON.stringify(shoppingCart)}`, 'info')
    updateWhatsAppContact({ _id: contact._id }, { shoppingCart }, null, {})
    let text = `${quantity} ${product.product}${quantity !== 1 ? 's have' : ' has'} been succesfully added to your cart.`
    return getShowMyCartBlock(chatbot, backId, contact, text)
  } catch (err) {
    logger.serverLog(TAG, `Unable to add to cart ${err}`, 'error')
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
        type: 'whatsapp_chatbot'
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
        if (!currency) {
          currency = product.currency
        }
        let price = product.quantity * product.price
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
        { type: DYNAMIC, action: CLEAR_CART },
        { type: DYNAMIC, action: GET_CHECKOUT_EMAIL })
      messageBlock.payload[0].text += dedent(`Please select an option by sending the corresponding number for it:\n
                                            ${convertToEmoji(0)} Remove an item
                                            ${convertToEmoji(1)} Update quantity for an item
                                            ${convertToEmoji(2)} Clear cart
                                            ${convertToEmoji(3)} Proceed to Checkout`)
    }
    messageBlock.payload[0].text += `\n\n${specialKeyText(BACK_KEY)}`
    messageBlock.payload[0].text += `\n${specialKeyText(HOME_KEY)}`
    return messageBlock
  } catch (err) {
    logger.serverLog(TAG, `Unable to show cart ${err}`, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to show cart`)
  }
}

const getRemoveFromCartBlock = async (chatbot, backId, contact, productInfo, quantity) => {
  try {
    quantity = Number(quantity)
    if (!Number.isInteger(quantity) || quantity < 0) {
      throw new Error(`${ERROR_INDICATOR}Invalid quantity given.`)
    }
    let shoppingCart = contact.shoppingCart
    shoppingCart[productInfo.productIndex].quantity -= quantity
    if (shoppingCart[productInfo.productIndex].quantity === 0) {
      shoppingCart.splice(productInfo.productIndex, 1)
    } else if (shoppingCart[productInfo.productIndex].quantity < 0) {
      throw new Error(`${ERROR_INDICATOR}Invalid quantity given.`)
    }
    updateWhatsAppContact({ _id: contact._id }, { shoppingCart }, null, {})
    let text = `${quantity} ${productInfo.product}${quantity !== 1 ? 's have' : ' has'} been succesfully removed from your cart.`
    return getShowMyCartBlock(chatbot, backId, contact, text)
  } catch (err) {
    logger.serverLog(TAG, `Unable to remove item(s) from cart ${err} `, 'error')
    if (err.message) {
      throw new Error(`${ERROR_INDICATOR}${err.message}`)
    } else {
      throw new Error(`${ERROR_INDICATOR}Unable to remove item(s) from cart`)
    }
  }
}

const getQuantityToRemoveBlock = async (chatbot, product) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_chatbot'
      },
      title: 'Quantity to Remove',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `How many ${product.product}s would you like to remove from your cart?\n\nYou currently have ${product.quantity} in your cart.\n\n(price: ${product.price} ${product.currency})`,
          componentType: 'text',
          action: { type: DYNAMIC, action: REMOVE_FROM_CART, argument: product, input: true }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    return messageBlock
  } catch (err) {
    logger.serverLog(TAG, `Unable to remove product(s) from cart ${err} `, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to remove product(s) from cart`)
  }
}

const getShowItemsToRemoveBlock = (chatbot, backId, contact) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_chatbot'
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
      messageBlock.payload[0].menu.push({ type: DYNAMIC, action: QUANTITY_TO_REMOVE, argument: { ...product, productIndex: i } })
    }
    messageBlock.payload[0].text += `\n\n${specialKeyText(SHOW_CART_KEY)} `
    messageBlock.payload[0].text += `\n${specialKeyText(BACK_KEY)} `
    messageBlock.payload[0].text += `\n${specialKeyText(HOME_KEY)} `
    return messageBlock
  } catch (err) {
    logger.serverLog(TAG, `Unable to show items from cart ${err} `, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to show items from cart`)
  }
}

const getQuantityToUpdateBlock = async (chatbot, product) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_chatbot'
      },
      title: 'Quantity to Update',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `What quantity would you like to set for ${product.product}?\n\nYou currently have ${product.quantity} in your cart.\n\n(price: ${product.price} ${product.currency}) (stock available: ${product.inventory_quantity})`,
          componentType: 'text',
          action: { type: DYNAMIC, action: UPDATE_CART, argument: product, input: true }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    return messageBlock
  } catch (err) {
    logger.serverLog(TAG, `Unable to update product(s) in cart ${err} `, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to update product(s) in cart`)
  }
}

const getShowItemsToUpdateBlock = (chatbot, backId, contact) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_chatbot'
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
    for (let i = 0; i < shoppingCart.length; i++) {
      let product = shoppingCart[i]
      messageBlock.payload[0].text += `\n${convertToEmoji(i)} ${product.product} `
      messageBlock.payload[0].menu.push({ type: DYNAMIC, action: QUANTITY_TO_UPDATE, argument: { ...product, productIndex: i } })
    }
    messageBlock.payload[0].text += `\n\n${specialKeyText(SHOW_CART_KEY)} `
    messageBlock.payload[0].text += `\n${specialKeyText(BACK_KEY)} `
    messageBlock.payload[0].text += `\n${specialKeyText(HOME_KEY)} `
    return messageBlock
  } catch (err) {
    logger.serverLog(TAG, `Unable to show items from cart ${err} `, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to show items from cart`)
  }
}

const getUpdateCartBlock = async (chatbot, backId, contact, product, quantity) => {
  try {
    quantity = Number(quantity)
    if (!Number.isInteger(quantity) || quantity < 0) {
      throw new Error(`${ERROR_INDICATOR}Invalid quantity given.`)
    }
    if (quantity > product.inventory_quantity) {
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
        quantity,
        product: product.product,
        inventory_quantity: product.inventory_quantity,
        price: Number(product.price),
        currency: product.currency
      })
    }
    logger.serverLog(TAG, `shoppingCart ${JSON.stringify(shoppingCart)}`, 'info')
    updateWhatsAppContact({ _id: contact._id }, { shoppingCart }, null, {})
    let text = `${product.product} quantity has been updated to ${quantity}.`
    return getShowMyCartBlock(chatbot, backId, contact, text)
  } catch (err) {
    logger.serverLog(TAG, `Unable to update cart ${err}`, 'error')
    if (err.message) {
      throw new Error(`${ERROR_INDICATOR}${err.message}`)
    } else {
      throw new Error(`${ERROR_INDICATOR}Unable to update cart`)
    }
  }
}

const clearCart = async (chatbot, contact) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_chatbot'
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
    logger.serverLog(TAG, `Unable to clear cart ${err} `, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to clear cart`)
  }
}

function updateWhatsAppContact (query, bodyForUpdate, bodyForIncrement, options) {
  callApi(`whatsAppContacts/update`, 'put', { query: query, newPayload: { ...bodyForIncrement, ...bodyForUpdate }, options: options })
    .then(updated => {
    })
    .catch(error => {
      logger.serverLog(TAG, `Failed to update contact ${error} `, 'error')
    })
}

const getCheckoutEmailBlock = async (chatbot, contact, newEmail) => {
  try {
    let messageBlock = null
    if (!newEmail && contact.shopifyCustomer && contact.shopifyCustomer.email) {
      messageBlock = {
        module: {
          id: chatbot._id,
          type: 'whatsapp_chatbot'
        },
        title: 'Checkout Email',
        uniqueId: '' + new Date().getTime(),
        payload: [
          {
            text: dedent(`Would you like to use ${contact.shopifyCustomer.email} as your email?\n
                        Send '0' for Yes
                        Send '1' for No`),
            componentType: 'text',
            menu: [
              { type: DYNAMIC, action: PROCEED_TO_CHECKOUT },
              { type: DYNAMIC, action: GET_CHECKOUT_EMAIL, argument: true }
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
          type: 'whatsapp_chatbot'
        },
        title: 'Checkout Email',
        uniqueId: '' + new Date().getTime(),
        payload: [
          {
            text: `Please enter your email: `,
            componentType: 'text',
            action: { type: DYNAMIC, action: PROCEED_TO_CHECKOUT, input: true }
          }
        ],
        userId: chatbot.userId,
        companyId: chatbot.companyId
      }
    }
    return messageBlock
  } catch (err) {
    logger.serverLog(TAG, `Unable to checkout ${err} `, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to show checkout`)
  }
}

const getCheckoutBlock = async (chatbot, backId, EcommerceProvider, contact, newEmail) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_chatbot'
      },
      title: 'Checkout Link',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Here is your checkout link: `,
          componentType: 'text',
          specialKeys: {
            [SHOW_CART_KEY]: { type: DYNAMIC, action: SHOW_MY_CART },
            [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }

    let shopifyCustomer = null
    if (newEmail) {
      shopifyCustomer = await EcommerceProvider.searchCustomerUsingEmail(newEmail)
      if (shopifyCustomer.length === 0) {
        shopifyCustomer = await EcommerceProvider.createCustomer('', '', newEmail)
      } else {
        shopifyCustomer = shopifyCustomer[0]
      }
      logger.serverLog(TAG, `shopifyCustomer ${JSON.stringify(shopifyCustomer)}`, 'info')
      updateWhatsAppContact({ _id: contact._id }, { shopifyCustomer, shoppingCart: [] }, null, {})
    } else {
      shopifyCustomer = contact.shopifyCustomer

      updateWhatsAppContact({ _id: contact._id }, { shoppingCart: [] }, null, {})
    }
    let checkoutLink = EcommerceProvider.createPermalinkForCart(shopifyCustomer, contact.shoppingCart)

    messageBlock.payload[0].text += `\n${checkoutLink} `

    messageBlock.payload[0].text += `\n\n${specialKeyText(SHOW_CART_KEY)} `
    messageBlock.payload[0].text += `\n${specialKeyText(HOME_KEY)} `
    return messageBlock
  } catch (err) {
    logger.serverLog(TAG, `Unable to checkout ${err} `, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to show checkout. Please make sure you have entered a correct email.`)
  }
}

// const getErrorMessageBlock = (chatbot, backId, error) => {
//   return {
//     module: {
//       id: chatbot._id,
//       type: 'whatsapp_chatbot'
//     },
//     title: 'Error',
//     uniqueId: '' + new Date().getTime(),
//     payload: [
//       {
//         text: dedent(`${error} \n
//   ${specialKeyText(SHOW_CART_KEY)}
//   ${specialKeyText(BACK_KEY)}
//   ${specialKeyText(HOME_KEY)} `),
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
//   }
// }

const getWelcomeMessageBlock = async (chatbot, contact, input) => {
  let welcomeMessage = ''
  let subscriberLastMessageAt = moment(contact.lastMessagedAt)
  let dateNow = moment()

  welcomeMessage += `${input.charAt(0).toUpperCase() + input.substr(1).toLowerCase()}`

  if (contact.name && contact.name !== contact.number) {
    welcomeMessage += ` ${contact.name.split(' ')[0]}!`
  } else {
    welcomeMessage += `!`
  }
  if (dateNow.diff(subscriberLastMessageAt, 'days') >= 1 && contact.lastMessageSentByBot) {
    welcomeMessage += ` Welcome back!`
  }
  let messageBlock = await messageBlockDataLayer.findOneMessageBlock({ uniqueId: chatbot.startingBlockId })
  messageBlock.payload[0].text = `${welcomeMessage}\n\n` + messageBlock.payload[0].text
  return messageBlock
}

const invalidInput = async (chatbot, messageBlock, errMessage) => {
  if (messageBlock.uniqueId === chatbot.startingBlockId) {
    messageBlock = await messageBlockDataLayer.findOneMessageBlock({ uniqueId: chatbot.startingBlockId })
  }

  if (messageBlock.payload[0].text.includes(ERROR_INDICATOR)) {
    logger.serverLog(TAG, `whatsapp invalid input contains error_indicator`, 'info')
    messageBlock.payload[0].text = messageBlock.payload[0].text.split('\n').filter((line) => {
      return !line.includes(ERROR_INDICATOR)
    }).join('\n')
    messageBlock.payload[0].text = `${errMessage}\n` + messageBlock.payload[0].text
  } else {
    messageBlock.payload[0].text = `${errMessage}\n\n` + messageBlock.payload[0].text
  }

  logger.serverLog(TAG, `whatsapp chatbot invalid input ${JSON.stringify(messageBlock)} `, 'info')
  return messageBlock
}

exports.getNextMessageBlock = async (chatbot, EcommerceProvider, contact, input) => {
  input = input.toLowerCase()
  if (!contact || !contact.lastMessageSentByBot) {
    if (chatbot.triggers.includes(input)) {
      return getWelcomeMessageBlock(chatbot, contact, input)
    }
  } else {
    let action = null
    logger.serverLog(TAG, `whatsapp chatbot contact ${JSON.stringify(contact)} `, 'info')
    let lastMessageSentByBot = contact.lastMessageSentByBot.payload[0]
    try {
      if (lastMessageSentByBot.specialKeys && lastMessageSentByBot.specialKeys[input]) {
        action = lastMessageSentByBot.specialKeys[input]
      } else if (lastMessageSentByBot.menu) {
        let menuInput = parseInt(input)
        if (isNaN(menuInput) || menuInput >= lastMessageSentByBot.menu.length) {
          throw new Error(`${ERROR_INDICATOR}Invalid User Input`)
        }
        action = lastMessageSentByBot.menu[menuInput]
      } else if (lastMessageSentByBot.action) {
        action = lastMessageSentByBot.action
      } else {
        throw new Error(`${ERROR_INDICATOR}Invalid User Input`)
      }
    } catch (err) {
      logger.serverLog(TAG, `Invalid user input ${input} `, 'info')
      if (chatbot.triggers.includes(input)) {
        return getWelcomeMessageBlock(chatbot, contact, input)
      } else {
        return invalidInput(chatbot, contact.lastMessageSentByBot, `${ERROR_INDICATOR}You entered an invalid response.`)
      }
    }
    if (action.type === DYNAMIC) {
      try {
        let messageBlock = null
        switch (action.action) {
          case PRODUCT_CATEGORIES: {
            messageBlock = await getProductCategoriesBlock(chatbot, contact.lastMessageSentByBot.uniqueId, EcommerceProvider)
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
            messageBlock = await getDiscoverProductsBlock(chatbot, contact.lastMessageSentByBot.uniqueId, EcommerceProvider, action.input ? input : '')
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
          case PROCEED_TO_CHECKOUT: {
            messageBlock = await getCheckoutBlock(chatbot, contact.lastMessageSentByBot.uniqueId, EcommerceProvider, contact, action.input ? input : '')
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
            messageBlock = await getRemoveFromCartBlock(chatbot, contact.lastMessageSentByBot.uniqueId, contact, action.argument, action.input ? input : '')
            break
          }
          case UPDATE_CART: {
            messageBlock = await getUpdateCartBlock(chatbot, contact.lastMessageSentByBot.uniqueId, contact, action.argument, action.input ? input : '')
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
          case QUANTITY_TO_REMOVE: {
            messageBlock = await getQuantityToRemoveBlock(chatbot, action.argument)
            break
          }
          case QUANTITY_TO_UPDATE: {
            messageBlock = await getQuantityToUpdateBlock(chatbot, action.argument)
            break
          }
          case VIEW_RECENT_ORDERS: {
            messageBlock = await getRecentOrdersBlock(chatbot, contact.lastMessageSentByBot.uniqueId, contact, EcommerceProvider)
            break
          }
        }
        await messageBlockDataLayer.createForMessageBlock(messageBlock)
        return messageBlock
      } catch (err) {
        if (chatbot.triggers.includes(input)) {
          return getWelcomeMessageBlock(chatbot, contact, input)
        } else {
          return invalidInput(chatbot, contact.lastMessageSentByBot, err.message)
        }
      }
    } else if (action.type === STATIC) {
      return messageBlockDataLayer.findOneMessageBlock({ uniqueId: action.blockId })
    }
  }
}
