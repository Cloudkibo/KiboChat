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
  GET_CHECKOUT_EMAIL,
  CLEAR_CART,
  QUANTITY_TO_ADD,
  QUANTITY_TO_REMOVE,
  FAQS_KEY,
  ORDER_STATUS_KEY,
  BACK_KEY,
  SHOW_CART_KEY,
  HOME_KEY
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

function convertToEmoji (num) {
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

function specialKeyText (key) {
  switch (key) {
    case FAQS_KEY:
      return `Send '${key}' for faqs`
    case SHOW_CART_KEY:
      return `Send '${key}' to show cart`
    case ORDER_STATUS_KEY:
      return `Send '${key}' to check order status`
    case BACK_KEY:
      return `Send '${key}' to go back`
    case HOME_KEY:
      return `Send '${key}' to go home`
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
      messageBlockDataLayer.genericUpdateMessageBlock(
        { uniqueId: startingBlock.payload[0].specialKeys[FAQS_KEY].blockId },
        {
          'payload.0.text': dedent(`View our FAQs here: ${chatbot.botLinks.faqs}\n
                                    ${specialKeyText(SHOW_CART_KEY)}
                                    ${specialKeyText(BACK_KEY)}
                                    ${specialKeyText(HOME_KEY)}`)
        }
      )
    } else {
      startingBlock.payload[0].text = startingBlock.payload[0].text.replace(`\n${specialKeyText(FAQS_KEY)}`, '')
      delete startingBlock.payload[0].specialKeys[FAQS_KEY]
      messageBlockDataLayer.genericUpdateMessageBlock({ uniqueId: chatbot.startingBlockId }, startingBlock)
      messageBlockDataLayer.deleteForMessageBlock({ uniqueId: startingBlock.payload[0].specialKeys[FAQS_KEY].blockId })
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
        text: dedent(`Please select an option by sending the corresponding number for it (e.g. send '1' to select Discover):\n
                ${convertToEmoji(0)} All Categories
                ${convertToEmoji(1)} Discover\n
                ${specialKeyText(ORDER_STATUS_KEY)}
                ${specialKeyText(SHOW_CART_KEY)}`),
        componentType: 'text',
        menu: [
          { type: DYNAMIC, action: PRODUCT_CATEGORIES },
          { type: DYNAMIC, action: DISCOVER_PRODUCTS }
        ],
        specialKeys: {
          [ORDER_STATUS_KEY]: { type: STATIC, blockId: orderStatusId },
          [SHOW_CART_KEY]: { type: DYNAMIC, action: SHOW_MY_CART }
        }
      }
    ],
    userId: chatbot.userId,
    companyId: chatbot.companyId
  })
  getOrderIdBlock(chatbot, orderStatusId, messageBlocks)
  getReturnOrderIdBlock(chatbot, returnOrderId, messageBlocks)
  if (chatbot.botLinks && chatbot.botLinks.faqs) {
    messageBlocks[0].payload[0].text = `\n${specialKeyText(FAQS_KEY, 'faqs')} FAQs`
    messageBlocks[0].payload[0].specialKeys[FAQS_KEY] = { type: STATIC, blockId: faqsId }
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
    let products = await EcommerceProvider.fetchProducts()
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
          text: `Here is your order status:\n`,
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
    messageBlock.payload[0].text += `\nPayment: ${orderStatus.displayFinancialStatus}`
    messageBlock.payload[0].text += `\nDelivery: ${orderStatus.displayFulfillmentStatus}`

    messageBlock.payload[0].text += `\n\n${specialKeyText(SHOW_CART_KEY)}`
    messageBlock.payload[0].text += `\n${specialKeyText(BACK_KEY)}`
    messageBlock.payload[0].text += `\n${specialKeyText(HOME_KEY)}`
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
          text: `Please select a product variant by sending the corresponding number for it:\n`,
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
    for (let i = 0; i < productVariants.length; i++) {
      let productVariant = productVariants[i]
      messageBlock.payload[0].text += `\n${convertToEmoji(i)} ${productVariant.name} ${product.name}, Price: ${product.price}`
      messageBlock.payload[0].menu.push({
        type: DYNAMIC, action: SELECT_PRODUCT, argument: { variant_id: productVariant.id, product: `${productVariant.name} ${product.name}`, price: productVariant.price }
      })
    }
    messageBlock.payload[0].text += `\n\n${specialKeyText(SHOW_CART_KEY)}`
    messageBlock.payload[0].text += `\n${specialKeyText(BACK_KEY)}`
    messageBlock.payload[0].text += `\n${specialKeyText(HOME_KEY)}`
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
          text: dedent(`You have selected ${product.product}.\n
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
    throw new Error('Unable to select product')
  }
}

const getQuantityToAddBlock = async (chatbot, product) => {
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
          text: `How many ${product.product}s would you like to add to your cart?`,
          componentType: 'text',
          action: { type: DYNAMIC, action: ADD_TO_CART, argument: product, input: true }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    return messageBlock
  } catch (err) {
    logger.serverLog(TAG, `Unable to add product(s) to cart ${err}`, 'error')
    throw new Error('Unable to add product(s) to cart')
  }
}

const getAddToCartBlock = async (chatbot, backId, contact, product, quantity) => {
  try {
    quantity = Number(quantity)
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error('Invalid quantity given')
    }
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_chatbot'
      },
      title: 'Add to Cart',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: dedent(`${quantity} ${product.product}${quantity > 1 ? 's have' : ' has'} been succesfully added to your cart.\n
                Please select an option by sending the corresponding number for it:\n
                ${convertToEmoji(0)} Proceed to Checkout\n
                ${specialKeyText(SHOW_CART_KEY)}
                ${specialKeyText(BACK_KEY)}
                ${specialKeyText(HOME_KEY)}`),
          componentType: 'text',
          menu: [
            { type: DYNAMIC, action: GET_CHECKOUT_EMAIL }
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

    let shoppingCart = contact.shoppingCart ? contact.shoppingCart : []
    let existingProductIndex = shoppingCart.findIndex((item) => item.variant_id === product.variant_id)
    if (existingProductIndex > -1) {
      shoppingCart[existingProductIndex].quantity += quantity
    } else {
      shoppingCart.push({
        variant_id: product.variant_id,
        quantity,
        product: product.product,
        price: Number(product.price)
      })
    }

    logger.serverLog(TAG, `shoppingCart ${JSON.stringify(shoppingCart)}`, 'info')
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
          text: '',
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
      for (let product of shoppingCart) {
        let price = product.quantity * product.price
        totalPrice += price
        messageBlock.payload[0].text += `\n• ${product.product}, quantity: ${product.quantity}, price: ${price}`
      }
      messageBlock.payload[0].text += `\n\nTotal price: ${totalPrice}\n\n`
      messageBlock.payload[0].menu.push(
        { type: DYNAMIC, action: SHOW_ITEMS_TO_REMOVE },
        { type: DYNAMIC, action: CLEAR_CART },
        { type: DYNAMIC, action: GET_CHECKOUT_EMAIL })
      messageBlock.payload[0].text += dedent(`Please select an option by sending the corresponding number for it:\n
                                            ${convertToEmoji(0)} Remove an item
                                            ${convertToEmoji(1)} Clear cart
                                            ${convertToEmoji(2)} Proceed to Checkout`)
    }
    messageBlock.payload[0].text += `\n\n${specialKeyText(BACK_KEY)}`
    messageBlock.payload[0].text += `\n${specialKeyText(HOME_KEY)}`
    return messageBlock
  } catch (err) {
    logger.serverLog(TAG, `Unable to show cart ${err}`, 'error')
    throw new Error('Unable to show cart')
  }
}

const getRemoveFromCartBlock = async (chatbot, backId, contact, productInfo, quantity) => {
  try {
    quantity = Number(quantity)
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error('Invalid quantity given')
    }
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_chatbot'
      },
      title: 'Remove From Cart',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `${quantity} ${productInfo.product}${quantity > 1 ? 's have' : ' has'} been succesfully removed from your cart.\n`,
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
    shoppingCart[productInfo.productIndex].quantity -= quantity
    if (shoppingCart[productInfo.productIndex].quantity === 0) {
      shoppingCart.splice(productInfo.productIndex, 1)
    } else if (shoppingCart[productInfo.productIndex].quantity < 0) {
      throw new Error('Invalid quantity given')
    }
    if (shoppingCart.length > 0) {
      messageBlock.payload[0].menu.push({ type: DYNAMIC, action: GET_CHECKOUT_EMAIL })
      messageBlock.payload[0].text += dedent(`Please select an option by sending the corresponding number for it: \n
                                            ${convertToEmoji(0)} Proceed to Checkout`)
    }
    messageBlock.payload[0].text += `\n\n${specialKeyText(SHOW_CART_KEY)} `
    messageBlock.payload[0].text += `\n${specialKeyText(BACK_KEY)} `
    messageBlock.payload[0].text += `\n${specialKeyText(HOME_KEY)} `
    updateWhatsAppContact({ _id: contact._id }, { shoppingCart }, null, {})
    return messageBlock
  } catch (err) {
    logger.serverLog(TAG, `Unable to remove item(s) from cart ${err} `, 'error')
    throw new Error('Unable to remove item(s) from cart')
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
          text: `How many ${product.product}s would you like to remove from your cart?  You currently have ${product.quantity} in your cart.`,
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
    throw new Error(`Unable to remove product(s) from cart`)
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
    throw new Error('Unable to show items from cart')
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
    throw new Error('Unable to clear cart')
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
    throw new Error('Unable to show checkout')
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
      updateWhatsAppContact({ _id: contact._id }, { shopifyCustomer }, null, {})
    } else {
      shopifyCustomer = contact.shopifyCustomer
    }
    let checkoutLink = await EcommerceProvider.createPermalinkForCart(shopifyCustomer, contact.shoppingCart)

    messageBlock.payload[0].text += `\n${checkoutLink} `

    messageBlock.payload[0].text += `\n\n${specialKeyText(SHOW_CART_KEY)} `
    messageBlock.payload[0].text += `\n${specialKeyText(HOME_KEY)} `
    return messageBlock
  } catch (err) {
    logger.serverLog(TAG, `Unable to checkout ${err} `, 'error')
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
        text: dedent(`${error} \n
  ${specialKeyText(SHOW_CART_KEY)}
  ${specialKeyText(BACK_KEY)}
  ${specialKeyText(HOME_KEY)} `),
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
}

exports.getNextMessageBlock = async (chatbot, EcommerceProvider, contact, input) => {
  if (!contact || !contact.lastMessageSentByBot) {
    if (chatbot.triggers.includes(input)) {
      return messageBlockDataLayer.findOneMessageBlock({ uniqueId: chatbot.startingBlockId })
    }
  } else {
    let action = null
    logger.serverLog(TAG, `whatsapp chatbot contact ${JSON.stringify(contact)} `, 'info')
    try {
      let lastMessageSentByBot = contact.lastMessageSentByBot.payload[0]
      if (lastMessageSentByBot.specialKeys && lastMessageSentByBot.specialKeys[input]) {
        action = lastMessageSentByBot.specialKeys[input]
      } else if (lastMessageSentByBot.menu) {
        let menuInput = parseInt(input)
        if (isNaN(menuInput) || menuInput >= lastMessageSentByBot.menu.length) {
          throw new Error('Invalid User Input')
        }
        action = lastMessageSentByBot.menu[menuInput]
      } else if (lastMessageSentByBot.action) {
        action = lastMessageSentByBot.action
      } else {
        throw new Error('Invalid User Input')
      }
    } catch (err) {
      logger.serverLog(TAG, `Invalid user input ${input} `, 'info')
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
            messageBlock = await getProductsInCategoryBlock(chatbot, contact.lastMessageSentByBot.uniqueId, EcommerceProvider, action.argument)
            break
          }
          case PRODUCT_VARIANTS: {
            messageBlock = await getProductVariantsBlock(chatbot, contact.lastMessageSentByBot.uniqueId, EcommerceProvider, action.argument)
            break
          }
          case DISCOVER_PRODUCTS: {
            messageBlock = await getDiscoverProductsBlock(chatbot, contact.lastMessageSentByBot.uniqueId, EcommerceProvider)
            break
          }
          case ORDER_STATUS: {
            messageBlock = await getOrderStatusBlock(chatbot, contact.lastMessageSentByBot.uniqueId, EcommerceProvider, action.input ? input : '')
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
          case REMOVE_FROM_CART: {
            messageBlock = await getRemoveFromCartBlock(chatbot, contact.lastMessageSentByBot.uniqueId, contact, action.argument, action.input ? input : '')
            break
          }
          case CLEAR_CART: {
            messageBlock = await clearCart(chatbot, contact)
            break
          }
          case QUANTITY_TO_ADD: {
            messageBlock = await getQuantityToAddBlock(chatbot, action.argument)
            break
          }
          case QUANTITY_TO_REMOVE: {
            messageBlock = await getQuantityToRemoveBlock(chatbot, action.argument)
            break
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
