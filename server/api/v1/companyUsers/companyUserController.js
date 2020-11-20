
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')
const utility = require('../../v1.1/utility')
const logger = require('../../../components/logger')
const TAG = 'api/companyUsers/companyUserController.js'

exports.update = function (req, res) {
  utility.callApi(`companyUser/update`, 'put', {query: {userId: req.user._id}, newPayload: req.body, options: {}})
    .then(updatedcompanyUser => {
      sendSuccessResponse(res, 200, updatedcompanyUser)
    })
    .catch(err => {
      const message = err || 'error in updating company user record'
      logger.serverLog(message, `${TAG}: exports.update`, req.body, { user: req.user }, 'error')
      sendErrorResponse(res, 500, `Failed to update companyUser ${err}`)
    })
}
