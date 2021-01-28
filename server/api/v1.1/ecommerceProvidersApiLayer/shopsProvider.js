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

const needle = require('needle')

const API_URL = 'https://graph.facebook.com/v8.0'

exports.fetchBusinessAccounts = (credentials) => {
  const params = initShops(credentials)
  return new Promise(function (resolve, reject) {
    const fields = 'fields=id,name,primary_page,created_by'
    needle('get', `${API_URL}/me/businesses?access_token=${params}&${fields}`)
      .then(result => {
        result = result.body
        resolve(result)
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
        resolve(result)
      })
      .catch(err => reject(err))
  })
}

exports.fetchAllProductCategories = (name, credentials) => {
  const params = initShops(credentials)
  return new Promise(function (resolve, reject) {
    needle('get', `${API_URL}/cities?access_key=${params}&search=${name}`)
      .then(result => {
        result = result.body
        let payload = result.data
        payload = payload.map(item => {
          return {
            categoryName: item.name,
            categoryId: item.id
          }
        })
        resolve(payload)
      })
      .catch(err => reject(err))
  })
}

exports.fetchProductsInThisCategory = (category, credentials) => {
  const params = initShops(credentials)
  return new Promise(function (resolve, reject) {
    needle('get', `${API_URL}/${category}?access_key=${params}&search`)
      .then(result => {
        result = result.body
        let payload = result.data
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
            inventory: item.inventory
          }
        })
        resolve(payload)
      })
      .catch(err => reject(err))
  })
}

exports.fetchProducts = (query, credentials) => {
  const params = initShops(credentials)
  return new Promise(function (resolve, reject) {
    const fields = 'fields=id,name,fb_product_category,currency,image_url,price,product_type,brand'
    needle('get', `${API_URL}/${query}/products?access_token=${params}&${fields}`)
      .then(result => {
        result = result.body
        let payload = result.data
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
      })
      .catch(err => reject(err))
  })
}

exports.searchProducts = (query, catalogId, credentials) => {
  const params = initShops(credentials)
  return new Promise(function (resolve, reject) {
    const fields = 'fields=id,name,fb_product_category,currency,image_url,price,product_type,brand'
    const filter = `filter=${JSON.stringify({name: { i_contains: query }})}`
    needle('get', `${API_URL}/${catalogId}/products?access_token=${params}&${filter}&${fields}`)
      .then(result => {
        result = result.body
        let payload = result.data
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
      })
      .catch(err => reject(err))
  })
}

function initShops (credentials) {
  return credentials.shopToken
}
