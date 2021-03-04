const shopifyDataLayer = require('../api/v1.1/shopify/shopify.datalayer')
const bigcommerceDataLayer = require('../api/v1.1/bigcommerce/bigcommerce.datalayer')
const EcommerceProvider = require('../api/v1.1/ecommerceProvidersApiLayer/EcommerceProvidersApiLayer.js')
const logger = require('../components/logger')
const TAG = '/chatbotTemplates/logiclayer.js'
const { callApi } = require('../api/v1.1/utility')
const pdf = require('pdf-creator-node')
const fs = require('fs')
const path = require('path')
const config = require('../config/environment/index')

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

exports.findFaqTopics = function (automationResponse, chatbot) {
  let options = []
  if (chatbot.faqs && chatbot.faqs.length > 0) {
    for (let i = 0; i < chatbot.faqs.length; i++) {
      const topic = chatbot.faqs[i].topic
      options[i] = {
        code: `${i}`,
        label: topic,
        event: automationResponse.event,
        id: topic
      }
    }
    automationResponse.options = options
  } else {
    automationResponse.text += `Please contact our support agents for any questions you have.`
  }
  return automationResponse
}

exports.proceedToCheckout = function (Provider, automationResponse, selectedOption, subscriber, chatbot, channel) {
  return new Promise(async (resolve, reject) => {
    try {
      const customer = getCustomerInfo(subscriber, chatbot)
      const address = customer.defaultAddress
      const paymentMethod = getSelectedPaymentMethod(subscriber, selectedOption)
      let shoppingCart = subscriber.shoppingCart
      shoppingCart = shoppingCart.map((item) => {
        return {...item, variant_id: item.product_id}
      })
      let text = ''
      let gallery = null
      if (paymentMethod === 'cod') {
        if (['shopify', 'shopify-nlp'].includes(chatbot.storeType)) {
          const cart = shoppingCart.map((item) => {
            return {
              variant_id: item.variant_id + '',
              quantity: item.quantity
            }
          })
          const order = await Provider.createTestOrder(
            {id: customer.id + ''},
            cart,
            {
              first_name: customer.first_name,
              last_name: customer.last_name,
              ...address
            }
          )
          if (order) {
            const storeInfo = await Provider.fetchStoreInfo()
            const orderId = order.name.replace('#', '')
            customer.lastOrder = orderId

            text = `Thank you for shopping at ${storeInfo.name}. We have received your order. Please note the order number given below to track your order:\n\n`
            text = `${text}*${orderId}*\n\n`
            text = `${text}Here is your complete order:`

            let total = 0
            shoppingCart.forEach((item, i) => {
              total = total + Number((Number(item.quantity) * Number(item.price)).toFixed(2))
              if (channel === 'whatsApp') {
                text = `${text}\n\n*Item*: ${item.product}`
                text = `${text}\n*Quantity*: ${item.quantity}`
                text = `${text}\n*Price*: ${item.price} ${item.currency}`
              }
            })
            text = `${text}\n\n*Total Price*: ${total} ${shoppingCart[0].currency}`
            text = `${text}\n\n*Address*: ${address.address1}, ${address.city} ${address.zip}, ${address.country}`

            gallery = []
            if (channel === 'whatsApp') {
              shoppingCart.forEach((item, i) => {
                gallery.push({
                  title: item.product,
                  subtitle: `${item.product}\nPrice: ${item.price} ${storeInfo.currency}`,
                  image: item.image
                })
              })
            } else if (channel === 'messenger') {
              let ptotal = 0
              shoppingCart.forEach((item, i) => {
                ptotal = Number((Number(item.quantity) * Number(item.price)).toFixed(2))
                gallery.push({
                  title: item.product,
                  subtitle: `Price: ${item.price} ${storeInfo.currency}\nQuantity: ${item.quantity}\nTotal Price: ${ptotal} ${storeInfo.currency}`,
                  image: item.image
                })
              })
            }

            automationResponse.otherOptions.unshift({
              event: 'pdf-invoice',
              label: 'Get pdf invoice',
              code: 'I'
            })
          } else {
            text = 'Unable to proceed to checkout. Please try again later.'
            reject(new Error('Unable to create shopify test order'))
          }
        } else {
          text = `Cash on delivery is currently not supported for this store`
        }
      } else if (paymentMethod === 'epayment') {
        let checkoutLink = ''
        text = `Here is your checkout link:`
        if (['shopify', 'shopify-nlp'].includes(chatbot.storeType)) {
          checkoutLink = await Provider.createPermalinkForCart(customer, shoppingCart)
        } else if (chatbot.storeType === 'bigcommerce') {
          const bigcommerceCart = await Provider.createCart(customer.id, shoppingCart)
          checkoutLink = await Provider.createPermalinkForCartBigCommerce(bigcommerceCart.id)
          checkoutLink = checkoutLink.data.cart_url
        }

        if (checkoutLink) {
          text = `${text}\n\n${checkoutLink} `
        } else {
          text = 'Unable to proceed to checkout. Please try again later.'
          reject(new Error('Unable to generate checkout link'))
        }
      }
      automationResponse.text = text

      let updatePayload = { shoppingCart: [] }
      if (['shopify', 'shopify-nlp'].includes(chatbot.storeType)) {
        updatePayload.commerceCustomerShopify = customer
      } else {
        updatePayload.commerceCustomer = customer
      }
      updateSubscriber(
        'subscribers/update',
        {
          query: {_id: subscriber._id},
          newPayload: updatePayload,
          options: {}
        }
      )

      resolve({...automationResponse, gallery})
    } catch (err) { reject(err) }
  })
}

exports.getPdfInvoice = function (Provider, storeInfo, automationResponse, subscriber) {
  return new Promise(async (resolve, reject) => {
    try {
      const orderId = subscriber.commerceCustomerShopify.lastOrder
      let orderStatus = await Provider.checkOrderStatus(Number(orderId))

      let attempts = 0
      const maxAttempts = 10
      while (!orderStatus && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        orderStatus = await Provider.checkOrderStatus(Number(orderId))
        attempts++
      }

      let text = ''
      if (!orderStatus) {
        text = 'Unable to generate pdf invoice. Please try again later.'
        reject(new Error('Unable to check the order status.'))
      } else {
        text = `Here is your pdf invoice for ${orderId}:`
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
      } else if (subscriber.commerceCustomerShopify && subscriber.commerceCustomerShopify.defaultAddress) {
        shippingAddress = subscriber.commerceCustomerShopify.defaultAddress
      }

      if (orderStatus.billingAddress) {
        billingAddress = orderStatus.billingAddress
      }

      automationResponse.text = text
      automationResponse.pdfInvoice = await generateInvoice(storeInfo, {
        id: orderId,
        date: new Date(orderStatus.createdAt).toLocaleString(),
        customer: orderStatus.customer,
        shippingAddress,
        billingAddress,
        items: shoppingCart,
        totalPrice: totalOrderPriceString
      })

      resolve(automationResponse)
    } catch (err) { reject(err) }
  })
}

exports.viewCatalog = function (automationResponse, chatbot) {
  if (chatbot.botLinks.catalogUrl) {
    automationResponse.payload = {
      componentType: 'file',
      fileurl: {
        url: chatbot.botLinks.catalogUrl
      },
      fileName: `catalog.pdf`
    }
  } else {
    automationResponse.text = 'No catalog currently available!'
  }
  return automationResponse
}

exports.cancelOrder = function (Provider, automationResponse, selectedOption, chatbot) {
  return new Promise(async (resolve, reject) => {
    try {
      let text = chatbot.cancelOrderMessage || ''
      let { orderId, id } = selectedOption
      id = id.split('//')[1].split('/')[2]
      if (!selectedOption.isOrderFulFilled) {
        const orderStatus = await Provider.checkOrderStatus(Number(orderId))
        let tags = orderStatus.tags || []
        tags.push('cancel-request')
        const cancelResponse = await Provider.updateOrderTag(id, tags.join())
        if (cancelResponse.status === 'success') {
          text = text.replace('__orderId__', orderId)
          text = text.replace('{{orderId}}', orderId)
        } else {
          text = `Failed to send cancel request for your order. For further details please talk to an agent.`
          automationResponse.otherOptions = [{
            event: 'talk-to-agent',
            label: 'Talk to support agent',
            code: 'T'
          }]
        }
      } else {
        text = `Your order cannot be canceled as it has been shipped. For further details please talk to an agent.`
        automationResponse.otherOptions = [{
          event: 'talk-to-agent',
          label: 'Talk to support agent',
          code: 'T'
        }]
      }
      resolve({...automationResponse, text})
    } catch (err) { reject(err) }
  })
}

function getCustomerInfo (subscriber, chatbot) {
  let customer = subscriber.commerceCustomer
  if (['shopify', 'shopify-nlp'].includes(chatbot.storeType)) {
    customer = subscriber.commerceCustomerShopify
  }
  return customer
}

function getSelectedPaymentMethod (subscriber, selectedOption) {
  let paymentMethod = selectedOption.paymentMethod
  if (!paymentMethod) {
    const lastMessage = subscriber.lastMessageSentByBot
    paymentMethod = lastMessage.paymentMethod
  }
  return paymentMethod
}

async function generateInvoice (storeInfo, order) {
  const html = fs.readFileSync(path.join(__dirname, '../api/v1.1/chatbots/invoice_template.html'), 'utf8')
  const options = {
    format: 'A3',
    orientation: 'portrait',
    border: '10mm'
  }
  const document = {
    html: html,
    data: {
      shopName: storeInfo.name,
      orderId: order.id,
      date: order.date,
      customer: order.customer,
      shippingAddress: order.shippingAddress,
      billingAddress: order.billingAddress,
      items: order.items,
      totalPrice: order.totalPrice
    },
    path: `./invoices/${storeInfo.id}/order${order.id}.pdf`
  }
  await pdf.create(document, options)
  return {
    componentType: 'file',
    fileurl: {
      url: `${config.domain}/invoices/${storeInfo.id}/order${order.id}.pdf`
    },
    fileName: `order${order.id}.pdf`
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
exports.getCustomerInfo = getCustomerInfo
exports.getSelectedPaymentMethod = getSelectedPaymentMethod
exports.updateSubscriber = updateSubscriber
