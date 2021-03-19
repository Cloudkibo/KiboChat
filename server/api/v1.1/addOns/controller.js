const logger = require('../../../components/logger')
const TAG = 'api/addOns/controller.js'
const LogicLayer = require('./logicLayer.js')
const { callApi } = require('../utility/index.js')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')

exports.create = function (req, res) {
  logger.serverLog(TAG, 'create endpoint of addOns is hit', 'debug')
  const payload = LogicLayer.createAddOnsPayload(req.body)
  callApi(`addOns`, 'post', payload, 'accounts', req.headers.authorization)
    .then(created => {
      sendSuccessResponse(res, 200, 'Add On created succssfully')
    })
    .catch(err => {
      logger.serverLog(TAG, `Error occured while creating add on ${err}`, 'error')
      sendErrorResponse(res, 500, 'Error occured while creating add on')
    })
}
