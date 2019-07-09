/*
This file will contain the functions for data layer.
By separating it from controller, we are separating the concerns.
Thus we can use it from other non express callers like cron etc
*/
const { callApi } = require('../utility')

exports.findOneAnswerObject = (answerId) => {
  let query = {
    purpose: 'findOne',
    match: {_id: answerId}
  }
  return callApi(`smart_replies/answers/query`, 'post', query, 'kibochat')
}

exports.findAllAnswerObjects = () => {
  let query = {
    purpose: 'findAll',
    match: {}
  }
  return callApi(`smart_replies/answers/query`, 'post', query, 'kibochat')
}

exports.findOneAnswerObjectUsingQuery = (queryObject) => {
  let query = {
    purpose: 'findOne',
    match: queryObject
  }
  return callApi(`smart_replies/answers/query`, 'post', query, 'kibochat')
}

exports.findAllAnswerObjectsUsingQuery = (queryObject) => {
  let query = {
    purpose: 'findAll',
    match: queryObject
  }
  return callApi(`smart_replies/answers/query`, 'post', query, 'kibochat')
}

exports.findAnswerObjectsUsingAggregate = (aggregateObject) => {
  // Will call aggregate of kibochat dblayer - currently not used in controller
  return new Promise(() => {})
}

exports.createAnswerObject = (payload) => {
  return callApi(`smart_replies/answers/query`, 'post', payload, 'kibochat')
}

exports.updateAnswerObject = (answerId, payload) => {
  let query = {
    purpose: 'updateOne',
    match: {_id: answerId},
    updated: payload
  }
  return callApi(`smart_replies/answers`, 'put', query, 'kibochat')
}

exports.genericUpdateAnswerObject = (queryObject, updated, options) => {
  let query = {
    purpose: 'updateAll',
    match: queryObject,
    updated: updated
  }
  if (options.upsert) query.upsert = options.upsert
  if (options.multi) query.multi = options.multi
  if (options.new) query.new = options.new
  return callApi(`smart_replies/answers`, 'put', query, 'kibochat')
}

exports.genericUpdateAnswerObject = (queryObject, updated) => {
  let query = {
    purpose: 'updateOne',
    match: queryObject,
    updated: updated
  }
  return callApi(`smart_replies/answers`, 'put', query, 'kibochat')
}

exports.genericFindByIdAndUpdate = (queryObject, updated) => {
  let query = {
    purpose: 'updateOne',
    match: queryObject,
    updated: updated
  }
  return callApi(`smart_replies/answers`, 'put', query, 'kibochat')
}

exports.deleteAnswerObject = (answerId) => {
  let query = {
    purpose: 'deleteOne',
    match: {_id: answerId}
  }
  return callApi(`smart_replies/answers`, 'delete', query, 'kibochat')
}

exports.deleteAnswerObjectUsingQuery = (queryObject) => {
  let query = {
    purpose: 'deleteOne',
    match: queryObject
  }
  return callApi(`smart_replies/answers`, 'delete', query, 'kibochat')
}
