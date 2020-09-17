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
  SHOW_ITEMS_TO_UPDATE,
  PROCEED_TO_CHECKOUT,
  RETURN_ORDER,
  GET_CHECKOUT_EMAIL,
  CLEAR_CART,
  QUANTITY_TO_ADD,
  QUANTITY_TO_REMOVE,
  QUANTITY_TO_UPDATE,
  VIEW_RECENT_ORDERS,
  UPDATE_CART,
  DEFAULT_TEXT,
  ERROR_INDICATOR
} = require('./shopifyChatbotConstants')
const logger = require('../../../components/logger')
const TAG = 'api/v1️.1/whatsAppChatbot/whatsAppChatbot.logiclayer.js'
const messageBlockDataLayer = require('../messageBlock/messageBlock.datalayer')
const { callApi } = require('../utility')

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

exports.getMessageBlocks = (chatbot, storeName) => {
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
      type: 'messenger_shopify_chatbot'
    },
    title: 'Main Menu',
    triggers: ['hi', 'hello'],
    uniqueId: mainMenuId,
    payload: [
      {
        text: `Hi {{user_first_name}}! Welcome to ${storeName} chatbot!\n\n${DEFAULT_TEXT}`,
        componentType: 'text',
        quickReplies: [
          {
            content_type: 'text',
            title: 'All Categories',
            payload: JSON.stringify({ type: DYNAMIC, action: PRODUCT_CATEGORIES })
          },
          {
            content_type: 'text',
            title: 'On Sale',
            payload: JSON.stringify({ type: DYNAMIC, action: DISCOVER_PRODUCTS })
          },
          {
            content_type: 'text',
            title: 'Search for a product',
            payload: JSON.stringify({ type: STATIC, blockId: searchProductsId })
          },
          {
            content_type: 'text',
            title: 'Check Order Status',
            payload: JSON.stringify({ type: STATIC, blockId: checkOrdersId })
          },
          {
            content_type: 'text',
            title: 'Show my Cart',
            payload: JSON.stringify({ type: DYNAMIC, action: SHOW_MY_CART })
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

const getSearchProductsBlock = async (chatbot, blockId, messageBlocks, input) => {
  messageBlocks.push({
    module: {
      id: chatbot._id,
      type: 'whatsapp_chatbot'
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
      type: 'whatsapp_chatbot'
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

const getDiscoverProductsBlock = async (chatbot, backId, EcommerceProvider, input) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'messenger_shopify_chatbot'
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
    if (input) {
      products = await EcommerceProvider.searchProducts(input)
      if (products.length > 0) {
        messageBlock.payload[0].text = `Following products were found for "${input}". Please select a product:`
      } else {
        messageBlock.payload[0].text = `No products found that match "${input}".\n\nPlease enter the name of the product you wish to search for:`
        messageBlock.payload[0].action = { type: DYNAMIC, action: DISCOVER_PRODUCTS, input: true }
      }
    } else {
      products = await EcommerceProvider.fetchProducts()
      if (products.length > 0) {
        messageBlock.payload[0].text = `Please select a product:`
      } else {
        messageBlock.payload[0].text = `No products were found using discover.`
      }
    }

    logger.serverLog(TAG, `products found: ${JSON.stringify(products)}`, 'info')
    if (products.length > 0) {
      messageBlock.payload.push({
        componentType: 'gallery',
        cards: [],
        quickReplies: []
      })
      for (let i = 0; i < products.length; i++) {
        let product = products[i]
        messageBlock.payload[1].cards.push({
          image_url: product.image,
          title: product.name,
          buttons: [{
            title: 'Select Product',
            type: 'postback',
            payload: JSON.stringify({ type: DYNAMIC, action: PRODUCT_VARIANTS, argument: product })
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
    logger.serverLog(TAG, `Unable to discover products ${err}`, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to discover products`)
  }
}

const getReturnOrderIdBlock = (chatbot, blockId, messageBlocks) => {
  messageBlocks.push({
    module: {
      id: chatbot._id,
      type: 'messenger_shopify_chatbot'
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
        type: 'messenger_shopify_chatbot'
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
    logger.serverLog(TAG, `Unable to return order ${err}`, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to return order`)
  }
}

const getFaqsBlock = (chatbot, blockId, messageBlocks, backId) => {
  messageBlocks.push({
    module: {
      id: chatbot._id,
      type: 'messenger_shopify_chatbot'
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
      type: 'messenger_shopify_chatbot'
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

const getOrderStatusBlock = async (chatbot, backId, EcommerceProvider, orderId) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'messenger_shopify_chatbot'
      },
      title: 'Order Status',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Here is your order status:\n`,
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
    let orderStatus = await EcommerceProvider.checkOrderStatus(Number(orderId))
    logger.serverLog(TAG, `orderStatus ${JSON.stringify(orderStatus)}`, 'info')
    messageBlock.payload[0].text += `\nPayment: ${orderStatus.displayFinancialStatus}`
    messageBlock.payload[0].text += `\nDelivery: ${orderStatus.displayFulfillmentStatus}`

    if (orderStatus.lineItems) {
      for (let i = 0; i < orderStatus.lineItems.length; i++) {
        let product = orderStatus.lineItems[i]
        if (i === 0) {
          messageBlock.payload[0].text += `\n`
        }
        messageBlock.payload[0].text += `\nItem: ${product.name}`
        messageBlock.payload[0].text += `\nQuantity: ${product.quantity}`
        if (i + 1 < orderStatus.lineItems.length) {
          messageBlock.payload[0].text += `\n`
        }
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
      if (orderStatus.billingAddress.country) {
        messageBlock.payload[0].text += `, ${orderStatus.billingAddress.country}`
      }
    }

    messageBlock.payload[0].text += `\n\nThis order was placed on ${new Date(orderStatus.createdAt).toDateString()}`
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
        type: 'messenger_shopify_chatbot'
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
    let productCategories = await EcommerceProvider.fetchAllProductCategories()
    for (let i = 0; i < productCategories.length; i++) {
      let category = productCategories[i]
      messageBlock.payload[0].quickReplies.push({
        content_type: 'text',
        title: category.name,
        payload: JSON.stringify({ type: DYNAMIC, action: FETCH_PRODUCTS, argument: category.id })
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
    logger.serverLog(TAG, `Unable to get product categories ${err}`, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to get product categories`)
  }
}

const getProductsInCategoryBlock = async (chatbot, backId, EcommerceProvider, categoryId) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'messenger_shopify_chatbot'
      },
      title: 'Products in Category',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Please select a product:`,
          componentType: 'text',
          quickReplies: []
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }

    let products = await EcommerceProvider.fetchProductsInThisCategory(categoryId)

    for (let i = 0; i < products.length; i++) {
      let product = products[i]
      messageBlock.payload[0].quickReplies.push({
        content_type: 'text',
        title: product.name,
        payload: JSON.stringify({ type: DYNAMIC, action: PRODUCT_VARIANTS, argument: product }),
        image_url: product.image
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
    logger.serverLog(TAG, `Unable to get products in category ${err}`, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to get products in this category`)
  }
}

const getProductVariantsBlock = async (chatbot, backId, EcommerceProvider, product) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'messenger_shopify_chatbot'
      },
      title: 'Product Variants',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `You have selected ${product.name}. Please select a product variant:\n`,
          componentType: 'text'
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    let productVariants = await EcommerceProvider.getVariantsOfSelectedProduct(product.id)
    logger.serverLog(TAG, `product variants found: ${JSON.stringify(productVariants)}`, 'info')
    let storeInfo = await EcommerceProvider.fetchStoreInfo()
    logger.serverLog(TAG, `store info ${JSON.stringify(storeInfo)}`, 'info')

    if (productVariants.length > 0) {
      messageBlock.payload.push({
        componentType: 'gallery',
        cards: [],
        quickReplies: []
      })
      for (let i = 0; i < productVariants.length; i++) {
        let productVariant = productVariants[i]
        messageBlock.payload[1].cards.push({
          image_url: product.image,
          title: `${productVariant.name} ${product.name}`,
          subtitle: `Price: ${product.price} ${storeInfo.currency}`,
          buttons: [{
            title: 'Select Product',
            type: 'postback',
            payload: JSON.stringify({
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
    logger.serverLog(TAG, `Unable to get product variants ${err}`, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to get product variants`)
  }
}

const getSelectProductBlock = async (chatbot, backId, product) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'messenger_shopify_chatbot'
      },
      title: 'Select Product',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: dedent(`You have selected ${product.product} (price: ${product.price} ${product.currency}).\n
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
    logger.serverLog(TAG, `Unable to select product ${err}`, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to select product`)
  }
}

const getQuantityToAddBlock = async (chatbot, backId, contact, product) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'messenger_shopify_chatbot'
      },
      title: 'Quantity to Add',
      uniqueId: '' + new Date().getTime(),
      payload: [
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
        messageBlock.payload[0].text = `How many ${product.product}s would you like to add to your cart?\n\nYou already have ${shoppingCart[existingProductIndex].quantity} in your cart.\n\n(price: ${product.price} ${product.currency}) (stock available: ${product.inventory_quantity})`
      }
    } else {
      messageBlock.payload[0].text = `How many ${product.product}s would you like to add to your cart?\n\n(price: ${product.price} ${product.currency}) (stock available: ${product.inventory_quantity})`
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
      shoppingCart.push({
        variant_id: product.variant_id,
        quantity,
        product: product.product,
        inventory_quantity: product.inventory_quantity,
        price: Number(product.price),
        currency: product.currency,
        image: product.image
      })
    }

    logger.serverLog(TAG, `shoppingCart ${JSON.stringify(shoppingCart)}`, 'info')
    updateSubscriber({ _id: contact._id }, { shoppingCart }, null, {})
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
        type: 'messenger_shopify_chatbot'
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
        messageBlock.payload[0].text += `\nItem: ${product.product}`
        messageBlock.payload[0].text += `\nQuantity: ${product.quantity}`
        messageBlock.payload[0].text += `\nPrice: ${price} ${currency}`
        if (i + 1 < shoppingCart.length) {
          messageBlock.payload[0].text += `\n`
        }
      }
      messageBlock.payload[0].text += `\n\nTotal price: ${totalPrice} ${currency}\n\n`

      messageBlock.payload[0].quickReplies.push(
        {
          content_type: 'text',
          title: 'Remove an item',
          payload: JSON.stringify({ type: DYNAMIC, action: SHOW_ITEMS_TO_REMOVE })
        },
        {
          content_type: 'text',
          title: 'Update quantity for an item',
          payload: JSON.stringify({ type: DYNAMIC, action: SHOW_ITEMS_TO_UPDATE })
        },
        {
          content_type: 'text',
          title: 'Clear cart',
          payload: JSON.stringify({ type: DYNAMIC, action: CLEAR_CART })
        },
        {
          content_type: 'text',
          title: 'Proceed to Checkout',
          payload: JSON.stringify({ type: DYNAMIC, action: GET_CHECKOUT_EMAIL })
        })
    }
    messageBlock.payload[0].text += DEFAULT_TEXT
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
    updateSubscriber({ _id: contact._id }, { shoppingCart }, null, {})
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

const getQuantityToRemoveBlock = async (chatbot, backId, product) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'messenger_shopify_chatbot'
      },
      title: 'Quantity to Remove',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `How many ${product.product}s would you like to remove from your cart?\n\nYou currently have ${product.quantity} in your cart.\n\n(price: ${product.price} ${product.currency})`,
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
    logger.serverLog(TAG, `Unable to remove product(s) from cart ${err} `, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to remove product(s) from cart`)
  }
}

const getShowItemsToRemoveBlock = (chatbot, backId, contact) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'messenger_shopify_chatbot'
      },
      title: 'Select Item to Remove',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Please select an item to remove from your cart:`,
          componentType: 'text',
          quickReplies: []
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }

    let shoppingCart = contact.shoppingCart
    for (let i = 0; i < shoppingCart.length; i++) {
      let product = shoppingCart[i]
      messageBlock.payload[0].quickReplies.push(
        {
          content_type: 'text',
          title: product.product,
          payload: JSON.stringify({ type: DYNAMIC, action: QUANTITY_TO_REMOVE, argument: { ...product, productIndex: i } }),
          image_url: product.image
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
    logger.serverLog(TAG, `Unable to show items from cart ${err} `, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to show items from cart`)
  }
}

const clearCart = async (chatbot, contact) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'messenger_shopify_chatbot'
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
    updateSubscriber({ _id: contact._id }, { shoppingCart }, {})
    return messageBlock
  } catch (err) {
    logger.serverLog(TAG, `Unable to clear cart ${err} `, 'error')
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
    if (!newEmail && contact.shopifyCustomer && contact.shopifyCustomer.email) {
      messageBlock = {
        module: {
          id: chatbot._id,
          type: 'messenger_shopify_chatbot'
        },
        title: 'Checkout Email',
        uniqueId: '' + new Date().getTime(),
        payload: [
          {
            text: `Would you like to use ${contact.shopifyCustomer.email} as your email?`,
            componentType: 'text',
            quickReplies: [
              {
                content_type: 'text',
                title: 'Yes',
                payload: JSON.stringify({ type: DYNAMIC, action: PROCEED_TO_CHECKOUT })
              },
              {
                content_type: 'text',
                title: 'No',
                payload: JSON.stringify({ type: DYNAMIC, action: GET_CHECKOUT_EMAIL, argument: true })
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
          type: 'messenger_shopify_chatbot'
        },
        title: 'Checkout Email',
        uniqueId: '' + new Date().getTime(),
        payload: [
          {
            text: `Please enter your email: `,
            componentType: 'text',
            action: { type: DYNAMIC, action: PROCEED_TO_CHECKOUT, input: true },
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
        type: 'messenger_shopify_chatbot'
      },
      title: 'Checkout Link',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Here is your checkout link: `,
          componentType: 'text',
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
      updateSubscriber({ _id: contact._id }, { shopifyCustomer, shoppingCart: [] }, {})
    } else {
      shopifyCustomer = contact.shopifyCustomer
      updateSubscriber({ _id: contact._id }, { shoppingCart: [] }, null, {})
    }
    let checkoutLink = EcommerceProvider.createPermalinkForCart(shopifyCustomer, contact.shoppingCart)

    messageBlock.payload[0].text += `\n${checkoutLink} `
    return messageBlock
  } catch (err) {
    logger.serverLog(TAG, `Unable to checkout ${err} `, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to show checkout`)
  }
}

const getShowItemsToUpdateBlock = (chatbot, backId, contact) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'messenger_shopify_chatbot'
      },
      title: 'Select Item to Update',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Please select an item in your cart for which you want to update the quantity:`,
          componentType: 'text',
          quickReplies: []
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }

    let shoppingCart = contact.shoppingCart
    for (let i = 0; i < shoppingCart.length; i++) {
      let product = shoppingCart[i]
      messageBlock.payload[0].quickReplies.push(
        {
          content_type: 'text',
          title: product.product,
          payload: JSON.stringify({ type: DYNAMIC, action: QUANTITY_TO_UPDATE, argument: { ...product, productIndex: i } }),
          image_url: product.image
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
    logger.serverLog(TAG, `Unable to show items from cart ${err} `, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to show items from cart`)
  }
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
          quickReplies: []
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
        messageBlock.payload[0].text = 'Here are your recently placed orders. Select an order to view its status:'
        for (let i = 0; i < recentOrders.length; i++) {
          messageBlock.payload[0].quickReplies.push(
            {
              content_type: 'text',
              title: `Order ${recentOrders[i].name}`,
              payload: JSON.stringify({ type: DYNAMIC, action: ORDER_STATUS, argument: recentOrders[i].name.substr(1) })
            })
        }
      } else {
        messageBlock.payload[0].text = 'You have not placed any orders within the last 60 days.'
      }
    } else {
      messageBlock.payload[0].text = 'You have not placed any orders yet.'
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
    logger.serverLog(TAG, `Unable to get recent orders ${err}`, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to get recent orders.`)
  }
}

// const getErrorMessageBlock = (chatbot, backId, error) => {
//   return {
//     module: {
//       id: chatbot._id,
//       type: 'messenger_shopify_chatbot'
//     },
//     title: 'Error',
//     uniqueId: '' + new Date().getTime(),
//     payload: [
//       {
//         text: error,
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
//   }
// }

// const getWelcomeMessageBlock = async (chatbot, contact, EcommerceProvider, input) => {
//   let welcomeMessage = ''

//   welcomeMessage += `${input.charAt(0).toUpperCase() + input.substr(1).toLowerCase()}`

//   let storeInfo = await EcommerceProvider.fetchStoreInfo()

//   if (contact.firstName) {
//     welcomeMessage += ` ${contact.firstName}!`
//   } else {
//     welcomeMessage += `!`
//   }
//   welcomeMessage += ` Welcome to ${storeInfo.name} chatbot!`
//   let messageBlock = await messageBlockDataLayer.findOneMessageBlock({ uniqueId: chatbot.startingBlockId })
//   messageBlock.payload[0].text = `${welcomeMessage}\n\n` + messageBlock.payload[0].text
//   return messageBlock
// }

const invalidInput = async (chatbot, messageBlock, errMessage) => {
  if (messageBlock.uniqueId === chatbot.startingBlockId) {
    messageBlock = await messageBlockDataLayer.findOneMessageBlock({ uniqueId: chatbot.startingBlockId })
  }

  if (messageBlock.payload[0].text.includes(ERROR_INDICATOR)) {
    logger.serverLog(TAG, `messenger shopify chatbot invalid input contains error_indicator`, 'info')
    messageBlock.payload[0].text = messageBlock.payload[0].text.split('\n').filter((line) => {
      return !line.includes(ERROR_INDICATOR)
    }).join('\n')
    messageBlock.payload[0].text = `${errMessage}\n` + messageBlock.payload[0].text
  } else {
    messageBlock.payload[0].text = `${errMessage}\n\n` + messageBlock.payload[0].text
  }

  logger.serverLog(TAG, `messenger shopify chatbot invalid input ${JSON.stringify(messageBlock)} `, 'info')
  return messageBlock
}

const getQuantityToUpdateBlock = async (chatbot, backId, product) => {
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
    logger.serverLog(TAG, `Unable to update product(s) in cart ${err} `, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to update product(s) in cart`)
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
        currency: product.currency,
        image: product.image
      })
    }
    logger.serverLog(TAG, `shoppingCart ${JSON.stringify(shoppingCart)}`, 'info')
    updateSubscriber({ _id: contact._id }, { shoppingCart }, null, {})
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

exports.getNextMessageBlock = async (chatbot, EcommerceProvider, contact, event) => {
  try {
    logger.serverLog(TAG, `getNextMessageBlock event ${JSON.stringify(event)}`, 'info')
    const userMessage = event.message
    const input = userMessage ? userMessage.text.toLowerCase() : ''
    let startingBlock = await messageBlockDataLayer.findOneMessageBlock({ uniqueId: chatbot.startingBlockId })
    if (!contact || !contact.lastMessageSentByBot) {
      if (startingBlock.triggers.includes(input)) {
        return startingBlock
      }
    } else {
      let action = null
      logger.serverLog(TAG, `messenger shopify chatbot subscriber ${JSON.stringify(contact)} `, 'info')
      try {
        let lastMessageSentByBot = contact.lastMessageSentByBot.payload[contact.lastMessageSentByBot.payload.length - 1]
        if (userMessage && userMessage.quick_reply && userMessage.quick_reply.payload) {
          action = JSON.parse(userMessage.quick_reply.payload)
        } else if (event.postback && event.postback.payload) {
          action = JSON.parse(event.postback.payload)
        } else if (lastMessageSentByBot.action) {
          action = lastMessageSentByBot.action
        } else {
          throw new Error('Invalid user input')
        }
      } catch (err) {
        logger.serverLog(TAG, `Invalid user input ${input} `, 'info')
        if (startingBlock.triggers.includes(input)) {
          return startingBlock
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
              messageBlock = await getQuantityToUpdateBlock(chatbot, contact.lastMessageSentByBot.uniqueId, action.argument)
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
          if (startingBlock.triggers.includes(input)) {
            return startingBlock
          } else {
            return invalidInput(chatbot, contact.lastMessageSentByBot, err.message)
          }
        }
      } else if (action.type === STATIC) {
        return messageBlockDataLayer.findOneMessageBlock({ uniqueId: action.blockId })
      }
    }
  } catch (err) {
    console.log('nextMessageBlock error', err.stack)
    logger.serverLog(TAG, `nextMessageBlock error ${err}`, 'error')
  }
}
