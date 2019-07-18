/**
 * Created by sojharo on 25/09/2017.
 */
const logger = require('../../../components/logger')
const TAG = 'api/operational_dashboard/operational.controller.js'
const { callApi } = require('../utility')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')

/*
Endpoint: /api/v1/UserwiseData
Type: Get
Responds: Array
Structure: TotalUserwiseAnalytics
Endpoint: /api/v1/UserwiseData/OneUserAnalytics
Type: Post
Body: companyId
Responds: Array
Structure: TotalUserwiseAnalytics
Endpoint: /api/v1/UserwiseData/AggregateDatewise
Type: Post
Body: startDate
Responds: Array
Structure: UserwiseAggregate
Endpoint: /api/v1/UserwiseData/OneUserAggregateDatewise
Type: Post
Body: startDate, companyId
Responds: Array
Structure: UserwiseAggregate
*/

exports.index = (req, res) => {
  callApi(`UserwiseData`, 'get', {}, 'kibodash')
    .then((result) => {
      sendSuccessResponse(res, 200, result)
    })
    .catch((err) => {
      logger.serverLog(TAG, `Error in fetching data from KiboDash ${JSON.stringify(err)}`, 'error')
      sendErrorResponse(res, 500, '', err)
    })
}

exports.ranged = (req, res) => {
  callApi(`UserwiseData/AggregateDatewise`, 'post', {startDate: req.body.startDate}, 'kibodash')
    .then((result) => {
      sendSuccessResponse(res, 200, result)
    })
    .catch((err) => {
      logger.serverLog(TAG, `Error in fetching data from KiboDash ${JSON.stringify(err)}`, 'error')
      sendErrorResponse(res, 500, '', err)
    })
}

exports.oneUser = (req, res) => {
  callApi(`UserwiseData/OneUserAnalytics`, 'post', {companyId: req.body.companyId}, 'kibodash')
    .then((result) => {
      sendSuccessResponse(res, 200, result)
    })
    .catch((err) => {
      logger.serverLog(TAG, `Error in fetching data from KiboDash ${JSON.stringify(err)}`, 'error')
      sendErrorResponse(res, 500, '', err)
    })
}

exports.oneUserRanged = (req, res) => {
  callApi(`UserwiseData/OneUserAggregateDatewise`, 'post', {startDate: req.body.startDate,
    companyId: req.body.companyId}, 'kibodash')
    .then((result) => {
      sendSuccessResponse(res, 200, result)
    })
    .catch((err) => {
      logger.serverLog(TAG, `Error in fetching data from KiboDash ${JSON.stringify(err)}`, 'error')
      sendErrorResponse(res, 500, '', err)
    })
}
