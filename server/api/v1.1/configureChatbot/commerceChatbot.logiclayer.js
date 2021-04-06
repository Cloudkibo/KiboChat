const messageBlockDataLayer = require('../messageBlock/messageBlock.datalayer')
const constants = require('../whatsAppChatbot/constants')
const commerceConstants = require('../ecommerceProvidersApiLayer/constants')
const botUtils = require('./commerceChatbot.utils')
const logger = require('../../../components/logger')
const TAG = 'api/v1️.1/configureChatbot/commerceChatbot.logiclayer.js'

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
            [constants.HOME_KEY]: { type: constants.STATIC, blockId: chatbot.startingBlockId }
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
