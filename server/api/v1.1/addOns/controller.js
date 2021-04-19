const logger = require('../../../components/logger')
const TAG = 'api/addOns/controller.js'
const LogicLayer = require('./logicLayer.js')
const { callApi } = require('../utility/index.js')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')

exports.create = function (req, res) {
  logger.serverLog(TAG, 'create endpoint of addOns is hit', 'debug')
  const payload = LogicLayer.createAddOnsPayload(req.body, req.user.platform)
  callApi(`addOns`, 'post', payload, 'accounts', req.headers.authorization)
    .then(created => {
      sendSuccessResponse(res, 200, 'Add On created succssfully')
    })
    .catch(err => {
      logger.serverLog(TAG, `Error occured while creating add on ${err}`, 'error')
      sendErrorResponse(res, 500, 'Error occured while creating add on')
    })
}
exports.index = function (req, res) {
  logger.serverLog(TAG, 'create endpoint of addOns is hit', 'debug')
  callApi(`addOns/query`, 'post', {purpose: 'findAll', match: {platform: req.user.platform}}, 'accounts', req.headers.authorization)
    .then(addOns => {
      sendSuccessResponse(res, 200, addOns)
    })
    .catch(err => {
      logger.serverLog(TAG, `Error occured while fetching addons ${err}`, 'error')
      sendErrorResponse(res, 500, err, 'Failed to fetch addOns')
    })
}
