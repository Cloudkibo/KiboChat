const { callApi } = require('../utility')
const { accounts } = require('../../global/constants').serverConstants

exports.createBigCommerceIntegration = (payload) => {
  return callApi(`bigcommerce`, 'post', payload, accounts)
}

exports.findOneBigCommerceIntegration = (match) => {
  let query = {
    purpose: 'findOne',
    match: match
  }
  return callApi(`bigcommerce/query`, 'post', query, accounts)
}
