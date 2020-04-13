/*
This file will contain the functions for data layer.
By separating it from controller, we are separating the concerns.
Thus we can use it from other non express callers like cron etc
*/
const { callApi } = require('../utility')

exports.aggregate = (match, group, lookup, limit, sort, skip) => {
  let query = {
    purpose: 'aggregate',
    match: match
  }
  if (group) query.group = group
  if (lookup) query.lookup = lookup
  if (limit) query.limit = limit
  if (sort) query.sort = sort
  if (skip) query.skip = skip

  return callApi(`contactLists/query`, 'post', query)
}
exports.delete = (id) => {
  let query = {
    purpose: 'deleteOne',
    match: {_id: id}
  }
  return callApi(`contactLists`, 'delete', query)
}

exports.create = (payload) => {
  return callApi(`contactLists`, 'post', payload)
}

exports.findAllLists = (queryObject) => {
  let query = {
    purpose: 'findAll',
    match: queryObject
  }
  return callApi(`contactLists/query`, 'post', query)
}
