const Shopify = require('shopify-api-node')

exports.fetchStoreInfo = (credentials) => {
  const shopify = initShopify(credentials)
  return new Promise(function (resolve, reject) {
    shopify.shop.get()
      .then(shop => {
        resolve({
          id: shop.id,
          name: shop.name,
          domain: shop.domain
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
            price: product.variants[0].price
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
            weight_unit: product.weight_unit
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
  return new Promise(function (resolve, reject) {
    shopify.order.list({ limit: 10 })
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
