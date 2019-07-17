/**
 * Created by sojharo on 25/09/2017.
 */
const logger = require('../../../components/logger')
const TAG = 'api/operational_dashboard/operational.controller.js'
const utility = require('./utility')
const { callApi } = require('../utility')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')

/*
Endpoint: /api/v1/PagewiseData
Type: Get
Responds: Array
Structure: TotalPagewiseAnalytics
Endpoint: /api/v1/PagewiseData/OnePageAnalytics
Type: Post
Body: pageId
Responds: Array
Structure: TotalPagewiseAnalytics
Endpoint: /api/v1/PagewiseData/AggregateDatewise
Type: Post
Body: startDate
Responds: Array
Structure: PagewiseAggregate
Endpoint: /api/v1/PagewiseData/OnePageAggregateDatewise
Type: Post
Body: startDate, pageId
Responds: Array
Structure: PagewiseAggregate
Endpoint: /api/v1/PagewiseData/topPages
Type: Post
Body: limit
Responds: Array
Structure: TotalPagewiseAnalytics
*/

exports.index = (req, res) => {
  callApi(`PagewiseData`, 'get', {}, 'kibodash')
    .then((result) => {
      sendSuccessResponse(res, 200, result)
    })
    .catch((err) => {
      logger.serverLog(TAG, `Error in fetching data from KiboDash ${JSON.stringify(err)}`, 'error')
      sendErrorResponse(res, 500, err)
    })
}

exports.ranged = (req, res) => {
  callApi(`PagewiseData/AggregateDatewise`, 'post', {startDate: req.body.startDate}, 'kibodash')
    .then((result) => {
      sendSuccessResponse(res, 200, result)
    })
    .catch((err) => {
      logger.serverLog(TAG, `Error in fetching data from KiboDash ${JSON.stringify(err)}`, 'error')
      sendErrorResponse(res, 500, '', err)
    })
}

exports.onePage = (req, res) => {
  callApi(`PagewiseData/OnePageAnalytics`, 'post', {pageId: req.body.pageId}, 'kibodash')
    .then((result) => {
      sendSuccessResponse(res, 200, result)
    })
    .catch((err) => {
      logger.serverLog(TAG, `Error in fetching data from KiboDash ${JSON.stringify(err)}`, 'error')
      sendErrorResponse(res, 500, '', err)
    })
}

exports.onePageRanged = (req, res) => {
  callApi(`PagewiseData/OnePageAggregateDatewise`, 'post', {startDate: req.body.startDate,
    pageId: req.body.pageId}, 'kibodash')
    .then((result) => {
      sendSuccessResponse(res, 200, result)
    })
    .catch((err) => {
      logger.serverLog(TAG, `Error in fetching data from KiboDash ${JSON.stringify(err)}`, 'error')
      sendErrorResponse(res, 500, '', err)
    })
}

exports.topPages = (req, res) => {
  callApi(`PagewiseData/topPages`, 'post', {limit: req.body.limit}, 'kibodash')
    .then((result) => {
      let pageIds = utility.getPageIdsFromTopPagesPayload(result)
      if (pageIds) {
        callApi(`pages/query`, 'post', {pageId: {$in: pageIds}})
          .then((results) => {
            let finalPayload = utility.mergePayload(results, result)
            sendSuccessResponse(res, 200, finalPayload)
          })
          .catch((err) => {
            logger.serverLog(TAG, `Error in fetching data from KiboDash ${JSON.stringify(err)}`, 'error')
            sendErrorResponse(res, 500, '', err)
          })
      } else {
        sendErrorResponse(res, 500, '', 'Error in finding pageIds')
      }
    })
    .catch((err) => {
      logger.serverLog(TAG, `Error in fetching data from KiboDash ${JSON.stringify(err)}`, 'error')
      sendErrorResponse(res, 500, '', err)
    })
}
