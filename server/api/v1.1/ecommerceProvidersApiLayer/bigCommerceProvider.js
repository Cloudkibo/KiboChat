const BigCommerce = require('node-bigcommerce')
const config = require('./../../../config/environment/index')

exports.fetchStoreInfo = (credentials) => {
  // const shopify = initBigCommerce(credentials)
  return new Promise(function (resolve, reject) {
    resolve('Not implemented')
    // shopify.shop.get()
    // .then(shop => {
    // resolve({
    // id: shop.id,
    // name: shop.name,
    // domain: shop.domain,
    // currency: shop.currency
    // })
    // })
    // .catch(err => {
    // reject(err)
    // })
  })
}

exports.fetchAllProductCategories = (credentials) => {
  const bigCommerce = initBigCommerce(credentials)
  return new Promise(function (resolve, reject) {
    bigCommerce.get('/catalog/categories')
      .then(data => {
        data = data.data
        data = data.map(item => {
          return { id: item.id, name: item.name }
        })
        resolve(data)
      })
      .catch(err => {
        reject(err)
      })
  })
}

exports.fetchProductsInThisCategory = (id, credentials) => {
  const bigCommerce = initBigCommerce(credentials)
  return new Promise(function (resolve, reject) {
    bigCommerce.get('/catalog/products?limit=10&categories:in=' + id)
      .then(async data => {
        data = data.data
        data = await Promise.all(data.map(async item => {
          let images = await bigCommerce.get(`/catalog/products/${item.id}/images`)
          images = images.data
          return { id: item.id,
            name: item.name,
            product_type: item.type,
            vendor: null,
            price: item.price,
            image: images[0].url_standard
          }
        }))
        resolve(data)
      })
      .catch(err => {
        reject(err)
      })
  })
}

exports.fetchProducts = (credentials) => {
  const bigCommerce = initBigCommerce(credentials)
  return new Promise(function (resolve, reject) {
    bigCommerce.get('/catalog/products?limit=10')
      .then(async data => {
        data = data.data
        data = await Promise.all(data.map(async item => {
          let images = await bigCommerce.get(`/catalog/products/${item.id}/images`)
          images = images.data
          return { id: item.id,
            name: item.name,
            product_type: item.type,
            vendor: null,
            price: item.price,
            image: images[0].url_standard
          }
        }))
        resolve(data)
      })
      .catch(err => {
        reject(err)
      })
  })
}

exports.searchProducts = (searchQuery, credentials) => {
  const shopify = initBigCommerce(credentials)

  return new Promise(function (resolve, reject) {
    const query = 'temp'
    shopify.graphql(query)
      .then(result => {
        let products = result.products.edges
        products = products.map(product => {
          product = product.node
          return { id: product.id.split('/')[4],
            name: product.title,
            product_type: product.productType,
            vendor: product.vendor,
            price: product.variants.edges[0].node.price,
            image: product.featuredImage ? product.featuredImage.originalSrc : null
          }
        })
        resolve(products)
      })
      .catch(err => {
        reject(err)
      })
  })
}

exports.getProductVariants = (id, credentials) => {
  const bigCommerce = initBigCommerce(credentials)
  const nameReducer = (accumulator, current) => `${accumulator} ${current.label}`
  return new Promise(function (resolve, reject) {
    bigCommerce.get(`/catalog/products/${id}/variants`)
      .then(data => {
        data = data.data
        data = data.map(item => {
          return { id: item.id,
            name: item.option_values.reduce(nameReducer, ''),
            product_id: item.product_id,
            price: item.price,
            inventory_quantity: item.inventory_level,
            image_url: item.image_url
          }
        })
        resolve(data)
      })
      .catch(err => {
        reject(err)
      })
  })
}

exports.getOrderStatus = (id, credentials) => {
  const shopify = initBigCommerce(credentials)
  const query = `{
    orders(first: 1, query: "name:#${id}") {
      edges {
        node {
          id
          name
          billingAddress {
            id
            name
            phone
            city
            country
            province
            address1
            address2
          }
          confirmed
          createdAt
          currencyCode
          customer {
            id
            email
            firstName
            lastName
            phone
            ordersCount
            totalSpent
          }
          displayFinancialStatus
          email
          fulfillments {
            id
            trackingInfo {
              company
              number
              url
            }
          }
          phone
          shippingAddress {
            id
            name
            phone
            city
            country
            province
            address1
            address2
          }
          displayFulfillmentStatus
          lineItems(first: 100) {
            edges {
              node {
                id
                variant {
                  id
                }
                variantTitle
                quantity
                sku
                vendor
                product {
                  id
                }
                name
              }
            }
          }
        }
      }
    }
  }
  `

  return new Promise(function (resolve, reject) {
    shopify.graphql(query)
      .then(result => {
        let order = result.orders.edges[0].node
        order = {
          ...order,
          lineItems: order.lineItems.edges.map(lineItem => {
            return {
              id: lineItem.node.id,
              variantId: lineItem.node.variant,
              title: lineItem.node.title,
              quantity: lineItem.node.quantity,
              sku: lineItem.node.sku,
              variant_title: lineItem.node.variant_title,
              vendor: lineItem.node.vendor,
              product: lineItem.node.product,
              name: lineItem.node.name
            }
          })
        }
        resolve(order)
      })
      .catch(err => {
        reject(err)
      })
  })
}

exports.getCustomerUsingId = (id, credentials) => {
  const shopify = initBigCommerce(credentials)
  return new Promise(function (resolve, reject) {
    shopify.customer.get(id, { limit: 10 })
      .then(customer => {
        customer = {
          id: customer.id,
          email: customer.email,
          first_name: customer.first_name,
          last_name: customer.last_name,
          phone: customer.phone,
          orders_count: customer.orders_count,
          total_spent: customer.total_spent,
          currency: customer.currency,
          default_address: customer.default_address
        }
        resolve(customer)
      })
      .catch(err => {
        reject(err)
      })
  })
}

exports.searchCustomerUsingPhone = (phone, credentials) => {
  const shopify = initBigCommerce(credentials)
  return new Promise(function (resolve, reject) {
    shopify.customer.search({ phone, limit: 10 })
      .then(customers => {
        customers = customers.map(customer => {
          return {
            id: customer.id,
            email: customer.email,
            first_name: customer.first_name,
            last_name: customer.last_name,
            phone: customer.phone,
            orders_count: customer.orders_count,
            total_spent: customer.total_spent,
            currency: customer.currency,
            default_address: customer.default_address
          }
        })
        resolve(customers)
      })
      .catch(err => {
        reject(err)
      })
  })
}

exports.searchCustomerUsingEmail = (email, credentials) => {
  const shopify = initBigCommerce(credentials)
  return new Promise(function (resolve, reject) {
    shopify.customer.search({ email, limit: 10 })
      .then(customers => {
        customers = customers.map(customer => {
          return {
            id: customer.id,
            email: customer.email,
            first_name: customer.first_name,
            last_name: customer.last_name,
            phone: customer.phone,
            orders_count: customer.orders_count,
            total_spent: customer.total_spent,
            currency: customer.currency,
            default_address: customer.default_address
          }
        })
        resolve(customers)
      })
      .catch(err => {
        reject(err)
      })
  })
}

exports.createCustomer = (firstName, lastName, email, credentials) => {
  const shopify = initBigCommerce(credentials)
  return new Promise(function (resolve, reject) {
    shopify.customer.create({ email, first_name: firstName, last_name: lastName })
      .then(customer => {
        resolve(customer)
      })
      .catch(err => {
        reject(err)
      })
  })
}

exports.findCustomerOrders = (customerId, limit, credentials) => {
  const shopify = initBigCommerce(credentials)
  const query = `{
    customers(first:1, query: "id:${customerId}") {
      edges {
        node {
          id
          email
          firstName
          lastName
          phone
          ordersCount
          totalSpent
          orders(first: 10) {
            edges {
              node {
                id
                name
                billingAddress {
                  id
                  name
                  phone
                  city
                  country
                  province
                  address1
                  address2
                }
                confirmed
                createdAt
                currencyCode
                displayFinancialStatus
                email
                fulfillments {
                  id
                  trackingInfo {
                    company
                    number
                    url
                  }
                }
                phone
                shippingAddress {
                  id
                }
                displayFulfillmentStatus
              }
            }
          }
        }
      }
    }
  }`

  return new Promise(function (resolve, reject) {
    shopify.graphql(query)
      .then(result => {
        let customer = result.customers.edges[0].node
        customer.orders = customer.orders.edges.map(order => {
          return order.node
        })
        resolve(customer)
      })
      .catch(err => {
        reject(err)
      })
  })
}

// when creating a new cart, the cartToken provided here
// will be null. once the cart is created, we will get cart
// token from shopify, so this is used to create or update
// a cart
// lineItems will be array like
// [
//   {
//     "variant_id": 39072856,
//     "quantity": 5
//   }
// ]
exports.addOrUpdateProductToCart = (customerId, lineItems, cartToken, credentials) => {
  const shopify = initBigCommerce(credentials)
  return new Promise(function (resolve, reject) {
    if (cartToken) {
      shopify.checkout.update(cartToken, { customer_id: customerId, line_items: lineItems })
        .then(result => {
          resolve(result)
        })
        .catch(err => {
          reject(err)
        })
    } else {
      shopify.checkout.create({ customer_id: customerId, line_items: lineItems })
        .then(result => {
          resolve(result)
        })
        .catch(err => {
          reject(err)
        })
    }
  })
}

// customer is the customer object that is returned
// by this shpify layer.
// lineItems will be array like
// [
//   {
//     "variant_id": 39072856,
//     "quantity": 5
//   }
// ]
exports.createPermalinkForCart = (customer, lineItems, credentials) => {
  let shopUrl = credentials.shopUrl
  let permaLink = `http://${shopUrl}/cart/`
  lineItems.forEach(item => {
    permaLink += `${item.variant_id}:${item.quantity},`
  })
  permaLink = permaLink.substring(0, permaLink.length - 1)
  permaLink = `${permaLink}?checkout[email]=${customer.email}`
  permaLink = `${permaLink}&checkout[shipping_address][first_name]=${customer.first_name}`
  permaLink = `${permaLink}&checkout[shipping_address][last_name]=${customer.last_name}`
  return permaLink
}

// Address object required as discussed in shopify api
// https://shopify.dev/docs/admin-api/rest/reference/sales-channels/checkout
exports.updateBillingAddressOnCart = (billingAddress, cartToken, credentials) => {
  const shopify = initBigCommerce(credentials)
  return new Promise(function (resolve, reject) {
    shopify.checkout.update(cartToken, { billing_address: billingAddress })
      .then(result => {
        resolve(result)
      })
      .catch(err => {
        reject(err)
      })
  })
}

// Address object required as discussed in shopify api
// https://shopify.dev/docs/admin-api/rest/reference/sales-channels/checkout
exports.updateShippingAddressOnCart = (shippingAddress, cartToken, credentials) => {
  const shopify = initBigCommerce(credentials)
  return new Promise(function (resolve, reject) {
    shopify.checkout.update(cartToken, { shipping_address: shippingAddress })
      .then(result => {
        resolve(result)
      })
      .catch(err => {
        reject(err)
      })
  })
}

// completing checkout means creating order
exports.completeCheckout = (cartToken, credentials) => {
  const shopify = initBigCommerce(credentials)
  return new Promise(function (resolve, reject) {
    if (cartToken) {
      shopify.checkout.complete(cartToken)
        .then(result => {
          resolve(result)
        })
        .catch(err => {
          reject(err)
        })
    } else {
      throw new Error('Cart Token is required to complete the order')
    }
  })
}

exports.cancelAnOrder = (orderId, credentials) => {
  const shopify = initBigCommerce(credentials)
  return new Promise(function (resolve, reject) {
    shopify.order.cancel(orderId)
      .then(result => {
        resolve(result)
      })
      .catch(err => {
        reject(err)
      })
  })
}

exports.cancelAnOrderWithRefund = (orderId, refundAmount, currency, credentials) => {
  const shopify = initBigCommerce(credentials)
  return new Promise(function (resolve, reject) {
    shopify.order.cancel(orderId, { amount: refundAmount, currency })
      .then(result => {
        resolve(result)
      })
      .catch(err => {
        reject(err)
      })
  })
}

exports.viewCart = (id, credentials) => {
  const shopify = initBigCommerce(credentials)
  return new Promise(function (resolve, reject) {
    shopify.checkout.list({ limit: 10 })
      .then(products => {
        // products = products.map(product => {
        // return { id: product.id,
        // name: product.title,
        // product_id: product.product_id,
        // price: product.price,
        // option1: product.option1,
        // option2: product.option2,
        // option3: product.option3,
        // weight: product.weight,
        // weight_unit: product.weight_unit
        // }
        // })
        resolve(products)
      })
      .catch(err => {
        reject(err)
      })
  })
}

function initBigCommerce (credentials) {
  const bigCommerce = new BigCommerce({
    clientId: config.bigcommerce.client_id,
    accessToken: credentials.shopToken,
    storeHash: credentials.storeHash.split('/')[1],
    responseType: 'json',
    apiVersion: 'v3'
  })
  return bigCommerce
}
