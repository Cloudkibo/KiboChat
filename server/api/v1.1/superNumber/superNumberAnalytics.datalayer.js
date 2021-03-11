const { callApi } = require('../utility')

exports.findAll = function (payload) {
  const data = {
    purpose: 'findAll',
    match: payload
  }
  return callApi(
    'superNumberAnalytics/query',
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
    'superNumberAnalytics/query',
    'POST',
    data,
    'kibochat'
  )
}

exports.create = function (payload) {
  return callApi(
    'superNumberAnalytics',
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
    'superNumberAnalytics',
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
    'superNumberAnalytics',
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
    'superNumberAnalytics',
    'DELETE',
    data,
    'kibochat'
  )
}
exports.aggregate = (match, group, project, lookup, limit, sort, skip) => {
  let query = {
    purpose: 'aggregate',
    match: match
  }
  if (project) query.project = project
  if (group) query.group = group
  if (lookup) query.lookup = lookup
  if (limit) query.limit = limit
  if (sort) query.sort = sort
  if (skip) query.skip = skip

  return callApi(`superNumberAnalytics/query`, 'post', query, 'kibochat')
}
