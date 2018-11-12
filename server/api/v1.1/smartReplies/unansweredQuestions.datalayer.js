/*
This file will contain the functions for data layer.
By separating it from controller, we are separating the concerns.
Thus we can use it from other non express callers like cron etc
*/
const { callApi } = require('../utility')

exports.findOneUnansweredQuestionObject = (questionId) => {
  let query = {
    purpose: 'findOne',
    match: {_id: questionId}
  }
  return callApi(`smart_replies/unanswered/query`, 'post', query, '', 'kibochat')
}

exports.findAllUnansweredQuestionObjects = () => {
  let query = {
    purpose: 'findAll',
    match: {}
  }
  return callApi(`smart_replies/unanswered/query`, 'post', query, '', 'kibochat')
}

exports.findOneUnansweredQuestionObjectUsingQuery = (queryObject) => {
  let query = {
    purpose: 'findOne',
    match: queryObject
  }
  return callApi(`smart_replies/unanswered/query`, 'post', query, '', 'kibochat')
}

exports.findAllUnansweredQuestionObjectsUsingQuery = (queryObject) => {
  let query = {
    purpose: 'findAll',
    match: queryObject
  }
  return callApi(`smart_replies/unanswered/query`, 'post', query, '', 'kibochat')
}

exports.findUnansweredQuestionObjectsUsingAggregate = (aggregateObject) => {
  // Will call aggregate of kibochat dblayer - currently not used in controller
  return new Promise(() => {})
}

exports.createUnansweredQuestionObject = (payload) => {
  return callApi(`smart_replies/unanswered`, 'post', payload, '', 'kibochat')
}

exports.updateUnansweredQuestionObject = (questionId, payload) => {
  let query = {
    purpose: 'updateOne',
    match: {_id: questionId},
    updated: payload
  }
  return callApi(`smart_replies/unanswered/query`, 'put', query, '', 'kibochat')
}

exports.genericUpdateUnansweredQuestionObject = (queryObject, updated, options) => {
  let query = {
    purpose: 'updateOne',
    match: queryObject,
    updated: updated
  }
  if (options.upsert) query.upsert = options.upsert
  if (options.multi) query.multi = options.multi
  if (options.new) query.new = options.new
  return callApi(`smart_replies/unanswered/query`, 'put', query, '', 'kibochat')
}

exports.genericUpdateUnansweredQuestionObject = (queryObject, updated) => {
  let query = {
    purpose: 'updateOne',
    match: queryObject,
    updated: updated
  }
  return callApi(`smart_replies/unanswered/query`, 'put', query, '', 'kibochat')
}

exports.genericFindByIdAndUpdate = (queryObject, updated) => {
  let query = {
    purpose: 'updateOne',
    match: queryObject,
    updated: updated
  }
  return callApi(`smart_replies/unanswered/query`, 'put', query, '', 'kibochat')
}

exports.deleteUnansweredQuestionObject = (questionId) => {
  let query = {
    purpose: 'deleteOne',
    match: {_id: questionId}
  }
  return callApi(`smart_replies/unanswered/query`, 'delete', query, '', 'kibochat')
}

exports.deleteUnansweredQuestionObjectUsingQuery = (queryObject) => {
  let query = {
    purpose: 'deleteOne',
    match: queryObject
  }
  return callApi(`smart_replies/unanswered/query`, 'delete', query, '', 'kibochat')
}
