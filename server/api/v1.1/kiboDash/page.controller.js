/**
 * Created by sojharo on 25/09/2017.
 */
const logger = require('../../../components/logger')
const TAG = 'api/operational_dashboard/operational.controller.js'
const utility = require('./utility')
const { callApi } = require('../utility')

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
  callApi(`PagewiseData`, 'get', {}, req.headers.authorization, 'kibodash')
    .then((result) => {
      return res.status(200).json({status: 'success', payload: result})
    })
    .catch((err) => {
      logger.serverLog(TAG, `Error in fetching data from KiboDash ${JSON.stringify(err)}`, 'error')
      return res.status(500).json({status: 'failed', description: err})
    })
}

exports.ranged = (req, res) => {
  callApi(`PagewiseData/AggregateDatewise`, 'post', {startDate: req.body.startDate}, req.headers.authorization, 'kibodash')
    .then((result) => {
      return res.status(200).json({status: 'success', payload: result})
    })
    .catch((err) => {
      logger.serverLog(TAG, `Error in fetching data from KiboDash ${JSON.stringify(err)}`, 'error')
      return res.status(500).json({status: 'failed', description: err})
    })
}

exports.onePage = (req, res) => {
  callApi(`PagewiseData/OnePageAnalytics`, 'post', {pageId: req.body.pageId}, req.headers.authorization, 'kibodash')
    .then((result) => {
      return res.status(200).json({status: 'success', payload: result})
    })
    .catch((err) => {
      logger.serverLog(TAG, `Error in fetching data from KiboDash ${JSON.stringify(err)}`, 'error')
      return res.status(500).json({status: 'failed', description: err})
    })
}

exports.onePageRanged = (req, res) => {
  callApi(`PagewiseData/OnePageAggregateDatewise`, 'post', {startDate: req.body.startDate,
    pageId: req.body.pageId},
  req.headers.authorization, 'kibodash')
    .then((result) => {
      return res.status(200).json({status: 'success', payload: result})
    })
    .catch((err) => {
      logger.serverLog(TAG, `Error in fetching data from KiboDash ${JSON.stringify(err)}`, 'error')
      return res.status(500).json({status: 'failed', description: err})
    })
}

exports.topPages = (req, res) => {
  callApi(`PagewiseData/topPages`, 'post', {limit: req.body.limit}, req.headers.authorization, 'kibodash')
    .then((result) => {
      let pageIds = utility.getPageIdsFromTopPagesPayload(result)
      if (pageIds) {
        callApi(`pages/query`, 'post', {pageId: {$in: pageIds}}, req.headers.authorization)
          .then((results) => {
            let finalPayload = utility.mergePayload(results, result)
            return res.status(200).json({status: 'success', payload: finalPayload})
          })
          .catch((err) => {
            logger.serverLog(TAG, `Error in fetching data from KiboDash ${JSON.stringify(err)}`, 'error')
            return res.status(500).json({status: 'failed', description: err})
          })
      } else {
        return res.status(500).json({status: 'failed', description: 'Error in finding pageIds'})
      }
    })
    .catch((err) => {
      logger.serverLog(TAG, `Error in fetching data from KiboDash ${JSON.stringify(err)}`, 'error')
      return res.status(500).json({status: 'failed', description: err})
    })
}
