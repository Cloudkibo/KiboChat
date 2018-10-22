const requestPromise = require('request-promise')
const config = require('../../../config/environment/index')
const logger = require('../../../components/logger')
const TAG = 'api/v2/utility/index.js'
exports.callApi = (endpoint, method = 'get', body, token) => {
  let headers = {
    'content-type': 'application/json',
    'Authorization': token
  }
  let path = ''
  if (endpoint === 'auth/verify') {
    path = config.env === 'production'
      ? `https://accounts.cloudkibo.com/${endpoint}`
      : config.env === 'staging' ? `https://saccounts.cloudkibo.com/${endpoint}`
        : `http://localhost:3000/${endpoint}`
  } else {
    path = `${config.API_URL_ACCOUNTS}${endpoint}`
  }
  let options = {
    method: method.toUpperCase(),
    uri: path,
    headers,
    body,
    json: true
  }
  logger.serverLog(TAG, `requestPromise options ${JSON.stringify(options)}`)
  return requestPromise(options)
}
