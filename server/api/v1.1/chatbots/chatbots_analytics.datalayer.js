
const { callApi } = require('../utility')
const { kibochat } = require('../../global/constants').serverConstants

exports.findOneBotAnalytics = (match) => {
  let query = {
    purpose: 'findOne',
    match: match
  }
  return callApi(`chatbot_analytics/query`, 'post', query, kibochat)
}

exports.findAllBotAnalytics = (match) => {
  let query = {
    purpose: 'findAll',
    match: match
  }
  return callApi(`chatbot_analytics/query`, 'post', query, kibochat)
}

exports.createForBotAnalytics = (payload) => {
  return callApi(`chatbot_analytics`, 'post', payload, kibochat)
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
  return callApi(`chatbot_analytics`, 'put', query, kibochat)
}

