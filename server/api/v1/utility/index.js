const needle = require('needle')
const config = require('../../../config/environment/index')
const logger = require('../../../components/logger')
const TAG = 'api/v1/utility/index.js'

exports.callApi = (endpoint, method = 'get', body, type = 'accounts', token) => {
  let headers
  if (token) {
    headers = {
      'content_type': 'application/json',
      'Authorization': token
    }
  } else {
    headers = {
      'content_type': 'application/json',
      'is_kibo_product': true
    }
  }
  let apiUrl = config.ACCOUNTS_URL
  if (type === 'kiboengage') {
    apiUrl = config.DBLAYER_URL_KIBOENGAGE
  } else if (type === 'kibochat') {
    apiUrl = config.DBLAYER_URL_KIBOCHAT
  }
  let options = {
    method: method.toUpperCase(),
    uri: `${apiUrl}/${endpoint}`,
    headers,
    body,
    json: true
  }
  return new Promise((resolve, reject) => {
    needle(method, options.uri, body, options)
      .then(response => {
        if (response.body.status === 'success') {
          resolve(response.body.payload)
        } else {
          reject(response.body.payload)
        }
      })
      .catch(error => {
        reject(error)
        logger.serverLog(TAG, `error in calling internal APIs ${JSON.stringify(error)}`, 'error')
      })
  })
}
