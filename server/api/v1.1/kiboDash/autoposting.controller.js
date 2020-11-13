/**
 * Created by sojharo on 25/09/2017.
 */
const logger = require('../../../components/logger')
const TAG = 'api/operational_dashboard/operational.controller.js'
const { callApi } = require('../utility')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')

/*
//for platform wise total autoposting
Endpoint: /api/v1/AutopostingData
Type: Get
Responds: Array
Structure: {status: 'success', payload: {totalAutoposting, facebookAutoposting, twitterAutoposting, wordpressAutoposting}}
Endpoint: /api/v1/AutopostingData/UserTotalAutoposting
Type: post
Body: companyId
Responds: Array
Structure: {status: 'success', payload: {companyId, totalAutoposting, facebookAutoposting, twitterAutoposting, wordpressAutoposting}}
Endpoint: /api/v1/AutopostingData/UserAutopostingDatewise
Type: post
Body: companyId, startDate
Responds: Array
Structure: {status: 'success', payload: {companyId, startDate, totalAutoposting, facebookAutoposting, twitterAutoposting, wordpressAutoposting}}
Endpoint: /api/v1/AutopostingData/PlatformAutopostingDatewise
Type: post
Body: startDate
Responds: Array
Structure: {status: 'success', payload: {startDate, totalAutoposting, facebookAutoposting, twitterAutoposting, wordpressAutoposting}}
*/

exports.index = (req, res) => {
  callApi(`AutopostingData`, 'get', {}, 'kibodash')
    .then((result) => {
      sendSuccessResponse(res, 200, result)
    })
    .catch((err) => {
      const message = err || 'Error in fetching data from KiboDash'
      logger.serverLog(message, `${TAG}: exports.index`, {}, {}, 'error')
      sendSuccessResponse(res, 500, err)
    })
}

exports.ranged = (req, res) => {
  callApi(`AutopostingData/PlatformAutopostingDatewise`, 'post', {startDate: req.body.startDate}, 'kibodash')
    .then((result) => {
      sendSuccessResponse(res, 200, result)
    })
    .catch((err) => {
      const message = err || 'Error in fetching data from KiboDash'
      logger.serverLog(message, `${TAG}: exports.ranged`, req.body, {}, 'error')
      sendErrorResponse(res, 500, err)
    })
}

exports.userwise = (req, res) => {
  callApi(`AutopostingData/UserTotalAutoposting`, 'post', {companyId: req.body.companyId}, 'kibodash')
    .then((result) => {
      sendSuccessResponse(res, 200, result)
    })
    .catch((err) => {
      const message = err || 'Error in fetching data from KiboDash'
      logger.serverLog(message, `${TAG}: exports.userwise`, req.body, {}, 'error')
      sendErrorResponse(res, 500, err)
    })
}

exports.userwiseRanged = (req, res) => {
  callApi(`AutopostingData/UserAutopostingDatewise`, 'post', {startDate: req.body.startDate,
    companyId: req.body.companyId}, 'kibodash')
    .then((result) => {
      sendSuccessResponse(res, 200, result)
    })
    .catch((err) => {
      const message = err || 'Error in fetching data from KiboDash'
      logger.serverLog(message, `${TAG}: exports.userwiseRanged`, req.body, {}, 'error')
      sendErrorResponse(res, 500, err)
    })
}
