const logger = require('../../../components/logger')
const TAG = '/api/v1/zoomIntegration/zoomIntegration.controller.js'
const { callApi } = require('../utility')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')

exports.getZoomUser = function (req, res) {
  callApi('zoomUsers/query', 'post', {purpose: 'findOne', match: {companyId: req.user.companyId, connected: true}})
    .then(zoomUser => {
      if (zoomUser) {
        sendSuccessResponse(res, 200, zoomUser)
      } else {
        sendSuccessResponse(res, 200, null, 'zoom_not_integrated')
      }
    })
    .catch(err => {
      logger.serverLog(TAG, err, 'error')
      sendErrorResponse(res, 500, undefined, 'Failed to get zoom integration')
    })
}
