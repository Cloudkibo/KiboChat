const logger = require('../../../components/logger')
const logicLayer = require('./sessions.logiclayer')
const dataLayer = require('./sessions.datalayer')
const TAG = '/api/v1/sessions/sessions.controller.js'
const util = require('util')

exports.genericFetch = function (req, res) {
  logger.serverLog(TAG, 'Hit the query endpoint for sessions controller')

  dataLayer.findSessionUsingQuery(req.body)
    .then(result => {
      res.status(200).json({status: 'success', payload: result})
    })
    .catch(err => {
      logger.serverLog(TAG, `Error at querying session ${util.inspect(err)}`)
      res.status(500).json({status: 'failed', payload: err})
    })
}
