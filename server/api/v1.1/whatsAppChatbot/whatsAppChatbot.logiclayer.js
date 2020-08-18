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
  ADD_TO_CART,
  PROCEED_TO_CHECKOUT,
  SHOW_MY_CART,
  RETURN_PRODUCT
} = require('./constants')
const logger = require('../../../components/logger')
const TAG = 'api/v1.1/whatsAppChatbot/whatsAppChatbot.logiclayer.js'
const messageBlockDataLayer = require('../../v1.1/messageBlock/messageBlock.datalayer')

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

exports.getMessageBlocks = (chatbot) => {
  const messageBlocks = []
  const mainMenuId = '' + new Date().getTime() + 100
  const orderStatusId = '' + new Date().getTime() + 100
  const returnProductId = '' + new Date().getTime() + 200
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
                0. All Categories
                1. Discover
                2. Check order status
                3. Return an item`),
        componentType: 'text',
        menu: [
          { type: DYNAMIC, action: PRODUCT_CATEGORIES },
          { type: DYNAMIC, action: DISCOVER_PRODUCTS },
          { type: STATIC, blockId: orderStatusId },
          { type: STATIC, blockId: returnProductId },
          { type: STATIC, blockId: faqsId }
        ]
      }
    ],
    userId: chatbot.userId,
    companyId: chatbot.companyId
  })
  getOrderIdBlock(chatbot, orderStatusId, messageBlocks)
  getReturnProductIdBlock(chatbot, returnProductId, messageBlocks)
  if (chatbot.botLinks && chatbot.botLinks.faqs) {
    messageBlocks[0].payload[0].text = '\n4. FAQs'
    messageBlocks[0].payload[0].menu.push({ type: STATIC, blockId: faqsId })
    getFaqsBlock(chatbot, faqsId, messageBlocks, mainMenuId)
  }
  return messageBlocks
}

const getReturnProductIdBlock = (chatbot, blockId, messageBlocks) => {
  messageBlocks.push({
    module: {
      id: chatbot._id,
      type: 'whatsapp_chatbot'
    },
    title: 'Get Return Product ID',
    uniqueId: blockId,
    payload: [
      {
        text: `Please enter your product id`,
        componentType: 'text',
        menu: [
          { type: DYNAMIC, action: RETURN_PRODUCT, input: true }
        ]
      }
    ],
    userId: chatbot.userId,
    companyId: chatbot.companyId
  })
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
        text: dedent(`View our FAQs here: ${chatbot.botLinks.faqs}
                Please send "0" to go back`),
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
      uniqueId: new Date().getTime(),
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
    let order = await EcommerceProvider.checkOrderStatus(orderId)
    let orderStatus = order.payload
    messageBlock.payload.text += `\nPayment: ${orderStatus.financial_status}`
    if (orderStatus.fulfillment_status) {
      messageBlock.payload.text += `, Delivery: ${orderStatus.fulfillment_status}`
    }
    messageBlock.payload.text += `Get full order status here: ${orderStatus.order_status_url}`

    messageBlock.payload.text += '\nPlease select an option by sending the corresponding number for it:'
    messageBlock.payload.text += `\n0. Go Back`
    messageBlock.payload.menu.push({
      action: { type: STATIC, blockId: backId }
    })
    messageBlock.payload.text += `\n1. Go Home`
    messageBlock.payload.menu.push({
      action: { type: STATIC, blockId: chatbot.startingBlockId }
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
      uniqueId: new Date().getTime(),
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
    let productCategories = await EcommerceProvider.getProductCategoriesBlock()
    for (let i = 0; i < productCategories.payload.length; i++) {
      let category = productCategories.payload[i]
      messageBlock.payload.text += `\n${i}. ${category.name}`
      messageBlock.payload.menu.push({
        action: { type: DYNAMIC, action: FETCH_PRODUCTS, argument: category.id }
      })
    }
    messageBlock.payload.text += `\n${productCategories.payload.length}. Go Back`
    messageBlock.payload.menu.push({
      action: { type: STATIC, blockId: backId }
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
      uniqueId: new Date().getTime(),
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
    for (let i = 0; i < products.payload.length; i++) {
      let product = products.payload[i]
      messageBlock.payload.text += `\n${i}. ${product.name} from ${product.vendor}`
      messageBlock.payload.menu.push({
        action: { type: DYNAMIC, action: PRODUCT_VARIANTS, argument: product.id }
      })
    }
    messageBlock.payload.text += `\n${products.payload.length}. Go Back`
    messageBlock.payload.menu.push({
      action: { type: STATIC, blockId: backId }
    })
    messageBlock.payload.text += `\n${products.payload.length + 1}. Go Home`
    messageBlock.payload.menu.push({
      action: { type: STATIC, blockId: chatbot.startingBlockId }
    })
    return messageBlock
  } catch (err) {
    logger.serverLog(TAG, `Unable to get products in category ${err}`, 'error')
    throw new Error('Unable to get products in this category')
  }
}

const getProductVariantsBlock = async (chatbot, backId, EcommerceProvider, productId) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_chatbot'
      },
      title: 'Product Variants',
      uniqueId: new Date().getTime(),
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
    let productVariants = await EcommerceProvider.getVariantsOfSelectedProduct(productId)
    for (let i = 0; i < productVariants.payload.length; i++) {
      let product = productVariants.payload[i]
      messageBlock.payload.text += `\n${i}. Variant: ${product.name}, Price: ${product.price}`
      messageBlock.payload.menu.push({
        action: { type: DYNAMIC, action: SELECT_PRODUCT, argument: product.id }
      })
    }
    messageBlock.payload.text += `\n${productVariants.payload.length}. Go Back`
    messageBlock.payload.menu.push({
      action: { type: STATIC, blockId: backId }
    })
    messageBlock.payload.text += `\n${productVariants.payload.length + 1}. Go Home`
    messageBlock.payload.menu.push({
      action: { type: STATIC, blockId: chatbot.startingBlockId }
    })
    return messageBlock
  } catch (err) {
    logger.serverLog(TAG, `Unable to get product variants ${err}`, 'error')
    throw new Error('Unable to get product variants')
  }
}

const getSelectProductBlock = async (chatbot, backId, productId) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_chatbot'
      },
      title: 'Select Product',
      uniqueId: new Date().getTime(),
      payload: [
        {
          text: `Please select an option by sending the corresponding number for it:
                  0. Add to Cart
                  1. Proceed to Checkout
                  2. Show my Cart
                  3. Go Back
                  4. Go Home`,
          componentType: 'text',
          menu: [
            { type: DYNAMIC, action: ADD_TO_CART, argument: productId },
            { type: DYNAMIC, action: PROCEED_TO_CHECKOUT, argument: productId },
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

const triggers = ['Hi', 'Hello']

exports.getNextMessageBlock = (chatbot, EcommerceProvider, messageBlock, input) => {
  console.log('getting next message block')
  if (!messageBlock) {
    if (triggers.includes(input)) {
      return messageBlockDataLayer.findOneMessageBlock({ uniqueId: chatbot.startingBlockId })
    }
  } else {
    let action = null
    try {
      if (messageBlock.payload[0].menu) {
        let menuInput = parseInt(input)
        action = messageBlock.payload[0].menu[menuInput]
      } else {
        action = messageBlock.payload[0].action
      }
    } catch (err) {
      logger.serverLog(TAG, `Invalid user input ${err}`, 'debug')
      if (triggers.includes(input)) {
        return messageBlockDataLayer.findOneMessageBlock({ uniqueId: chatbot.startingBlockId })
      }
    }
    if (action.type === DYNAMIC) {
      switch (action.action) {
        case PRODUCT_CATEGORIES: {
          return getProductCategoriesBlock(chatbot, messageBlock.uniqueId, EcommerceProvider)
        }
        case FETCH_PRODUCTS: {
          return getProductsInCategoryBlock(chatbot, messageBlock.uniqueId, EcommerceProvider, action.argument)
        }
        case PRODUCT_VARIANTS: {
          return getProductVariantsBlock(chatbot, messageBlock.uniqueId, EcommerceProvider, action.argument)
        }
        // case DISCOVER_PRODUCTS: {
        //   // TODO
        //   return
        // }
        case ORDER_STATUS: {
          return getOrderStatusBlock(chatbot, messageBlock.uniqueId, EcommerceProvider, input)
        }
        case SELECT_PRODUCT: {
          return getSelectProductBlock(chatbot, messageBlock.uniqueId, action.argument)
        }
        default: {
          if (input === 'Hi') {
            return messageBlockDataLayer.findOneMessageBlock({ uniqueId: action.blockId })
          }
        }
      }
    } else if (action.type === STATIC) {
      return messageBlockDataLayer.findOneMessageBlock({ uniqueId: chatbot.startingBlockId })
    }
  }
}
