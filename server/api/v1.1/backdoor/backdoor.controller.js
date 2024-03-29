const LogicLayer = require('./logiclayer')
const utility = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/v1.1/attachment/controller.js'
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')

exports.actingAsUser = function (req, res) {
  if (req.body.type === 'set') {
    utility.callApi('user/query', 'post', {domain_email: req.body.domain_email})
      .then(actingUser => {
        actingUser = actingUser[0]
        let updated = LogicLayer.getActingAsUserPayload(req.body, actingUser)
        utility.callApi('user/update', 'post', {query: {_id: req.user._id}, newPayload: updated, options: {}})
          .then(updatedUser => {
            sendSuccessResponse(res, 200, updatedUser)
          })
          .catch(err => {
            const message = err || 'Failed to update user'
            logger.serverLog(message, `${TAG}: exports.actingAsUser`, req.body, {user: req.user}, 'error')
            sendErrorResponse(res, 500, err)
          })
      })
      .catch(err => {
        const message = err || 'Unable to get company user'
        logger.serverLog(message, `${TAG}: exports.actingAsUser`, req.body, {user: req.user}, 'error')
        sendErrorResponse(res, 500, `Unable to get company user ${err}`)
      })
  } else {
    let updated = LogicLayer.getActingAsUserPayload(req.body, null)
    utility.callApi('user/update', 'post', {query: {_id: req.user._id}, newPayload: updated, options: {}})
      .then(updatedUser => {
        utility.callApi('user/update', 'post', {query: {domain_email: req.body.domain_email}, newPayload: {platform: req.user.actingAsUser.actingUserplatform}, options: {}})
          .then(updatedActingUser => {
            sendSuccessResponse(res, 200, updatedUser)
          })
          .catch(err => {
            const message = err || 'Unable to update user'
            logger.serverLog(message, `${TAG}: exports.actingAsUser`, req.body, {user: req.user}, 'error')
            sendErrorResponse(res, 500, err)
          })
      })
      .catch(err => {
        const message = err || 'Unable to update user'
        logger.serverLog(message, `${TAG}: exports.actingAsUser`, req.body, {user: req.user}, 'error')
        sendErrorResponse(res, 500, err)
      })
  }
}
