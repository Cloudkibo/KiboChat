const { callApi } = require('../utility')
const { accounts } = require('../../global/constants').serverConstants

exports.createShopifyIntegration = (payload) => {
  return callApi(`shopify`, 'post', payload, accounts)
}

exports.findOneShopifyIntegration = (match) => {
  let query = {
    purpose: 'findOne',
    match: match
  }
  console.log('query', query)
  return callApi(`shopify/query`, 'post', query, accounts)
}

exports.deleteShopifyIntegration = (queryObject) => {
  let query = {
    purpose: 'deleteOne',
    match: queryObject
  }
  return callApi(`shopify`, 'delete', query, accounts)
}
