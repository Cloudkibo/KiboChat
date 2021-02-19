const shopifyDataLayer = require('../api/v1.1/shopify/shopify.datalayer')
const bigcommerceDataLayer = require('../api/v1.1/bigcommerce/bigcommerce.datalayer')
const EcommerceProvider = require('../api/v1.1/ecommerceProvidersApiLayer/EcommerceProvidersApiLayer.js')
const logger = require('../components/logger')
const TAG = '/chatbotTemplates/logiclayer.js'
const { callApi } = require('../api/v1.1/utility')

async function initializeProvider (chatbot) {
  return new Promise(async (resolve, reject) => {
    let provider = ''
    let integration = null
    try {
      switch (chatbot.storeType) {
        case 'shopify':
          integration = await shopifyDataLayer.findOneShopifyIntegration({ companyId: chatbot.companyId })
          provider = new EcommerceProvider('shopify', {
            shopUrl: integration.shopUrl,
            shopToken: integration.shopToken
          })
          break
        case 'shopify-nlp':
          integration = await shopifyDataLayer.findOneShopifyIntegration({ companyId: chatbot.companyId })
          provider = new EcommerceProvider('shopify', {
            shopUrl: integration.shopUrl,
            shopToken: integration.shopToken
          })
          break
        case 'bigcommerce':
          provider = await bigcommerceDataLayer.findOneBigCommerceIntegration({ companyId: chatbot.companyId })
          provider = new EcommerceProvider('bigcommerce', {
            shopToken: integration.shopToken,
            storeHash: integration.payload.context
          })
          break
        default:
      }
      resolve(provider)
    } catch (err) {
      reject(err)
    }
  })
}

exports.setShoppingCart = function (subscriber, selectedOption, storeInfo, channel) {
  return new Promise((resolve, reject) => {
    let cart = subscriber.shoppingCart || []
    const itemIndex = cart.findIndex((item) => item.product_id === selectedOption.id)
    if (itemIndex >= 0) {
      const quantity = Number(cart[itemIndex].quantity) + Number(selectedOption.quantity || 1)
      cart[itemIndex] = {
        ...cart[itemIndex],
        quantity,
        price: Number(cart[itemIndex].price) * quantity
      }
    } else {
      cart.push({
        product_id: selectedOption.id,
        quantity: selectedOption.quantity || 1,
        product: selectedOption.productName,
        inventory_quantity: selectedOption.stock,
        price: Number(selectedOption.price) * Number(selectedOption.quantity || 1),
        currency: storeInfo.currency,
        image: selectedOption.image
      })
    }

    let commerceCustomer = subscriber.commerceCustomer
    if (commerceCustomer) commerceCustomer.cartId = null
    const path = channel === 'whatsApp' ? 'whatsAppContacts' : 'subscribers'
    updateSubscriber(
      `${path}/update`,
      {
        query: {_id: subscriber._id},
        newPayload: {shoppingCart: cart, commerceCustomer},
        options: {}
      }
    )

    resolve(cart)
  })
}

exports.clearShoppingCart = function (subscriber, channel) {
  let commerceCustomer = subscriber.commerceCustomer
  if (commerceCustomer) commerceCustomer.cartId = null
  const path = channel === 'whatsApp' ? 'whatsAppContacts' : 'subscribers'
  updateSubscriber(
    `${path}/update`,
    {
      query: {_id: subscriber._id},
      newPayload: {shoppingCart: [], commerceCustomer},
      options: {}
    }
  )
}

exports.updateShoppingCartItem = function (subscriber, quantity, channel) {
  const lastMessage = subscriber.lastMessageSentByBot
  let cart = subscriber.shoppingCart || []
  const index = cart.findIndex((item) => item.product_id === lastMessage.selectedProduct)
  if (index >= 0) {
    cart[index].quantity = quantity
  }
  let commerceCustomer = subscriber.commerceCustomer
  if (commerceCustomer) commerceCustomer.cartId = null
  const path = channel === 'whatsApp' ? 'whatsAppContacts' : 'subscribers'
  updateSubscriber(
    `${path}/update`,
    {
      query: {_id: subscriber._id},
      newPayload: {shoppingCart: cart, commerceCustomer},
      options: {}
    }
  )
}

exports.removeShoppingCartItem = function (subscriber, selectedOption, channel) {
  let cart = subscriber.shoppingCart || []

  const index = cart.findIndex((item) => item.product_id === selectedOption.id)
  if (index >= 0) {
    cart.splice(index, 1)
  }

  let commerceCustomer = subscriber.commerceCustomer
  if (commerceCustomer) commerceCustomer.cartId = null
  const path = channel === 'whatsApp' ? 'whatsAppContacts' : 'subscribers'
  updateSubscriber(
    `${path}/update`,
    {
      query: {_id: subscriber._id},
      newPayload: {shoppingCart: cart, commerceCustomer},
      options: {}
    }
  )
}

exports.getCustomerInfo = function (subscriber, chatbot) {
  let customer = subscriber.commerceCustomer
  if (['shopify', 'shopify-nlp'].includes(chatbot.storeType)) {
    customer = subscriber.commerceCustomerShopify
  }
  return customer
}

exports.getSelectedPaymentMethod = function (subscriber, selectedOption) {
  let paymentMethod = selectedOption.paymentMethod
  if (!paymentMethod) {
    const lastMessage = subscriber.lastMessageSentByBot
    paymentMethod = lastMessage.paymentMethod
  }
  return paymentMethod
}

exports.completeAddress = function (address) {
  if (address && address.address1 && address.city && address.zip && address.country) {
    return true
  } else {
    return false
  }
}

exports.showCheckoutInfo = function (automationResponse, paymentMethod, customer) {
  const address = customer.defaultAddress
  automationResponse.text = automationResponse.text.replace('__checkoutInfo__', () => {
    let text = `*Email*: ${customer.email}`
    if (paymentMethod === 'cod') {
      text = `${text}\n\n*Address*: ${address.address1}, ${address.city} ${address.zip}, ${address.country}`
    }
    return text
  })
  if (paymentMethod === 'epayment') {
    automationResponse.options = automationResponse.options.filter((item) => item.event !== 'ask-address')
  }
  return automationResponse
}

exports.getValidateResponse = function (automationResponse, type) {
  automationResponse.options = []
  automationResponse.validateUserInput = true
  switch (type) {
    case 'email':
      automationResponse.validationCriteria = { type: 'email' }
      break
    case 'address':
      automationResponse.validationCriteria = { type: 'address' }
      break
    case 'city':
      automationResponse.validationCriteria = { type: 'city' }
      break
    case 'zip':
      automationResponse.validationCriteria = { type: 'zip' }
      break
    case 'country':
      automationResponse.validationCriteria = { type: 'country' }
      break
    default:
  }
  return automationResponse
}

exports.processCustomerEmail = async function (email, subscriber, chatbot, channel) {
  const Provider = await initializeProvider(chatbot)
  let path = ''
  let firstName = ''
  let lastName = ''
  switch (channel) {
    case 'whatsApp':
      const names = subscriber.name.split(' ')
      firstName = names[0]
      lastName = names[1] ? names[1] : names[0]
      path = 'whatsAppContacts'
      break
    case 'messenger':
      firstName = subscriber.firstName
      lastName = subscriber.lastName
      path = 'subscribers'
      break
    default:
  }
  let customer = await Provider.searchCustomerUsingEmail(email)
  if (customer.length === 0) {
    customer = await Provider.createCustomer(firstName, lastName, email)
  } else {
    customer = customer[0]
  }
  customer.provider = ['shopify', 'shopify-nlp'].includes(chatbot.storeType) ? 'shopify' : chatbot.storeType

  let updatePayload = {}
  if (['shopify', 'shopify-nlp'].includes(chatbot.storeType)) {
    updatePayload.commerceCustomerShopify = customer
  } else {
    updatePayload.commerceCustomer = customer
  }
  updateSubscriber(
    `${path}/update`,
    {
      query: {_id: subscriber._id},
      newPayload: updatePayload,
      options: {}
    }
  )
}

exports.processCustomerAddress = function (subscriber, chatbot, key, value, channel) {
  let customer = null
  if (['shopify', 'shopify-nlp'].includes(chatbot.storeType)) {
    customer = subscriber.commerceCustomerShopify
    customer.defaultAddress = customer.defaultAddress || {}
    customer.defaultAddress[key] = value
    const path = channel === 'whatsApp' ? 'whatsAppContacts' : 'subscribers'
    updateSubscriber(
      `${path}/update`,
      {
        query: {_id: subscriber._id},
        newPayload: {commerceCustomerShopify: customer},
        options: {}
      }
    )
  }
}

function updateSubscriber (path, data) {
  callApi(path, 'put', data)
    .then(updated => {
    })
    .catch(error => {
      const message = error || 'Failed to update subscriber'
      logger.serverLog(message, `${TAG}: updateSubscriber`, {}, {path, data}, 'error')
    })
}

exports.initializeProvider = initializeProvider
exports.updateSubscriber = updateSubscriber
