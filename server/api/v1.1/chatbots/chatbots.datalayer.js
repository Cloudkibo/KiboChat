const { callApi } = require('../utility')
const { kibochat } = require('../../global/constants').serverConstants

exports.findOneChatBot = (match) => {
  let query = {
    purpose: 'findOne',
    match: match
  }
  return callApi(`chatbots/query`, 'post', query, kibochat)
}

exports.findAllChatBots = (match) => {
  let query = {
    purpose: 'findAll',
    match: match
  }
  return callApi(`chatbots/query`, 'post', query, kibochat)
}

exports.createForChatBot = (payload) => {
  return callApi(`chatbots`, 'post', payload, kibochat)
}

exports.genericUpdateChatBot = (queryObject, updated, options) => {
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
  return callApi(`chatbots`, 'put', query, kibochat)
}

exports.deleteForChatBot = (queryObject) => {
  let query = {
    purpose: 'deleteMany',
    match: queryObject
  }
  return callApi(`chatbots`, 'delete', query, kibochat)
}
