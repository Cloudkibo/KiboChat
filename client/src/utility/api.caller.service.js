import fetch from 'isomorphic-fetch'
import _ from 'lodash'
import auth from './auth.service'

export const API_URL = '/api'

export default function callApi (endpoint, method = 'get', body, headers = {'content-type': 'application/json'}) {
  headers = _.merge(headers, {
    Authorization: `Bearer ${auth.getToken()}`
  })
  return fetch(`${API_URL}/${endpoint}`, {
    headers,
    method,
    body: JSON.stringify(body)
  }).then(response => {
    if (response.statusText === 'Unauthorized') {
      // auth.logout()
      // browserHistory.push('/')
      return Promise.reject(response.statusText)
    }
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
