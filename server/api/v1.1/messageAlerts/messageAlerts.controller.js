const logger = require('../../../components/logger')
const logicLayer = require('./messageAlerts.logiclayer')
const TAG = '/api/v1/messageAlerts/messageAlerts.controller.js'
const { callApi } = require('../utility')
const async = require('async')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')

exports.index = function (req, res) {
  let query = {
    purpose: 'findAll',
    match: {companyId: req.user.companyId, platform: req.body.platform}
  }
  callApi(`alerts/query`, 'post', query, 'kibochat')
    .then(data => {
      sendSuccessResponse(res, 200, data)
    })
    .catch(err => {
      const message = err || 'Error in fetching alerts'
      logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, err)
    })
}
exports.fetchSubscriptions = function (req, res) {
  let query = {
    purpose: 'findAll',
    match: {companyId: req.user.companyId, platform: req.body.platform}
  }
  callApi(`alerts/subscriptions/query`, 'post', query, 'kibochat')
    .then(data => {
      sendSuccessResponse(res, 200, data)
    })
    .catch(err => {
      const message = err || 'Error in fetching subscriptions'
      logger.serverLog(message, `${TAG}: exports.fetchSubscriptions`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, err)
    })
}
exports.createAlert = function (req, res) {
  callApi(`alerts`, 'post', {
    platform: req.body.platform,
    companyId: req.user.companyId,
    type: req.body.type,
    enabled: req.body.enabled,
    interval: req.body.interval,
    intervalUnit: req.body.intervalUnit,
    promptCriteria: req.body.promptCriteria
  }, 'kibochat')
    .then(data => {
      sendSuccessResponse(res, 200, data)
    })
    .catch(err => {
      const message = err || 'Error in creating alert'
      logger.serverLog(message, `${TAG}: exports.createAlert`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, err)
    })
}
exports.updateAlert = function (req, res) {
  let query = {
    purpose: 'updateOne',
    match: { _id: req.params.id },
    updated: req.body
  }
  callApi(`alerts`, 'put', query, 'kibochat')
    .then(data => {
      sendSuccessResponse(res, 200, data)
    })
    .catch(err => {
      const message = err || 'Error in updating alert'
      logger.serverLog(message, `${TAG}: exports.updateAlert`, req.body, {user: req.user, id: req.params.id}, 'error')
      sendErrorResponse(res, 500, err)
    })
}
