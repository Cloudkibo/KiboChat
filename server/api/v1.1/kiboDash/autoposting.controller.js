/**
 * Created by sojharo on 25/09/2017.
 */
const logger = require('../../../components/logger')
const TAG = 'api/operational_dashboard/operational.controller.js'
const { callApi } = require('../utility')

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
      return res.status(200).json({status: 'success', payload: result})
    })
    .catch((err) => {
      logger.serverLog(TAG, `Error in fetching data from KiboDash ${JSON.stringify(err)}`, 'error')
      return res.status(500).json({status: 'failed', description: err})
    })
}

exports.ranged = (req, res) => {
  callApi(`AutopostingData/PlatformAutopostingDatewise`, 'post', {startDate: req.body.startDate}, 'kibodash')
    .then((result) => {
      return res.status(200).json({status: 'success', payload: result})
    })
    .catch((err) => {
      logger.serverLog(TAG, `Error in fetching data from KiboDash ${JSON.stringify(err)}`, 'error')
      return res.status(500).json({status: 'failed', description: err})
    })
}

exports.userwise = (req, res) => {
  callApi(`AutopostingData/UserTotalAutoposting`, 'post', {companyId: req.body.companyId}, 'kibodash')
    .then((result) => {
      return res.status(200).json({status: 'success', payload: result})
    })
    .catch((err) => {
      logger.serverLog(TAG, `Error in fetching data from KiboDash ${JSON.stringify(err)}`, 'error')
      return res.status(500).json({status: 'failed', description: err})
    })
}

exports.userwiseRanged = (req, res) => {
  callApi(`AutopostingData/UserAutopostingDatewise`, 'post', {startDate: req.body.startDate,
    companyId: req.body.companyId}, 'kibodash')
    .then((result) => {
      return res.status(200).json({status: 'success', payload: result})
    })
    .catch((err) => {
      logger.serverLog(TAG, `Error in fetching data from KiboDash ${JSON.stringify(err)}`, 'error')
      return res.status(500).json({status: 'failed', description: err})
    })
}
