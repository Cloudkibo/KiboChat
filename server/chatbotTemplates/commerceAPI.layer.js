const shopifyDataLayer = require('../api/v1.1/shopify/shopify.datalayer')
const bigcommerceDataLayer = require('../api/v1.1/bigcommerce/bigcommerce.datalayer')
const EcommerceProvider = require('../api/v1.1/ecommerceProvidersApiLayer/EcommerceProvidersApiLayer.js')
const logger = require('../components/logger')
const TAG = '/chatbotTemplates/commerceAPI.layer.js'

const { convertToEmoji } = require('./utility')
const { callApi } = require('../api/v1.1/utility')

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
          items = await Provider.fetchProductsInThisCategory(selectedOption.id, automationResponse.nextPage)
          response = await getResponse(items, storeInfo, automationResponse, selectedOption, true)
          break
        case 'PRODUCTS_ONSALE':
          storeInfo = await Provider.fetchStoreInfo()
          items = await Provider.fetchProducts(automationResponse.nextPage)
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
          if (selectedOption.event === 'cart-remove-success') {
            subscriber.shoppingCart = await removeShoppingCartItem(subscriber, selectedOption)
          }
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
            automationResponse = await require('./kiboautomation.layer.js').callKiboAutomation(automationResponse.event, chatbot, subscriber, true)
            automationResponse.options = automationResponse.options || []
            automationResponse.validateUserInput = true
            automationResponse.validationCriteria = {
              type: 'number',
              min: 1,
              max: items[0].inventory_quantity
            }
            selectedOption = {
              label: items[0].name,
              price: items[0].price,
              image: items[0].image,
              event: automationResponse.event,
              id: items[0].id,
              stock: items[0].inventory_quantity
            }
            response = getPurchaseResponse(automationResponse, storeInfo, selectedOption, subscriber)
          } else {
            response = await getResponse(items, null, automationResponse, null, false)
          }
          break
        default:
          storeInfo = await Provider.fetchStoreInfo()
          if (selectedOption.event === 'set-cart') {
            subscriber.shoppingCart = await setShoppingCart(subscriber, selectedOption, storeInfo)
            response = await showCart(automationResponse, storeInfo, selectedOption, subscriber)
          } else {
            response = getPurchaseResponse(automationResponse, storeInfo, selectedOption, subscriber)
          }
      }
      resolve(response)
    } catch (err) {
      reject(err)
    }
  })
}

async function initializeProvider (chatbot) {
  return new Promise(async (resolve, reject) => {
    let provider = ''
    try {
      switch (chatbot.storeType) {
        case 'shopify':
          const integration = await shopifyDataLayer.findOneShopifyIntegration({ companyId: chatbot.companyId })
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
      let productVariants = await Provider.getVariantsOfSelectedProduct(selectedOption.id)
      if (productVariants.length === 1) {
        automationResponse = await require('./kiboautomation.layer.js').callKiboAutomation(automationResponse.event, chatbot, subscriber, true)
        selectedOption.stock = productVariants[0].inventory_quantity
        selectedOption.productName = selectedOption.label
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
  let confirmIndex = automationResponse.options.findIndex((item) => item.code.toLowerCase() === 'y' && ['set-cart', 'cart-remove-success'].includes(item.event))
  if (confirmIndex >= 0) {
    automationResponse.options[confirmIndex] = {
      ...selectedOption,
      ...automationResponse.options[confirmIndex],
      productName: selectedOption.productName || selectedOption.label
    }
  }
  const gallery = [{
    title: selectedOption.label,
    subtitle: `${selectedOption.label}\nPrice: ${selectedOption.price} ${storeInfo.currency}`,
    image: selectedOption.image
  }]

  if (automationResponse.event === 'cart-update-success') {
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
  automationResponse.text = prepareText(automationResponse.text, selectedOption, storeInfo, subscriber)
  let gallery = []
  const cart = subscriber.shoppingCart || []
  if (cart.length > 0) {
    cart.forEach((item, i) => {
      gallery.push({
        title: item.product,
        subtitle: `${item.product}\nPrice: ${item.price} ${storeInfo.currency}`,
        image: item.image
      })
    })
  } else {
    gallery = null
  }
  return {...automationResponse, gallery}
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
    text = 'Here is your cart'
    cart.forEach((item, i) => {
      total = total + Number((Number(item.quantity) * Number(item.price)).toFixed(2))
      text = `${text}\n\n*Item*: ${item.product}`
      text = `${text}\n*Quantity*: ${item.quantity}`
      text = `${text}\n*Price*: ${item.price} ${item.currency}`
    })
    text = `${text}\n\n*Total Price*: ${total}`
  } else {
    text = 'You have no items in your cart'
  }
  return text
}

function setShoppingCart (subscriber, selectedOption, storeInfo) {
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
    updateSubscriber(
      'whatsAppContacts/update',
      {
        query: {_id: subscriber._id},
        newPayload: {shoppingCart: cart, commerceCustomer},
        options: {}
      }
    )

    resolve(cart)
  })
}

function clearShoppingCart (subscriber) {
  let commerceCustomer = subscriber.commerceCustomer
  if (commerceCustomer) commerceCustomer.cartId = null
  updateSubscriber(
    'whatsAppContacts/update',
    {
      query: {_id: subscriber._id},
      newPayload: {shoppingCart: [], commerceCustomer},
      options: {}
    }
  )
}

function removeShoppingCartItem (subscriber, selectedOption) {
  return new Promise((resolve, reject) => {
    let cart = subscriber.shoppingCart || []

    const index = cart.findIndex((item) => item.product_id === selectedOption.id)
    if (index >= 0) {
      cart.splice(index, 1)
    }

    let commerceCustomer = subscriber.commerceCustomer
    if (commerceCustomer) commerceCustomer.cartId = null
    updateSubscriber(
      'whatsAppContacts/update',
      {
        query: {_id: subscriber._id},
        newPayload: {shoppingCart: cart, commerceCustomer},
        options: {}
      }
    )

    resolve(cart)
  })
}

function updateSubscriber (path, data) {
  callApi(path, 'put', data)
    .then(updated => {
    })
    .catch(error => {
      const message = error || 'Failed to update contact'
      logger.serverLog(message, `${TAG}: updateSubscriber`, {}, {path, data}, 'error')
    })
}

exports.clearShoppingCart = clearShoppingCart
