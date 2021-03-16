// APIs Quick Reference:
//
// - list businesses of a user
// - https://developers.facebook.com/docs/marketing-api/business-manager/get-started#users
// - /me/businesses
//
// - list catalogs inside a business
// - https://developers.facebook.com/docs/marketing-api/reference/product-catalog
// - /<business_id>/owned_product_catalogs
//
// - list product categories
// - https://developers.facebook.com/docs/marketing-api/reference/product-catalog/categories/
// - /{product-catalog-id}/categories?categorization_criteria=CATEGORY
//
// - list products
// - https://developers.facebook.com/docs/marketing-api/reference/product-catalog/products/
// - /<PRODUCT_CATALOG_ID>/products?fields=condition,id,name
//
// - search products by name
// - https://developers.facebook.com/docs/marketing-api/reference/product-catalog/products/#Reading
// - /<PRODUCT_CATALOG_ID>//products?filter=Satin&fields=condition,id,name,category
// filter must be json encoded string
//
// permissions to apply for:
// commerce_account_read_orders, commerce_account_manage_orders, catalog_management, business_management

const needle = require('needle')

const API_URL = 'https://graph.facebook.com/v8.0'

exports.fetchBusinessAccounts = (credentials) => {
  const params = initShops(credentials)
  return new Promise(function (resolve, reject) {
    const fields = 'fields=id,name,primary_page,created_by'
    needle('get', `${API_URL}/me/businesses?access_token=${params}&${fields}`)
      .then(result => {
        result = result.body
        if (result.error) {
          reject(result.error.message || result.error)
        } else {
          resolve(result)
        }
      })
      .catch(err => reject(err))
  })
}

exports.fetchCommerceCatalogs = (businessId, credentials) => {
  const params = initShops(credentials)
  return new Promise(function (resolve, reject) {
    const fields = 'fields=id,name,business,vertical,product_count'
    needle('get', `${API_URL}/${businessId}/owned_product_catalogs?access_token=${params}&${fields}`)
      .then(result => {
        result = result.body
        if (result.error) {
          reject(result.error.message || result.error)
        } else {
          resolve(result)
        }
      })
      .catch(err => reject(err))
  })
}

exports.fetchAllProductCategories = (paginationParams, catalogId, credentials) => {
  const params = initShops(credentials)
  return new Promise(function (resolve, reject) {
    let fields = `limit=11&`
    if (paginationParams) {
      fields = fields + `&after=${paginationParams}`
    }
    needle('get', `${API_URL}/${catalogId}/product_sets?access_token=${params}&${fields}`)
      .then(result => {
        result = result.body
        if (result.error) {
          reject(result.error.message || result.error)
        } else {
          let payload = result.data
          payload = payload.filter(category => !category.name.includes('DO NOT MODIFY'))
          payload = payload.map(category => {
            return {
              id: category.id,
              name: category.name,
              image: category.image_url
            }
          })
          if (result.paging && result.paging.next && result.paging.cursors && result.paging.cursors.after) {
            payload.nextPageParameters = result.paging.cursors.after
          }
          resolve(payload)
        }
      })
      .catch(err => reject(err))
  })
}

exports.fetchProductsInThisCategory = (category, numberOfProducts, credentials) => {
  const params = initShops(credentials)
  return new Promise(function (resolve, reject) {
    const fields = `fields=products{id,name,fb_product_category,currency,image_url,price,product_type,brand,retailer_product_group_id}`
    needle('get', `${API_URL}/${category}?${fields}&access_token=${params}`)
      .then(result => {
        result = result.body
        if (result.error) {
          reject(result.error.message || result.error)
        } else {
          let payload = result.products && result.products.data ? result.products.data : []
          payload = payload.filter(item => item.image_url)
          payload = [...new Map(payload.map(item =>
            [item['retailer_product_group_id'], item])).values()]
          payload = payload.splice(0, numberOfProducts)
          payload = payload.map(item => {
            return {
              id: item.id,
              brand: item.brand,
              category: item.category,
              condition: item.condition,
              currency: item.currency,
              description: item.description,
              gender: item.gender,
              image: item.image_url,
              name: item.name,
              inventory: item.inventory,
              product_type: item.product_type,
              vendor: item.brand,
              price: item.price
            }
          })
          resolve(payload)
        }
      })
      .catch(err => {
        reject(err)
      })
  })
}

exports.fetchProducts = (query, numberOfProducts, credentials) => {
  const params = initShops(credentials)
  return new Promise(function (resolve, reject) {
    const fields = `fields=id,name,fb_product_category,currency,image_url,price,product_type,brand,retailer_product_group_id`
    needle('get', `${API_URL}/${query}/products?access_token=${params}&${fields}`)
      .then(result => {
        result = result.body
        if (result.error) {
          reject(result.error.message || result.error)
        } else {
          let payload = result.data
          payload = payload.filter(item => item.image_url)
          payload = [...new Map(payload.map(item =>
            [item['retailer_product_group_id'], item])).values()]
          payload = payload.splice(0, numberOfProducts)
          payload = payload.map(product => {
            return {
              id: product.id,
              name: product.name,
              product_type: product.product_type,
              vendor: product.brand,
              price: product.price,
              currency: product.currency,
              image: product.image_url
            }
          })
          resolve(payload)
        }
      })
      .catch(err => reject(err))
  })
}

exports.searchProducts = (query, catalogId, credentials) => {
  const params = initShops(credentials)
  return new Promise(function (resolve, reject) {
    const fields = 'fields=id,name,fb_product_category,currency,image_url,price,product_type,brand,retailer_product_group_id&limit=9'
    const filterQuery = `filter=${encodeURIComponent(JSON.stringify({name: { i_contains: query }}))}`
    needle('get', `${API_URL}/${catalogId}/products?access_token=${params}&${fields}&${filterQuery}`)
      .then(result => {
        result = result.body
        if (result.error) {
          reject(result.error.message || result.error)
        } else {
          let payload = result.data
          payload = payload.filter(item => item.image_url)
          payload = [...new Map(payload.map(item =>
            [item['retailer_product_group_id'], item])).values()]
          payload = payload.map(product => {
            return {
              id: product.id,
              name: product.name,
              product_type: product.product_type,
              vendor: product.brand,
              price: product.price,
              currency: product.currency,
              image: product.image_url
            }
          })
          resolve(payload)
        }
      })
      .catch(err => reject(err))
  })
}

exports.getOrderStatus = (id, credentials) => {
  const params = initShops(credentials)
  return new Promise(function (resolve, reject) {
    let payload = {}
    const fields = 'fields=id,order_status,created,channel,shipping_address,buyer_details'
    needle('get', `${API_URL}/${id}?access_token=${params}&${fields}`)
      .then(result => {
        result = result.body
        if (result.error) {
          reject(result.error.message || result.error)
        } else {
          payload = {
            id: result.id,
            name: result.id,
            status: result.order_status,
            createdAt: result.created,
            channel: result.channel,
            billingAddress: {
              name: result.shipping_address.name,
              address1: result.shipping_address.street1,
              address2: result.shipping_address.street2,
              city: result.shipping_address.city,
              province: result.shipping_address.state,
              country: result.shipping_address.country
            },
            shippingAddress: {
              name: result.shipping_address.name,
              address1: result.shipping_address.street1,
              address2: result.shipping_address.street2,
              city: result.shipping_address.city,
              province: result.shipping_address.state,
              country: result.shipping_address.country
            },
            customer: {
              firstName: result.buyer_details.name,
              email: result.buyer_details.email
            },
            email: result.buyer_details.email
          }
          const itemsFields = 'fields=id,product_name,quantity,price_per_unit,product_id'
          return needle('get', `${API_URL}/${id}/items?access_token=${params}&${itemsFields}`)
        }
      })
      .then(async items => {
        if (items.body.error) {
          reject(items.body.error.message || items.body.error)
        } else {
          items = items.body.data
          payload.lineItems = await Promise.all(items.map(async item => {
            let productDetails = await needle('get', `${API_URL}/${item.product_id}?access_token=${params}`)
            return {
              id: item.id,
              title: item.product_name,
              name: item.product_name,
              variant_title: item.product_name,
              price: item.price_per_unit.amount,
              currency: item.price_per_unit.currency,
              quantity: item.quantity,
              image: productDetails.body.image_url
            }
          }))
          resolve(payload)
        }
      })
      .catch(err => reject(err))
  })
}

function initShops (credentials) {
  return credentials.shopToken
}
