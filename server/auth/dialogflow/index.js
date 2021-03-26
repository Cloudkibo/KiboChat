const express = require('express')
const {google} = require('googleapis')
const config = require('../../config/environment')
const url = require('url')
const logger = require('../../components/logger')
const TAG = 'auth/dialogflow/index.js'
const { callApi } = require('../../api/v1.1/utility')

const router = express.Router()
let keys
let oAuth2Client

try {
  keys = require(config.DIALOGFLOW_OAUTH_KEYS)

  oAuth2Client = new google.auth.OAuth2(
    keys.web.client_id,
    keys.web.client_secret,
    config.DIALOGFLOW_OAUTH_REDIRECT_URI
  )
} catch (err) {
  console.log(err) // please leave this log. It will only be logged in development environment
}

router.get('/callback', async (req, res) => {
  try {
    const urlParts = url.parse(req.url, true)
    const query = urlParts.query

    const {tokens} = await oAuth2Client.getToken(query.code)
    const userId = req.cookies.userid
    const companyUser = await callApi(`companyUser/query`, 'post', { userId })
    if (companyUser) {
      const integrations = await callApi(`integrations/query`, 'post', { companyId: companyUser.companyId, integrationName: 'DIALOGFLOW' })
      if (integrations.length > 0) {
        callApi('integrations/update', 'put', {query: {_id: integrations[0]._id}, newPayload: {enabled: true}, options: {}})
          .then(upated => {
            res.redirect('/successMessage')
          })
          .catch(err => {
            const message = err || 'Failed to save dialogflow integration'
            logger.serverLog(message, `${TAG}: /callback`, {}, {}, 'error')
            res.redirect('/ErrorMessage')
          })
      } else {
        const payload = {
          companyId: companyUser.companyId,
          userId,
          integrationName: 'DIALOGFLOW',
          integrationToken: tokens.refresh_token,
          integrationPayload: tokens,
          enabled: true
        }
        callApi(`integrations`, 'post', payload)
          .then(created => {
            res.redirect('/successMessage')
          })
          .catch(err => {
            const message = err || 'Failed to save dialogflow integration'
            logger.serverLog(message, `${TAG}: /callback`, {}, {}, 'error')
            res.redirect('/ErrorMessage')
          })
      }
    } else {
      res.redirect('/ErrorMessage')
    }
  } catch (err) {
    const message = err || 'Failed to save dialogflow integration'
    logger.serverLog(message, `${TAG}: /callback`, {}, {}, 'error')
    res.redirect('/ErrorMessage')
  }
})

router.get('/', async (req, res) => {
  try {
    const authorizeUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/dialogflow'
      ]
    })
    res.redirect(authorizeUrl)
  } catch (err) {
    const message = err || 'Failed to save dialogflow integration'
    logger.serverLog(message, `${TAG}: /`, {}, {}, 'error')
    res.redirect('/ErrorMessage')
  }
})

module.exports = router
