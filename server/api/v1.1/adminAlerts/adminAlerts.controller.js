const logger = require('../../../components/logger')
const TAG = 'api/adminAlerts/adminAlerts.controller.js'
const utility = require('../utility/index.js')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')

exports.index = function (req, res) {
  utility.callApi(`companypreferences`, 'get', {}, 'accounts', req.headers.authorization)
    .then(companypreferences => {
      var payload = {}
      if (companypreferences) {
        payload = {
          pendingSessionAlert: companypreferences.pendingSessionAlert,
          unresolveSessionAlert: companypreferences.unresolveSessionAlert
        }
      }
      sendSuccessResponse(res, 200, payload)
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch companypreferences ${JSON.stringify(error)}`)
    })
}

exports.update = function (req, res) {
  logger.serverLog(TAG, 'update endpoint of admin alerts is hit', 'debug')
  var newPayload = {
    pendingSessionAlert: req.body.pendingSessionAlert,
    unresolveSessionAlert: req.body.unresolveSessionAlert
  }
  utility.callApi(`companypreferences/update`, 'post', {query: {companyId: req.user.companyId}, newPayload: newPayload, options: {}}, 'accounts', req.headers.authorization)
    .then(updated => {
      sendSuccessResponse(res, 200, 'Notification settings updated succssfully')
    })
    .catch(err => {
      logger.serverLog(TAG, `Error occured while updating notification settings ${err}`, 'error')
      sendErrorResponse(res, 500, 'Error occured while updating notification settings')
    })
}
