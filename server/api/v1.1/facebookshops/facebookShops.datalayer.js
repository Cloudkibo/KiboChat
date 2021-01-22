const { callApi } = require('../utility')
const { accounts } = require('../../global/constants').serverConstants

exports.createFacebookShop = (payload) => {
  return callApi(`facebookshops`, 'post', payload, accounts)
}

exports.findOneFacebookShop = (match) => {
  let query = {
    purpose: 'findOne',
    match: match
  }
  return callApi(`facebookshops/query`, 'post', query, accounts)
}

exports.deleteFacebookShop = (queryObject) => {
  let query = {
    purpose: 'deleteOne',
    match: queryObject
  }
  return callApi(`facebookshops`, 'delete', query, accounts)
}
