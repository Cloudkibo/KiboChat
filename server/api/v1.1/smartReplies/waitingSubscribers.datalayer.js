/*
This file will contain the functions for data layer.
By separating it from controller, we are separating the concerns.
Thus we can use it from other non express callers like cron etc
*/
const { callApi } = require('../utility')

exports.findOneWaitingSubscriberObject = (subscriberId) => {
  let query = {
    purpose: 'findOne',
    match: {_id: subscriberId}
  }
  return callApi(`smart_replies/waiting/query`, 'post', query, '', 'kibochat')
}

exports.findAllWaitingSubscriberObjects = () => {
  let query = {
    purpose: 'findAll',
    match: {}
  }
  return callApi(`smart_replies/waiting/query`, 'post', query, '', 'kibochat')
}

exports.findOneWaitingSubscriberObjectUsingQuery = (queryObject) => {
  let query = {
    purpose: 'findOne',
    match: queryObject
  }
  return callApi(`smart_replies/waiting/query`, 'post', query, '', 'kibochat')
}

exports.findAllWaitingSubscriberObjectsUsingQuery = (queryObject) => {
  let query = {
    purpose: 'findAll',
    match: queryObject
  }
  return callApi(`smart_replies/waiting/query`, 'post', query, '', 'kibochat')
}

exports.findWaitingSubscriberObjectsUsingAggregate = (aggregateObject) => {
  // Will call aggregate of kibochat dblayer - currently not being used in controller
  return new Promise(() => {})
}

exports.createWaitingSubscriberObject = (payload) => {
  return callApi(`smart_replies/waiting`, 'post', payload, '', 'kibochat')
}

exports.updateWaitingSubscriberObject = (subscriberId, payload) => {
  let query = {
    purpose: 'updateOne',
    match: {_id: subscriberId},
    updated: payload
  }
  return callApi(`smart_replies/waiting`, 'put', query, '', 'kibochat')
}

exports.genericUpdateWaitingSubscriberObject = (queryObject, updated, options) => {
  let query = {
    purpose: 'updateAll',
    match: queryObject,
    updated: updated
  }
  if (options.upsert) query.upsert = options.upsert
  if (options.multi) query.multi = options.multi
  if (options.new) query.new = options.new
  return callApi(`smart_replies/waiting`, 'put', query, '', 'kibochat')
}

exports.genericUpdateWaitingSubscriberObject = (queryObject, updated) => {
  let query = {
    purpose: 'updateOne',
    match: queryObject,
    updated: updated
  }
  return callApi(`smart_replies/waiting`, 'put', query, '', 'kibochat')
}

exports.genericFindByIdAndUpdate = (queryObject, updated) => {
  let query = {
    purpose: 'updateOne',
    match: queryObject,
    updated: updated
  }
  return callApi(`smart_replies/waiting`, 'put', query, '', 'kibochat')
}

exports.deleteWaitingSubscriberObject = (subscriberId) => {
  let query = {
    purpose: 'deleteOne',
    match: {_id: subscriberId}
  }
  return callApi(`smart_replies/waiting`, 'delete', query, '', 'kibochat')
}

exports.deleteWaitingSubscriberObjectUsingQuery = (queryObject) => {
  let query = {
    purpose: 'deleteOne',
    match: queryObject
  }
  return callApi(`smart_replies/waiting`, 'delete', query, '', 'kibochat')
}
