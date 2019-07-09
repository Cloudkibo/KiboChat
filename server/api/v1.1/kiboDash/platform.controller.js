/**
 * Created by sojharo on 25/09/2017.
 */
const logger = require('../../../components/logger')
const TAG = 'api/operational_dashboard/operational.controller.js'
const { callApi } = require('../utility')

/*
Endpoint: /api/v1/PlatformwiseData
Type: Get
Responds: Array
Structure: TotalPlatformwiseAnalytics

Endpoint: /api/v1/PlatformwiseData/AggregateDatewise
Type: Post
Body: startDate
Responds: Array
Structure: PlatformwiseAggregate
*/

exports.index = (req, res) => {
  callApi(`PlatformwiseData`, 'get', {}, 'kibodash')
    .then((result) => {
      if (result.length === 1) {
        // The array length will always be 1
        return res.status(200).json({status: 'success', payload: result[0]})
      } else {
        return res.status(500).json({status: 'failed', description: 'Unable to fetch data from KiboDash'})
      }
    })
    .catch((err) => {
      logger.serverLog(TAG, `Error in fetching data from KiboDash ${JSON.stringify(err)}`, 'error')
      return res.status(500).json({status: 'failed', description: err})
    })
}

exports.ranged = (req, res) => {
  callApi(`PlatformwiseData/AggregateDatewise`, 'post', {startDate: req.body.startDate}, 'kibodash')
    .then((result) => {
      return res.status(200).json({status: 'success', payload: result})
    })
    .catch((err) => {
      logger.serverLog(TAG, `Error in fetching data from KiboDash ${JSON.stringify(err)}`, 'error')
      return res.status(500).json({status: 'failed', description: err})
    })
}
