const requestPromise = require('request-promise')
const config = require('../../../config/environment/index')
const logger = require('../../../components/logger')
const TAG = 'api/v1/utility/index.js'
const util = require('util')

exports.callApi = (endpoint, method = 'get', body, token) => {
  let headers = {
    'content-type': 'application/json',
    'Authorization': token
  }
  let options = {
    method: method.toUpperCase(),
    uri: `${config.API_URL_ACCOUNTS}${endpoint}`,
    headers,
    body,
    json: true
  }
  logger.serverLog(TAG, `requestPromise body ${util.inspect(body)}`)
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
