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
  SHOW_ITEMS_TO_REMOVE,
  PROCEED_TO_CHECKOUT,
  RETURN_ORDER,
  GET_CHECKOUT_EMAIL
} = require('./constants')
const logger = require('../../../components/logger')
const TAG = 'api/v1️.1/whatsAppChatbot/whatsAppChatbot.logiclayer.js'
const messageBlockDataLayer = require('../messageBlock/messageBlock.datalayer')
const { callApi } = require('../utility')

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

function convertToEmoji(num) {
  if (isNaN(num)) {
    throw new Error('invalid number')
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

exports.updateFaqsForStartingBlock = async (chatbot) => {
  let messageBlocks = []
  const faqsId = '' + new Date().getTime()
  let startingBlock = await messageBlockDataLayer.findOneMessageBlock({ uniqueId: chatbot.startingBlockId })
  if (!startingBlock.payload[0].text.includes('FAQ')) {
    startingBlock.payload[0].text += `\n${convertToEmoji(3)} FAQs`
    startingBlock.payload[0].menu.push({ type: STATIC, blockId: faqsId })
    getFaqsBlock(chatbot, faqsId, messageBlocks, chatbot.startingBlockId)
    messageBlockDataLayer.genericUpdateMessageBlock({ uniqueId: chatbot.startingBlockId }, startingBlock)
    messageBlockDataLayer.createForMessageBlock(messageBlocks[0])
  } else {
    if (chatbot.botLinks && chatbot.botLinks.faqs) {
      messageBlockDataLayer.genericUpdateMessageBlock(
        { uniqueId: startingBlock.payload[0].menu[3].blockId },
        { 'payload.0.text': `View our FAQs here: ${chatbot.botLinks.faqs}\nPlease send "0" to go back` }
      )
    } else {
      startingBlock.payload[0].text = startingBlock.payload[0].text.replace(`\n${convertToEmoji(3)} FAQs`, '')
      startingBlock.payload[0].menu.splice(3, 1)
      messageBlockDataLayer.genericUpdateMessageBlock({ uniqueId: chatbot.startingBlockId }, startingBlock)
      messageBlockDataLayer.deleteForMessageBlock({ uniqueId: startingBlock.payload[0].menu[3].blockId })
    }
  }
}

exports.getMessageBlocks = (chatbot) => {
  const messageBlocks = []
  const mainMenuId = '' + new Date().getTime()
  const orderStatusId = '' + new Date().getTime() + 100
  const returnOrderId = '' + new Date().getTime() + 200
  const faqsId = '' + new Date().getTime() + 300

  messageBlocks.push({
    module: {
      id: chatbot._id,
      type: 'whatsapp_chatbot'
    },
    title: 'Main Menu',
    uniqueId: mainMenuId,
    payload: [
      {
        text: dedent(`Please select an option by sending the corresponding number for it (e.g send “1” to select Discover):
                ${convertToEmoji(0)} All Categories
                ${convertToEmoji(1)} Discover
                ${convertToEmoji(2)} Check order status`),
        componentType: 'text',
        menu: [
          { type: DYNAMIC, action: PRODUCT_CATEGORIES },
          { type: DYNAMIC, action: DISCOVER_PRODUCTS },
          { type: STATIC, blockId: orderStatusId }
        ]
      }
    ],
    userId: chatbot.userId,
    companyId: chatbot.companyId
  })
  getOrderIdBlock(chatbot, orderStatusId, messageBlocks)
  getReturnOrderIdBlock(chatbot, returnOrderId, messageBlocks)
  if (chatbot.botLinks && chatbot.botLinks.faqs) {
    messageBlocks[0].payload[0].text = `\n${convertToEmoji(3)} FAQs`
    messageBlocks[0].payload[0].menu.push({ type: STATIC, blockId: faqsId })
    getFaqsBlock(chatbot, faqsId, messageBlocks, mainMenuId)
  }
  return messageBlocks
}

const getDiscoverProductsBlock = async (chatbot, backId, EcommerceProvider) => {
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
          text: `Please select a product by sending the corresponding number for it:`,
          componentType: 'text',
          menu: []
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    let products = await EcommerceProvider.fetchProducts()
    for (let i = 0; i < products.length; i++) {
      let product = products[i]
      messageBlock.payload[0].text += `\n${convertToEmoji(i)} ${product.name}`
      messageBlock.payload[0].menu.push({
        type: DYNAMIC, action: PRODUCT_VARIANTS, argument: product
      })
    }
    messageBlock.payload[0].text += `\n${convertToEmoji(products.length)} Go Back`
    messageBlock.payload[0].menu.push({
      type: STATIC, blockId: backId
    })
    messageBlock.payload[0].text += `\n${convertToEmoji(products.length + 1)} Go Home`
    messageBlock.payload[0].menu.push({
      type: STATIC, blockId: chatbot.startingBlockId
    })
    return messageBlock
  } catch (err) {
    logger.serverLog(TAG, `Unable to discover products ${err}`, 'error')
    throw new Error('Unable to discover products')
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
      title: 'Show My Cart',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: dedent(`Your return request has been made.
            Please select an option by sending the corresponding number for it:
            ${convertToEmoji(0)} Go Back
            ${convertToEmoji(1)} Go Home`),
          componentType: 'text',
          menu: [
            { type: STATIC, blockId: backId },
            { type: STATIC, blockId: chatbot.startingBlockId }
          ]
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    await EcommerceProvider.returnOrder(orderId)

    return messageBlock
  } catch (err) {
    logger.serverLog(TAG, `Unable to return order ${err}`, 'error')
    throw new Error('Unable to return order')
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
        text: `View our FAQs here: ${chatbot.botLinks.faqs}\nPlease send "0" to go back`,
        componentType: 'text',
        menu: [
          { type: STATIC, blockId: backId }
        ]
      }
    ],
    userId: chatbot.userId,
    companyId: chatbot.companyId
  })
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
          text: `Here is your order status:`,
          componentType: 'text',
          menu: []
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    let orderStatus = await EcommerceProvider.checkOrderStatus(Number(orderId))
    messageBlock.payload[0].text += `\nPayment: ${orderStatus.displayFinancialStatus}`
    messageBlock.payload[0].text += `\nDelivery: ${orderStatus.displayFulfillmentStatus}`

    messageBlock.payload[0].text += '\nPlease select an option by sending the corresponding number for it:'
    messageBlock.payload[0].text += `\n${convertToEmoji(0)} Go Back`
    messageBlock.payload[0].menu.push({
      type: STATIC, blockId: backId
    })
    messageBlock.payload[0].text += `\n${convertToEmoji(1)} Go Home`
    messageBlock.payload[0].menu.push({
      type: STATIC, blockId: chatbot.startingBlockId
    })
    return messageBlock
  } catch (err) {
    logger.serverLog(TAG, `Unable to get order status ${err}`, 'error')
    throw new Error('Unable to get order status')
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
          text: `Please select a category by sending the corresponding number for it:`,
          componentType: 'text',
          menu: []
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
    messageBlock.payload[0].text += `\n${convertToEmoji(productCategories.length)} Go Back`
    messageBlock.payload[0].menu.push({
      type: STATIC, blockId: backId
    })
    return messageBlock
  } catch (err) {
    logger.serverLog(TAG, `Unable to get product categories ${err}`, 'error')
    throw new Error('Unable to get product categories')
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
          text: `Please select a product by sending the corresponding number for it:`,
          componentType: 'text',
          menu: []
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
    messageBlock.payload[0].text += `\n${convertToEmoji(products.length)} Go Back`
    messageBlock.payload[0].menu.push({
      type: STATIC, blockId: backId
    })
    messageBlock.payload[0].text += `\n${convertToEmoji(products.length + 1)} Go Home`
    messageBlock.payload[0].menu.push({
      type: STATIC, blockId: chatbot.startingBlockId
    })
    return messageBlock
  } catch (err) {
    logger.serverLog(TAG, `Unable to get products in category ${err}`, 'error')
    throw new Error('Unable to get products in this category')
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
          text: `Please select a product variant by sending the corresponding number for it:`,
          componentType: 'text',
          menu: []
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    let productVariants = await EcommerceProvider.getVariantsOfSelectedProduct(product.id)
    for (let i = 0; i < productVariants.length; i++) {
      let productVariant = productVariants[i]
      messageBlock.payload[0].text += `\n${convertToEmoji(i)} ${productVariant.name} ${product.name}, Price: ${product.price}`
      messageBlock.payload[0].menu.push({
        type: DYNAMIC, action: SELECT_PRODUCT, argument: { variant_id: productVariant.id, product: `${productVariant.name} ${product.name}` }
      })
    }
    messageBlock.payload[0].text += `\n${convertToEmoji(productVariants.length)} Go Back`
    messageBlock.payload[0].menu.push({
      type: STATIC, blockId: backId
    })
    messageBlock.payload[0].text += `\n${convertToEmoji(productVariants.length + 1)} Go Home`
    messageBlock.payload[0].menu.push({
      type: STATIC, blockId: chatbot.startingBlockId
    })
    return messageBlock
  } catch (err) {
    logger.serverLog(TAG, `Unable to get product variants ${err}`, 'error')
    throw new Error('Unable to get product variants')
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
          text: dedent(`Please select an option by sending the corresponding number for it:
                  ${convertToEmoji(0)} Add to Cart
                  ${convertToEmoji(1)} Proceed to Checkout
                  ${convertToEmoji(2)} Show my Cart
                  ${convertToEmoji(3)} Go Back
                  ${convertToEmoji(4)} Go Home`),
          componentType: 'text',
          menu: [
            { type: DYNAMIC, action: ADD_TO_CART, argument: product },
            { type: DYNAMIC, action: GET_CHECKOUT_EMAIL },
            { type: DYNAMIC, action: SHOW_MY_CART },
            { type: STATIC, blockId: backId },
            { type: STATIC, blockId: chatbot.startingBlockId }
          ]
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    return messageBlock
  } catch (err) {
    logger.serverLog(TAG, `Unable to select product ${err}`, 'error')
    throw new Error('Unable to select product')
  }
}

const getAddToCartBlock = async (chatbot, backId, EcommerceProvider, contact, product) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_chatbot'
      },
      title: 'Add to Cart',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: dedent(`${product.product} has been succesfully added to your cart.
                Please select an option by sending the corresponding number for it:
                ${convertToEmoji(0)} Go Back
                ${convertToEmoji(1)} Go Home`),
          componentType: 'text',
          menu: [
            { type: STATIC, blockId: backId },
            { type: STATIC, blockId: chatbot.startingBlockId }
          ]
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }

    let shoppingCart = contact.shoppingCart ? contact.shoppingCart : []
    let existingProductIndex = shoppingCart.findIndex((item) => item.variant_id === product.variant_id)
    if (existingProductIndex > -1) {
      shoppingCart[existingProductIndex].quantity += 1
    } else {
      shoppingCart.push({
        variant_id: product.variant_id,
        quantity: 1,
        product: product.product
      })
    }

    updateWhatsAppContact({ _id: contact._id }, { shoppingCart }, null, {})
    return messageBlock
  } catch (err) {
    logger.serverLog(TAG, `Unable to add to cart ${err}`, 'error')
    throw new Error('Unable to add to cart')
  }
}

const getShowMyCartBlock = async (chatbot, backId, contact) => {
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
          text: `Here is your cart:`,
          componentType: 'text',
          menu: [
            { type: DYNAMIC, action: SHOW_ITEMS_TO_REMOVE },
            { type: DYNAMIC, action: GET_CHECKOUT_EMAIL },
            { type: STATIC, blockId: backId },
            { type: STATIC, blockId: chatbot.startingBlockId }
          ]
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }

    let shoppingCart = contact.shoppingCart
    for (let product of shoppingCart) {
      messageBlock.payload[0].text += `\n - ${product.product}\n`
    }
    messageBlock.payload[0].text += dedent(`Please select an option by sending the corresponding number for it:
                                        ${convertToEmoji(0)} Remove an item
                                        ${convertToEmoji(1)} Proceed to Checkout
                                        ${convertToEmoji(2)} Go Back
                                        ${convertToEmoji(3)} Go Home`)
    return messageBlock
  } catch (err) {
    logger.serverLog(TAG, `Unable to show cart ${err}`, 'error')
    throw new Error('Unable to show cart')
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
          text: `Please select an item to remove from your cart:`,
          componentType: 'text',
          menu: []
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }

    let shoppingCart = contact.shoppingCart
    for (let i = 0; i < shoppingCart.length; i++) {
      let product = shoppingCart[i]
      messageBlock.payload[0].text += `\n${convertToEmoji(i)} - ${product.product}`
      messageBlock.payload[0].menu.push({ type: DYNAMIC, action: REMOVE_FROM_CART, argument: i })
    }
    messageBlock.payload[0].menu.push({ type: STATIC, blockId: backId }, { type: STATIC, blockId: chatbot.startingBlockId })
    messageBlock.payload[0].text += `\n${convertToEmoji(shoppingCart.length)} Go Back\n${convertToEmoji(shoppingCart.length + 1)} Go Home`
    return messageBlock
  } catch (err) {
    logger.serverLog(TAG, `Unable to show items from cart ${err}`, 'error')
    throw new Error('Unable to show items from cart')
  }
}

const getRemoveFromCartBlock = async (chatbot, backId, EcommerceProvider, contact, productIndex) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_chatbot'
      },
      title: 'Remove From Cart',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: dedent(`Product has been succesfully removed from your cart.
          Please select an option by sending the corresponding number for it:
          ${convertToEmoji(0)} Go Back
          ${convertToEmoji(1)} Go Home`),
          componentType: 'text',
          menu: [
            { type: STATIC, blockId: backId },
            { type: STATIC, blockId: chatbot.startingBlockId }
          ]
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    let shoppingCart = contact.shoppingCart
    shoppingCart.splice(productIndex, 1)

    updateWhatsAppContact({ _id: contact._id }, { shoppingCart }, null, {})
    return messageBlock
  } catch (err) {
    logger.serverLog(TAG, `Unable to remove item from cart ${err}`, 'error')
    throw new Error('Unable to remove item from cart')
  }
}

function updateWhatsAppContact(query, bodyForUpdate, bodyForIncrement, options) {
  callApi(`whatsAppContacts/update`, 'put', { query: query, newPayload: { ...bodyForIncrement, ...bodyForUpdate }, options: options })
    .then(updated => {
    })
    .catch(error => {
      logger.serverLog(TAG, `Failed to update contact ${JSON.stringify(error)}`, 'error')
    })
}

const getCheckoutEmailBlock = async (chatbot) => {
  try {
    let messageBlock = {
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
    return messageBlock
  } catch (err) {
    logger.serverLog(TAG, `Unable to checkout ${err}`, 'error')
    throw new Error('Unable to show checkout')
  }
}

const getCheckoutBlock = async (chatbot, backId, EcommerceProvider, contact, email) => {
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
          text: `Here is your checkout link:`,
          componentType: 'text',
          menu: [
            { type: STATIC, blockId: backId },
            { type: STATIC, blockId: chatbot.startingBlockId }
          ]
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    let shopifyCustomer = await EcommerceProvider.searchCustomerUsingEmail(email)
    if (shopifyCustomer.length === 0) {
      shopifyCustomer = await EcommerceProvider.createCustomer('', '', email)
      await EcommerceProvider.createPermalinkForCart(shopifyCustomer, contact.shoppingCart)
    } else {
      shopifyCustomer = shopifyCustomer[0]
    }
    let checkoutLink = await EcommerceProvider.createPermalinkForCart(shopifyCustomer, contact.shoppingCart)

    messageBlock.payload[0].text += `\n${checkoutLink}\n`

    messageBlock.payload[0].text += dedent(`Please select an option by sending the corresponding number for it:
                                        ${convertToEmoji(0)} Go Back
                                        ${convertToEmoji(1)} Go Home`)
    return messageBlock
  } catch (err) {
    logger.serverLog(TAG, `Unable to checkout ${err}`, 'error')
    throw new Error('Unable to show checkout')
  }
}

const getErrorMessageBlock = (chatbot, backId, error) => {
  return {
    module: {
      id: chatbot._id,
      type: 'whatsapp_chatbot'
    },
    title: 'Error',
    uniqueId: '' + new Date().getTime(),
    payload: [
      {
        text: dedent(`${error} 
                Please select an option by sending the corresponding number for it:
                ${convertToEmoji(0)} Go Back
                ${convertToEmoji(1)} Go Home`),
        componentType: 'text',
        menu: [
          { type: STATIC, blockId: backId },
          { type: STATIC, blockId: chatbot.startingBlockId }
        ]
      }
    ],
    userId: chatbot.userId,
    companyId: chatbot.companyId
  }
}

exports.getNextMessageBlock = async (chatbot, EcommerceProvider, contact, input) => {
  if (!contact || !contact.lastMessageSentByBot) {
    if (chatbot.triggers.includes(input)) {
      return messageBlockDataLayer.findOneMessageBlock({ uniqueId: chatbot.startingBlockId })
    }
  } else {
    let action = null
    logger.serverLog(TAG, `whatsapp chatbot contact ${JSON.stringify(contact)}`, 'info')
    try {
      if (contact.lastMessageSentByBot.payload[0].menu) {
        let menuInput = parseInt(input)
        if (isNaN(menuInput) || menuInput >= contact.lastMessageSentByBot.payload[0].menu.length) {
          throw new Error('Invalid User Input')
        }
        action = contact.lastMessageSentByBot.payload[0].menu[menuInput]
      } else {
        action = contact.lastMessageSentByBot.payload[0].action
      }
    } catch (err) {
      logger.serverLog(TAG, `Invalid user input ${input}`, 'info')
      if (chatbot.triggers.includes(input)) {
        return messageBlockDataLayer.findOneMessageBlock({ uniqueId: chatbot.startingBlockId })
      } else {
        return null
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
            messageBlock = await getProductsInCategoryBlock(chatbot, contact.lastMessageSentByBot.uniqueId, EcommerceProvider, action.input ? input : action.argument)
            break
          }
          case PRODUCT_VARIANTS: {
            messageBlock = await getProductVariantsBlock(chatbot, contact.lastMessageSentByBot.uniqueId, EcommerceProvider, action.input ? input : action.argument)
            break
          }
          case DISCOVER_PRODUCTS: {
            messageBlock = await getDiscoverProductsBlock(chatbot, contact.lastMessageSentByBot.uniqueId, EcommerceProvider)
            break
          }
          case ORDER_STATUS: {
            messageBlock = await getOrderStatusBlock(chatbot, contact.lastMessageSentByBot.uniqueId, EcommerceProvider, action.input ? input : action.argument)
            break
          }
          case SELECT_PRODUCT: {
            messageBlock = await getSelectProductBlock(chatbot, contact.lastMessageSentByBot.uniqueId, action.input ? input : action.argument)
            break
          }
          case ADD_TO_CART: {
            messageBlock = await getAddToCartBlock(chatbot, contact.lastMessageSentByBot.uniqueId, EcommerceProvider, contact, action.input ? input : action.argument)
            break
          }
          case SHOW_MY_CART: {
            messageBlock = await getShowMyCartBlock(chatbot, contact.lastMessageSentByBot.uniqueId, contact)
            break
          }
          case GET_CHECKOUT_EMAIL: {
            messageBlock = await getCheckoutEmailBlock(chatbot)
            break
          }
          case PROCEED_TO_CHECKOUT: {
            messageBlock = await getCheckoutBlock(chatbot, contact.lastMessageSentByBot.uniqueId, EcommerceProvider, contact, action.input ? input : action.argument)
            break
          }
          case RETURN_ORDER: {
            messageBlock = await getReturnOrderBlock(chatbot, contact.lastMessageSentByBot.uniqueId, EcommerceProvider, action.input ? input : action.argument)
            break
          }
          case SHOW_ITEMS_TO_REMOVE: {
            messageBlock = await getShowItemsToRemoveBlock(chatbot, contact.lastMessageSentByBot.uniqueId, contact)
            break
          }
          case REMOVE_FROM_CART: {
            messageBlock = await getRemoveFromCartBlock(chatbot, contact.lastMessageSentByBot.uniqueId, EcommerceProvider, contact, action.input ? input : action.argument)
          }
        }
        await messageBlockDataLayer.createForMessageBlock(messageBlock)
        return messageBlock
      } catch (err) {
        return getErrorMessageBlock(chatbot, contact.lastMessageSentByBot.uniqueId, err.message)
      }
    } else if (action.type === STATIC) {
      return messageBlockDataLayer.findOneMessageBlock({ uniqueId: action.blockId })
    }
  }
}
