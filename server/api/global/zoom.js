const needle = require('needle')
const config = require('../../config/environment')
const { callApi } = require('../v1.1/utility')
const logger = require('../../components/logger')
const TAG = '/api/global/zoom.js'

const zoomApiCaller = (method, path, data, auth, qs) => {
  let authorization = ''
  if (auth.type === 'basic') {
    authorization = `Basic ${Buffer.from(config.zoomClientId + ':' + config.zoomClientSecret).toString('base64')}`
  } else if (auth.type === 'bearer') {
    authorization = `Bearer ${auth.token}`
  }
  const options = {
    json: !qs,
    headers: {
      'Authorization': authorization
    }
  }
  return new Promise((resolve, reject) => {
    needle.request(
      method.toUpperCase(),
      `https://api.zoom.us/${path}`,
      data,
      options,
      (err, response) => {
        if (err) {
          const message = err || 'error in zoom api'
          logger.serverLog(message, `${TAG}: exports.zoomApiCaller`, {}, {method, path, data}, 'error')
          reject(err)
        } else {
          resolve(response.body)
        }
      }
    )
  })
}

exports.refreshAccessToken = (zoomUser) => {
  return new Promise((resolve, reject) => {
    const params = {
      grant_type: 'refresh_token',
      refresh_token: zoomUser.refreshToken
    }
    zoomApiCaller('post', 'oauth/token', params, {type: 'basic'}, true)
      .then(response => {
        const accessToken = response.access_token
        const refreshToken = response.refresh_token
        if (accessToken) {
          callApi('zoomUsers', 'put', {purpose: 'updateOne', match: {_id: zoomUser._id}, updated: {accessToken, refreshToken}})
            .then(updated => resolve(accessToken))
            .catch(err => {
              reject(err)
            })
        } else {
          reject(new Error(`Failed to refresh access token ${JSON.stringify(response)}`))
        }
      })
      .catch(err => {
        reject(err)
      })
  })
}

exports.setDefaultFields = (data) => {
  let defaultZoomConfiguration = {
    account: data.zoomUserId,
    topic: data.topic,
    agenda: data.agenda,
    invitationMessage: data.invitationMessage
  }
  let newPayload = { defaultZoomConfiguration }
  callApi(`companypreferences/update`, 'post', {query: {companyId: data.companyId}, newPayload: newPayload, options: {}}, 'accounts')
    .then(updated => {
      logger.serverLog('Default values updated successfully', `${TAG}: exports.setDefaultFields`, {}, {data, updated}, 'info')
    })
    .catch(err => {
      let message = err || 'Error in setting default zoom configuration'
      logger.serverLog(message, `${TAG}: exports.setDefaultFields`, {}, {data, err}, 'error')
    })
}

exports.zoomApiCaller = zoomApiCaller
