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
    paginationParams = paginationParams || { limit: 9 }
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

exports.fetchProductsInThisCategory = (id, paginationParams, numberOfProducts, credentials) => {
  const shopify = initShopify(credentials)
  return new Promise(function (resolve, reject) {
    paginationParams = paginationParams || { limit: numberOfProducts }
    if (!paginationParams.page_info) {
      paginationParams.collection_id = id
    }
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

exports.fetchProducts = (paginationParams, numberOfProducts, credentials) => {
  const shopify = initShopify(credentials)
  return new Promise(function (resolve, reject) {
    paginationParams = paginationParams || { limit: numberOfProducts }
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

exports.getProductVariants = (id, paginationParams, numberOfProducts, credentials) => {
  const shopify = initShopify(credentials)
  return new Promise(function (resolve, reject) {
    paginationParams = paginationParams || { limit: numberOfProducts }
    shopify.productVariant.list(id, paginationParams)
      .then(async products => {
        let nextPageParameters = products.nextPageParameters
        products = await Promise.all(products.map(async product => {
          let variantPayload = { id: product.id,
            name: product.title,
            product_id: product.product_id,
            price: product.price,
            inventory_quantity: product.inventory_quantity
          }
          if (product.image_id) {
            let image = await shopify.productImage.get(product.product_id, product.image_id)
            variantPayload.image = image.src
          }
          return variantPayload
        }))
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

exports.getOrderStatusByRest = (id, credentials) => {
  const shopify = initShopify(credentials)
  return new Promise(function (resolve, reject) {
    shopify.order.get(id)
      .then(order => {
        resolve(order)
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
          cancelReason
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
          tags
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
                image {
                  originalSrc
                }
                sku
                vendor
                product {
                  id
                }
                name
                originalTotalSet {
                  presentmentMoney {
                    amount
                    currencyCode
                  }
                }
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
        let order = null
        if (result.orders.edges[0]) {
          order = result.orders.edges[0].node
        } else {
          resolve(order)
          return
        }
        order = {
          ...order,
          lineItems: order.lineItems.edges.map(lineItem => {
            return {
              id: lineItem.node.id,
              variantId: lineItem.node.variant,
              title: lineItem.node.title,
              quantity: lineItem.node.quantity,
              sku: lineItem.node.sku,
              image: lineItem.node.image,
              variant_title: lineItem.node.variant_title,
              vendor: lineItem.node.vendor,
              product: lineItem.node.product,
              name: lineItem.node.name,
              price: lineItem.node.originalTotalSet.presentmentMoney.amount,
              currency: lineItem.node.originalTotalSet.presentmentMoney.currencyCode
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

exports.updateOrderTag = (orderId, tags, credentials) => {
  const shopify = initShopify(credentials)
  const params = {
    tags
  }
  return new Promise(function (resolve, reject) {
    shopify.order.update(orderId, params)
      .then(order => {
        let response = {status: 'success', payload: order}
        resolve(response)
      })
      .catch(err => {
        let errResponse = {status: 'failed', payload: err}
        reject(errResponse)
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
          orders(first: 10, reverse: true) {
            edges {
              node {
                id
                name
                cancelReason
                createdAt
                totalPriceSet {
                  presentmentMoney {
                    amount
                    currencyCode
                  }
                }
                lineItems(first: 1) {
                  edges {
                    node {
                      id
                      name
                      quantity
                      image {
                        originalSrc
                      }
                      originalTotalSet {
                        presentmentMoney {
                          amount
                          currencyCode
                        }
                      }
                    }
                  }
                }
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
          const lineItems = order.node.lineItems.edges.map(lineItem => {
            return lineItem.node
          })
          const orderItem = order.node
          orderItem.lineItems = lineItems
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
  let permaLink = `https://${shopUrl}/cart/`
  lineItems.forEach(item => {
    permaLink += `${item.variant_id}:${item.quantity},`
  })
  permaLink = permaLink.substring(0, permaLink.length - 1)
  permaLink = `${permaLink}?checkout[email]=${customer.email}`
  permaLink = `${permaLink}&checkout[shipping_address][first_name]=${customer.first_name}`
  permaLink = `${permaLink}&checkout[shipping_address][last_name]=${customer.last_name}`
  return permaLink
}

exports.createTestOrder = (customer, lineItems, address, credentials) => {
  const shopify = initShopify(credentials)
  return new Promise(function (resolve, reject) {
    shopify.order.create({
      financial_status: 'pending',
      line_items: lineItems,
      send_receipt: true,
      customer: {
        id: customer.id
      },
      transactions: [
        {
          kind: 'authorization',
          status: 'success',
          amount: 1.0
        }
      ],
      billing_address: address,
      shipping_address: address,
      inventory_behaviour: 'decrement_obeying_policy'
    })
      .then(order => {
        resolve(order)
      })
      .catch(err => {
        reject(err)
      })
  })
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

exports.cancelAnOrder = (id, credentials) => {
  const shopify = initShopify(credentials)
  return new Promise(function (resolve, reject) {
    const params = {
      reason: 'customer',
      email: true
    }
    shopify.order.cancel(id, params)
      .then(order => {
        order = {
          id: order.id,
          email: order.email,
          name: order.name,
          confirmed: order.confirmed
        }
        resolve(order)
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

exports.fetchAbandonedCart = (token, credentials) => {
  const shopify = initShopify(credentials)
  return new Promise(function (resolve, reject) {
    if (token) {
      shopify.checkout.get(token)
        .then(result => {
          resolve(result)
        })
        .catch(err => {
          reject(err)
        })
    } else {
      throw new Error('token is required to complete to get checkout details')
    }
  })
}

exports.fetchCheckoutsCount = (credentials) => {
  const shopify = initShopify(credentials)
  return new Promise(function (resolve, reject) {
    shopify.checkout.count({status: 'any'})
      .then(count => {
        resolve(count)
      })
      .catch(err => {
        reject(err)
      })
  })
}

exports.fetchCheckouts = (limit, paginationParams, credentials) => {
  const shopify = initShopify(credentials)
  return new Promise(function (resolve, reject) {
    paginationParams = paginationParams || { limit: limit, status: 'any' }
    shopify.checkout.list(paginationParams)
      .then(checkouts => {
        let nextPageParameters = checkouts.nextPageParameters
        checkouts = checkouts.map(checkout => {
          let url = checkout.abandoned_checkout_url.split('.com')
          let payload = {
            checkoutId: checkout.id,
            token: checkout.token,
            cart_token: checkout.cart_token,
            customerName: getCustomerName(checkout),
            totalPrice: checkout.total_price,
            currency: checkout.currency,
            created_at: checkout.created_at,
            updated_at: checkout.updated_at,
            abandoned_checkout_url: checkout.abandoned_checkout_url,
            checkout_admin_url: `${url[0]}.com/admin/checkouts/${checkout.id}`,
            customerNumber: checkout.phone ? checkout.phone : checkout.customer ? checkout.customer.phone : null,
            tags: checkout.tags
          }
          return payload
        })
        if (nextPageParameters) {
          checkouts.nextPageParameters = nextPageParameters
        }
        resolve(checkouts)
      })
      .catch(err => {
        reject(err)
      })
  })
}

exports.fetchOrdersCount = (credentials) => {
  const shopify = initShopify(credentials)
  return new Promise(function (resolve, reject) {
    shopify.order.count({status: 'any'})
      .then(orders => {
        resolve(orders)
      })
      .catch(err => {
        reject(err)
      })
  })
}

exports.fetchOrders = (limit, paginationParams, credentials) => {
  const shopify = initShopify(credentials)
  return new Promise(function (resolve, reject) {
    paginationParams = paginationParams || { limit: limit, status: 'any' }
    shopify.order.list(paginationParams)
      .then(orders => {
        let nextPageParameters = orders.nextPageParameters
        orders = orders.map(order => {
          let orderStatusUrl = order.order_status_url.split('.com')
          let payload = {
            orderNumber: order.order_number,
            createdAt: order.created_at,
            customerName: getCustomerName(order),
            totalPrice: order.total_price,
            currency: order.currency,
            financialStatus: order.financial_status,
            fulfillmentStatus: order.fulfillment_status,
            orderAdminUrl: `${orderStatusUrl[0]}.com/admin/orders/${order.id}`,
            orderStatusUrl: order.order_status_url,
            customerNumber: order.phone ? order.phone : order.customer ? order.customer.phone : null,
            tags: order.tags
          }
          payload = getTrackingDetails(payload, order.fulfillments)
          return payload
        })
        if (nextPageParameters) {
          orders.nextPageParameters = nextPageParameters
        }
        resolve(orders)
      })
      .catch(err => {
        reject(err)
      })
  })
}

function getCustomerName (order) {
  let name = 'No Customer'
  if (order.customer) {
    name = order.customer.first_name + ' ' + order.customer.last_name
  } else if (order.shipping_address && order.shipping_address.name) {
    name = order.shipping_address.name
  } else if (order.billing_address && order.billing_address.name) {
    name = order.billing_address.name
  }
  return name
}

function getTrackingDetails (payload, fulfillments) {
  if (fulfillments.length > 0) {
    for (let i = 0; i < fulfillments.length; i++) {
      if (fulfillments[i].tracking_number && fulfillments[i].tracking_url) {
        payload.trackingId = fulfillments[i].tracking_number
        payload.trackingUrl = fulfillments[i].tracking_url
      }
    }
  }
  return payload
}
