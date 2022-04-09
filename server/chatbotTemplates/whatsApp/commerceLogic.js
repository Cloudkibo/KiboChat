const { convertToEmoji } = require('./utility')
const { truncate } = require('../../components/utility')
const {
  setShoppingCart,
  getCustomerInfo,
  getSelectedPaymentMethod,
  completeAddress,
  showCheckoutInfo,
  getValidateResponse,
  initializeProvider,
  findFaqTopics,
  findFaqTopicQuestions,
  findFaqQuestionAnswer,
  proceedToCheckout,
  getPdfInvoice,
  viewCatalog,
  cancelOrder
} = require('../logiclayer')
const { sendNotification } = require('../../api/v1.1/whatsAppChatbot/whatsAppChatbot.logiclayer')

exports.callApi = function (automationResponse, selectedOption, chatbot, subscriber) {
  return new Promise(async (resolve, reject) => {
    try {
      selectedOption = selectedOption || {}
      const Provider = await initializeProvider(chatbot)
      let response = {}
      let items = []
      let storeInfo = {}
      switch (automationResponse.API) {
        case 'PRODUCT_CATEGORIES':
          items = await Provider.fetchAllProductCategories(automationResponse.nextPage)
          response = await getResponse(items, null, automationResponse, null, false)
          break
        case 'CATEGORY_PRODUCTS':
          storeInfo = await Provider.fetchStoreInfo()
          items = await Provider.fetchProductsInThisCategory(selectedOption.id, automationResponse.nextPage, chatbot.numberOfProducts)
          response = await getResponse(items, storeInfo, automationResponse, selectedOption, true)
          break
        case 'PRODUCTS_ONSALE':
          storeInfo = await Provider.fetchStoreInfo()
          items = await Provider.fetchProducts(automationResponse.nextPage, chatbot.numberOfProducts)
          response = await getResponse(items, storeInfo, automationResponse, null, true)
          break
        case 'SEARCH_PRODUCTS':
          storeInfo = await Provider.fetchStoreInfo()
          items = await Provider.searchProducts(selectedOption.userInput)
          response = await getResponse(items, storeInfo, automationResponse, null, true)
          break
        case 'PRODUCT_VARIANTS':
          response = await getProductVariants(Provider, automationResponse, selectedOption, chatbot, subscriber)
          break
        case 'VIEW_CART':
          storeInfo = await Provider.fetchStoreInfo()
          response = await showCart(automationResponse, storeInfo, selectedOption, subscriber)
          break
        case 'CART_OPTIONS':
          items = subscriber.shoppingCart || []
          items = items.map((item) => {
            return {
              ...item,
              name: item.product,
              id: item.product_id
            }
          })
          if (items.length === 1) {
            storeInfo = await Provider.fetchStoreInfo()
            automationResponse = await require('../kiboAutomation.layer.js').callKiboAutomation(automationResponse.event, chatbot, subscriber, true)
            automationResponse.options = automationResponse.options || []
            selectedOption = {
              label: items[0].name,
              price: items[0].price,
              image: items[0].image,
              event: automationResponse.event,
              id: items[0].id,
              stock: items[0].inventory_quantity
            }
            response = await getPurchaseResponse(automationResponse, storeInfo, selectedOption, subscriber)
          } else {
            response = await getResponse(items, null, automationResponse, null, false)
          }
          break
        case 'GET_CHECKOUT_INFO':
          response = getCheckoutInfo(automationResponse, selectedOption, subscriber, chatbot)
          break
        case 'VALIDATE_EMAIL':
          response = getValidateResponse(automationResponse, 'email')
          break
        case 'VALIDATE_ADDRESS':
          response = getValidateResponse(automationResponse, 'address')
          break
        case 'VALIDATE_CITY':
          response = getValidateResponse(automationResponse, 'city')
          break
        case 'VALIDATE_ZIP':
          response = getValidateResponse(automationResponse, 'zip')
          break
        case 'VALIDATE_COUNTRY':
          response = getValidateResponse(automationResponse, 'country')
          break
        case 'CHECKOUT':
          response = await proceedToCheckout(Provider, automationResponse, selectedOption, subscriber, chatbot, 'whatsApp')
          break
        case 'GET_PDF_INVOICE':
          storeInfo = await Provider.fetchStoreInfo()
          response = await getPdfInvoice(Provider, storeInfo, automationResponse, subscriber)
          break
        case 'GET_RECENT_ORDERS':
          response = await getRecentOrders(Provider, automationResponse, subscriber, chatbot)
          break
        case 'FETCH_ORDER':
          response = await fetchOrder(Provider, automationResponse, selectedOption, chatbot)
          break
        case 'VIEW_CATALOG':
          response = await viewCatalog(automationResponse, chatbot)
          break
        case 'GET_SHOW_FAQ_TOPICS':
          response = findFaqTopics(automationResponse, chatbot)
          break
        case 'GET_FAQ_TOPIC-QUESTIONS':
          response = findFaqTopicQuestions(automationResponse, selectedOption, chatbot)
          break
        case 'GET_FAQ_QUESTION_ANSWER':
          response = findFaqQuestionAnswer(automationResponse, selectedOption, chatbot)
          break
        case 'CANCEL_ORDER':
          response = await cancelOrder(Provider, automationResponse, selectedOption, chatbot)
          break
        case 'RETURN_ORDER':
          response = await returnOrder(automationResponse, selectedOption, chatbot, subscriber)
          break
        default:
          storeInfo = await Provider.fetchStoreInfo()
          if (selectedOption.event === 'set-cart') {
            subscriber.shoppingCart = await setShoppingCart(subscriber, selectedOption, storeInfo, 'whatsApp')
            response = await showCart(automationResponse, storeInfo, selectedOption, subscriber)
          } else {
            automationResponse.options = automationResponse.options || []
            response = getPurchaseResponse(automationResponse, storeInfo, selectedOption, subscriber)
          }
      }
      resolve(response)
    } catch (err) {
      reject(err)
    }
  })
}

async function getResponse (items, storeInfo, automationResponse, selectedOption, appendGallery) {
  return new Promise(async (resolve, reject) => {
    try {
      let viewMore = null
      if (items && items.length > 0) {
        // next page
        if (items.nextPageParameters) {
          viewMore = {
            code: `${items.length}`,
            label: 'View More...',
            event: '__viewmore',
            id: selectedOption ? selectedOption.id : '',
            nextPage: items.nextPageParameters,
            API: automationResponse.API
          }
        }

        // options
        let options = items.map((item, i) => {
          return {
            code: `${i}`,
            label: item.name,
            price: item.price,
            image: item.image,
            event: automationResponse.event,
            id: item.id,
            stock: item.inventory_quantity,
            productName: item.productName
          }
        })
        if (viewMore) {
          options.push(viewMore)
        }

        // gallery
        let gallery = null
        if (appendGallery) {
          gallery = items.map((item, i) => {
            return {
              title: item.name,
              subtitle: `${convertToEmoji(i)} ${item.name}\nPrice: ${item.price} ${storeInfo.currency}`,
              image: item.image
            }
          })
        }

        resolve({options, gallery})
      } else {
        resolve({options: 'PRODUCTS_NOT_FOUND'})
      }
    } catch (err) {
      reject(err)
    }
  })
}

function getProductVariants (Provider, automationResponse, selectedOption, chatbot, subscriber) {
  return new Promise(async (resolve, reject) => {
    try {
      let response = null
      const storeInfo = await Provider.fetchStoreInfo()
      let productVariants = await Provider.getVariantsOfSelectedProduct(selectedOption.id, chatbot.numberOfProducts)
      if (productVariants.length === 1) {
        automationResponse = await require('../kiboAutomation.layer.js').callKiboAutomation(automationResponse.event, chatbot, subscriber, true)
        selectedOption.stock = productVariants[0].inventory_quantity
        selectedOption.productName = selectedOption.label
        selectedOption.id = productVariants[0].id
        response = getPurchaseResponse(automationResponse, storeInfo, selectedOption, subscriber)
      } else {
        productVariants = productVariants.map((item) => {
          const price = item.price || selectedOption.price
          return {
            ...item,
            name: `${item.name} (price: ${price} ${storeInfo.currency})`,
            productName: `${item.name} ${selectedOption.label}`
          }
        })
        response = await getResponse(productVariants, storeInfo, automationResponse, selectedOption, true)
        response.text = prepareText(automationResponse.text, selectedOption, storeInfo, subscriber)
      }
      resolve(response)
    } catch (err) {
      reject(err)
    }
  })
}

function getPurchaseResponse (automationResponse, storeInfo, selectedOption, subscriber) {
  automationResponse.text = prepareText(automationResponse.text, selectedOption, storeInfo, subscriber)
  let confirmIndex = automationResponse.options.findIndex((item) => item.code.toLowerCase() === 'y' && ['set-cart', 'cart-remove-success', 'cancel-order', 'return-order'].includes(item.event))
  if (confirmIndex >= 0) {
    automationResponse.options[confirmIndex] = {
      ...selectedOption,
      ...automationResponse.options[confirmIndex],
      productName: selectedOption.productName || selectedOption.label
    }
  }
  let gallery = null
  if (!['cancel-order-confirmation', 'return-order-confirmation'].includes(selectedOption.event)) {
    gallery = [{
      title: selectedOption.label,
      subtitle: `${selectedOption.label}\nPrice: ${selectedOption.price} ${storeInfo.currency}`,
      image: selectedOption.image
    }]
  }

  if (automationResponse.event === 'cart-update-success') {
    automationResponse.selectedProduct = selectedOption.id
    automationResponse.validateUserInput = true
    automationResponse.validationCriteria = {
      type: 'number',
      min: 1,
      max: selectedOption.stock
    }
  }
  return {...automationResponse, gallery}
}

function showCart (automationResponse, storeInfo, selectedOption, subscriber) {
  let gallery = []
  let options = automationResponse.options
  const cart = subscriber.shoppingCart || []
  if (cart.length > 0) {
    automationResponse.text = prepareText(automationResponse.text, selectedOption, storeInfo, subscriber)
    cart.forEach((item, i) => {
      gallery.push({
        title: item.product,
        subtitle: `${item.product}\nPrice: ${item.price} ${storeInfo.currency}`,
        image: item.image
      })
    })
  } else {
    automationResponse.text = 'You have no items in your cart.'
    gallery = null
    options = []
  }
  return {...automationResponse, options, gallery}
}

function prepareText (text, selectedOption, storeInfo, subscriber) {
  text = text.replace('__productName__', `*${selectedOption.productName || selectedOption.label}*`)
  text = text.replace('__productPrice__', `${selectedOption.price} ${storeInfo.currency}`)
  text = text.replace('__productStock__', selectedOption.stock)
  text = text.replace('__productQuantity__', selectedOption.quantity || 1)
  text = text.replace('__cart__', getCartInfo(subscriber.shoppingCart))
  return text
}

function getCartInfo (cart) {
  let text = ''
  if (cart.length > 0) {
    let total = 0
    text = 'Here is your cart:'
    cart.forEach((item, i) => {
      total = total + Number((Number(item.quantity) * Number(item.price)).toFixed(2))
      text = `${text}\n\n*Item*: ${item.product}`
      text = `${text}\n*Quantity*: ${item.quantity}`
      text = `${text}\n*Price*: ${item.price} ${item.currency}`
    })
    text = `${text}\n\n*Total Price*: ${total} ${cart[0].currency}`
  } else {
    text = 'You have no items in your cart'
  }
  return text
}

function getCheckoutInfo (automationResponse, selectedOption, subscriber, chatbot) {
  return new Promise(async (resolve, reject) => {
    try {
      const customer = getCustomerInfo(subscriber, chatbot)
      const paymentMethod = getSelectedPaymentMethod(subscriber, selectedOption)
      if (paymentMethod === 'cod') {
        if (customer && customer.email && completeAddress(customer.defaultAddress)) {
          automationResponse = await require('../kiboAutomation.layer.js').callKiboAutomation('checkout-info-show', chatbot, subscriber, true)
          automationResponse = showCheckoutInfo(automationResponse, 'cod', customer)
        } else if (customer && customer.email) {
          automationResponse = await require('../kiboAutomation.layer.js').callKiboAutomation('ask-address', chatbot, subscriber, true)
          automationResponse = getValidateResponse(automationResponse, 'address')
        } else {
          automationResponse = await require('../kiboAutomation.layer.js').callKiboAutomation('ask-email', chatbot, subscriber, true)
          automationResponse = getValidateResponse(automationResponse, 'email')
        }
      } else {
        if (customer && customer.email) {
          automationResponse = await require('../kiboAutomation.layer.js').callKiboAutomation('checkout-info-show', chatbot, subscriber, true)
          automationResponse = showCheckoutInfo(automationResponse, 'epayment', customer)
        } else {
          automationResponse = await require('../kiboAutomation.layer.js').callKiboAutomation('ask-email', chatbot, subscriber, true)
          automationResponse = getValidateResponse(automationResponse, 'email')
        }
      }
      resolve(automationResponse)
    } catch (err) { reject(err) }
  })
}

function getRecentOrders (Provider, automationResponse, subscriber, chatbot) {
  return new Promise(async (resolve, reject) => {
    try {
      let text = automationResponse.text || ''
      let gallery = []
      let options = []
      const customer = getCustomerInfo(subscriber, chatbot)
      if (customer) {
        const customerOrders = await Provider.findCustomerOrders(customer.id, 9)
        const orders = customerOrders.orders || []
        if (orders.length > 0) {
          options = orders.map((item, i) => {
            return {
              code: `${i}`,
              label: truncate(`${item.cancelReason ? '(Canceled) ' : ''}Order ${item.name} - ${new Date(item.createdAt).toDateString()} (${item.lineItems[0].name})`, 55),
              event: automationResponse.event,
              id: item.name.substr(1)
            }
          })

          gallery = orders.map((item, i) => {
            const firstProduct = item.lineItems[0]
            return {
              title: `${item.cancelReason ? '(Canceled) ' : ''}Order ${item.name}`,
              subtitle: `${firstProduct.name}\nQuantity: ${firstProduct.quantity}\nOrder number: ${item.name}`,
              image: firstProduct.image.originalSrc
            }
          })
        } else {
          text = 'You have not placed any orders within the last 60 days. If you have an order ID, you can enter that to view its status.'
        }
      } else {
        text = 'You have not placed any orders here yet. If you have an order ID, you can enter that to view its status.'
      }
      resolve({...automationResponse, text, options, gallery})
    } catch (err) { reject(err) }
  })
}

function fetchOrder (Provider, automationResponse, selectedOption, chatbot) {
  return new Promise(async (resolve, reject) => {
    try {
      const orderId = selectedOption.id || selectedOption.userInput
      let text = `Here is your order status for Order #${orderId}:\n`
      const orderStatus = await Provider.checkOrderStatus(Number(orderId))

      if (!orderStatus) {
        text = 'Unable to get order status. Please make sure your order ID is valid and that the order was placed within the last 60 days.'
        reject(new Error('Unable to fetch the order status.'))
      }

      const isOrderFulFilled = orderStatus.displayFulfillmentStatus.toLowerCase() === 'fulfilled'
      if (!orderStatus.cancelReason &&
        !(orderStatus.displayFinancialStatus && orderStatus.displayFinancialStatus.includes('PAID')) &&
        !(orderStatus.tags && orderStatus.tags.includes('cancel-request')) &&
        chatbot.cancelOrder
      ) {
        automationResponse.otherOptions.unshift({
          code: 'X',
          label: 'Cancel Order',
          id: orderStatus.id,
          orderId,
          event: 'cancel-order-confirmation',
          isOrderFulFilled
        })
      } else if (isOrderFulFilled && orderStatus.displayFinancialStatus &&
        orderStatus.displayFinancialStatus.includes('PAID') && chatbot.returnOrder
      ) {
        automationResponse.otherOptions.unshift({
          code: 'R',
          label: 'Request Return',
          id: orderStatus.id,
          orderId,
          event: 'return-order-confirmation',
          isOrderFulFilled
        })
      }

      if (orderStatus.cancelReason) {
        text = `${text}\n*Status*: CANCELED`
      } else if (orderStatus.tags && orderStatus.tags.includes('cancel-request')) {
        text = `${text}\n*Status*: Request Open for Cancellation `
      }

      if (orderStatus.displayFinancialStatus) {
        text = `${text}\n*Payment*: ${orderStatus.displayFinancialStatus}`
      }
      if (orderStatus.displayFulfillmentStatus) {
        text = `${text}\n*Delivery*: ${orderStatus.displayFulfillmentStatus}`
      }

      if (isOrderFulFilled && orderStatus.fulfillments) {
        if (orderStatus.fulfillments[0]) {
          let trackingDetails = orderStatus.fulfillments[0].trackingInfo && orderStatus.fulfillments[0].trackingInfo[0] ? orderStatus.fulfillments[0].trackingInfo[0] : null
          if (trackingDetails) {
            text = `${text}\n\n*Tracking Details*:\n`
            text = `${text}\n*Company*: ${trackingDetails.company}`
            text = `${text}\n*Number*: ${trackingDetails.number}`
            text = `${text}\n*Url*: ${trackingDetails.url}`
          }
        }
      }

      if (orderStatus.lineItems) {
        for (let i = 0; i < orderStatus.lineItems.length; i++) {
          let product = orderStatus.lineItems[i]
          text = `${text}\n\n*Item*: ${product.name}`
          text = `${text}\n*Quantity*: ${product.quantity}`
        }
      }

      const address = orderStatus.shippingAddress || orderStatus.billingAddress
      if (address) {
        text = `${text}\n\n*Shipping Address*: ${address.address1}`
        if (address.address2) {
          text = `${text}, ${address.address2}`
        }
        if (address.city) {
          text = `${text}, ${address.city}`
        }
        if (address.province) {
          text = `${text}, ${address.province}`
        }
        if (address.country) {
          text = `${text}, ${address.country}`
        }
      }
      text = `${text}\n\nThis order was placed on ${new Date(orderStatus.createdAt).toDateString()}`

      const gallery = orderStatus.lineItems.map((item, i) => {
        return {
          title: item.name,
          subtitle: `${item.name}\nQuantity: ${item.quantity}`,
          image: item.image.originalSrc
        }
      })

      resolve({...automationResponse, text, gallery})
    } catch (err) { reject(err) }
  })
}

function returnOrder (automationResponse, selectedOption, chatbot, subscriber) {
  let text = chatbot.returnOrderMessage || ''
  let { orderId } = selectedOption
  text = text.replace('__orderId__', orderId)
  text = text.replace('{{orderId}}', orderId)

  const names = subscriber.name.split(' ')
  const firstName = names[0]
  const message = `${firstName} is requesting a return for order #${orderId}.`
  sendNotification(subscriber, message, chatbot.companyId)

  return {...automationResponse, text}
}
