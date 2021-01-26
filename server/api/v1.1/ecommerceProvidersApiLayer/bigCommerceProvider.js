const BigCommerce = require('node-bigcommerce')
const config = require('./../../../config/environment/index')

exports.fetchStoreInfo = (credentials) => {
  const bigCommerce = initBigCommerce(credentials, 'v2')
  return new Promise(function (resolve, reject) {
    bigCommerce.get('/store')
      .then(shop => {
        resolve({
          id: shop.id,
          name: shop.name,
          domain: shop.domain,
          currency: shop.currency,
          type: 'bigcommerce'
        })
      })
      .catch(err => {
        reject(err)
      })
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

exports.fetchProductsInThisCategory = (id, numberOfProducts, credentials) => {
  const bigCommerce = initBigCommerce(credentials)
  return new Promise(function (resolve, reject) {
    bigCommerce.get(`/catalog/products?limit=${numberOfProducts}&categories:in=` + id)
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

exports.fetchProducts = (numberOfProducts, credentials) => {
  const bigCommerce = initBigCommerce(credentials)
  return new Promise(function (resolve, reject) {
    bigCommerce.get(`/catalog/products?limit=${numberOfProducts}`)
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
  const bigCommerce = initBigCommerce(credentials)

  return new Promise(function (resolve, reject) {
    bigCommerce.get(`/catalog/products?limit=10&keyword=${escape(searchQuery)}`)
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

exports.getProductVariants = (id, numberOfProducts, credentials) => {
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
  const bigCommerce = initBigCommerce(credentials, 'v2')
  return new Promise(function (resolve, reject) {
    bigCommerce.get(`/orders/${id}`)
      .then(data => {
        let temp = {
          id: data.id,
          name: `#${data.id}`,
          billingAddress: {
            name: `${data.billing_address.first_name} ${data.billing_address.last_name}`,
            phone: data.billing_address.phone,
            city: data.billing_address.city,
            country: data.billing_address.country,
            province: data.billing_address.state,
            address1: data.billing_address.street_1,
            address2: data.billing_address.street_2,
            email: data.billing_address.email
          },
          createdAt: data.date_created,
          currencyCode: data.currency_code,
          displayFinancialStatus: data.payment_status,
          email: data.billing_address.email,
          shippingAddress: data.shipping_addresses,
          displayFulfillmentStatus: data.status
        }
        bigCommerce.get(data.products.resource)
          .then(items => {
            temp.lineItems = items.map(item => {
              return {
                id: item.id,
                variantId: {
                  id: item.variant_id
                },
                sku: item.sku,
                quantity: item.quantity,
                vendor: null,
                name: item.name,
                product: {
                  id: item.product_id
                }
              }
            })
            resolve(temp)
          })
          .catch(err => {
            reject(err)
          })
      })
      .catch(err => {
        reject(err)
      })
  })
}

exports.getCustomerUsingId = (id, credentials) => {
  const bigCommerce = initBigCommerce(credentials)
  return new Promise(function (resolve, reject) {
    bigCommerce.get('/customers?id:in=' + id)
      .then(data => {
        data = data.data
        data = data.map(item => {
          return { id: item.id,
            email: item.email,
            first_name: item.first_name,
            last_name: item.last_name,
            phone: item.phone,
            default_address: item.addresses
          }
        })
        resolve(data[0])
      })
      .catch(err => {
        reject(err)
      })
  })
}

exports.searchCustomerUsingPhone = (phone, credentials) => {
  return new Promise(function (resolve, reject) {
    resolve('Not implemented')
  })
}

exports.searchCustomerUsingEmail = (email, credentials) => {
  const bigCommerce = initBigCommerce(credentials)
  return new Promise(function (resolve, reject) {
    bigCommerce.get('/customers?email:in=' + email)
      .then(data => {
        data = data.data
        data = data.map(item => {
          return { id: item.id,
            email: item.email,
            first_name: item.first_name,
            last_name: item.last_name,
            phone: item.phone,
            default_address: item.addresses
          }
        })
        resolve(data)
      })
      .catch(err => {
        reject(err)
      })
  })
}

exports.createCustomer = (firstName, lastName, email, credentials) => {
  const bigCommerce = initBigCommerce(credentials)
  return new Promise(function (resolve, reject) {
    bigCommerce.post('/customers', [{ email, last_name: lastName, first_name: firstName }])
      .then(data => {
        data = data.data
        resolve(data[0])
      })
      .catch(err => {
        reject(err)
      })
  })
}

exports.findCustomerOrders = (customerId, limit, credentials) => {
  const bigCommerce = initBigCommerce(credentials, 'v2')
  return new Promise(function (resolve, reject) {
    bigCommerce.get(`/orders?customer_id=${customerId}&limit=${limit}`)
      .then(data => {
        let result = { id: customerId }
        if (data) {
          result.orders = data.map(item => {
            return { id: item.id,
              name: '#' + item.id
            }
          }).reverse()
        } else {
          result.orders = []
        }
        resolve(result)
      })
      .catch(err => {
        reject(err)
      })
  })
}

// lineItems will be array like
// "line_items": [
//     {
//       "quantity": 2,
//       "product_id": 107,
//       "variant_id": 185 // (optional)
//     }
//   ]
exports.createCart = (customerId, lineItems, credentials) => {
  const bigCommerce = initBigCommerce(credentials)
  return new Promise(function (resolve, reject) {
    let payload = {
      customer_id: customerId,
      line_items: lineItems
    }
    bigCommerce.post('/carts', payload)
      .then(result => {
        result = result.data
        resolve(result)
      })
      .catch(err => {
        reject(err)
      })
  })
}

exports.viewCart = (cartId, credentials) => {
  const bigCommerce = initBigCommerce(credentials)
  return new Promise(function (resolve, reject) {
    bigCommerce.get(`/carts/${cartId}`)
      .then(result => {
        resolve(result)
      })
      .catch(err => {
        reject(err)
      })
  })
}

// itemId should be like edbd622d-4302-4aa0-9735-88e6977b3335
exports.updateCart = (cartId, itemId, productId, quantity, credentials) => {
  const bigCommerce = initBigCommerce(credentials)
  const payload = {
    line_item: {
      quantity: quantity,
      product_id: productId
    }
  }
  return new Promise(function (resolve, reject) {
    bigCommerce.put(`/carts/${cartId}/items/${itemId}`, payload)
      .then(result => {
        resolve(result)
      })
      .catch(err => {
        reject(err)
      })
  })
}

exports.createOrder = (cartId, credentials) => {
  const bigCommerce = initBigCommerce(credentials)
  return new Promise(function (resolve, reject) {
    bigCommerce.get(`/checkouts/${cartId}`)
      .then(result => {
        return bigCommerce.post(`/checkouts/${cartId}/orders`)
      })
      .then(result => {
        resolve(result)
      })
      .catch(err => {
        reject(err)
      })
  })
}

exports.createPermalinkForCart = (cartId, credentials) => {
  const bigCommerce = initBigCommerce(credentials)
  return new Promise(function (resolve, reject) {
    bigCommerce.post(`/carts/${cartId}/redirect_urls`)
      .then(result => {
        const cartUrl = result.data.cart_url
        const redirectUrl = `${config.domain}/api/bigcommerce/redirect?url=${cartUrl}`
        resolve({ data: { cart_url: redirectUrl } })
      })
      .catch(err => {
        reject(err)
      })
  })
}

// Address object required as discussed in bigcommerce api
// https://developer.bigcommerce.com/api-reference/cart-checkout/server-server-checkout-api/checkout-billing-address/checkoutsbillingaddressbycheckoutidpost
exports.updateBillingAddressOnCart = (cartId, addressId, address, credentials) => {
  const bigCommerce = initBigCommerce(credentials)
  return new Promise(function (resolve, reject) {
    bigCommerce.put(`/checkouts/${cartId}/billing-address/${addressId}`, address)
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

function initBigCommerce (credentials, version = 'v3') {
  const bigCommerce = new BigCommerce({
    clientId: config.bigcommerce.client_id,
    accessToken: credentials.shopToken,
    storeHash: credentials.storeHash.split('/')[1],
    responseType: 'json',
    apiVersion: version
  })
  return bigCommerce
}
