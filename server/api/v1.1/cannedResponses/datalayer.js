const { callApi } = require('../utility')

exports.findAllResponses = function (payload) {
  const data = {
    purpose: 'findAll',
    match: payload
  }
  return callApi(
    'cannedResponses/query',
    'POST',
    data,
    'kibochat'
  )
}

exports.findOneResponse = function (payload) {
  const data = {
    purpose: 'findOne',
    match: payload
  }
  return callApi(
    'cannedResponses/query',
    'POST',
    data,
    'kibochat'
  )
}

exports.createResponse = function (payload) {
  return callApi(
    'cannedResponses',
    'POST',
    payload,
    'kibochat'
  )
}

exports.updateOneResponse = function (query, updated, options) {
  const data = {
    purpose: 'updateOne',
    match: query,
    updated: updated,
    upsert: options && options.upsert,
    new: options && options.new
  }
  return callApi(
    'cannedResponses',
    'PUT',
    data,
    'kibochat'
  )
}

exports.updateAllResponses = function (query, updated, options) {
  const data = {
    purpose: 'updateAll',
    match: query,
    updated: updated,
    upsert: options && options.upsert,
    new: options && options.new
  }
  return callApi(
    'cannedResponses',
    'PUT',
    data,
    'kibochat'
  )
}

exports.deleteOneResponse = function (query) {
  const data = {
    purpose: 'deleteOne',
    match: query
  }
  return callApi(
    'cannedResponses',
    'DELETE',
    data,
    'kibochat'
  )
}
