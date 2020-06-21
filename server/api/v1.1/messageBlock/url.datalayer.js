const { callApi } = require('../utility')
const { kiboengage } = require('../../global/constants').serverConstants

exports.createURLObject = (payload) => {
  return callApi(`urls`, 'post', payload, kiboengage)
}
exports.findOneURL = (id) => {
  let query = {
    purpose: 'findOne',
    match: {_id: id}
  }
  return callApi(`urls/query`, 'post', query, kiboengage)
}
exports.genericFind = (queryObject) => {
  let query = {
    purpose: 'findOne',
    match: queryObject
  }
  return callApi(`urls/query`, 'post', query, kiboengage)
}
exports.updateOneURL = (id, payload) => {
  let query = {
    purpose: 'updateOne',
    match: {_id: id},
    updated: payload
  }
  return callApi(`urls`, 'put', query, kiboengage)
}
exports.deleteOneURL = (id) => {
  let query = {
    purpose: 'deleteOne',
    match: {_id: id}
  }
  return callApi(`urls`, 'delete', query, kiboengage)
}
