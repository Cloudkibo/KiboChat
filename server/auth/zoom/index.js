'use strict'

const express = require('express')
const router = express.Router()
const { zoomApiCaller } = require('../../api/global/zoom')
const { callApi } = require('../../api/v1.1/utility')
const logger = require('../../components/logger')
const TAG = 'auth/zoom/index.js'
const config = require('../../config/environment')
const auth = require('../auth.service')

router.get('/', auth.isAuthenticated(), (req, res) => {
  const userId = req.user._id
  const companyId = req.user.companyId
  return res.status(200).json({status: 'success', payload: `https://zoom.us/oauth/authorize?response_type=code&client_id=${config.zoomClientId}&redirect_uri=${config.zoomRedirectUri}&state=${userId}-${companyId}`})
})

router.get('/callback', (req, res) => {
  if (req.query.code && req.query.state) {
    const userContext = req.query.state.split('-')
    const params = {
      grant_type: 'authorization_code',
      code: req.query.code,
      redirect_uri: config.zoomRedirectUri
    }
    zoomApiCaller('post', 'oauth/token', params, {type: 'basic'}, true)
      .then(response => {
        const accessToken = response.access_token
        const refreshToken = response.refresh_token
        if (accessToken) {
          zoomApiCaller('get', 'v2/users/me', {}, {type: 'bearer', token: accessToken}, false)
            .then(zoomUser => {
              callApi('zoomUsers/query', 'post', {purpose: 'findOne', match: {zoomId: zoomUser.id, connected: true}})
                .then(zoomRecord => {
                  if (zoomRecord) {
                    res.redirect('/alreadyConnected')
                  } else {
                    const dataToSave = prepareZoomUserPayload(accessToken, refreshToken, zoomUser, userContext)
                    callApi('zoomUsers', 'put', {purpose: 'updateOne', match: {companyId: userContext[1], zoomId: zoomUser.id}, updated: dataToSave, upsert: true})
                      .then(saved => {
                        res.redirect('/successMessage')
                      })
                      .catch(err => {
                        const message = err || 'Failed to save zoom user'
                        logger.serverLog(message, `${TAG}: exports.callback`, {}, {}, 'error')
                        res.redirect('/ErrorMessage')
                      })
                  }
                })
                .catch(err => {
                  const message = err || 'Failed to save zoom user'
                  logger.serverLog(message, `${TAG}: exports.callback`, {}, {}, 'error')
                  res.redirect('/ErrorMessage')
                })
            })
            .catch(err => {
              const message = err || 'Failed to save zoom user'
              logger.serverLog(message, `${TAG}: exports.callback`, {}, {}, 'error')
              res.redirect('/ErrorMessage')
            })
        } else {
          res.redirect('/ErrorMessage')
        }
      })
      .catch(err => {
        const message = err || 'Failed to fetch accessToken'
        logger.serverLog(message, `${TAG}: exports.callback`, {}, {}, 'error')
        res.redirect('/ErrorMessage')
      })
  } else {
    res.redirect('/ErrorMessage')
  }
})

function prepareZoomUserPayload (accessToken, refreshToken, zoomUser, userContext) {
  const payload = {
    userId: userContext[0],
    companyId: userContext[1],
    zoomId: zoomUser.id,
    firstName: zoomUser.first_name,
    lastName: zoomUser.last_name,
    zoomRole: zoomUser.role_name,
    personalMeetingUrl: zoomUser.personal_meeting_url,
    profilePic: zoomUser.pic_url,
    language: zoomUser.language,
    phoneCountry: zoomUser.phone_country,
    phoneNumber: zoomUser.phone_number,
    accessToken,
    refreshToken,
    connected: true,
    datetime: new Date()
  }
  return payload
}

module.exports = router
