
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')
const utility = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/companyPreferences/companyPreferences.controller.js'

exports.fetch = function (req, res) {
  utility.callApi(`companypreferences`, 'get', {}, 'accounts', req.headers.authorization)
    .then(companypreferences => {
      sendSuccessResponse(res, 200, companypreferences)
    })
    .catch(error => {
      const message = error || 'Failed to fetch companypreferences'
      logger.serverLog(message, `${TAG}: exports.index`, {}, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to fetch companypreferences ${JSON.stringify(error)}`)
    })
}
