const { callApi } = require('../utility')
const { kiboengage } = require('../../global/constants').serverConstants

exports.findOneMessageBlock = (match) => {
  let query = {
    purpose: 'findOne',
    match: match
  }
  return callApi(`messageBlocks/query`, 'post', query, kiboengage)
}

exports.findAllMessageBlock = (match) => {
  let query = {
    purpose: 'findAll',
    match: match
  }
  return callApi(`messageBlocks/query`, 'post', query, kiboengage)
}

exports.createForMessageBlock = (payload) => {
  return callApi(`messageBlocks`, 'post', payload, kiboengage)
}

exports.genericUpdateMessageBlock = (queryObject, updated, options) => {
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
  return callApi(`messageBlocks`, 'put', query, kiboengage)
}

exports.deleteForMessageBlock = (queryObject) => {
  let query = {
    purpose: 'deleteMany',
    match: queryObject
  }
  return callApi(`messageBlocks`, 'delete', query, kiboengage)
}
