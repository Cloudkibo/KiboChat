const { callApi } = require('../utility')

exports.createShopifyIntegration = (payload) => {
  return callApi(`shopify`, 'post', payload, 'accounts')
}

exports.createStoreAnalytics = (payload) => {
  return callApi(`shopify`, 'post', payload, 'accounts')
}
