const messageBlockDataLayer = require('../messageBlock/messageBlock.datalayer')
const constants = require('../whatsAppChatbot/constants')
const { convertToEmoji } = require('../whatsAppChatbot/whatsAppChatbot.logiclayer')
const dedent = require('dedent-js')
const logger = require('../../../components/logger')
const TAG = 'api/v1️.1/configureChatbot/commerceChatbot.logiclayer.js'
const commerceConstants = require('../ecommerceProvidersApiLayer/constants')
const botUtils = require('./commerceChatbot.utils')

exports.getCheckoutBlock = async (chatbot, backId, EcommerceProvider, contact, argument, userInput) => {
  let userError = false
  try {
    if (userInput && argument.address && !argument.address.zip) {
      argument.address.zip = userInput
    }
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'sms_commerce_chatbot'
      },
      title: 'Checkout',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: ``,
          componentType: 'text',
          specialKeys: {
            [constants.HOME_KEY]: { type: constants.DYNAMIC, action: constants.SHOW_MAIN_MENU }
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
          messageBlock.payload[0].specialKeys['i'] = { type: constants.DYNAMIC, action: constants.GET_INVOICE, argument: orderId }
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

    messageBlock.payload[0].text += `\n\n${botUtils.specialKeyText(constants.HOME_KEY)} `

    commerceCustomer.defaultAddress = argument.address

    let updatePayload = {
      shoppingCart: []
    }
    if (chatbot.storeType === commerceConstants.shopify) {
      updatePayload.commerceCustomerShopify = commerceCustomer
    } else {
      updatePayload.commerceCustomer = commerceCustomer
    }
    botUtils.updateSmsContact({ _id: contact._id }, updatePayload, null, {})

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
      throw new Error(`${constants.ERROR_INDICATOR}${err.message}`)
    } else {
      throw new Error(`${constants.ERROR_INDICATOR}Unable to checkout`)
    }
  }
}

exports.invalidInput = async (chatbot, messageBlock, errMessage) => {
  if (messageBlock.uniqueId === chatbot.startingBlockId) {
    messageBlock = await messageBlockDataLayer.findOneMessageBlock({ uniqueId: chatbot.startingBlockId })
  }

  for (let i = 0; i < messageBlock.payload.length; i++) {
    if (messageBlock.payload[i].text && messageBlock.payload[i].text.includes(constants.ERROR_INDICATOR)) {
      messageBlock.payload[i].text = messageBlock.payload[i].text.split('\n').filter((line) => {
        return !line.includes(constants.ERROR_INDICATOR)
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
exports.getWelcomeMessageBlock = async (chatbot, contact, ecommerceProvider) => {
  let storeInfo = await ecommerceProvider.fetchStoreInfo()
  let welcomeMessage = 'Hi'

  if (contact.name && contact.name !== contact.number) {
    welcomeMessage += ` ${contact.name.split(' ')[0]}!`
  } else {
    welcomeMessage += `!`
  }
  welcomeMessage += ` Greetings from ${storeInfo.name} ${chatbot.integration} chatbot 🤖😀`

  welcomeMessage += `\n\nI am here to guide you on your journey of shopping on ${storeInfo.name}\n\n`
  welcomeMessage += 'Please select an option to let me know what you would like to do? (i.e. send “1” to View products on sale):\n\n0️⃣ Browse all categories\n1️⃣ View products on sale\n2️⃣ Search for a product\n3️⃣ View Catalog\n\n*O*  Check order status\n*C*  View your cart\n*T*  Talk to a customer support agent'

  const messageBlock = {
    module: {
      id: chatbot._id,
      type: 'sms_commerce_chatbot'
    },
    title: 'Main Menu',
    uniqueId: '' + new Date().getTime(),
    payload: [
      {
        text: welcomeMessage,
        componentType: 'text',
        menu: [
          {'type': 'DYNAMIC', 'action': constants.PRODUCT_CATEGORIES},
          {'type': 'DYNAMIC', 'action': constants.DISCOVER_PRODUCTS},
          {'type': 'DYNAMIC', 'action': constants.SEARCH_PRODUCTS},
          {'type': 'DYNAMIC', 'action': constants.VIEW_CATALOG}
        ],
        specialKeys: {
          [constants.ORDER_STATUS_KEY]: { type: constants.DYNAMIC, action: constants.VIEW_RECENT_ORDERS },
          [constants.SHOW_CART_KEY]: { type: constants.DYNAMIC, action: constants.SHOW_MY_CART },
          [constants.TALK_TO_AGENT_KEY]: {'type': 'DYNAMIC', 'action': constants.TALK_TO_AGENT}
        }
      }
    ],
    userId: chatbot.userId,
    companyId: chatbot.companyId
  }
  return messageBlock
}
const getShowMyCartBlock = async (chatbot, backId, contact, optionalText) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'sms_commerce_chatbot'
      },
      title: 'Show My Cart',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: optionalText ? `${optionalText}\n\n` : '',
          componentType: 'text',
          menu: [],
          specialKeys: {
            [constants.BACK_KEY]: { type: constants.STATIC, blockId: backId },
            [constants.HOME_KEY]: { type: constants.DYNAMIC, action: constants.SHOW_MAIN_MENU }
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
        { type: constants.DYNAMIC, action: constants.SHOW_ITEMS_TO_REMOVE },
        { type: constants.DYNAMIC, action: constants.SHOW_ITEMS_TO_UPDATE },
        { type: constants.DYNAMIC, action: constants.CONFIRM_CLEAR_CART },
        { type: constants.DYNAMIC, action: constants.ASK_PAYMENT_METHOD })
      messageBlock.payload[0].text += dedent(`Please select an option by sending the corresponding number for it:\n
                                            ${botUtils.convertToEmoji(0)} Remove an item
                                            ${botUtils.convertToEmoji(1)} Update quantity for an item
                                            ${botUtils.convertToEmoji(2)} Clear cart
                                            ${botUtils.convertToEmoji(3)} Proceed to Checkout`)

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
    }
    messageBlock.payload[0].text += `\n\n${botUtils.specialKeyText(constants.BACK_KEY)}`
    messageBlock.payload[0].text += `\n${botUtils.specialKeyText(constants.HOME_KEY)}`
    return messageBlock
  } catch (err) {
    const message = err || 'Unable to show cart'
    logger.serverLog(message, `${TAG}: exports.getShowMyCartBlock`, {}, {}, 'error')
    throw new Error(`${constants.ERROR_INDICATOR}Unable to show cart`)
  }
}
exports.getAddToCartBlock = async (chatbot, backId, contact, {product, quantity}) => {
  let userError = false
  try {
    quantity = Number(quantity)
    if (!Number.isInteger(quantity) || quantity < 0) {
      userError = true
      throw new Error(`${constants.ERROR_INDICATOR}Invalid quantity given.`)
    }
    let shoppingCart = contact.shoppingCart ? contact.shoppingCart : []
    let existingProductIndex = shoppingCart.findIndex((item) => item.variant_id === product.variant_id)
    if (existingProductIndex > -1) {
      let previousQuantity = shoppingCart[existingProductIndex].quantity
      if ((previousQuantity + quantity) > product.inventory_quantity) {
        userError = true
        throw new Error(`${constants.ERROR_INDICATOR}You can not add any more of this product. Your cart already contains ${previousQuantity}, which is the maximum stock currently available.`)
      }
      shoppingCart[existingProductIndex].quantity += quantity
    } else {
      if (quantity > product.inventory_quantity) {
        userError = true
        throw new Error(`${constants.ERROR_INDICATOR}Your requested quantity exceeds the stock available (${product.inventory_quantity}). Please enter a quantity less than ${product.inventory_quantity}.`)
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
    botUtils.updateSmsContact({ _id: contact._id }, { shoppingCart, commerceCustomer: contact.commerceCustomer }, null, {})
    let text = `${quantity} ${product.product}${quantity !== 1 ? 's have' : ' has'} been succesfully added to your cart.`
    return getShowMyCartBlock(chatbot, backId, contact, text)
  } catch (err) {
    if (!userError) {
      const message = err || 'Unable to add to cart'
      logger.serverLog(message, `${TAG}: exports.getAddToCartBlock`, chatbot, {}, 'error')
    }
    if (err.message) {
      throw new Error(`${constants.ERROR_INDICATOR}${err.message}`)
    } else {
      throw new Error(`${constants.ERROR_INDICATOR}Unable to add to cart`)
    }
  }
}

exports.confirmClearCart = (chatbot, contact) => {
  let messageBlock = {
    module: {
      id: chatbot._id,
      type: 'sms_commerce_chatbot'
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
          [constants.HOME_KEY]: {type: constants.DYNAMIC, action: constants.SHOW_MAIN_MENU},
          'y': { type: constants.DYNAMIC, action: constants.CLEAR_CART },
          'n': { type: constants.DYNAMIC, action: constants.SHOW_MY_CART },
          'yes': { type: constants.DYNAMIC, action: constants.CLEAR_CART },
          'no': { type: constants.DYNAMIC, action: constants.SHOW_MY_CART }

        }
      }
    ],
    userId: chatbot.userId,
    companyId: chatbot.companyId
  }

  messageBlock.payload[0].text += `\n\n${botUtils.specialKeyText(constants.HOME_KEY)}`
  return messageBlock
}

exports.clearCart = async (chatbot, contact) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'sms_commerce_chatbot'
      },
      title: 'Your cart has been successfully cleared',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: dedent(`Your cart is now empty.\n
  ${botUtils.specialKeyText(constants.HOME_KEY)} `),
          componentType: 'text',
          specialKeys: {
            [constants.HOME_KEY]: { type: constants.DYNAMIC, action: constants.SHOW_MAIN_MENU }
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
    botUtils.updateSmsContact({ _id: contact._id }, { shoppingCart, commerceCustomer: contact.commerceCustomer }, null, {})
    return messageBlock
  } catch (err) {
    const message = err || 'Unable to clear cart'
    logger.serverLog(message, `${TAG}: exports.clearCart`, {}, {}, 'error')
    throw new Error(`${constants.ERROR_INDICATOR}Unable to clear cart`)
  }
}

exports.getRemoveFromCartBlock = async (chatbot, backId, contact, productInfo) => {
  const shoppingCart = contact.shoppingCart.filter((item, index) => index !== productInfo.productIndex)
  contact.shoppingCart = shoppingCart
  if (contact.commerceCustomer) {
    contact.commerceCustomer.cartId = null
  }
  await botUtils.updateSmsContact({ _id: contact._id }, { shoppingCart, commerceCustomer: contact.commerceCustomer }, null, {})
  const text = `${productInfo.product} has been successfully removed from your cart.`
  return getShowMyCartBlock(chatbot, backId, contact, text)
}

exports.getConfirmRemoveItemBlock = async (chatbot, backId, product) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'sms_commerce_chatbot'
      },
      title: 'Quantity to Remove',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Are you sure you want to remove ${product.product}?\n\nYou currently have ${product.quantity} in your cart.\n\n(price: ${product.price} ${product.currency})\n\n`,
          componentType: 'text',
          specialKeys: {
            [constants.BACK_KEY]: { type: constants.STATIC, blockId: backId },
            [constants.HOME_KEY]: { type: constants.DYNAMIC, action: constants.SHOW_MAIN_MENU },
            'y': { type: constants.DYNAMIC, action: constants.REMOVE_FROM_CART, argument: product },
            'n': { type: constants.DYNAMIC, action: constants.SHOW_ITEMS_TO_REMOVE },
            'yes': { type: constants.DYNAMIC, action: constants.REMOVE_FROM_CART, argument: product },
            'no': { type: constants.DYNAMIC, action: constants.SHOW_ITEMS_TO_REMOVE }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    messageBlock.payload[0].text += dedent(`Please select an option from following:\n
                                            Send 'Y' for Yes
                                            Send 'N' for No`)

    messageBlock.payload[0].text += `\n\n${botUtils.specialKeyText(constants.BACK_KEY)}`
    messageBlock.payload[0].text += `\n${botUtils.specialKeyText(constants.HOME_KEY)}`

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
    throw new Error(`${constants.ERROR_INDICATOR}Unable to remove product(s) from cart`)
  }
}

exports.getShowItemsToRemoveBlock = (chatbot, backId, contact) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'sms_commerce_chatbot'
      },
      title: 'Select Item to Remove',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Please select an item to remove from your cart: \n`,
          componentType: 'text',
          menu: [],
          specialKeys: {
            [constants.SHOW_CART_KEY]: { type: constants.DYNAMIC, action: constants.SHOW_MY_CART },
            [constants.BACK_KEY]: { type: constants.STATIC, blockId: backId },
            [constants.HOME_KEY]: { type: constants.DYNAMIC, action: constants.SHOW_MAIN_MENU }
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
      messageBlock.payload[0].menu.push({ type: constants.DYNAMIC, action: constants.CONFIRM_TO_REMOVE_CART_ITEM, argument: { ...product, productIndex: i } })
    }
    messageBlock.payload[0].text += `\n\n${botUtils.specialKeyText(constants.SHOW_CART_KEY)} `
    messageBlock.payload[0].text += `\n${botUtils.specialKeyText(constants.BACK_KEY)} `
    messageBlock.payload[0].text += `\n${botUtils.specialKeyText(constants.HOME_KEY)} `
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
    throw new Error(`${constants.ERROR_INDICATOR}Unable to show items from cart`)
  }
}

exports.getProductCategoriesBlock = async (chatbot, backId, EcommerceProvider, argument) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'sms_commerce_chatbot'
      },
      title: 'Product Categories',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Please select a category by sending the corresponding number for it:\n`,
          componentType: 'text',
          menu: [],
          specialKeys: {
            [constants.SHOW_CART_KEY]: { type: constants.DYNAMIC, action: constants.SHOW_MY_CART },
            [constants.BACK_KEY]: { type: constants.STATIC, blockId: backId },
            [constants.HOME_KEY]: { type: constants.STATIC, blockId: chatbot.startingBlockId }
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
        type: constants.DYNAMIC, action: constants.FETCH_PRODUCTS, argument: {categoryId: category.id}
      })
    }
    if (productCategories.nextPageParameters) {
      messageBlock.payload[0].text += `\n${convertToEmoji(productCategories.length)} View More`
      messageBlock.payload[0].menu.push({
        type: constants.DYNAMIC, action: constants.PRODUCT_CATEGORIES, argument: {paginationParams: productCategories.nextPageParameters}
      })
    }
    messageBlock.payload[0].text += `\n\n${botUtils.specialKeyText(constants.SHOW_CART_KEY)}`
    messageBlock.payload[0].text += `\n${botUtils.specialKeyText(constants.BACK_KEY)}`
    messageBlock.payload[0].text += `\n${botUtils.specialKeyText(constants.HOME_KEY)}`
    return messageBlock
  } catch (err) {
    const message = err || 'Unable to get product categories'
    logger.serverLog(message, `${TAG}: exports.getProductCategoriesBlock`, {}, {}, 'error')
    throw new Error(`${constants.ERROR_INDICATOR}Unable to get product categories`)
  }
}

exports.getProductsInCategoryBlock = async (chatbot, backId, EcommerceProvider, argument) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'sms_commerce_chatbot'
      },
      title: 'Products in Category',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Please select a product by sending the corresponding number for it:\n`,
          componentType: 'text',
          menu: [],
          specialKeys: {
            [constants.SHOW_CART_KEY]: { type: constants.DYNAMIC, action: constants.SHOW_MY_CART },
            [constants.BACK_KEY]: { type: constants.STATIC, blockId: backId },
            [constants.HOME_KEY]: { type: constants.STATIC, blockId: chatbot.startingBlockId }
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
        type: constants.DYNAMIC, action: constants.PRODUCT_VARIANTS, argument: {product}
      })
    }
    if (products.nextPageParameters) {
      messageBlock.payload[0].text += `\n${convertToEmoji(products.length)} View More`
      messageBlock.payload[0].menu.push({
        type: constants.DYNAMIC, action: constants.FETCH_PRODUCTS, argument: {categoryId: argument.categoryId, paginationParams: products.nextPageParameters}
      })
    }
    messageBlock.payload[0].text += `\n\n${botUtils.specialKeyText(constants.SHOW_CART_KEY)}`
    messageBlock.payload[0].text += `\n${botUtils.specialKeyText(constants.BACK_KEY)}`
    messageBlock.payload[0].text += `\n${botUtils.specialKeyText(constants.HOME_KEY)}`
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
    throw new Error(`${constants.ERROR_INDICATOR}Unable to get products in this category`)
  }
}

exports.getProductsInCategoryBlock = async (chatbot, backId, EcommerceProvider, argument) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'sms_commerce_chatbot'
      },
      title: 'Products in Category',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Please select a product by sending the corresponding number for it:\n`,
          componentType: 'text',
          menu: [],
          specialKeys: {
            [constants.SHOW_CART_KEY]: { type: constants.DYNAMIC, action: constants.SHOW_MY_CART },
            [constants.BACK_KEY]: { type: constants.STATIC, blockId: backId },
            [constants.HOME_KEY]: { type: constants.STATIC, blockId: chatbot.startingBlockId }
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
        type: constants.DYNAMIC, action: constants.PRODUCT_VARIANTS, argument: {product}
      })
    }
    if (products.nextPageParameters) {
      messageBlock.payload[0].text += `\n${convertToEmoji(products.length)} View More`
      messageBlock.payload[0].menu.push({
        type: constants.DYNAMIC, action: constants.FETCH_PRODUCTS, argument: {categoryId: argument.categoryId, paginationParams: products.nextPageParameters}
      })
    }
    messageBlock.payload[0].text += `\n\n${botUtils.specialKeyText(constants.SHOW_CART_KEY)}`
    messageBlock.payload[0].text += `\n${botUtils.specialKeyText(constants.BACK_KEY)}`
    messageBlock.payload[0].text += `\n${botUtils.specialKeyText(constants.HOME_KEY)}`
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
    throw new Error(`${constants.ERROR_INDICATOR}Unable to get products in this category`)
  }
}

exports.getProductVariantsBlock = async (chatbot, backId, contact, EcommerceProvider, argument) => {
  try {
    const product = argument.product
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'sms_commerce_chatbot'
      },
      title: 'Product Variants',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Please select from following *${product.name}* options by sending the corresponding number for it:\n`,
          componentType: 'text',
          menu: [],
          specialKeys: {
            [constants.SHOW_CART_KEY]: { type: constants.DYNAMIC, action: constants.SHOW_MY_CART },
            [constants.BACK_KEY]: { type: constants.STATIC, blockId: backId },
            [constants.HOME_KEY]: { type: constants.STATIC, blockId: chatbot.startingBlockId }
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
        type: constants.DYNAMIC,
        action: constants.SELECT_PRODUCT,
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
        type: constants.DYNAMIC, action: constants.PRODUCT_CATEGORIES, argument: {product, paginationParams: productVariants.nextPageParameters}
      })
    }
    messageBlock.payload[0].text += `\n\n${botUtils.specialKeyText(constants.SHOW_CART_KEY)}`
    messageBlock.payload[0].text += `\n${botUtils.specialKeyText(constants.BACK_KEY)}`
    messageBlock.payload[0].text += `\n${botUtils.specialKeyText(constants.HOME_KEY)}`
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
    throw new Error(`${constants.ERROR_INDICATOR}Unable to get product variants`)
  }
}

const getSelectProductBlock = async (chatbot, backId, product) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'sms_commerce_chatbot'
      },
      title: 'Select Product',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Do you want to purchase this product?\n\n${product.product} (price: ${product.price} ${product.currency}) (stock available: ${product.inventory_quantity}).`,
          componentType: 'text',
          specialKeys: {
            [constants.SHOW_CART_KEY]: { type: constants.DYNAMIC, action: constants.SHOW_MY_CART },
            [constants.BACK_KEY]: { type: constants.STATIC, blockId: backId },
            [constants.HOME_KEY]: { type: constants.STATIC, blockId: chatbot.startingBlockId },
            'y': { type: constants.DYNAMIC, action: constants.ADD_TO_CART, argument: {product, quantity: 1} },
            'n': { type: constants.STATIC, blockId: chatbot.startingBlockId },
            'yes': { type: constants.DYNAMIC,
              action: constants.ADD_TO_CART,
              argument: {product, quantity: 1},
              'no': { type: constants.STATIC, blockId: chatbot.startingBlockId }
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

    messageBlock.payload[0].text += `\n${botUtils.specialKeyText(constants.SHOW_CART_KEY)}\n${botUtils.specialKeyText(constants.BACK_KEY)}\n${botUtils.specialKeyText(constants.HOME_KEY)}`

    // TODO: Will do this when we know if our API supports images or not.

    // if (product.image) {
    //   messageBlock.payload.unshift({
    //     componentType: 'image',
    //     fileurl: product.image,
    //     caption: `${product.product}\nPrice: ${product.price} ${product.currency}`
    //   })
    // }

    return messageBlock
  } catch (err) {
    const message = err || 'Unable to select product'
    logger.serverLog(message, `${TAG}: exports.getSelectProductBlock`, {}, {}, 'error')
    logger.serverLog(TAG, `Unable to select product ${err}`, 'error')
    throw new Error(`${constants.ERROR_INDICATOR}Unable to select product`)
  }
}

exports.getShowMyCartBlock = getShowMyCartBlock
