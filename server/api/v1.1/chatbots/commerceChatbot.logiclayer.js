const dedent = require('dedent-js')
const {
  DYNAMIC,
  STATIC,
  PRODUCT_CATEGORIES,
  PRODUCT_VARIANTS,
  DISCOVER_PRODUCTS,
  ORDER_STATUS,
  SELECT_PRODUCT,
  SHOW_MY_CART,
  ADD_TO_CART,
  REMOVE_FROM_CART,
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
} = require('./commerceChatbotConstants')
const logger = require('../../../components/logger')
const TAG = 'api/v1️.1/whatsAppChatbot/whatsAppChatbot.logiclayer.js'
const messageBlockDataLayer = require('../messageBlock/messageBlock.datalayer')
const { callApi } = require('../utility')
const commerceConstants = require('../ecommerceProvidersApiLayer/constants')

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
  const startingBlock = messageBlockDataLayer.findOneMessageBlock({ uniqueId: chatbot.startingBlockId })
  startingBlock.payload[0].text = `Hi {{user_first_name}}! Welcome to ${storeName} chatbot!\n\n${DEFAULT_TEXT}`
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

const getDiscoverProductsBlock = async (chatbot, backId, EcommerceProvider, input, categoryId) => {
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
    let storeInfo = await EcommerceProvider.fetchStoreInfo()
    if (input) {
      products = await EcommerceProvider.searchProducts(input)
      if (products.length > 0) {
        messageBlock.payload[0].text = `Following products were found for "${input}".\n\nPlease select a product:`
      } else {
        messageBlock.payload[0].text = `No products found that match "${input}".\n\nPlease enter the name of the product you wish to search for:`
        messageBlock.payload[0].action = { type: DYNAMIC, action: DISCOVER_PRODUCTS, input: true }
      }
    } else {
      if (categoryId) {
        products = await EcommerceProvider.fetchProductsInThisCategory(categoryId)
      } else {
        products = await EcommerceProvider.fetchProducts()
      }
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
        let priceString = storeInfo.currency === 'USD' ? `$${product.price}` : `${product.price} ${storeInfo.currency}`
        messageBlock.payload[1].cards.push({
          image_url: product.image,
          title: product.name,
          subtitle: `Price: ${priceString}`,
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
    if (orderStatus.displayFinancialStatus) {
      messageBlock.payload[0].text += `\nPayment: ${orderStatus.displayFinancialStatus}`
    }
    if (orderStatus.displayFulfillmentStatus) {
      messageBlock.payload[0].text += `\nDelivery: ${orderStatus.displayFulfillmentStatus}`
    }

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
        payload: JSON.stringify({ type: DYNAMIC, action: DISCOVER_PRODUCTS, argument: category.id })
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
          text: `You have selected ${product.name}.\n\nPlease select a product variant:`,
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
      let productVariantsLength = productVariants.length > 10 ? 10 : productVariants.length
      for (let i = 0; i < productVariantsLength; i++) {
        let productVariant = productVariants[i]
        let priceString = storeInfo.currency === 'USD' ? `Price: $${productVariant.price ? productVariant.price : product.price}` : `Price: ${productVariant.price ? productVariant.price : product.price} ${storeInfo.currency}`
        messageBlock.payload[1].cards.push({
          title: `${productVariant.name} ${product.name}`,
          subtitle: priceString
        })
        if (productVariant.inventory_quantity > 0) {
          messageBlock.payload[1].cards[i].buttons = [{
            title: 'Select Product',
            type: 'postback',
            payload: JSON.stringify({
              type: DYNAMIC,
              action: SELECT_PRODUCT,
              argument: {
                variant_id: productVariant.id,
                product_id: productVariant.product_id,
                product: `${productVariant.name} ${product.name}`,
                price: productVariant.price ? productVariant.price : product.price,
                inventory_quantity: productVariant.inventory_quantity,
                currency: storeInfo.currency
              }
            })
          }]
          messageBlock.payload[1].cards[i].subtitle += `\nStock Available: ${productVariant.inventory_quantity}`
        } else {
          messageBlock.payload[1].cards[i].subtitle += `\nOut of Stock`
        }
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
    let priceString = product.currency === 'USD' ? `$${product.price}` : `${product.price} ${product.currency}`
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'messenger_shopify_chatbot'
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
    let priceString = product.currency === 'USD' ? `$${product.price}` : `${product.price} ${product.currency}`
    let shoppingCart = contact.shoppingCart ? contact.shoppingCart : []
    let existingProductIndex = shoppingCart.findIndex((item) => item.variant_id === product.variant_id)
    if (existingProductIndex > -1) {
      if (shoppingCart[existingProductIndex].quantity >= product.inventory_quantity) {
        let text = `Your cart already contains the maximum stock available for this product.`
        return getShowMyCartBlock(chatbot, backId, contact, text)
      } else {
        messageBlock.payload[0].text = `How many ${product.product}s would you like to add to your cart?\n\nYou already have ${shoppingCart[existingProductIndex].quantity} in your cart.\n\n(price: ${priceString}) (stock available: ${product.inventory_quantity})`
      }
    } else {
      messageBlock.payload[0].text = `How many ${product.product}s would you like to add to your cart?\n\n(price: ${priceString}) (stock available: ${product.inventory_quantity})`
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
    if (!Number.isInteger(quantity) || quantity <= 0) {
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
        product_id: product.product_id,
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
    let text = `${quantity} ${product.product}${quantity !== 1 ? 's have' : 'has'} been succesfully added to your cart.`
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
      messageBlock.payload.push({
        componentType: 'gallery',
        cards: [],
        quickReplies: []
      })
      messageBlock.payload[0].text += `Here is your cart.`
      let totalPrice = 0
      let currency = ''
      for (let i = 0; i < shoppingCart.length; i++) {
        let product = shoppingCart[i]
        if (!currency) {
          currency = product.currency
        }
        let price = product.quantity * product.price
        totalPrice += price

        let priceString = currency === 'USD' ? `$${product.price}` : `${product.price} ${currency}`
        let totalPriceString = currency === 'USD' ? `$${price}` : `${price} ${currency}`
        messageBlock.payload[1].cards.push({
          title: product.product,
          subtitle: `Price: ${priceString}\nQuantity: ${product.quantity}\nTotal Price: ${totalPriceString}`,
          buttons: [
            {
              title: 'Update Quantity',
              type: 'postback',
              payload: JSON.stringify({ type: DYNAMIC, action: QUANTITY_TO_UPDATE, argument: { ...product, productIndex: i } })
            },
            {
              title: 'Remove',
              type: 'postback',
              payload: JSON.stringify({ type: DYNAMIC, action: REMOVE_FROM_CART, argument: { ...product, productIndex: i } })
            }
          ]
        })
      }
      let totalPriceString = currency === 'USD' ? `$${totalPrice}` : `${totalPrice} ${currency}`
      messageBlock.payload[0].text += ` Total price is: ${totalPriceString}.`

      messageBlock.payload[messageBlock.payload.length - 1].quickReplies.push(
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
    logger.serverLog(TAG, `Unable to show cart ${err}`, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to show cart`)
  }
}

const getRemoveFromCartBlock = async (chatbot, backId, contact, productInfo, quantity) => {
  try {
    if (!quantity) {
      quantity = productInfo.quantity
    }
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
    let text = `${quantity} ${productInfo.product}${quantity !== 1 ? 's have' : 'has'} been succesfully removed from your cart.`
    return getShowMyCartBlock(chatbot, backId, contact, text)
  } catch (err) {
    console.log('Unable to remove item(s) from cart', err.stack)
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
    let priceString = product.currency === 'USD' ? `$${product.price}` : `${product.price} ${product.currency}`
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'messenger_shopify_chatbot'
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
    logger.serverLog(TAG, `Unable to remove product(s) from cart ${err} `, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to remove product(s) from cart`)
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
    if (!newEmail && contact.commerceCustomer && contact.commerceCustomer.email) {
      messageBlock = {
        module: {
          id: chatbot._id,
          type: 'messenger_shopify_chatbot'
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
          text: `Your checkout link has been generated.`,
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
    if (newEmail) {
      commerceCustomer = await EcommerceProvider.searchCustomerUsingEmail(newEmail)
      if (commerceCustomer.length === 0) {
        commerceCustomer = await EcommerceProvider.createCustomer(contact.firstName, contact.lastName, newEmail)
      } else {
        commerceCustomer = commerceCustomer[0]
      }
      logger.serverLog(TAG, `commerceCustomer ${JSON.stringify(commerceCustomer)}`, 'info')
      updateSubscriber({ _id: contact._id }, { commerceCustomer, shoppingCart: [] }, {})
    } else {
      commerceCustomer = contact.commerceCustomer
      updateSubscriber({ _id: contact._id }, { shoppingCart: [] }, null, {})
    }
    let checkoutLink = ''
    if (chatbot.storeType === commerceConstants.shopify) {
      checkoutLink = await EcommerceProvider.createPermalinkForCart(commerceCustomer, contact.shoppingCart)
    } else if (chatbot.storeType === commerceConstants.bigcommerce) {
      const bigcommerceCart = await EcommerceProvider.createCart(commerceCustomer.id, contact.shoppingCart)
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
      logger.serverLog(TAG, `checkoutLink isn't defined`, 'error')
      throw new Error()
    }
    return messageBlock
  } catch (err) {
    logger.serverLog(TAG, `Unable to checkout ${err} `, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to show checkout`)
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
    if (contact.commerceCustomer) {
      recentOrders = await EcommerceProvider.findCustomerOrders(contact.commerceCustomer.id, 9)
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
    let priceString = product.currency === 'USD' ? `$${product.price}` : `${product.price} ${product.currency}`
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_chatbot'
      },
      title: 'Quantity to Update',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `What quantity would you like to set for ${product.product}?\n\nYou currently have ${product.quantity} in your cart.\n\n(price: ${priceString}) (stock available: ${product.inventory_quantity})`,
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
        product_id: product.product_id,
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
      try {
        let lastMessageSentByBot = contact.lastMessageSentByBot.payload[contact.lastMessageSentByBot.payload.length - 1]
        if (userMessage && userMessage.quick_reply && userMessage.quick_reply.payload) {
          action = JSON.parse(userMessage.quick_reply.payload)
        } else if (event.postback && event.postback.payload) {
          action = JSON.parse(event.postback.payload)
        } else if (lastMessageSentByBot.action) {
          action = lastMessageSentByBot.action
        } else if (startingBlock.triggers.includes(input)) {
          return startingBlock
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
            case PRODUCT_VARIANTS: {
              messageBlock = await getProductVariantsBlock(chatbot, contact.lastMessageSentByBot.uniqueId, EcommerceProvider, action.argument)
              break
            }
            case DISCOVER_PRODUCTS: {
              messageBlock = await getDiscoverProductsBlock(chatbot, contact.lastMessageSentByBot.uniqueId, EcommerceProvider, action.input ? input : '', action.argument ? action.argument : '')
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
