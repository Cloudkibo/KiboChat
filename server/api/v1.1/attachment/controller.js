const ogs = require('open-graph-scraper')
const logger = require('../../../components/logger')
const TAG = 'api/v1.1/attachment/controller.js'
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')

exports.handleUrl = function (req, res) {
  let options = { url: req.body.url }
  ogs(options, (error, results) => {
    if (error) {
      const message = error || 'Failed to fetch url meta data.'
      logger.serverLog(message, `${TAG}: exports.save`, req.body, {user: req.user}, 'error')
      return sendErrorResponse(res, 500, error, 'Failed to fetch url meta data.')
    }
    return sendSuccessResponse(res, 200, results.data, 'Fetched url meta data')
  })
}
