const requestPromise = require('request-promise')
const config = require('../../../config/environment/index')
// const logger = require('../../../components/logger')
// const TAG = 'api/v1/utility/index.js'
// const util = require('util')

exports.callApi = (endpoint, method = 'get', body, type = 'accounts', token) => {
  let headers
  if (token && token !== '') {
    headers = {
      'content-type': 'application/json',
      'Authorization': token
    }
  } else {
    headers = {
      'content-type': 'application/json',
      'is_kibo_product': true
    }
  }
  let apiUrl = config.ACCOUNTS_URL
  if (type === 'kiboengage') {
    apiUrl = config.DBLAYER_URL_KIBOENGAGE
  } else if (type === 'kibochat') {
    apiUrl = config.DBLAYER_URL_KIBOCHAT
  } else if (type === 'kibodash') {
    apiUrl = config.kibodash
  } else if (type === 'COVIS') {
    apiUrl = config.COVIS
  }
  let options = {
    method: method.toUpperCase(),
    uri: `${apiUrl}/${endpoint}`,
    headers,
    body,
    json: true
  }
  // logger.serverLog(TAG, `requestPromise body ${util.inspect(body)}`)
  return requestPromise(options).then(response => {
    // logger.serverLog(TAG, `response from accounts ${util.inspect(response)}`)
    return new Promise((resolve, reject) => {
      if (response.status === 'success') {
        resolve(response.payload)
      } else {
        reject(response.payload)
      }
    })
  })
}
