const needle = require('needle')
const config = require('../../../config/environment/index')
const logger = require('../../../components/logger')
const TAG = 'api/v1.1/utility/index.js'

exports.callApi = (endpoint, method = 'get', body, type = 'accounts', token) => {
  let headers
  if (token && token !== '') {
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
  } else if (type === 'kibodash') {
    apiUrl = config.kibodash
  } else if (type === 'COVIS') {
    apiUrl = config.COVIS
  } else if (type === 'engage') {
    apiUrl = config.KIBOENGAGE_URL
  } else if (type === 'kiboautomation') {
    apiUrl = config.KIBOAUTOMATION_URL
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
        const message = error || 'error in calling internal APIs'
        logger.serverLog(message, `${TAG}: exports.callApi`, {}, {body}, 'error')
      })
  })
}
