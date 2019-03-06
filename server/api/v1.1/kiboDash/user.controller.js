/**
 * Created by sojharo on 25/09/2017.
 */
const logger = require('../../../components/logger')
const TAG = 'api/operational_dashboard/operational.controller.js'
const { callApi } = require('../utility')

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
  callApi(`UserwiseData`, 'get', {}, req.headers.authorization, 'kibodash')
    .then((result) => {
      return res.status(200).json({status: 'success', payload: result})
    })
    .catch((err) => {
      logger.serverLog(TAG, `Error in fetching data from KiboDash ${JSON.stringify(err)}`)
      return res.status(500).json({status: 'failed', description: err})
    })
}

exports.ranged = (req, res) => {
  callApi(`UserwiseData/AggregateDatewise`, 'post', {startDate: req.body.startDate}, req.headers.authorization, 'kibodash')
    .then((result) => {
      return res.status(200).json({status: 'success', payload: result})
    })
    .catch((err) => {
      logger.serverLog(TAG, `Error in fetching data from KiboDash ${JSON.stringify(err)}`)
      return res.status(500).json({status: 'failed', description: err})
    })
}

exports.oneUser = (req, res) => {
  callApi(`UserwiseData/OneUserAnalytics`, 'post', {companyId: req.body.companyId}, req.headers.authorization, 'kibodash')
    .then((result) => {
      return res.status(200).json({status: 'success', payload: result})
    })
    .catch((err) => {
      logger.serverLog(TAG, `Error in fetching data from KiboDash ${JSON.stringify(err)}`)
      return res.status(500).json({status: 'failed', description: err})
    })
}

exports.oneUserRanged = (req, res) => {
  callApi(`UserwiseData/OneUserAggregateDatewise`, 'post', {startDate: req.body.startDate,
    companyId: req.body.companyId}, req.headers.authorization, 'kibodash')
    .then((result) => {
      return res.status(200).json({status: 'success', payload: result})
    })
    .catch((err) => {
      logger.serverLog(TAG, `Error in fetching data from KiboDash ${JSON.stringify(err)}`)
      return res.status(500).json({status: 'failed', description: err})
    })
}
