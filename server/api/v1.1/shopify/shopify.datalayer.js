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
  return callApi(`shopify/query`, 'post', query, accounts)
}
