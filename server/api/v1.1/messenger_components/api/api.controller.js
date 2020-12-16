/**
 * Created by sojharo on 27/07/2017.
 */

const logger = require('../../../../components/logger')
const TAG = 'api/v1.1/messenger_components/api/api.controller.js'
const DataLayer = require('./../messenger_components.datalayer')
const { callApi } = require('./../../utility')
const { sendSuccessResponse, sendErrorResponse } = require('../../../global/response')

exports.subscriberInfo = function (req, res) {
  callApi('subscribers/query', 'post', { _id: subscriber._id })
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