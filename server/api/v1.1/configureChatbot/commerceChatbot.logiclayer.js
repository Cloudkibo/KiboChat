const messageBlockDataLayer = require('../messageBlock/messageBlock.datalayer')
const constants = require('../whatsAppChatbot/constants')
const { convertToEmoji, sendNotification } = require('../whatsAppChatbot/whatsAppChatbot.logiclayer')
const { generateInvoice } = require('../whatsAppChatbot/commerceChatbot.logiclayer')
const dedent = require('dedent-js')
const logger = require('../../../components/logger')
const TAG = 'api/v1️.1/configureChatbot/commerceChatbot.logiclayer.js'
const commerceConstants = require('../ecommerceProvidersApiLayer/constants')
const botUtils = require('./commerceChatbot.utils')
const utility = require('../../../components/utility')
const { callApi } = require('../utility')

exports.getCheckoutBlock = async (chatbot, EcommerceProvider, contact, argument, userInput) => {
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
    if (chatbot.integration === commerceConstants.shopify) {
      tempCustomerPayload = contact.commerceCustomerShopify
    }

    if (argument.newEmail) {
      commerceCustomer = await EcommerceProvider.searchCustomerUsingEmail(argument.newEmail)
      if (commerceCustomer.length === 0) {
        commerceCustomer = await EcommerceProvider.createCustomer(firstName, lastName, argument.newEmail, argument.address)
      } else {
        commerceCustomer = commerceCustomer[0]
      }
      commerceCustomer.provider = chatbot.integration
    } else {
      if (!tempCustomerPayload.provider || tempCustomerPayload.provider !== chatbot.integration) {
        commerceCustomer = await EcommerceProvider.searchCustomerUsingEmail(tempCustomerPayload.email)
        if (commerceCustomer.length === 0) {
          commerceCustomer = await EcommerceProvider.createCustomer(firstName, lastName, tempCustomerPayload.email, argument.address)
        } else {
          commerceCustomer = commerceCustomer[0]
        }
        commerceCustomer.provider = chatbot.integration
      } else {
        commerceCustomer = tempCustomerPayload
      }
    }

    let checkoutLink = ''
    if (argument.paymentMethod === 'cod') {
      if (chatbot.integration === commerceConstants.shopify) {
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
          messageBlock.payload[0].text += `${orderId}\n\n`
          messageBlock.payload[0].text += `Here is your complete order:\n`

          let totalPrice = 0
          let currency = ''
          for (let i = 0; i < shoppingCart.length; i++) {
            let product = shoppingCart[i]

            currency = product.currency

            let price = product.quantity * product.price
            price = Number(price.toFixed(2))
            totalPrice += price

            messageBlock.payload[0].text += `\nItem: ${product.product}`
            messageBlock.payload[0].text += `\nQuantity: ${product.quantity}`
            messageBlock.payload[0].text += `\nPrice: ${price} ${currency}`

            if (i + 1 < shoppingCart.length) {
              messageBlock.payload[0].text += `\n`
            }
          }

          messageBlock.payload[0].text += `\n\nTotal price: ${totalPrice} ${currency}\n\n`

          const address = argument.address
          messageBlock.payload[0].text += `Address: ${address.address1}, ${address.city} ${address.zip}, ${address.country}`

          messageBlock.payload[0].text += `\n\nI  Get PDF Invoice`
          messageBlock.payload[0].specialKeys['i'] = { type: constants.DYNAMIC, action: constants.GET_INVOICE, argument: orderId }
        } else {
          throw new Error()
        }
      } else {
        messageBlock.payload[0].text += `Cash on delivery is currently not supported for this store`
      }
    } else if (argument.paymentMethod === 'e-payment') {
      messageBlock.payload[0].text += `Here is your checkout link:`
      if (chatbot.integration === commerceConstants.shopify) {
        checkoutLink = await EcommerceProvider.createPermalinkForCart(commerceCustomer, contact.shoppingCart)
      } else if (chatbot.integration === commerceConstants.bigcommerce) {
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
    if (chatbot.integration === commerceConstants.shopify) {
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
  welcomeMessage += dedent(`Please select an option to let me know what you would like to do? (i.e. send “1” to View products on sale):\n
  ${convertToEmoji(0)} Browse all categories
  ${convertToEmoji(1)} View products on sale
  ${convertToEmoji(2)} Search for a product
  ${convertToEmoji(3)} View Catalog`)
  welcomeMessage += `\n\n${botUtils.specialKeyText(constants.ORDER_STATUS_KEY)}`
  welcomeMessage += `\n${botUtils.specialKeyText(constants.SHOW_CART_KEY)}`
  welcomeMessage += `\n${botUtils.specialKeyText(constants.TALK_TO_AGENT_KEY)}`
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

const getShowMyCartBlock = async (chatbot, contact, optionalText) => {
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
            [constants.BACK_KEY]: { type: constants.DYNAMIC, action: constants.GO_BACK },
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

        messageBlock.payload[0].text += `\nItem: ${product.product}`
        messageBlock.payload[0].text += `\nQuantity: ${product.quantity}`
        messageBlock.payload[0].text += `\nPrice: ${price} ${currency}`

        if (i + 1 < shoppingCart.length) {
          messageBlock.payload[0].text += `\n`
        }
      }
      messageBlock.payload[0].text += `\n\nTotal price: ${totalPrice} ${currency}\n\n`
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
    let textBlockIndex = messageBlock.payload.findIndex(b => b.componentType === 'text')
    messageBlock.payload[textBlockIndex].text += `\n\n${botUtils.specialKeyText(constants.BACK_KEY)}`
    messageBlock.payload[textBlockIndex].text += `\n${botUtils.specialKeyText(constants.HOME_KEY)}`
    return messageBlock
  } catch (err) {
    const message = err || 'Unable to show cart'
    logger.serverLog(message, `${TAG}: exports.getShowMyCartBlock`, {}, {}, 'error')
    throw new Error(`${constants.ERROR_INDICATOR}Unable to show cart`)
  }
}
exports.getAddToCartBlock = async (chatbot, contact, {product, quantity}) => {
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
    return getShowMyCartBlock(chatbot, contact, text)
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
          [constants.HOME_KEY]: { type: constants.DYNAMIC, action: constants.SHOW_MAIN_MENU },
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

exports.getRemoveFromCartBlock = async (chatbot, contact, productInfo) => {
  const shoppingCart = contact.shoppingCart.filter((item, index) => index !== productInfo.productIndex)
  contact.shoppingCart = shoppingCart
  if (contact.commerceCustomer) {
    contact.commerceCustomer.cartId = null
  }
  await botUtils.updateSmsContact({ _id: contact._id }, { shoppingCart, commerceCustomer: contact.commerceCustomer }, null, {})
  const text = `${productInfo.product} has been successfully removed from your cart.`
  return getShowMyCartBlock(chatbot, contact, text)
}

exports.getConfirmRemoveItemBlock = async (chatbot, product) => {
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
            [constants.BACK_KEY]: { type: constants.DYNAMIC, action: constants.GO_BACK },
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

exports.getShowItemsToRemoveBlock = (chatbot, contact) => {
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
            [constants.BACK_KEY]: { type: constants.DYNAMIC, action: constants.GO_BACK },
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

exports.getProductCategoriesBlock = async (chatbot, EcommerceProvider, argument) => {
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
            [constants.BACK_KEY]: { type: constants.DYNAMIC, action: constants.GO_BACK },
            [constants.HOME_KEY]: { type: constants.DYNAMIC, action: constants.SHOW_MAIN_MENU }
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

exports.getProductsInCategoryBlock = async (chatbot, EcommerceProvider, argument) => {
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
            [constants.BACK_KEY]: { type: constants.DYNAMIC, action: constants.GO_BACK },
            [constants.HOME_KEY]: { type: constants.DYNAMIC, action: constants.SHOW_MAIN_MENU }
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

exports.getProductVariantsBlock = async (chatbot, contact, EcommerceProvider, argument) => {
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
          text: `Please select from following "${product.name}" options by sending the corresponding number for it:\n`,
          componentType: 'text',
          menu: [],
          specialKeys: {
            [constants.SHOW_CART_KEY]: { type: constants.DYNAMIC, action: constants.SHOW_MY_CART },
            [constants.BACK_KEY]: { type: constants.DYNAMIC, action: constants.GO_BACK },
            [constants.HOME_KEY]: { type: constants.DYNAMIC, action: constants.SHOW_MAIN_MENU }
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
      messageBlock = await getSelectProductBlock(chatbot, {
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

const getSelectProductBlock = async (chatbot, product) => {
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
            [constants.BACK_KEY]: { type: constants.DYNAMIC, action: constants.GO_BACK },
            [constants.HOME_KEY]: { type: constants.DYNAMIC, action: constants.SHOW_MAIN_MENU },
            'y': { type: constants.DYNAMIC, action: constants.ADD_TO_CART, argument: {product, quantity: 1} },
            'n': { type: constants.DYNAMIC, action: constants.GO_BACK },
            'yes': { type: constants.DYNAMIC,
              action: constants.ADD_TO_CART,
              argument: {product, quantity: 1},
              'no': { type: constants.DYNAMIC, action: constants.GO_BACK }
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
    throw new Error(`${constants.ERROR_INDICATOR}Unable to select product`)
  }
}

exports.getDiscoverProductsBlock = async (chatbot, EcommerceProvider, input, argument) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'sms_commerce_chatbot'
      },
      title: 'Discover Products',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: ``,
          componentType: 'text',
          menu: [],
          specialKeys: {
            [constants.SHOW_CART_KEY]: { type: constants.DYNAMIC, action: constants.SHOW_MY_CART },
            [constants.BACK_KEY]: { type: constants.DYNAMIC, action: constants.GO_BACK },
            [constants.HOME_KEY]: { type: constants.DYNAMIC, action: constants.SHOW_MAIN_MENU }
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
        messageBlock.payload[0].text = `These products were found for "${input}". Please select a product by sending the corresponding number for it or enter another product name or SKU code to search again:\n`
      } else {
        messageBlock.payload[0].text = `No products found that match "${input}".\n\nEnter another product name or SKU code to search again:`
      }

      messageBlock.payload[0].action = { type: constants.DYNAMIC, action: constants.DISCOVER_PRODUCTS, input: true }
    } else {
      products = await EcommerceProvider.fetchProducts(argument.paginationParams, chatbot.numberOfProducts)

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
        type: constants.DYNAMIC, action: constants.PRODUCT_VARIANTS, argument: {product}
      })
    }

    if (products.nextPageParameters) {
      messageBlock.payload[0].text += `\n${convertToEmoji(products.length)} View More`
      messageBlock.payload[0].menu.push({
        type: constants.DYNAMIC, action: constants.DISCOVER_PRODUCTS, argument: {paginationParams: products.nextPageParameters}
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
    const message = err || 'Unable to discover products'
    logger.serverLog(message, `${TAG}: exports.getDiscoverProductsBlock`, {}, {}, 'error')
    throw new Error(`${constants.ERROR_INDICATOR}Unable to discover products`)
  }
}

exports.getRecentOrdersBlock = async (chatbot, contact, EcommerceProvider) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'sms_commerce_chatbot'
      },
      title: 'Recent Orders',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: ``,
          componentType: 'text',
          menu: [],
          action: { type: constants.DYNAMIC, action: constants.ORDER_STATUS, input: true },
          specialKeys: {
            [constants.SHOW_CART_KEY]: { type: constants.DYNAMIC, action: constants.SHOW_MY_CART },
            [constants.BACK_KEY]: { type: constants.DYNAMIC, action: constants.GO_BACK },
            [constants.HOME_KEY]: { type: constants.DYNAMIC, action: constants.SHOW_MAIN_MENU }
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
    if (chatbot.integration === commerceConstants.shopify) {
      tempCustomerPayload = contact.commerceCustomerShopify
    }
    if (tempCustomerPayload) {
      recentOrders = await EcommerceProvider.findCustomerOrders(tempCustomerPayload.id, 9)
      recentOrders = recentOrders.orders
      if (recentOrders.length > 0) {
        messageBlock.payload[0].text = 'Select an order by sending the corresponding number for it or enter an order ID:\n'
        for (let i = 0; i < recentOrders.length; i++) {
          let orderTitle
          if (!recentOrders[i].cancelReason) {
            orderTitle = `\n${convertToEmoji(i)} Order ${recentOrders[i].name} - ${new Date(recentOrders[i].createdAt).toDateString()} (${recentOrders[i].lineItems[0].name})`
          } else {
            orderTitle = `\n${convertToEmoji(i)} (Canceled) Order ${recentOrders[i].name} - ${new Date(recentOrders[i].createdAt).toDateString()} (${recentOrders[i].lineItems[0].name})`
          }
          messageBlock.payload[0].text += utility.truncate(orderTitle, 55)
          messageBlock.payload[0].menu.push({ type: constants.DYNAMIC, action: constants.ORDER_STATUS, argument: recentOrders[i].name.substr(1) })
        }
      } else {
        messageBlock.payload[0].text = 'You have not placed any orders within the last 60 days. If you have an order ID, you can enter that to view its status.'
      }
    } else {
      messageBlock.payload[0].text = 'You have not placed any orders here yet. If you have an order ID, you can enter that to view its status.'
    }

    messageBlock.payload[0].text += `\n\n${botUtils.specialKeyText(constants.SHOW_CART_KEY)}`
    messageBlock.payload[0].text += `\n${botUtils.specialKeyText(constants.BACK_KEY)}`
    messageBlock.payload[0].text += `\n${botUtils.specialKeyText(constants.HOME_KEY)}`

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
    throw new Error(`${constants.ERROR_INDICATOR}Unable to get recent orders.`)
  }
}

exports.getSearchProductsBlock = async (chatbot, contact) => {
  try {
    const messageBlock = {
      module: {
        id: chatbot._id,
        type: 'sms_commerce_chatbot'
      },
      title: 'Search Products',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Please enter the name or SKU code of the product you wish to search for:\n`,
          componentType: 'text',
          action: { type: constants.DYNAMIC, action: constants.DISCOVER_PRODUCTS, input: true }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    return messageBlock
  } catch (err) {
    const message = err || 'Unable get search for products message block'
    logger.serverLog(message, `${TAG}: getSearchProductsBlock`, {}, {chatbot, contact}, 'error')
    throw new Error(`${constants.ERROR_INDICATOR}Unable get search for products message block`)
  }
}

exports.getOrderStatusBlock = async (chatbot, EcommerceProvider, orderId) => {
  let userError = false
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'sms_commerce_chatbot'
      },
      title: 'Order Status',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Here is your order status for Order #${orderId}:\n`,
          componentType: 'text',
          specialKeys: {
            [constants.BACK_KEY]: { type: constants.DYNAMIC, action: constants.GO_BACK },
            [constants.HOME_KEY]: { type: constants.DYNAMIC, action: constants.SHOW_MAIN_MENU },
            'i': { type: constants.DYNAMIC, action: constants.GET_INVOICE, argument: orderId },
            'o': { type: constants.DYNAMIC, action: constants.VIEW_RECENT_ORDERS }
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

    let isOrderFulFilled = orderStatus.displayFulfillmentStatus.toLowerCase() === 'fulfilled'
    if (!orderStatus.cancelReason && chatbot.cancelOrder) {
      messageBlock.payload[0].specialKeys['x'] = { type: constants.DYNAMIC, action: constants.CANCEL_ORDER_CONFIRM, argument: { id: orderStatus.id, orderId, isOrderFulFilled } }
    }

    if (orderStatus.cancelReason) {
      messageBlock.payload[0].text += `\nStatus: CANCELED`
    } else {
      if (orderStatus.tags && orderStatus.tags.includes('cancel-request')) {
        messageBlock.payload[0].text += `\nStatus: Request Open for Cancelation `
      }
      if (orderStatus.displayFinancialStatus) {
        messageBlock.payload[0].text += `\nPayment: ${orderStatus.displayFinancialStatus}`
      }
      if (orderStatus.displayFulfillmentStatus) {
        messageBlock.payload[0].text += `\nDelivery: ${orderStatus.displayFulfillmentStatus}`
      }
    }
    if (isOrderFulFilled && orderStatus.fulfillments) {
      if (orderStatus.fulfillments[0]) {
        let trackingDetails = orderStatus.fulfillments[0].trackingInfo && orderStatus.fulfillments[0].trackingInfo[0] ? orderStatus.fulfillments[0].trackingInfo[0] : null
        if (trackingDetails) {
          messageBlock.payload[0].text += `\n\nTracking Details`
          messageBlock.payload[0].text += `\nCompany: ${trackingDetails.company}`
          messageBlock.payload[0].text += `\nNumber: ${trackingDetails.number}`
          messageBlock.payload[0].text += `\nUrl: ${trackingDetails.url && trackingDetails.url !== '' ? trackingDetails.url : utility.getTrackingUrl(trackingDetails)}`
        }
      }
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

    let tempAddressBlock = null
    if (orderStatus.shippingAddress) {
      tempAddressBlock = orderStatus.shippingAddress
    } else if (orderStatus.billingAddress) {
      tempAddressBlock = orderStatus.billingAddress
    }

    messageBlock.payload[0].text += `\n\nShipping Address: ${tempAddressBlock.address1}`
    if (tempAddressBlock.address2) {
      messageBlock.payload[0].text += `, ${tempAddressBlock.address2}`
    }
    if (tempAddressBlock.city) {
      messageBlock.payload[0].text += `, ${tempAddressBlock.city}`
    }
    if (tempAddressBlock.province) {
      messageBlock.payload[0].text += `, ${tempAddressBlock.province}`
    }
    if (tempAddressBlock.country) {
      messageBlock.payload[0].text += `, ${tempAddressBlock.country}`
    }

    messageBlock.payload[0].text += `\n\nThis order was placed on ${new Date(orderStatus.createdAt).toDateString()}`

    messageBlock.payload[0].text += `\n\nI   Get PDF Invoice`
    messageBlock.payload[0].text += `\nO  View Recent Orders`

    if (!orderStatus.cancelReason &&
      !(orderStatus.displayFinancialStatus && orderStatus.displayFinancialStatus.includes('PAID')) &&
      !(orderStatus.tags && orderStatus.tags.includes('cancel-request')) &&
      chatbot.cancelOrder
    ) {
      messageBlock.payload[0].text += `\nX  Cancel Order`
    }
    if (orderStatus.displayFulfillmentStatus &&
      orderStatus.displayFulfillmentStatus === 'FULFILLED' &&
      orderStatus.displayFinancialStatus &&
      orderStatus.displayFinancialStatus.includes('PAID') &&
      !orderStatus.cancelReason &&
      chatbot.returnOrder
    ) {
      messageBlock.payload[0].specialKeys['r'] = { type: constants.DYNAMIC, action: constants.CONFIRM_RETURN_ORDER, argument: orderId }
      messageBlock.payload[0].text += `\nR  Request Return`
    }
    messageBlock.payload[0].text += `\n${botUtils.specialKeyText(constants.BACK_KEY)}`
    messageBlock.payload[0].text += `\n${botUtils.specialKeyText(constants.HOME_KEY)}`

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
      throw new Error(`${constants.ERROR_INDICATOR}${err.message}`)
    } else {
      throw new Error(`${constants.ERROR_INDICATOR}Unable to get order status.`)
    }
  }
}

exports.getOrderIdBlock = (chatbot, contact) => {
  try {
    const messageBlock = {
      module: {
        id: chatbot._id,
        type: 'sms_commerce_chatbot'
      },
      title: 'Get Order ID',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Please enter your order ID`,
          componentType: 'text',
          action: { type: constants.DYNAMIC, action: constants.ORDER_STATUS, input: true },
          specialKeys: {
            [constants.BACK_KEY]: { type: constants.DYNAMIC, action: constants.GO_BACK },
            [constants.HOME_KEY]: { type: constants.DYNAMIC, action: constants.SHOW_MAIN_MENU },
            'o': { type: constants.DYNAMIC, action: constants.VIEW_RECENT_ORDERS }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    messageBlock.payload[0].text += `\n\nO  View Recent Orders`
    messageBlock.payload[0].text += `\n${botUtils.specialKeyText(constants.BACK_KEY)}`
    messageBlock.payload[0].text += `\n${botUtils.specialKeyText(constants.HOME_KEY)}`
    return messageBlock
  } catch (err) {
    const message = err || 'Unable get search for products message block'
    logger.serverLog(message, `${TAG}: getSearchProductsBlock`, {}, {chatbot, contact}, 'error')
    throw new Error(`${constants.ERROR_INDICATOR}Unable to notify customer support agent`)
  }
}

exports.getCheckOrdersBlock = (chatbot, contact) => {
  try {
    const messageBlock = {
      module: {
        id: chatbot._id,
        type: 'sms_commerce_chatbot'
      },
      title: 'Check Orders',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: dedent(`Please select an option by sending the corresponding number for it:\n
                      ${convertToEmoji(0)} View recently placed orders
                      ${convertToEmoji(1)} Check order status for a specific order id\n
                      ${botUtils.specialKeyText(constants.SHOW_CART_KEY)}
                      ${botUtils.specialKeyText(constants.HOME_KEY)}`),
          componentType: 'text',
          menu: [
            { type: constants.DYNAMIC, action: constants.VIEW_RECENT_ORDERS },
            { type: constants.DYNAMIC, action: constants.ASK_ORDER_ID }
          ],
          specialKeys: {
            [constants.SHOW_CART_KEY]: { type: constants.DYNAMIC, action: constants.SHOW_MY_CART },
            [constants.HOME_KEY]: { type: constants.DYNAMIC, action: constants.SHOW_MAIN_MENU }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    return messageBlock
  } catch (err) {
    const message = err || 'Unable get check orders message block'
    logger.serverLog(message, `${TAG}: getCheckOrdersBlock`, {}, {chatbot, contact}, 'error')
    throw new Error(`${constants.ERROR_INDICATOR}Unable get check orders message block`)
  }
}

exports.getShowItemsToUpdateBlock = (chatbot, contact) => {
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
          text: `Please select an item in your cart for which you want to update the quantity: \n`,
          componentType: 'text',
          menu: [],
          specialKeys: {
            [constants.SHOW_CART_KEY]: { type: constants.DYNAMIC, action: constants.SHOW_MY_CART },
            [constants.BACK_KEY]: { type: constants.DYNAMIC, action: constants.GO_BACK },
            [constants.HOME_KEY]: { type: constants.DYNAMIC, action: constants.SHOW_MAIN_MENU }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }

    let shoppingCart = contact.shoppingCart

    if (shoppingCart.length === 1) {
      let product = shoppingCart[0]
      return getQuantityToUpdateBlock(chatbot, { ...product, productIndex: 0 })
    }

    for (let i = 0; i < shoppingCart.length; i++) {
      let product = shoppingCart[i]

      messageBlock.payload[0].text += `\n${convertToEmoji(i)} ${product.product} `

      messageBlock.payload[0].menu.push({ type: constants.DYNAMIC, action: constants.QUANTITY_TO_UPDATE, argument: { ...product, productIndex: i } })
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
    logger.serverLog(message, `${TAG}: exports.getShowItemsToUpdateBlock`, {}, {}, 'error')
    throw new Error(`${constants.ERROR_INDICATOR}Unable to show items from cart`)
  }
}

const getQuantityToUpdateBlock = async (chatbot, product) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'sms_commerce_chatbot'
      },
      title: 'Quantity to Update',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `What quantity would you like to set for ${product.product}?\n\nYou currently have ${product.quantity} in your cart.\n\n(price: ${product.price} ${product.currency}) (stock available: ${product.inventory_quantity})`,
          componentType: 'text',
          action: { type: constants.DYNAMIC, action: constants.UPDATE_CART, argument: product, input: true },
          specialKeys: {
            [constants.BACK_KEY]: { type: constants.DYNAMIC, action: constants.GO_BACK },
            [constants.HOME_KEY]: { type: constants.DYNAMIC, action: constants.SHOW_MAIN_MENU },
            'p': { type: constants.DYNAMIC, action: constants.ASK_PAYMENT_METHOD }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }

    messageBlock.payload[0].text += `\n\n${botUtils.specialKeyText(constants.BACK_KEY)}`
    messageBlock.payload[0].text += `\n${botUtils.specialKeyText(constants.HOME_KEY)}`
    messageBlock.payload[0].text += `\nP  Proceed to Checkout`

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
    throw new Error(`${constants.ERROR_INDICATOR}Unable to update product(s) in cart`)
  }
}

exports.getUpdateCartBlock = async (chatbot, contact, product, quantity) => {
  let userError = false
  try {
    quantity = Number(quantity)
    if (!Number.isInteger(quantity) || quantity < 0) {
      userError = true
      throw new Error(`${constants.ERROR_INDICATOR}Invalid quantity given.`)
    }
    if (quantity > product.inventory_quantity) {
      userError = true
      throw new Error(`${constants.ERROR_INDICATOR}Your requested quantity exceeds the stock available (${product.inventory_quantity}). Please enter a quantity less than ${product.inventory_quantity}.`)
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
    botUtils.updateSmsContact({ _id: contact._id }, { shoppingCart, commerceCustomer: contact.commerceCustomer }, null, {})
    let text = `${product.product} quantity has been updated to ${quantity}.`
    if (quantity === 0) {
      text = `${product.product} has been removed from cart.`
    }
    return getShowMyCartBlock(chatbot, contact, text)
  } catch (err) {
    if (!userError) {
      const message = err || 'Unable to update cart'
      logger.serverLog(message, `${TAG}: exports.getUpdateCartBlock`, chatbot, {}, 'error')
    } if (err.message) {
      throw new Error(`${constants.ERROR_INDICATOR}${err.message}`)
    } else {
      throw new Error(`${constants.ERROR_INDICATOR}Unable to update cart`)
    }
  }
}

const getCheckoutInfoBlock = async (chatbot, contact, EcommerceProvider, argument, userInput) => {
  let userError = false
  try {
    let messageBlock = null
    if (userInput && argument.updatingZip) {
      argument.address.zip = userInput
    }

    // this is workaround to store both bigcommerce and shopify
    // customer information in contacts table so that during
    // demo we can easily switch between commerce providers.
    // Here we are checking which store the chatbot belongs to
    // and getting the customer payload for that store - Sojharo
    let tempCustomerPayload = contact.commerceCustomer
    if (chatbot.integration === commerceConstants.shopify) {
      tempCustomerPayload = contact.commerceCustomerShopify
    }
    const address = argument.address ? argument.address : tempCustomerPayload ? tempCustomerPayload.defaultAddress : null
    let yesAction = null
    if (address && argument.paymentMethod === 'cod') {
      yesAction = { type: constants.DYNAMIC, action: constants.PROCEED_TO_CHECKOUT, argument: {...argument, address} }
    } else if (!address && argument.paymentMethod === 'cod') {
      yesAction = { type: constants.DYNAMIC, action: constants.ASK_ADDRESS, argument: {...argument} }
    } else {
      yesAction = { type: constants.DYNAMIC, action: constants.PROCEED_TO_CHECKOUT, argument: {...argument} }
    }
    if (userInput || argument.updatingZip || argument.updatingAddress || argument.newEmail || (tempCustomerPayload && tempCustomerPayload.email)) { // (!argument.newEmail && tempCustomerPayload && tempCustomerPayload.email)) {
      if (argument.updatingZip) {
        argument.updatingZip = false
      }
      if (argument.updatingAddress) {
        argument.updatingAddress = false
      }
      if (!contact.emailVerified) {
        return getEmailOtpBlock(chatbot, contact, EcommerceProvider, {...argument, newEmail: true}, argument.newEmail ? argument.newEmail : tempCustomerPayload.email)
      }
      messageBlock = {
        module: {
          id: chatbot._id,
          type: 'sms_commerce_chatbot'
        },
        title: 'Checkout Info',
        uniqueId: '' + new Date().getTime(),
        payload: [
          {
            text: ``,
            componentType: 'text',
            menu: [
              yesAction
            ],
            specialKeys: {
              [constants.HOME_KEY]: { type: constants.DYNAMIC, action: constants.SHOW_MAIN_MENU },
              [constants.BACK_KEY]: { type: constants.DYNAMIC, action: constants.GO_BACK }
            }
          }
        ],
        userId: chatbot.userId,
        companyId: chatbot.companyId
      }
      messageBlock.payload[0].text += `Would you like to use the current information for checkout?`
      messageBlock.payload[0].text += `\n\nEmail: ${argument.newEmail ? argument.newEmail : tempCustomerPayload.email}`

      if (address && argument.paymentMethod === 'cod') {
        messageBlock.payload[0].text += `\n\nAddress: ${address.address1}, ${address.city} ${address.zip}, ${address.country}`
        messageBlock.payload[0].menu.push(
          { type: constants.DYNAMIC, action: constants.UPDATE_ADDRESS_BLOCK, argument: {...argument, address} }
        )
      }
      messageBlock.payload[0].text += `\n\n${convertToEmoji(0)} Yes, Proceed to checkout`
      // messageBlock.payload[0].text += `\n${convertToEmoji(1)} No, update email`
      if (address && argument.paymentMethod === 'cod') {
        messageBlock.payload[0].text += `\n${convertToEmoji(1)} No, update address`
      }
    } else {
      messageBlock = {
        module: {
          id: chatbot._id,
          type: 'sms_commerce_chatbot'
        },
        title: 'Checkout Email',
        uniqueId: '' + new Date().getTime(),
        payload: [
          {
            text: `Please enter your email: `,
            componentType: 'text',
            action: {
              type: constants.DYNAMIC,
              action: constants.GET_EMAIL_OTP,
              argument: {...argument, newEmail: true},
              input: true
            },
            specialKeys: {
              [constants.HOME_KEY]: { type: constants.DYNAMIC, action: constants.SHOW_MAIN_MENU },
              [constants.BACK_KEY]: { type: constants.DYNAMIC, action: constants.GO_BACK }
            }
          }
        ],
        userId: chatbot.userId,
        companyId: chatbot.companyId
      }
    }
    messageBlock.payload[0].text += `\n\n${botUtils.specialKeyText(constants.BACK_KEY)}`
    messageBlock.payload[0].text += `\n${botUtils.specialKeyText(constants.HOME_KEY)}`
    return messageBlock
  } catch (err) {
    if (!userError) {
      const message = err || 'Unable to checkout'
      logger.serverLog(message, `${TAG}: exports.getCheckoutEmailBlock`, {}, {}, 'error')
      throw new Error(`${constants.ERROR_INDICATOR}Unable to show checkout`)
    } else {
      throw new Error(`${constants.ERROR_INDICATOR}${err.message}`)
    }
  }
}

const getEmailOtpBlock = async (chatbot, contact, EcommerceProvider, argument, userInput) => {
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
        platform: 'sms',
        commercePlatform: 'shopify',
        phone: contact.number,
        emailAddress: userInput,
        storeName: storeInfo.name
      })
        .then(created => {
          logger.serverLog('otp created and sent', `${TAG}: exports.getEmailOtpBlock`, { created }, {}, 'info')
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
        type: 'sms_commerce_chatbot'
      },
      title: 'Checkout Email OTP',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `In order to verify your email address, please enter the OTP which is sent to your email address: `,
          componentType: 'text',
          action: {
            type: constants.DYNAMIC,
            action: constants.GET_VERIFY_OTP,
            argument: {...argument},
            input: true
          },
          specialKeys: {
            [constants.HOME_KEY]: { type: constants.DYNAMIC, action: constants.SHOW_MAIN_MENU },
            [constants.BACK_KEY]: { type: constants.DYNAMIC, action: constants.GO_BACK }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    messageBlock.payload[0].text += `\n\n${botUtils.specialKeyText(constants.BACK_KEY)}`
    messageBlock.payload[0].text += `\n${botUtils.specialKeyText(constants.HOME_KEY)}`
    return messageBlock
  } catch (err) {
    if (!userError) {
      const message = err || 'Unable to input otp for email verification'
      logger.serverLog(message, `${TAG}: exports.getEmailOtpBlock`, {contact}, {}, 'error')
      throw new Error(`${constants.ERROR_INDICATOR}Unable to input otp for email verification`)
    } else {
      throw new Error(`${constants.ERROR_INDICATOR}${err.message}`)
    }
  }
}

exports.getVerifyOtpBlock = async (chatbot, contact, argument, userInput, EcommerceProvider) => {
  let userError = false
  try {
    let messageBlock = null
    let otpInput = userInput
    if (otpInput) {
      let otpRecord = await callApi('email_verification_otps/verify', 'post', {
        companyId: contact.companyId,
        platform: 'sms',
        commercePlatform: 'shopify',
        phone: contact.number,
        emailAddress: argument.newEmail,
        otp: otpInput
      })
      if (otpRecord !== 'otp matched') {
        userError = true
        throw new Error('OTP is invalid or expired.')
      }
      botUtils.updateSmsContact({ _id: contact._id }, {emailVerified: true}, null, {})
    }
    messageBlock = {
      module: {
        id: chatbot._id,
        type: 'sms_commerce_chatbot'
      },
      title: 'Verify Email OTP',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Email address is verified successfully`,
          componentType: 'text',
          menu: [
            {
              type: constants.DYNAMIC,
              action: argument.address || argument.paymentMethod !== 'cod' ? constants.GET_CHECKOUT_INFO : constants.ASK_ADDRESS,
              argument: { ...argument }
            }
          ],
          specialKeys: {
            [constants.HOME_KEY]: { type: constants.DYNAMIC, action: constants.SHOW_MAIN_MENU },
            [constants.BACK_KEY]: { type: constants.DYNAMIC, action: constants.GO_BACK }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }

    messageBlock.payload[0].text += `\n\n${convertToEmoji(0)} Proceed to checkout`
    messageBlock.payload[0].text += `\n\n${botUtils.specialKeyText(constants.BACK_KEY)}`
    messageBlock.payload[0].text += `\n${botUtils.specialKeyText(constants.HOME_KEY)}`

    let commerceCustomer = null

    if (argument.newEmail) {
      commerceCustomer = await EcommerceProvider.searchCustomerUsingEmail(argument.newEmail)
      if (commerceCustomer.length === 0) {
        const names = contact.name.split(' ')
        const firstName = names[0]
        const lastName = names[1] ? names[1] : names[0]

        commerceCustomer = await EcommerceProvider.createCustomer(firstName, lastName, argument.newEmail)
      } else {
        commerceCustomer = commerceCustomer[0]
      }
      commerceCustomer.provider = chatbot.integration
    }

    let updatePayload = {
      shoppingCart: []
    }
    if (chatbot.integration === commerceConstants.shopify) {
      updatePayload.commerceCustomerShopify = commerceCustomer
    } else {
      updatePayload.commerceCustomer = commerceCustomer
    }

    botUtils.updateSmsContact({ _id: contact._id }, updatePayload, null, {})

    return messageBlock
  } catch (err) {
    if (!userError) {
      const message = err || 'Unable to verify otp for email verification'
      logger.serverLog(message, `${TAG}: exports.getVerifyOtpBlock`, {contact}, {}, 'info')
      throw new Error(`${constants.ERROR_INDICATOR}Unable to verify otp for email verification`)
    } else {
      throw new Error(`${constants.ERROR_INDICATOR}${err.message}`)
    }
  }
}

exports.getAskAddressBlock = async (chatbot, contact, argument, userInput) => {
  let userError = false
  try {
    let messageBlock = null
    if (userInput) {
      const emailRegex = /\S+@\S+\.\S+/
      if (!emailRegex.test(userInput)) {
        userError = true
        throw new Error('Invalid Email. Please input a valid email address.')
      }
      argument.newEmail = userInput
    }
    // this is workaround to store both bigcommerce and shopify
    // customer information in contacts table so that during
    // demo we can easily switch between commerce providers.
    // Here we are checking which store the chatbot belongs to
    // and getting the customer payload for that store - Sojharo
    let tempCustomerPayload = contact.commerceCustomer
    if (chatbot.integration === commerceConstants.shopify) {
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
          type: 'sms_commerce_chatbot'
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
              'y': { type: constants.DYNAMIC, action: constants.PROCEED_TO_CHECKOUT, argument: { ...argument, address: tempCustomerPayload.defaultAddress } },
              'n': { type: constants.DYNAMIC, action: constants.GET_CHECKOUT_STREET_ADDRESS, argument: { ...argument, address: {address1: ''} } },
              'yes': { type: constants.DYNAMIC, action: constants.PROCEED_TO_CHECKOUT, argument: { ...argument, address: tempCustomerPayload.defaultAddress } },
              'no': { type: constants.DYNAMIC, action: constants.GET_CHECKOUT_STREET_ADDRESS, argument: { ...argument, address: {address1: ''} } },
              [constants.HOME_KEY]: { type: constants.DYNAMIC, action: constants.SHOW_MAIN_MENU }
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
          type: 'sms_commerce_chatbot'
        },
        title: 'Asking Street Address',
        uniqueId: '' + new Date().getTime(),
        payload: [
          {
            text: `Please enter your street address: `,
            componentType: 'text',
            action: {
              type: constants.DYNAMIC,
              action: constants.GET_CHECKOUT_CITY,
              input: true,
              argument: { ...argument,
                address: { address1: '' }
              }
            },
            specialKeys: {
              [constants.HOME_KEY]: { type: constants.DYNAMIC, action: constants.SHOW_MAIN_MENU }
            }
          }
        ],
        userId: chatbot.userId,
        companyId: chatbot.companyId
      }
    }
    messageBlock.payload[0].text += `\n\n${botUtils.specialKeyText(constants.HOME_KEY)} `
    return messageBlock
  } catch (err) {
    if (!userError) {
      logger.serverLog(TAG, `Unable to input street address ${err} `, 'error')
      throw new Error(`${constants.ERROR_INDICATOR}Unable to input street address`)
    } else {
      throw new Error(`${constants.ERROR_INDICATOR}${err.message}`)
    }
  }
}

exports.getCheckoutStreetAddressBlock = async (chatbot, contact, argument) => {
  try {
    const messageBlock = {
      module: {
        id: chatbot._id,
        type: 'sms_commerce_chatbot'
      },
      title: 'Checkout Email',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Please enter your street address: `,
          componentType: 'text',
          action: {
            type: constants.DYNAMIC,
            action: constants.GET_CHECKOUT_CITY,
            input: true,
            argument: { ...argument,
              address: {...argument.address, address1: ''}
            }
          },
          specialKeys: {
            [constants.HOME_KEY]: { type: constants.DYNAMIC, action: constants.SHOW_MAIN_MENU }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    messageBlock.payload[0].text += `\n\n${botUtils.specialKeyText(constants.HOME_KEY)} `
    return messageBlock
  } catch (err) {
    logger.serverLog(TAG, `Unable to input street address ${err} `, 'error')
    throw new Error(`${constants.ERROR_INDICATOR}Unable to input street address`)
  }
}

exports.getCheckoutCityBlock = async (chatbot, contact, argument, userInput) => {
  try {
    if (userInput && argument.address && !argument.address.address1) {
      argument.address.address1 = userInput
    }
    const messageBlock = {
      module: {
        id: chatbot._id,
        type: 'sms_commerce_chatbot'
      },
      title: 'Checkout Email',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Please enter your city: `,
          componentType: 'text',
          action: {
            type: constants.DYNAMIC,
            action: constants.GET_CHECKOUT_COUNTRY,
            input: true,
            argument: { ...argument,
              address: { ...argument.address, city: '' }
            }
          },
          specialKeys: {
            [constants.HOME_KEY]: { type: constants.DYNAMIC, action: constants.SHOW_MAIN_MENU }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }

    messageBlock.payload[0].text += `\n\n${botUtils.specialKeyText(constants.HOME_KEY)} `
    return messageBlock
  } catch (err) {
    logger.serverLog(TAG, `Unable to input city ${err} `, 'error')
    throw new Error(`${constants.ERROR_INDICATOR}Unable to input city`)
  }
}

exports.getCheckoutCountryBlock = async (chatbot, contact, argument, userInput) => {
  try {
    if (userInput && argument.address && !argument.address.city) {
      argument.address.city = userInput
    }
    const messageBlock = {
      module: {
        id: chatbot._id,
        type: 'sms_commerce_chatbot'
      },
      title: 'Checkout Email',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Please enter your country: `,
          componentType: 'text',
          action: {
            type: constants.DYNAMIC,
            action: constants.GET_CHECKOUT_ZIP_CODE,
            input: true,
            argument: { ...argument,
              address: { ...argument.address, country: '' }
            }
          },
          specialKeys: {
            [constants.HOME_KEY]: { type: constants.DYNAMIC, action: constants.SHOW_MAIN_MENU }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }

    messageBlock.payload[0].text += `\n\n${botUtils.specialKeyText(constants.HOME_KEY)} `
    return messageBlock
  } catch (err) {
    logger.serverLog(TAG, `Unable to input country ${err} `, 'error')
    throw new Error(`${constants.ERROR_INDICATOR}Unable to input country`)
  }
}

exports.getCheckoutZipCodeBlock = async (chatbot, contact, argument, userInput) => {
  try {
    if (userInput && argument.address && !argument.address.country) {
      argument.address.country = userInput
    }
    const messageBlock = {
      module: {
        id: chatbot._id,
        type: 'sms_commerce_chatbot'
      },
      title: 'Checkout Zip Code',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Please enter your zip code: `,
          componentType: 'text',
          action: {
            type: constants.DYNAMIC,
            action: constants.GET_CHECKOUT_INFO,
            input: true,
            argument: { ...argument,
              updatingZip: true,
              address: { ...argument.address, zip: '' }
            }
          },
          specialKeys: {
            [constants.HOME_KEY]: { type: constants.DYNAMIC, action: constants.SHOW_MAIN_MENU }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }

    messageBlock.payload[0].text += `\n\n${botUtils.specialKeyText(constants.HOME_KEY)} `
    return messageBlock
  } catch (err) {
    logger.serverLog(TAG, `Unable to input country ${err} `, 'error')
    throw new Error(`${constants.ERROR_INDICATOR}Unable to input country`)
  }
}

exports.confirmCompleteAddress = (chatbot, contact, argument, userInput) => {
  if (userInput && argument.address && !argument.address.zip) {
    argument.address.zip = userInput
  }
  let messageBlock = {
    module: {
      id: chatbot._id,
      type: 'sms_commerce_chatbot'
    },
    title: 'Is this address confirmed?',
    uniqueId: '' + new Date().getTime(),
    payload: [
      {
        text: 'Thank you for providing address details.',
        componentType: 'text',
        menu: [],
        specialKeys: {
          [constants.HOME_KEY]: { type: constants.DYNAMIC, action: constants.SHOW_MAIN_MENU },
          'y': { type: constants.DYNAMIC, action: constants.PROCEED_TO_CHECKOUT, argument },
          'n': { type: constants.DYNAMIC, action: constants.UPDATE_ADDRESS_BLOCK, argument },
          'yes': { type: constants.DYNAMIC, action: constants.PROCEED_TO_CHECKOUT, argument },
          'no': { type: constants.DYNAMIC, action: constants.UPDATE_ADDRESS_BLOCK, argument }
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

  messageBlock.payload[0].text += `\n\n${botUtils.specialKeyText(constants.HOME_KEY)}`
  return messageBlock
}

exports.updateAddressBlock = (chatbot, contact, argument) => {
  let messageBlock = {
    module: {
      id: chatbot._id,
      type: 'sms_commerce_chatbot'
    },
    title: 'Update in the address',
    uniqueId: '' + new Date().getTime(),
    payload: [
      {
        text: '',
        componentType: 'text',
        menu: [],
        specialKeys: {
          [constants.HOME_KEY]: { type: constants.DYNAMIC, action: constants.SHOW_MAIN_MENU }
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
    { type: constants.DYNAMIC, action: constants.UPDATE_CHECKOUT_STREET_ADDRESS, argument },
    { type: constants.DYNAMIC, action: constants.UPDATE_CHECKOUT_CITY, argument },
    { type: constants.DYNAMIC, action: constants.UPDATE_CHECKOUT_COUNTRY, argument },
    { type: constants.DYNAMIC, action: constants.UPDATE_CHECKOUT_ZIP_CODE, argument })

  messageBlock.payload[0].text += `\n\n${botUtils.specialKeyText(constants.HOME_KEY)}`
  return messageBlock
}

exports.updateCheckoutStreetAddressBlock = async (chatbot, contact, argument) => {
  try {
    const messageBlock = {
      module: {
        id: chatbot._id,
        type: 'sms_commerce_chatbot'
      },
      title: 'Update street address for checkout',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Please enter the new street address: `,
          componentType: 'text',
          action: {
            type: constants.DYNAMIC,
            action: constants.GET_NEW_CHECKOUT_STREET_ADDRESS,
            input: true,
            argument
          },
          specialKeys: {
            [constants.HOME_KEY]: { type: constants.DYNAMIC, action: constants.SHOW_MAIN_MENU }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    messageBlock.payload[0].text += `\n\n${botUtils.specialKeyText(constants.HOME_KEY)} `
    return messageBlock
  } catch (err) {
    logger.serverLog(TAG, `Unable to input street address ${err} `, 'error')
    throw new Error(`${constants.ERROR_INDICATOR}Unable to input street address`)
  }
}

exports.updateCheckoutCityBlock = async (chatbot, contact, argument) => {
  try {
    const messageBlock = {
      module: {
        id: chatbot._id,
        type: 'sms_commerce_chatbot'
      },
      title: 'Update city for checkout',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Please enter the new city : `,
          componentType: 'text',
          action: {
            type: constants.DYNAMIC,
            action: constants.GET_NEW_CHECKOUT_CITY,
            input: true,
            argument
          },
          specialKeys: {
            [constants.HOME_KEY]: { type: constants.DYNAMIC, action: constants.SHOW_MAIN_MENU }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    messageBlock.payload[0].text += `\n\n${botUtils.specialKeyText(constants.HOME_KEY)} `
    return messageBlock
  } catch (err) {
    logger.serverLog(TAG, `Unable to input city name ${err} `, 'error')
    throw new Error(`${constants.ERROR_INDICATOR}Unable to input city name`)
  }
}

exports.updateCheckoutCountryBlock = async (chatbot, contact, argument) => {
  try {
    const messageBlock = {
      module: {
        id: chatbot._id,
        type: 'sms_commerce_chatbot'
      },
      title: 'Update country for checkout',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Please enter the new country : `,
          componentType: 'text',
          action: {
            type: constants.DYNAMIC,
            action: constants.GET_NEW_CHECKOUT_COUNTRY,
            input: true,
            argument
          },
          specialKeys: {
            [constants.HOME_KEY]: { type: constants.DYNAMIC, action: constants.SHOW_MAIN_MENU }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    messageBlock.payload[0].text += `\n\n${botUtils.specialKeyText(constants.HOME_KEY)} `
    return messageBlock
  } catch (err) {
    logger.serverLog(TAG, `Unable to input country ${err} `, 'error')
    throw new Error(`${constants.ERROR_INDICATOR}Unable to input country`)
  }
}

exports.updateCheckoutZipCodeBlock = async (chatbot, contact, argument) => {
  try {
    const messageBlock = {
      module: {
        id: chatbot._id,
        type: 'sms_commerce_chatbot'
      },
      title: 'Update zip code for checkout',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Please enter the new zip code : `,
          componentType: 'text',
          action: {
            type: constants.DYNAMIC,
            action: constants.GET_NEW_CHECKOUT_ZIP_CODE,
            input: true,
            argument
          },
          specialKeys: {
            [constants.HOME_KEY]: { type: constants.DYNAMIC, action: constants.SHOW_MAIN_MENU }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    messageBlock.payload[0].text += `\n\n${botUtils.specialKeyText(constants.HOME_KEY)} `
    return messageBlock
  } catch (err) {
    logger.serverLog(TAG, `Unable to input zip code ${err} `, 'error')
    throw new Error(`${constants.ERROR_INDICATOR}Unable to input zip code`)
  }
}

exports.getNewCheckoutStreetAddressBlock = async (chatbot, contact, argument, userInput) => {
  try {
    if (userInput && argument.address) {
      argument.address.address1 = userInput
      argument.updatingAddress = true
      return getCheckoutInfoBlock(chatbot, contact, contact.lastMessageSentByBot.uniqueId, argument)
      // return updatedAddressBlockedMessage(chatbot, contact, argument)
    } else {
      throw new Error(`${constants.ERROR_INDICATOR} Unable to input street address for update`)
    }
  } catch (err) {
    logger.serverLog(TAG, `Unable to input street address for update ${err} `, 'error')
    throw new Error(`${constants.ERROR_INDICATOR}Unable to input street address for update`)
  }
}

exports.getNewCheckoutCityBlock = async (chatbot, contact, argument, userInput) => {
  try {
    if (userInput && argument.address) {
      argument.address.city = userInput
      argument.updatingAddress = true
      return getCheckoutInfoBlock(chatbot, contact, contact.lastMessageSentByBot.uniqueId, argument)
      // return updatedAddressBlockedMessage(chatbot, contact, argument)
    } else {
      throw new Error(`${constants.ERROR_INDICATOR} Unable to input city for update`)
    }
  } catch (err) {
    logger.serverLog(TAG, `Unable to input city for update ${err} `, 'error')
    throw new Error(`${constants.ERROR_INDICATOR}Unable to input city for update`)
  }
}

exports.getNewCheckoutCountryBlock = async (chatbot, contact, argument, userInput) => {
  try {
    if (userInput && argument.address) {
      argument.address.country = userInput
      argument.updatingAddress = true
      return getCheckoutInfoBlock(chatbot, contact, contact.lastMessageSentByBot.uniqueId, argument)
      // return updatedAddressBlockedMessage(chatbot, contact, argument)
    } else {
      throw new Error(`${constants.ERROR_INDICATOR} Unable to input country for update`)
    }
  } catch (err) {
    logger.serverLog(TAG, `Unable to input country for update ${err} `, 'error')
    throw new Error(`${constants.ERROR_INDICATOR}Unable to input country for update`)
  }
}

exports.getNewCheckoutZipCodeBlock = async (chatbot, contact, argument, userInput) => {
  try {
    if (userInput && argument.address) {
      argument.address.zip = userInput
      argument.updatingAddress = true
      return getCheckoutInfoBlock(chatbot, contact, contact.lastMessageSentByBot.uniqueId, argument)
      // return updatedAddressBlockedMessage(chatbot, contact, argument)
    } else {
      throw new Error(`${constants.ERROR_INDICATOR} Unable to input zip for update`)
    }
  } catch (err) {
    logger.serverLog(TAG, `Unable to input zip for update ${err} `, 'error')
    throw new Error(`${constants.ERROR_INDICATOR}Unable to input zip for update`)
  }
}

exports.getAskPaymentMethodBlock = async (chatbot, contact, newEmail) => {
  let userError = false
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'sms_commerce_chatbot'
      },
      title: 'Ask Payment Method',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: dedent(`Please select a payment method:\n
                        ${convertToEmoji(0)} Cash on Delivery
                        ${convertToEmoji(1)} Electronic Payment\n
                        ${botUtils.specialKeyText(constants.SHOW_CART_KEY)}
                        ${botUtils.specialKeyText(constants.HOME_KEY)}`),
          componentType: 'text',
          menu: [
            { type: constants.DYNAMIC, action: constants.GET_CHECKOUT_INFO, argument: {paymentMethod: 'cod'} },
            { type: constants.DYNAMIC, action: constants.GET_CHECKOUT_INFO, argument: {paymentMethod: 'e-payment'} }
          ],
          specialKeys: {
            [constants.SHOW_CART_KEY]: { type: constants.DYNAMIC, action: constants.SHOW_MY_CART },
            [constants.HOME_KEY]: { type: constants.DYNAMIC, action: constants.SHOW_MAIN_MENU }
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
      throw new Error(`${constants.ERROR_INDICATOR}${err.message}`)
    } else {
      throw new Error(`${constants.ERROR_INDICATOR}Unable to select payment method`)
    }
  }
}

exports.getTalkToAgentBlock = (chatbot, contact) => {
  try {
    const messageBlock = {
      module: {
        id: chatbot._id,
        type: 'sms_commerce_chatbot'
      },
      title: 'Talk to Agent',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Our support agents have been notified and will get back to you shortly.`,
          componentType: 'text'
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    const message = `${contact.name} requested to talk to a customer support agent`
    sendNotification(contact, message, chatbot.companyId)
    botUtils.updateSmsContact({ _id: contact._id }, { chatbotPaused: true }, null, {})
    return messageBlock
  } catch (err) {
    const message = err || 'Unable get talk to agent message block'
    logger.serverLog(message, `${TAG}: getTalkToAgentBlock`, {}, {chatbot, contact}, 'error')
    throw new Error(`${constants.ERROR_INDICATOR}Unable to notify customer support agent`)
  }
}

exports.getAskUnpauseChatbotBlock = (chatbot, contact) => {
  try {
    const messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_commerce_chatbot'
      },
      title: 'Ask Unpause Chatbot',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Do you want to unpause the chatbot and cancel the customer support agent request?`,
          componentType: 'text',
          specialKeys: {
            'y': { type: constants.DYNAMIC, action: constants.UNPAUSE_CHATBOT },
            'yes': { type: constants.DYNAMIC, action: constants.UNPAUSE_CHATBOT },
            'n': { type: constants.DYNAMIC, action: constants.TALK_TO_AGENT },
            'no': { type: constants.DYNAMIC, action: constants.TALK_TO_AGENT }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    messageBlock.payload[0].text += `\n\nSend 'Y' for Yes, unpause the chatbot`
    messageBlock.payload[0].text += `\nSend 'N' for No, wait for agent`
    return messageBlock
  } catch (err) {
    const message = err || 'Unable to request for unpause chatbot'
    logger.serverLog(message, `${TAG}: getAskUnpauseChatbotBlock`, {}, {chatbot, contact}, 'error')
    throw new Error(`${constants.ERROR_INDICATOR}Unable to request for unpause chatbot`)
  }
}

exports.getViewCatalogBlock = (chatbot, contact) => {
  try {
    const messageBlock = {
      module: {
        id: chatbot._id,
        type: 'sms_commerce_chatbot'
      },
      title: 'View Catalog',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: ``,
          componentType: 'text',
          specialKeys: {
            [constants.HOME_KEY]: { type: constants.DYNAMIC, action: constants.SHOW_MAIN_MENU },
            [constants.ORDER_STATUS_KEY]: { type: constants.DYNAMIC, action: constants.SHOW_MAIN_MENU }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }

    if (chatbot.catalog && chatbot.catalog.url) {
      messageBlock.payload[0].text += `Here is our catalog. Please wait a moment for it to send.`
      messageBlock.payload.push({
        componentType: 'file',
        fileurl: {
          url: chatbot.catalog.url
        },
        fileName: chatbot.catalog.name
      })
    } else {
      messageBlock.payload[0].text += `No catalog currently available.`
    }
    messageBlock.payload[0].text += `\n\n${botUtils.specialKeyText(constants.HOME_KEY)}`
    return messageBlock
  } catch (err) {
    const message = err || 'Unable get catalog message block'
    logger.serverLog(message, `${TAG}: getViewCatalogBlock`, {}, {chatbot, contact}, 'error')
    throw new Error(`${constants.ERROR_INDICATOR}Unable to notify customer support agent`)
  }
}

exports.getInvoiceBlock = async (chatbot, contact, EcommerceProvider, orderId) => {
  let userError = false
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'sms_commerce_chatbot'
      },
      title: 'Order Invoice',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Here is your invoice for order #${orderId}:`,
          componentType: 'text',
          specialKeys: {
            [constants.HOME_KEY]: { type: constants.DYNAMIC, action: constants.SHOW_MAIN_MENU },
            [constants.BACK_KEY]: { type: constants.DYNAMIC, action: constants.GO_BACK }
          }
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
    messageBlock.payload[0].text += `\n\n${botUtils.specialKeyText(constants.BACK_KEY)}`
    messageBlock.payload[0].text += `\n${botUtils.specialKeyText(constants.HOME_KEY)}`
    messageBlock.payload.push(invoiceComponent)

    return messageBlock
  } catch (err) {
    if (!userError) {
      const message = err || 'Unable to get order status'
      logger.serverLog(message, `${TAG}: getInvoiceBlock`, {}, {}, 'error')
    }
    if (err && err.message) {
      throw new Error(`${constants.ERROR_INDICATOR}${err.message}`)
    } else {
      throw new Error(`${constants.ERROR_INDICATOR}Unable to get order status.`)
    }
  }
}

exports.getShowMyCartBlock = getShowMyCartBlock
exports.getSelectProductBlock = getSelectProductBlock
exports.getQuantityToUpdateBlock = getQuantityToUpdateBlock
exports.getEmailOtpBlock = getEmailOtpBlock
exports.getCheckoutInfoBlock = getCheckoutInfoBlock
