const { callApi } = require('../utility')

exports.createStoreInfo = (payload) => {
  return callApi(`abandoned_cart/storeinfo`, 'post', payload, 'kiboengage')
}

exports.createStoreAnalytics = (payload) => {
  return callApi(`abandoned_cart/storeanalytics`, 'post', payload, 'kiboengage')
}
