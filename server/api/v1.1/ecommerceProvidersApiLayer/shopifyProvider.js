const Shopify = require('shopify-api-node')

exports.fetchStoreInfo = (credentials) => {
  const shopify = initShopify(credentials)
  return new Promise(function (resolve, reject) {
    shopify.shop.get()
      .then(shop => {
        resolve({
          id: shop.id,
          name: shop.name,
          domain: shop.domain,
          currency: shop.currency,
          type: 'shopify'
        })
      })
      .catch(err => {
        reject(err)
      })
  })
}

exports.fetchAllProductCategories = (paginationParams, credentials) => {
  const shopify = initShopify(credentials)
  return new Promise(function (resolve, reject) {
    paginationParams = paginationParams || { limit: 10 }
    shopify.customCollection.list(paginationParams)
      .then(collections => {
        let nextPageParameters = collections.nextPageParameters
        collections = collections.map(collection => {
          return { id: collection.id, name: collection.title }
        })
        if (nextPageParameters) {
          collections.nextPageParameters = nextPageParameters
        }
        resolve(collections)
      })
      .catch(err => {
        reject(err)
      })
  })
}

exports.fetchProductsInThisCategory = (id, paginationParams, credentials) => {
  const shopify = initShopify(credentials)
  return new Promise(function (resolve, reject) {
    paginationParams = paginationParams || { limit: 10 }
    paginationParams.collection_id = id
    shopify.product.list(paginationParams)
      .then(products => {
        let nextPageParameters = products.nextPageParameters
        products = products.map(product => {
          return { id: product.id,
            name: product.title,
            product_type: product.product_type,
            vendor: product.vendor,
            price: product.variants[0].price,
            image: product.image ? product.image.src : null
          }
        })
        if (nextPageParameters) {
          products.nextPageParameters = nextPageParameters
        }
        resolve(products)
      })
      .catch(err => {
        reject(err)
      })
  })
}

exports.fetchProducts = (paginationParams, credentials) => {
  const shopify = initShopify(credentials)
  return new Promise(function (resolve, reject) {
    paginationParams = paginationParams || { limit: 10 }
    shopify.product.list(paginationParams)
      .then(products => {
        let nextPageParameters = products.nextPageParameters
        products = products.map(product => {
          return { id: product.id,
            name: product.title,
            product_type: product.product_type,
            vendor: product.vendor,
            price: product.variants[0].price,
            image: product.image ? product.image.src : null
          }
        })
        if (nextPageParameters) {
          products.nextPageParameters = nextPageParameters
        }
        resolve(products)
      })
      .catch(err => {
        reject(err)
      })
  })
}

exports.searchProducts = (searchQuery, credentials) => {
  const shopify = initShopify(credentials)
  const query = `{
    products(first: 10, query: "${searchQuery}") {
      edges {
        node {
          id
          title
          productType
          vendor
          featuredImage {
            id
            originalSrc
          }
          variants(first: 1) {
            edges {
              node {
                id
                price
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

exports.getProductVariants = (id, paginationParams, credentials) => {
  const shopify = initShopify(credentials)
  return new Promise(function (resolve, reject) {
    paginationParams = paginationParams || { limit: 10 }
    shopify.productVariant.list(id, paginationParams)
      .then(products => {
        let nextPageParameters = products.nextPageParameters
        products = products.map(product => {
          return { id: product.id,
            name: product.title,
            product_id: product.product_id,
            price: product.price,
            inventory_quantity: product.inventory_quantity
          }
        })
        if (nextPageParameters) {
          products.nextPageParameters = nextPageParameters
        }
        resolve(products)
      })
      .catch(err => {
        reject(err)
      })
  })
}

exports.getOrderStatus = (id, credentials) => {
  const shopify = initShopify(credentials)
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
  const shopify = initShopify(credentials)
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
  const shopify = initShopify(credentials)
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
  const shopify = initShopify(credentials)
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
  const shopify = initShopify(credentials)
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
  const shopify = initShopify(credentials)
  const query = `{
    customers(first:1, query: "id:${customerId}") {
      edges {
        node {
          id
          orders(first: 10) {
            edges {
              node {
                id
                name
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
  const shopify = initShopify(credentials)
  return new Promise(function (resolve, reject) {
    if (cartToken) {
      console.log('inside update CART')
      shopify.checkout.update(cartToken, { customer_id: customerId, line_items: lineItems })
        .then(result => {
          resolve(result)
        })
        .catch(err => {
          reject(err)
        })
    } else {
      console.log('inside create CART')
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
  const shopify = initShopify(credentials)
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
  const shopify = initShopify(credentials)
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
  const shopify = initShopify(credentials)
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
  const shopify = initShopify(credentials)
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
  const shopify = initShopify(credentials)
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
  const shopify = initShopify(credentials)
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

function initShopify (credentials) {
  const shopify = new Shopify({
    shopName: credentials.shopUrl,
    accessToken: credentials.shopToken,
    apiVersion: '2019-07'
  })
  return shopify
}
