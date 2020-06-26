'use strict'

const express = require('express')
const router = express.Router()
const { zoomApiCaller } = require('../../api/global/zoom')
const { callApi } = require('../../api/v1.1/utility')
const logger = require('../../components/logger')
const TAG = 'auth/zoom/index.js'
const config = require('../../config/environment')

router.get('/', (req, res) => {
  if (req.query.code && req.query.state) {
    const userContext = JSON.parse(req.query.state)
    const params = {
      grant_type: 'authorization_code',
      code: req.query.code,
      redirect_uri: config.zoomRedirectUri
    }
    zoomApiCaller('post', 'oauth/token', params, {type: 'basic'}, true)
      .then(response => {
        logger.serverLog(TAG, `Token response ${response}`)
        const accessToken = response.access_token
        const refreshToken = response.refresh_token
        if (accessToken) {
          zoomApiCaller('get', 'v2/users/me', {}, {type: 'bearer', token: accessToken}, false)
            .then(zoomUser => {
              const dataToSave = prepareZoomUserPayload(accessToken, refreshToken, zoomUser, userContext)
              callApi('zoomUsers', 'post', dataToSave)
                .then(saved => {
                  res.redirect('/successMessage')
                })
                .catch(err => {
                  logger.serverLog(TAG, `Failed to save zoom user ${err}`)
                  res.redirect('/ErrorMessage')
                })
            })
            .catch(err => {
              logger.serverLog(TAG, `Failed to fetch zoom user ${err}`)
              res.redirect('/ErrorMessage')
            })
        } else {
          logger.serverLog(TAG, 'zoom accessToken not found')
          res.redirect('/ErrorMessage')
        }
      })
      .catch(err => {
        logger.serverLog(TAG, `Failed to fetch accessToken ${err}`)
        res.redirect('/ErrorMessage')
      })
  } else if (req.query.companyId && req.query.userId) {
    res.redirect(`https://zoom.us/oauth/authorize?response_type=code&client_id=${config.zoomClientId}&redirect_uri=${config.zoomRedirectUri}$state=${encodeURIComponent(JSON.stringify({ userId: req.query.userId, companyId: req.query.companyId }))}`)
  } else {
    logger.serverLog(TAG, 'Parameters are missing')
    res.redirect('/ErrorMessage')
  }
})

function prepareZoomUserPayload (accessToken, refreshToken, zoomUser, userContext) {
  const payload = {
    userId: userContext.userId,
    companyId: userContext.companyId,
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
    refreshToken
  }
  return payload
}

module.exports = router
