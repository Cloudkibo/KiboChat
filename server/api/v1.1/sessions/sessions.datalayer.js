const { callApi } = require('../utility')

exports.findOneSessionUsingQuery = (queryObject) => {
  let query = {
    purpose: 'findOne',
    match: queryObject
  }
  return callApi(`sessions/query`, 'post', query, '', 'kibochat')
}
exports.createSessionObject = (payload) => {
  return callApi(`sessions`, 'post', payload, '', 'kibochat')
}
exports.updateSessionObject = (sessionId, payload) => {
  let query = {
    purpose: 'updateOne',
    match: {_id: sessionId},
    updated: payload
  }
  return callApi(`sessions`, 'put', query, '', 'kibochat')
}
