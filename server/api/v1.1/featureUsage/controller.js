const logger = require('../../../components/logger')
const TAG = 'api/featureUsage/controller.js'
const utility = require('../utility')
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')
const async = require('async')

exports.index = function (req, res) {
  async.parallelLimit([
    function (callback) {
      utility.callApi(`featureUsage/planQuery`, 'post', {planId: req.user.currentPlan})
        .then(planUsage => {
          callback(null, planUsage)
        })
        .catch((err) => {
          callback(err)
        })
    },
    function (callback) {
      utility.callApi(`featureUsage/companyQuery`, 'post', {companyId: req.user.companyId, platform: req.user.platform})
        .then(companyUsage => {
          callback(null, companyUsage)
        })
        .catch((err) => {
          callback(err)
        })
    }
  ], 10, function (err, results) {
    if (err) {
      const message = err || 'Failed to fetchUsage'
      logger.serverLog(message, `${TAG}: exports.fetchUsage`, req.body, req.user, 'error')
      sendErrorResponse(res, 500, `Failed to fetch usage ${err}`)
    } else {
      sendSuccessResponse(res, 200, {
        planUsage: results[0][0],
        companyUsage: results[1][0]
      })
    }
  })
}
