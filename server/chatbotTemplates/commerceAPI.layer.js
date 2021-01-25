const shopifyDataLayer = require('../api/v1.1/shopify/shopify.datalayer')
const bigcommerceDataLayer = require('../api/v1.1/bigcommerce/bigcommerce.datalayer')
const EcommerceProvider = require('../api/v1.1/ecommerceProvidersApiLayer/EcommerceProvidersApiLayer.js')

const { convertToEmoji } = require('./utility')

exports.callApi = function (automationResponse, selectedOption, chatbot, subscriber) {
  return new Promise(async (resolve, reject) => {
    try {
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
        default:
          storeInfo = await Provider.fetchStoreInfo()
          response = getPurchaseResponse(automationResponse, storeInfo, selectedOption)
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
        response = getPurchaseResponse(automationResponse, storeInfo, selectedOption)
      } else {
        productVariants = productVariants.map((item) => {
          const price = item.price || selectedOption.price
          return {
            ...item,
            name: `${item.name} (price: ${price} ${storeInfo.currency})`,
            productName: selectedOption.label
          }
        })
        response = await getResponse(productVariants, storeInfo, automationResponse, selectedOption, true)
        response.text = prepareText(automationResponse.text, selectedOption, storeInfo)
      }
      resolve(response)
    } catch (err) {
      reject(err)
    }
  })
}

function getPurchaseResponse (automationResponse, storeInfo, selectedOption) {
  automationResponse.text = prepareText(automationResponse.text, selectedOption, storeInfo)
  const gallery = [{
    title: selectedOption.label,
    subtitle: `${selectedOption.label}\nPrice: ${selectedOption.price} ${storeInfo.currency}`,
    image: selectedOption.image
  }]
  return {...automationResponse, gallery}
}

function prepareText (text, selectedOption, storeInfo) {
  text = text.replace('__productName__', `*${selectedOption.productName || selectedOption.label}*`)
  text = text.replace('__productPrice__', `${selectedOption.price} ${storeInfo.currency}`)
  text = text.replace('__productStock__', selectedOption.stock)
  return text
}
