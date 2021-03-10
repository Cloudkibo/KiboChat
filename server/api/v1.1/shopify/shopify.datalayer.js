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

exports.findShopifyIntegrations = (match) => {
  let query = {
    purpose: 'findAll',
    match: match
  }
  return callApi(`shopify/query`, 'post', query, accounts)
}

exports.deleteShopifyIntegration = (queryObject) => {
  let query = {
    purpose: 'deleteOne',
    match: queryObject
  }
  return callApi(`shopify`, 'delete', query, accounts)
}

exports.update = (purpose, queryObject, updated) => {
  let query = {
    purpose: purpose,
    match: queryObject,
    updated: updated
  }
  return callApi(`shopify`, 'put', query, accounts)
}
