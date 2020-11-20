
// Get a single verificationtoken
const utility = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/v1.1/verificationtoken/verificationtoken.controller.js'
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')

exports.resend = function (req, res) {
  utility.callApi(`verificationtoken/resend`, 'get', {}, 'accounts', req.headers.authorization)
    .then(response => {
      sendSuccessResponse(res, 200, response)
    })
    .catch(err => {
      const message = err || 'Failed to resend verification token'
      logger.serverLog(message, `${TAG}: exports.resend`, {}, {user: req.user}, 'error')
      sendErrorResponse(res, 500, 'Internal Server Error ' + err)
    })
}
