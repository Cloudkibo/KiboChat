'use strict'
const compose = require('composable-middleware')
const utility = require('../v1.1/utility')

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
        return res.status(500)
          .json({ status: 'failed', description: `Internal Server Error: ${err}` })
      })
  })
}
