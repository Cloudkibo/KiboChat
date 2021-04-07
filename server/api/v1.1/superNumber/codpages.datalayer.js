const { callApi } = require('../utility')

exports.findAll = function (payload) {
  const data = {
    purpose: 'findAll',
    match: payload
  }
  return callApi(
    'codverificationpages/query',
    'POST',
    data,
    'kibochat'
  )
}

exports.findOne = function (payload) {
  const data = {
    purpose: 'findOne',
    match: payload
  }
  return callApi(
    'codverificationpages/query',
    'POST',
    data,
    'kibochat'
  )
}

exports.create = function (payload) {
  return callApi(
    'codverificationpages',
    'POST',
    payload,
    'kibochat'
  )
}

exports.update = function (purpose, query, updated, options) {
  const data = {
    purpose: purpose,
    match: query,
    updated: updated,
    upsert: options && options.upsert,
    new: options && options.new
  }
  return callApi(
    'codverificationpages',
    'PUT',
    data,
    'kibochat'
  )
}

exports.updateAll = function (query, updated, options) {
  const data = {
    purpose: 'updateAll',
    match: query,
    updated: updated,
    upsert: options && options.upsert,
    new: options && options.new
  }
  return callApi(
    'codverificationpages',
    'PUT',
    data,
    'kibochat'
  )
}

exports.deleteOne = function (query) {
  const data = {
    purpose: 'deleteOne',
    match: query
  }
  return callApi(
    'codverificationpages',
    'DELETE',
    data,
    'kibochat'
  )
}
