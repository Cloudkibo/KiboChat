/**
 * Created by sojharo on 27/07/2017.
 */

const logger = require('../../../components/logger')
const TAG = 'api/v1.1/messenger_components/messenger_components.controller.js'
const DataLayer = require('./messenger_components.datalayer')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')

exports.index = function (req, res) {
  DataLayer.findAllMessengerComponents({ companyId: req.user.companyId })
    .then(result => {
      sendSuccessResponse(res, 200, result, null)
    })
    .catch(err => {
      const message = err || 'error from getting list of messenger components'
      logger.serverLog(message, `${TAG}: exports.index`, {}, {user: req.user}, 'error')
      sendErrorResponse(res, 501, err, 'error from getting list of messenger components')
    })
}

exports.create = function (req, res) {
  DataLayer.createMessengerComponent(req.body)
    .then(result => {
      sendSuccessResponse(res, 201, result, null)
    })
    .catch(err => {
      const message = err || 'error from in creating messenger components'
      logger.serverLog(message, `${TAG}: exports.index`, {}, {user: req.user}, 'error')
      sendErrorResponse(res, 501, err, 'error in creating of messenger components')
    })
}

exports.edit = function (req, res) {
  DataLayer.updateMessengerComponent(req.body)
    .then(result => {
      sendSuccessResponse(res, 200, result, null)
    })
    .catch(err => {
      const message = err || 'error from in updating messenger components'
      logger.serverLog(message, `${TAG}: exports.index`, {}, {user: req.user}, 'error')
      sendErrorResponse(res, 501, err, 'error in updating of messenger components')
    })
}
