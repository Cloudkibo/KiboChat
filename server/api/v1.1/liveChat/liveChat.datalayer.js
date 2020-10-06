const { callApi } = require('../utility')

exports.createFbMessageObject = (payload) => {
  return callApi(`livechat`, 'post', payload, 'kibochat')
}

exports.genericUpdate = (match, updated) => {
  let query = {
    purpose: 'updateAll',
    match: match,
    updated: updated
  }
  return callApi(`livechat`, 'put', query, 'kibochat')
}