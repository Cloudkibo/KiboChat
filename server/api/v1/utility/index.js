const fetch = require('isomorphic-fetch')
const config = require('../../config/environment/index')

exports.callApi = (endpoint, method = 'get', body) => {
  console.log('endpoint', endpoint)
  let headers = {
    'content-type': 'application/json'
  }
  return fetch(`${config.API_URL_ACCOUNTS}/${endpoint}`, {
    headers,
    method,
    body: JSON.stringify(body)
  }).then(response => {
    return response
  }).then(response => response.json().then(json => ({ json, response })))
    .then(({ json, response }) => {
      if (!response.ok) {
        return Promise.reject(json)
      }
      return json
    })
    .then(
      response => response,
      error => error
    )
}
