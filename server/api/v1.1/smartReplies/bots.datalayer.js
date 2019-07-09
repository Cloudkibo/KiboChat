/*
This file will contain the functions for data layer.
By separating it from controller, we are separating the concerns.
Thus we can use it from other non express callers like cron etc
*/
const { callApi } = require('../utility')

exports.findOneBotObject = (botId) => {
  let query = {
    purpose: 'findOne',
    match: {_id: botId}
  }
  return callApi(`smart_replies/query`, 'post', query, 'kibochat')
}

exports.findAllBotObjects = () => {
  let query = {
    purpose: 'findAll',
    match: {}
  }
  return callApi(`smart_replies/query`, 'post', query, 'kibochat')
}

exports.findOneBotObjectUsingQuery = (queryObject) => {
  let query = {
    purpose: 'findOne',
    match: queryObject
  }
  return callApi(`smart_replies/query`, 'post', query, 'kibochat')
}

exports.findAllBotObjectsUsingQuery = (queryObject) => {
  let query = {
    purpose: 'findAll',
    match: queryObject
  }
  return callApi(`smart_replies/query`, 'post', query, 'kibochat')
}

exports.findBotObjectsUsingAggregate = (aggregateObject) => {
  // Will call aggregate of kibochat dblayer - currently not being used in controller
  return new Promise(() => {})
}

exports.createBotObject = (payload) => {
  return callApi(`smart_replies`, 'post', payload, 'kibochat')
}

exports.updateBotObject = (queryObject, payload) => {
  let query = {
    purpose: 'updateOne',
    match: queryObject,
    updated: payload
  }
  return callApi(`smart_replies`, 'put', query, 'kibochat')
}

exports.genericUpdateBotObject = (queryObject, updated, options) => {
  let query = {
    match: queryObject,
    updated: updated
  }
  if (options) {
    query.purpose = 'updateAll'
    if (options.upsert) query.upsert = options.upsert
    if (options.multi) query.multi = options.multi
    if (options.new) query.new = options.new
  } else {
    query.purpose = 'updateOne'
  }

  return callApi(`smart_replies`, 'put', query, 'kibochat')
}

exports.genericFindByIdAndUpdate = (queryObject, updated) => {
  let query = {
    purpose: 'updateOne',
    match: queryObject,
    updated: updated
  }
  return callApi(`smart_replies`, 'put', query, 'kibochat')
}

exports.deleteBotObject = (botId) => {
  let query = {
    purpose: 'deleteOne',
    match: {_id: botId}
  }
  return callApi(`smart_replies`, 'delete', query, 'kibochat')
}

exports.deleteBotObjectUsingQuery = (queryObject) => {
  let query = {
    purpose: 'deleteOne',
    match: queryObject
  }
  return callApi(`smart_replies`, 'delete', query, 'kibochat')
}
