const constants = require('../whatsAppChatbot/constants')
const { convertToEmoji } = require('../whatsAppChatbot/whatsAppChatbot.logiclayer')
const dedent = require('dedent-js')
const { updateContact } = require('./commerceChatbot.controller')
const logger = require('../../../components/logger')
const TAG = 'api/v1️.1/configureChatbot/commerceChatbot.logiclayer.js'

function specialKeyText (key) {
  switch (key) {
    case constants.TALK_TO_AGENT_KEY:
      return `*${key.toUpperCase()}*  Talk to a customer support agent`
    case constants.FAQS_KEY:
      return `*${key.toUpperCase()}*  View FAQs`
    case constants.SHOW_CART_KEY:
      return `*${key.toUpperCase()}*  View your cart`
    case constants.ORDER_STATUS_KEY:
      return `*${key.toUpperCase()}*  Check order status`
    case constants.BACK_KEY:
      return `*${key.toUpperCase()}*  Go back`
    case constants.HOME_KEY:
      return `*${key.toUpperCase()}*  Go home`
  }
}

exports.getCheckoutBlock = function () {

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
                                            ${convertToEmoji(0)} Remove an item
                                            ${convertToEmoji(1)} Update quantity for an item
                                            ${convertToEmoji(2)} Clear cart
                                            ${convertToEmoji(3)} Proceed to Checkout`)

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
    messageBlock.payload[0].text += `\n\n${specialKeyText(constants.BACK_KEY)}`
    messageBlock.payload[0].text += `\n${specialKeyText(constants.HOME_KEY)}`
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
    updateContact({ _id: contact._id }, { shoppingCart, commerceCustomer: contact.commerceCustomer }, null, {})
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

  messageBlock.payload[0].text += `\n\n${specialKeyText(constants.HOME_KEY)}`
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
  ${specialKeyText(constants.HOME_KEY)} `),
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
    updateContact({ _id: contact._id }, { shoppingCart, commerceCustomer: contact.commerceCustomer }, null, {})
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
  await updateContact({ _id: contact._id }, { shoppingCart, commerceCustomer: contact.commerceCustomer }, null, {})
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

    messageBlock.payload[0].text += `\n\n${specialKeyText(constants.BACK_KEY)}`
    messageBlock.payload[0].text += `\n${specialKeyText(constants.HOME_KEY)}`

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
            [constants.HOME_KEY]: { type: constants.DYNAMIC, action: SHOW_MAIN_MENU }
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
    messageBlock.payload[0].text += `\n\n${specialKeyText(constants.SHOW_CART_KEY)} `
    messageBlock.payload[0].text += `\n${specialKeyText(constants.BACK_KEY)} `
    messageBlock.payload[0].text += `\n${specialKeyText(constants.HOME_KEY)} `
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

exports.getShowMyCartBlock = getShowMyCartBlock
