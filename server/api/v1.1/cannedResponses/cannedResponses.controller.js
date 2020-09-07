const logger = require('../../../components/logger')
const TAG = 'api/cannedResponses/cannedResponses.controller.js'
const dataLayer = require('./datalayer')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')

exports.index = function (req, res) {
  logger.serverLog(TAG, 'fetch endpoint of canned responses is hit', 'debug')
  dataLayer.findAllResponses({ companyId: req.user.companyId })
    .then(responses => {
      sendSuccessResponse(res, 200, responses)
    })
    .catch(err => {
      logger.serverLog(TAG, `Error occured while fetching responses ${err}`, 'error')
      sendErrorResponse(res, 500, 'Error occured while fetching responses')
    })
}

exports.create = function (req, res) {
  logger.serverLog(TAG, 'create endpoint of canned responses is hit', 'debug')
  var payload = {
    companyId: req.user.companyId,
    userId: req.user._id,
    responseCode: req.body.responseCode,
    responseMessage: req.body.responseMessage
  }
  dataLayer.createResponse(payload)
    .then(createdObj => {
      sendSuccessResponse(res, 200, 'Canned response created succssfully')
    })
    .catch(err => {
      logger.serverLog(TAG, `Error occured while creating canned response ${err}`, 'error')
      sendErrorResponse(res, 500, 'Error occured while creating canned response')
    })
}

exports.edit = function (req, res) {
  logger.serverLog(TAG, 'edit endpoint of canned responses is hit', 'debug')
  dataLayer.updateOneResponse({ _id: req.body.responseId}, { responseCode: req.body.responseCode, responseMessage: req.body.responseMessage})
    .then(updated => {
      sendSuccessResponse(res, 200, 'Canned response updated succssfully')
    })
    .catch(err => {
      logger.serverLog(TAG, `Error occured while updating canned response ${err}`, 'error')
      sendErrorResponse(res, 500, 'Error occured while updating canned response')
    })
}

exports.delete = function (req, res) {
  logger.serverLog(TAG, 'delete endpoint of canned responses is hit', 'debug')
  dataLayer.deleteOneResponse({ _id: req.body.responseId })
    .then(deletedObj => {
      sendSuccessResponse(res, 200, 'Canned response deleted successfully!')
    })
    .catch(err => {
      logger.serverLog(TAG, err, 'error')
      sendErrorResponse(res, 500, 'Failed to delete canned response.')
    })
}
