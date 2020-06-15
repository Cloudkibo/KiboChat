/**
 * Created by sojharo on 24/11/2017.
 */

// eslint-disable-next-line no-unused-vars
const logger = require('../../../components/logger')
// eslint-disable-next-line no-unused-vars
const TAG = 'api/messageStatistics/messageStatistics.controller.js'
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')
const { getRecords } = require('./../../global/messageStatistics')
const { parse } = require('json2csv')

exports.index = function (req, res) {
  let name = req.params.name || 'broadcast'
  getRecords(name, (err, data) => {
    if (err) {
      logger.serverLog(TAG, 'Got error from Message Statistics on getRecords')
      logger.serverLog(TAG, err)
      return sendErrorResponse(res, '500', '', JSON.stringify(err))
    }
    var info = data
    var keys = []
    var val = info[0]
    // fetching json keys and storing in array
    for (var k in val) {
      var subKey = k
      keys.push(subKey)
    }
    const opts = { keys }
    try {
      const csv = parse(info, opts)
      res.send(csv)
    } catch (err) {
      logger.serverLog(TAG, 'Got error from Message Statistics on CSV')
      logger.serverLog(TAG, err)
      sendErrorResponse(res, '500', '', JSON.stringify(err))
    }
  })
}
