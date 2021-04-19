const { callApi } = require('../utility')
const logger = require('../../../components/logger')
const TAG = '/plans/controller.js'
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')

exports.index = function (req, res) {
  const platform = req.params.platform

  callApi('plans/query', 'post', {platform})
    .then(plans => {
      return sendSuccessResponse(res, 200, plans)
    })
    .catch(err => {
      const message = err || 'Error at fetching platform plans'
      logger.serverLog(message, `${TAG}: exports.index`, req.body, {platform}, 'error')
      return sendErrorResponse(res, 500, null, 'Error at fetching platform plans')
    })
}
