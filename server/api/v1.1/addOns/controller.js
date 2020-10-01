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

exports.index = function (req, res) {
  logger.serverLog(TAG, 'index endpoint of addOns is hit', 'debug')
  callApi(`addOns`, 'get', {}, 'accounts', req.headers.authorization)
    .then(addOns => {
      sendSuccessResponse(res, 200, addOns)
    })
    .catch(err => {
      logger.serverLog(TAG, `Error occured while fetching add ons ${err}`, 'error')
      sendErrorResponse(res, 500, 'Error occured while fetching add ons')
    })
}

exports.companyAddOns = function (req, res) {
  logger.serverLog(TAG, 'companyAddOns endpoint of addOns is hit', 'debug')
  callApi(`companyAddOns/query`, 'post', {purpose: 'findAll', match: {companyId: req.user.companyId}}, 'accounts', req.headers.authorization)
    .then(addOns => {
      sendSuccessResponse(res, 200, addOns)
    })
    .catch(err => {
      logger.serverLog(TAG, `Error occured while fetching company add ons ${err}`, 'error')
      sendErrorResponse(res, 500, 'Error occured while fetching company add ons')
    })
}
