const Shopify = require('shopify-api-node')

exports.fetchStoreInfo = (credentials) => {
  const shopify = initShopify(credentials)
  return new Promise(function (resolve, reject) {
    shopify.shop.get()
      .then(shop => {
        console.log(shop)
        resolve({
          id: shop.id,
          name: shop.name,
          domain: shop.domain,
          currency: shop.currency
        })
      })
      .catch(err => {
        reject(err)
      })
  })
}

exports.fetchAllProductCategories = (credentials) => {
  const shopify = initShopify(credentials)
  return new Promise(function (resolve, reject) {
    shopify.customCollection.list({ limit: 10 })
      .then(collections => {
        collections = collections.map(collection => {
          return { id: collection.id, name: collection.title }
        })
        resolve(collections)
      })
      .catch(err => {
        reject(err)
      })
  })
}

exports.fetchProductsInThisCategory = (id, credentials) => {
  const shopify = initShopify(credentials)
  return new Promise(function (resolve, reject) {
    shopify.product.list({ collection_id: id, limit: 10 })
      .then(products => {
        products = products.map(product => {
          return { id: product.id,
            name: product.title,
            product_type: product.product_type,
            vendor: product.vendor,
            price: product.variants[0].price,
            image: product.image ? product.image.src : null
          }
        })
        resolve(products)
      })
      .catch(err => {
        reject(err)
      })
  })
}

exports.fetchProducts = (credentials) => {
  const shopify = initShopify(credentials)
  return new Promise(function (resolve, reject) {
    shopify.product.list({ limit: 10 })
      .then(products => {
        products = products.map(product => {
          return { id: product.id,
            name: product.title,
            product_type: product.product_type,
            vendor: product.vendor,
            price: product.variants[0].price,
            image: product.image ? product.image.src : null
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
  const shopify = initShopify(credentials)
  return new Promise(function (resolve, reject) {
    shopify.productVariant.list(id, { limit: 10 })
      .then(products => {
        products = products.map(product => {
          return { id: product.id,
            name: product.title,
            product_id: product.product_id,
            price: product.price,
            option1: product.option1,
            option2: product.option2,
            option3: product.option3,
            weight: product.weight,
            weight_unit: product.weight_unit,
            inventory_quantity: product.inventory_quantity
          }
        })
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
  return new Promise(function (resolve, reject) {
    shopify.customer.orders(customerId, { limit })
      .then(orders => {
        orders = orders.map(order => {
          return {
            id: order.id,
            email: order.email,
            created_at: order.created_at,
            total_price: order.total_price,
            currency: order.currency,
            financial_status: order.financial_status,
            total_spent: order.total_spent,
            confirmed: order.confirmed,
            order_number: order.order_number,
            order_status_url: order.order_status_url,
            fulfillment_status: order.fulfillment_status
          }
        })
        resolve(orders)
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
    accessToken: credentials.shopToken
  })
  return shopify
}
