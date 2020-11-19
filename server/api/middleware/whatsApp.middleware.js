'use strict'
const compose = require('composable-middleware')
const utility = require('../v1.1/utility')
const logger = require('../../components/logger')
const TAG = 'api/middleware/whatsapp.middleware.js'

exports.attachProviderInfo = () => {
  return compose().use((req, res, next) => {
    utility.callApi(`companyProfile/query`, 'post', { _id: req.user.companyId })
      .then(companyProfile => {
        if (!companyProfile) {
          return res.status(500).json({
            status: 'failed',
            description: 'No company profile found'
          })
        }
        if (!companyProfile.whatsApp) {
          return res.status(500).json({
            status: 'failed',
            description: 'No whatsApp Provider found'
          })
        }
        req.user.whatsApp = companyProfile.whatsApp
        next()
      })
      .catch(err => {
        const message = err || 'unable fetch pages'
        logger.serverLog(message, `${TAG}: exports.attachProviderInfo`, {}, {user: req.user}, 'error')
        return res.status(500)
          .json({ status: 'failed', description: `Internal Server Error: ${err}` })
      })
  })
}
