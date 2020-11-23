const { callApi } = require('../utility')
const { accounts } = require('../../global/constants').serverConstants

exports.findAllMessengerComponents = (match) => {
  let query = {
    purpose: 'findAll',
    match: match
  }
  return callApi(`messenger_components/query`, 'post', query, accounts)
}
