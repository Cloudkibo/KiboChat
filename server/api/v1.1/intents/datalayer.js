const { callApi } = require('../utility')

exports.findAllIntents = function (payload) {
  const data = {
    purpose: 'findAll',
    match: payload
  }
  return callApi(
    'intents/query',
    'POST',
    data,
    'kibochat'
  )
}

exports.findOneIntent = function (payload) {
  const data = {
    purpose: 'findOne',
    match: payload
  }
  return callApi(
    'intents/query',
    'POST',
    data,
    'kibochat'
  )
}

exports.createIntent = function (payload) {
  return callApi(
    'intents',
    'POST',
    payload,
    'kibochat'
  )
}

exports.updateOneIntent = function (query, updated, options) {
  const data = {
    purpose: 'updateOne',
    match: query,
    updated: updated,
    upsert: options && options.upsert,
    new: options && options.new
  }
  return callApi(
    'intents',
    'PUT',
    data,
    'kibochat'
  )
}

exports.updateAllIntents = function (query, updated, options) {
  const data = {
    purpose: 'updateAll',
    match: query,
    updated: updated,
    upsert: options && options.upsert,
    new: options && options.new
  }
  return callApi(
    'intents',
    'PUT',
    data,
    'kibochat'
  )
}
