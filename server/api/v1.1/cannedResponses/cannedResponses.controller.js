const logger = require('../../../components/logger')
const TAG = 'api/cannedResponses/cannedResponses.controller.js'
const dataLayer = require('./datalayer')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')

exports.index = function (req, res) {
  dataLayer.findAllResponses({ companyId: req.user.companyId })
    .then(responses => {
      sendSuccessResponse(res, 200, responses)
    })
    .catch(err => {
      const message = err || 'Error occured while fetching responses'
      logger.serverLog(message, `${TAG}: exports.index`, {}, {user: req.user}, 'error')
      sendErrorResponse(res, 500, 'Error occured while fetching responses')
    })
}

exports.create = function (req, res) {
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
      const message = err || 'Error occured while creating canned responses'
      logger.serverLog(message, `${TAG}: exports.create`, req.body, {payload, user: req.user}, 'error')
      sendErrorResponse(res, 500, 'Error occured while creating canned response')
    })
}

exports.edit = function (req, res) {
  dataLayer.updateOneResponse({ _id: req.body.responseId }, { responseCode: req.body.responseCode, responseMessage: req.body.responseMessage })
    .then(updated => {
      sendSuccessResponse(res, 200, 'Canned response updated succssfully')
    })
    .catch(err => {
      const message = err || 'Error occured while updating canned responses'
      logger.serverLog(message, `${TAG}: exports.edit`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, 'Error occured while updating canned response')
    })
}

exports.delete = function (req, res) {
  dataLayer.deleteOneResponse({ _id: req.body.responseId })
    .then(deletedObj => {
      sendSuccessResponse(res, 200, 'Canned response deleted successfully!')
    })
    .catch(err => {
      const message = err || 'Error occured while updating canned responses'
      logger.serverLog(message, `${TAG}: exports.delete`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, 'Failed to delete canned response.')
    })
}
