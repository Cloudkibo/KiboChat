
const { callApi } = require('../utility')
const { kibochat } = require('../../global/constants').serverConstants

exports.findOneBotAnalytics = (match) => {
  let query = {
    purpose: 'findOne',
    match: match
  }
  return callApi(`whatsappbotsanalytics/query`, 'post', query, kibochat)
}

exports.findAllBotAnalytics = (match) => {
  let query = {
    purpose: 'findAll',
    match: match
  }
  return callApi(`whatsappbotsanalytics/query`, 'post', query, kibochat)
}

exports.createForBotAnalytics = (payload) => {
  return callApi(`whatsappbotsanalytics`, 'post', payload, kibochat)
}

exports.genericUpdateBotAnalytics = (queryObject, updated, options) => {
  let query = {
    purpose: 'updateAll',
    match: queryObject,
    updated: updated
  }
  if (options) {
    if (options.upsert) query.upsert = options.upsert
    if (options.new) query.new = options.new
    if (options.multi) query.multi = options.multi
  }
  return callApi(`whatsappbotsanalytics`, 'put', query, kibochat)
}

exports.aggregateForBotAnalytics = (match, group, lookup, limit, sort, skip) => {
  let query = {
    purpose: 'aggregate',
    match: match
  }
  if (group) query.group = group
  if (lookup) query.lookup = lookup
  if (limit) query.limit = limit
  if (sort) query.sort = sort
  if (skip) query.skip = skip

  return callApi(`whatsappbotsanalytics/query`, 'post', query, kibochat)
}
